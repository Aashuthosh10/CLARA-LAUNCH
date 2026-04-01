"""Ingest English-indexed locale JSON into pgvector (leaf chunks).

RAG stays English-indexed: the universal pre-processor normalizes queries to English before search.
Only en.json (and optionally hi.json) are ingested. kn/ta/te/ml JSON are for UI + Narrator only — never vector DB.
"""

import json
import sys
import uuid
from pathlib import Path
from typing import Any

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.clients.database import get_connection, insert_college_chunk, put_connection
from backend.core.rag import EMBEDDING_DIM, EMBEDDING_MODEL_NAME, generate_embedding

LOCALES_DIR = _PROJECT_ROOT / "backend" / "data" / "locales"
LOCALE_FILES = ("en.json", "hi.json")


def _clean(value: Any) -> str:
    return " ".join(str(value).split())


def _stringify_leaf(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return _clean(str(value))
    if isinstance(value, str):
        return _clean(value)
    return _clean(json.dumps(value, ensure_ascii=False))


def _format_context_rich_line(path: list[str], value: Any) -> str:
    """One line per leaf: Category / Sub-category / Key / Value (preserves JSON key paths)."""
    val_s = _stringify_leaf(value)
    if not val_s:
        return ""
    if not path:
        return f"Category: root. Key: value. Value: {val_s}."
    category = path[0]
    key = path[-1]
    if len(path) == 1:
        return f"Category: {category}. Key: {key}. Value: {val_s}."
    if len(path) == 2:
        return f"Category: {category}. Key: {key}. Value: {val_s}."
    sub = ".".join(path[1:-1])
    return f"Category: {category}. Sub-category: {sub}. Key: {key}. Value: {val_s}."


def _walk(node: Any, path: list[str], out: list[str]) -> None:
    if isinstance(node, dict):
        for k, v in node.items():
            _walk(v, path + [str(k)], out)
        return
    if isinstance(node, list):
        for i, item in enumerate(node):
            seg = f"entry_{i + 1}" if isinstance(item, dict) else f"item_{i + 1}"
            _walk(item, path + [seg], out)
        return
    line = _format_context_rich_line(path, node)
    if line:
        out.append(line)


def build_leaf_chunks_from_locale(data: dict[str, Any]) -> list[str]:
    """Flatten entire locale object: one embedding row per scalar leaf."""
    out: list[str] = []
    if not isinstance(data, dict):
        return out
    _walk(data, [], out)
    return out


def _prepare_and_truncate_college_knowledge_table() -> bool:
    """Ensure table/index exist, then truncate all rows for a clean re-ingest."""
    stmts = [
        "CREATE EXTENSION IF NOT EXISTS vector",
        f"""
        CREATE TABLE IF NOT EXISTS college_knowledge (
            id UUID PRIMARY KEY,
            content TEXT NOT NULL,
            embedding VECTOR({EMBEDDING_DIM}),
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_college_embedding
        ON college_knowledge
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """,
        "TRUNCATE college_knowledge",
    ]
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        for stmt in stmts:
            cur.execute(stmt)
        conn.commit()
        cur.close()
        return True
    except Exception:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return False
    finally:
        if conn:
            put_connection(conn)


def main() -> None:
    if not LOCALES_DIR.is_dir():
        print(f"Error: Locales directory not found: {LOCALES_DIR}")
        sys.exit(1)

    paths = [LOCALES_DIR / name for name in LOCALE_FILES]
    missing = [p for p in paths if not p.is_file()]
    if missing:
        print(f"Error: Missing required locale file(s): {', '.join(str(p) for p in missing)}")
        sys.exit(1)

    print(f"Embedding model: {EMBEDDING_MODEL_NAME} (dim={EMBEDDING_DIM})")

    if not _prepare_and_truncate_college_knowledge_table():
        print("Error: Could not prepare/truncate college_knowledge table. Check PostgreSQL.")
        sys.exit(1)

    inserted = 0
    inserted_per_locale: dict[str, int] = {}
    for path in paths:
        locale = path.stem.strip().lower()
        if locale not in {"en", "hi"}:
            print(f"Error: Unexpected locale stem {locale!r} for {path}")
            sys.exit(1)
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error: Could not parse JSON file {path}: {e}")
            sys.exit(1)
        if not isinstance(data, dict):
            print(f"Error: JSON root must be an object in {path}")
            sys.exit(1)
        chunks = build_leaf_chunks_from_locale(data)
        if not chunks:
            print(f"Error: No chunks produced for {path}. Check JSON content.")
            sys.exit(1)

        inserted_per_locale.setdefault(locale, 0)
        for chunk in chunks:
            doc_id = str(uuid.uuid4())
            try:
                embedding = generate_embedding(chunk)
            except Exception as e:
                print(f"Error: Embedding failed for locale={locale}: {e}")
                sys.exit(1)
            if insert_college_chunk(doc_id, chunk, embedding, metadata={"language": locale}):
                inserted += 1
                inserted_per_locale[locale] += 1
            else:
                print(f"Error: Insert failed for locale={locale}, chunk={inserted_per_locale[locale] + 1}")
                sys.exit(1)

    per_locale_text = ", ".join(f"{k}={v}" for k, v in sorted(inserted_per_locale.items()))
    print(
        f"Ingested {inserted} leaf chunks from {len(paths)} locale files into PostgreSQL (college_knowledge). "
        f"Breakdown: {per_locale_text}"
    )


if __name__ == "__main__":
    main()
