"""
Ingest backend/data/locales/*.json into PostgreSQL (pgvector):
format into descriptive chunks, embed locally, and store.

Usage (from project root): python -m backend.tools.ingest_college_knowledge_pg
Or from backend dir: python tools/ingest_college_knowledge_pg.py
"""

import json
import sys
import uuid
from pathlib import Path
from typing import Any

# Ensure project root is on path when run as script or -m.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.clients.database import get_connection, insert_college_chunk, put_connection
from backend.core.rag import generate_embedding

LOCALES_DIR = _PROJECT_ROOT / "backend" / "data" / "locales"


def _clean_scalar(value: Any) -> str:
    text = str(value)
    return " ".join(text.split())


def _flatten_lines(prefix: str, value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, dict):
        out: list[str] = []
        for k, v in value.items():
            key = _clean_scalar(k).replace("_", " ").title()
            child_prefix = f"{prefix} - {key}" if prefix else key
            out.extend(_flatten_lines(child_prefix, v))
        return out
    if isinstance(value, list):
        out: list[str] = []
        for idx, item in enumerate(value, start=1):
            item_prefix = f"{prefix} [{idx}]"
            if isinstance(item, (dict, list)):
                out.extend(_flatten_lines(item_prefix, item))
            else:
                out.append(f"{item_prefix}: {_clean_scalar(item)}")
        return out
    return [f"{prefix}: {_clean_scalar(value)}" if prefix else _clean_scalar(value)]


def _make_section_chunk(title: str, body_lines: list[str]) -> str:
    body = "\n".join(f"- {line}" for line in body_lines if line.strip())
    return f"{title}\n{body}".strip()


def _build_department_chunks(data: dict[str, Any]) -> list[str]:
    chunks: list[str] = []
    ug_programs = data.get("undergraduate_programs")
    fees_map = (
        data.get("fees_structure", {})
        .get("management_quota_engineering_annual", {})
    )
    if not isinstance(ug_programs, list):
        return chunks
    for dept in ug_programs:
        if not isinstance(dept, dict):
            continue
        name = _clean_scalar(dept.get("department", "Department"))
        hod = _clean_scalar(dept.get("hod", "Information not available"))
        intake = _clean_scalar(dept.get("intake", "Information not available"))
        duration = _clean_scalar(dept.get("duration", "Information not available"))
        dept_fee = None
        if isinstance(fees_map, dict):
            dept_fee = fees_map.get(name) or fees_map.get(name.replace("&", "and"))
        fee_text = _clean_scalar(dept_fee) if dept_fee else "Information not available"

        lines = [
            f"Department: {name}",
            f"HOD: {hod}",
            f"Intake: {intake}",
            f"Duration: {duration}",
            f"Management quota annual fee: {fee_text}",
        ]
        for k, v in dept.items():
            if k in {"department", "hod", "intake", "duration"}:
                continue
            lines.extend(_flatten_lines(k.replace("_", " ").title(), v))
        chunks.append(_make_section_chunk(f"Undergraduate Department - {name}", lines))
    return chunks


def _build_chunks_from_json(data: dict[str, Any]) -> list[str]:
    chunks: list[str] = []
    for section in (
        "institution_overview",
        "leadership_and_governance",
        "vision_mission_values",
        "postgraduate_programs",
        "basic_science_departments",
        "admission_and_eligibility",
        "fees_structure",
        "placements_and_career_support",
    ):
        raw = data.get(section)
        if raw is None:
            continue
        title = section.replace("_", " ").title()
        chunks.append(_make_section_chunk(title, _flatten_lines(title, raw)))

    chunks.extend(_build_department_chunks(data))

    covered = {
        "institution_overview",
        "leadership_and_governance",
        "vision_mission_values",
        "undergraduate_programs",
        "postgraduate_programs",
        "basic_science_departments",
        "admission_and_eligibility",
        "fees_structure",
        "placements_and_career_support",
    }
    for key, value in data.items():
        if key in covered:
            continue
        title = key.replace("_", " ").title()
        chunks.append(_make_section_chunk(title, _flatten_lines(title, value)))
    return [c for c in chunks if c.strip()]


def _prepare_and_truncate_college_knowledge_table() -> bool:
    """Ensure table/index exist, then truncate all rows for a clean re-ingest."""
    stmts = [
        "CREATE EXTENSION IF NOT EXISTS vector",
        """
        CREATE TABLE IF NOT EXISTS college_knowledge (
            id UUID PRIMARY KEY,
            content TEXT NOT NULL,
            embedding VECTOR(768),
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

    locale_files = sorted([p for p in LOCALES_DIR.glob("*.json") if p.is_file()])
    if not locale_files:
        print(f"Error: No locale JSON files found in {LOCALES_DIR}")
        sys.exit(1)

    if not _prepare_and_truncate_college_knowledge_table():
        print("Error: Could not prepare/truncate college_knowledge table. Check PostgreSQL.")
        sys.exit(1)

    inserted = 0
    inserted_per_locale: dict[str, int] = {}
    for path in locale_files:
        locale = path.stem.strip().lower()
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error: Could not parse JSON file {path}: {e}")
            sys.exit(1)
        if not isinstance(data, dict):
            print(f"Error: JSON root must be an object in {path}")
            sys.exit(1)
        chunks = _build_chunks_from_json(data)
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
        f"Ingested {inserted} chunks from {len(locale_files)} locale files into PostgreSQL (college_knowledge). "
        f"Breakdown: {per_locale_text}"
    )


if __name__ == "__main__":
    main()
