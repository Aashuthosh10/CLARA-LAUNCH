"""Ingest college knowledge and locale leaves into pgvector.

Dual source ingestion:
1) college_knowledge.txt chunked for broad institution facts (language=en)
2) en/hi locale JSON flattened into context-rich leaf chunks
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
from backend.config.settings import COLLEGE_KNOWLEDGE_PATH
from backend.core.rag import EMBEDDING_DIM, EMBEDDING_MODEL_NAME, generate_embedding

LOCALES_DIR = _PROJECT_ROOT / "backend" / "data" / "locales"
LOCALE_FILES = ("en.json", "hi.json")
DEFAULT_CHUNK_SIZE = 700
DEFAULT_CHUNK_OVERLAP = 80


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


def build_text_chunks(text: str, *, chunk_size: int = DEFAULT_CHUNK_SIZE, overlap: int = DEFAULT_CHUNK_OVERLAP) -> list[str]:
    cleaned_lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned = "\n".join(cleaned_lines).strip()
    if not cleaned:
        return []
    if chunk_size <= 0:
        chunk_size = DEFAULT_CHUNK_SIZE
    if overlap < 0:
        overlap = 0
    if overlap >= chunk_size:
        overlap = max(0, chunk_size // 5)

    chunks: list[str] = []
    start = 0
    step = max(1, chunk_size - overlap)
    n = len(cleaned)
    while start < n:
        end = min(n, start + chunk_size)
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= n:
            break
        start += step
    return chunks


def build_text_fact_chunks(text: str) -> list[str]:
    """
    Build fine-grained retrieval chunks from heading+fact style lines.
    This improves precision for queries like location/address/HOD/fees.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    out: list[str] = []
    section = ""
    for line in lines:
        upper = line.upper()
        if upper.startswith("PART ") or (line.endswith(":") and len(line) < 80):
            section = line.rstrip(":")
            continue
        # Bullet/fact lines
        if line.startswith("•"):
            fact = line.lstrip("•").strip()
            if fact:
                if section:
                    out.append(f"Section: {section}. Fact: {fact}.")
                else:
                    out.append(f"Fact: {fact}.")
            continue
        # Key: value style lines
        if ":" in line and len(line) <= 200:
            if section:
                out.append(f"Section: {section}. Fact: {line}.")
            else:
                out.append(f"Fact: {line}.")
    # Deduplicate while preserving order
    seen: set[str] = set()
    deduped: list[str] = []
    for chunk in out:
        key = chunk.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(chunk)
    return deduped


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
    inserted_per_source: dict[str, int] = {"college_txt": 0, "locale_json": 0}

    txt_path = Path(COLLEGE_KNOWLEDGE_PATH)
    if not txt_path.is_file():
        print(f"Error: college knowledge text file not found: {txt_path}")
        sys.exit(1)
    try:
        txt_data = txt_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"Error: Could not read college knowledge file {txt_path}: {e}")
        sys.exit(1)
    txt_window_chunks = build_text_chunks(txt_data)
    txt_fact_chunks = build_text_fact_chunks(txt_data)
    txt_chunks = txt_window_chunks + txt_fact_chunks
    if not txt_chunks:
        print(f"Error: No text chunks produced from {txt_path}.")
        sys.exit(1)

    inserted_per_locale.setdefault("en", 0)
    for idx, chunk in enumerate(txt_chunks, start=1):
        doc_id = str(uuid.uuid4())
        try:
            embedding = generate_embedding(chunk)
        except Exception as e:
            print(f"Error: Embedding failed for college_knowledge chunk={idx}: {e}")
            sys.exit(1)
        metadata = {
            "language": "en",
            "source": "college_txt",
            "source_file": str(txt_path.name),
            "chunk_index": idx,
            "chunk_size": DEFAULT_CHUNK_SIZE,
            "chunk_overlap": DEFAULT_CHUNK_OVERLAP,
            "chunk_kind": "fact" if idx > len(txt_window_chunks) else "window",
        }
        if insert_college_chunk(doc_id, chunk, embedding, metadata=metadata):
            inserted += 1
            inserted_per_locale["en"] += 1
            inserted_per_source["college_txt"] += 1
        else:
            print(f"Error: Insert failed for college_knowledge chunk={idx}")
            sys.exit(1)

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
            metadata = {"language": locale, "source": "locale_json", "source_file": str(path.name)}
            if insert_college_chunk(doc_id, chunk, embedding, metadata=metadata):
                inserted += 1
                inserted_per_locale[locale] += 1
                inserted_per_source["locale_json"] += 1
            else:
                print(f"Error: Insert failed for locale={locale}, chunk={inserted_per_locale[locale] + 1}")
                sys.exit(1)

    per_locale_text = ", ".join(f"{k}={v}" for k, v in sorted(inserted_per_locale.items()))
    per_source_text = ", ".join(f"{k}={v}" for k, v in sorted(inserted_per_source.items()))
    print(
        f"Ingested {inserted} leaf chunks from {len(paths)} locale files into PostgreSQL (college_knowledge). "
        f"Breakdown by locale: {per_locale_text}. Breakdown by source: {per_source_text}"
    )


if __name__ == "__main__":
    main()
