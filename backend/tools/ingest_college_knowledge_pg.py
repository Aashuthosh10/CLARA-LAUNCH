"""
Ingest backend/data/svit_knowledge.json into PostgreSQL (pgvector):
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

SVIT_KNOWLEDGE_JSON_PATH = _PROJECT_ROOT / "backend" / "data" / "svit_knowledge.json"


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


def _reset_college_knowledge_table() -> bool:
    """Drop and recreate college_knowledge table for a hard reset."""
    stmts = [
        "CREATE EXTENSION IF NOT EXISTS vector",
        "DROP TABLE IF EXISTS college_knowledge",
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
    path = SVIT_KNOWLEDGE_JSON_PATH
    if not path.is_file():
        print(f"Error: Knowledge JSON file not found: {path}")
        sys.exit(1)

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Error: Could not parse JSON file {path}: {e}")
        sys.exit(1)
    if not isinstance(data, dict):
        print("Error: JSON root must be an object.")
        sys.exit(1)

    chunks = _build_chunks_from_json(data)
    if not chunks:
        print("Error: No chunks produced. Check JSON content.")
        sys.exit(1)

    if not _reset_college_knowledge_table():
        print("Error: Could not reset college_knowledge table. Check PostgreSQL.")
        sys.exit(1)

    inserted = 0
    for chunk in chunks:
        doc_id = str(uuid.uuid4())
        try:
            embedding = generate_embedding(chunk)
        except Exception as e:
            print(f"Error: Embedding failed: {e}")
            sys.exit(1)
        if insert_college_chunk(doc_id, chunk, embedding):
            inserted += 1
        else:
            print(f"Error: Insert failed for chunk {inserted + 1}")
            sys.exit(1)

    print(f"Ingested {inserted} chunks from {path} into PostgreSQL (college_knowledge).")


if __name__ == "__main__":
    main()
