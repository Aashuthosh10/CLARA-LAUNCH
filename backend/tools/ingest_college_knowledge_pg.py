"""
Ingest college_knowledge.txt into PostgreSQL (pgvector): chunk, embed locally, and store.
Run once after schema init or when college_knowledge.txt is updated.

Usage (from project root): python -m backend.tools.ingest_college_knowledge_pg
Or from backend dir: python tools/ingest_college_knowledge_pg.py
"""

import re
import sys
import uuid
from pathlib import Path

# Ensure project root is on path when run as script or -m.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.clients.database import insert_college_chunk, truncate_college_knowledge
from backend.config.settings import COLLEGE_KNOWLEDGE_PATH
from backend.core.rag import generate_embedding

# Chunking (same as original ingest)
MAX_CHUNK_CHARS = 700
OVERLAP_CHARS = 80
SECTION_SEP = "________________________________________"


def _strip_comments(content: str) -> str:
    """Remove leading comment lines (# or <!-- ... -->)."""
    lines = []
    in_comment = False
    for line in content.splitlines():
        s = line.strip()
        if s.startswith("<!--"):
            in_comment = True
        if in_comment:
            if "-->" in s:
                in_comment = False
            continue
        if s.startswith("#") and not s.startswith("# "):
            continue
        lines.append(line)
    return "\n".join(lines)


def _split_into_chunks(text: str) -> list[str]:
    """
    Split text into chunks: first by section separator, then by size with overlap.
    Preserves meaningful boundaries (paragraphs) where possible.
    """
    normalized = text.replace("\r\n", "\n").strip()
    sections = re.split(re.escape(SECTION_SEP), normalized)
    sections = [s.strip() for s in sections if s.strip()]

    chunks = []
    for section in sections:
        parts = re.split(r"\n\s*\n", section)
        current = []
        current_len = 0
        for part in parts:
            part = part.strip()
            if not part:
                continue
            part_len = len(part) + (2 if current else 0)
            if current_len + part_len <= MAX_CHUNK_CHARS and current:
                current.append(part)
                current_len += part_len
            else:
                if current:
                    chunk_text = "\n\n".join(current)
                    chunks.append(chunk_text)
                    if len(chunk_text) > OVERLAP_CHARS:
                        overlap = chunk_text[-OVERLAP_CHARS:].split("\n", 1)[-1]
                        current = [overlap.strip()] if overlap.strip() else []
                        current_len = len(current[0]) if current else 0
                    else:
                        current = []
                        current_len = 0
                if current:
                    current.append(part)
                    current_len = len("\n\n".join(current))
                else:
                    current = [part]
                    current_len = len(part)
        if current:
            chunks.append("\n\n".join(current))
    return [c for c in chunks if c.strip()]


def main() -> None:
    path = Path(COLLEGE_KNOWLEDGE_PATH)
    if not path.is_file():
        print(f"Error: College knowledge file not found: {path}")
        sys.exit(1)

    content = path.read_text(encoding="utf-8")
    content = _strip_comments(content)
    chunks = _split_into_chunks(content)
    if not chunks:
        print("Error: No chunks produced. Check file content.")
        sys.exit(1)

    if not truncate_college_knowledge():
        print("Error: Could not truncate college_knowledge table. Check PostgreSQL.")
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
