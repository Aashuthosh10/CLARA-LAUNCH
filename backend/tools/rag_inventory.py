"""Quick inventory of college_knowledge coverage by source/language."""

from __future__ import annotations

import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.clients.database import run_query


def main() -> None:
    q = """
    SELECT
      COALESCE(metadata->>'source', 'unknown') AS source,
      COALESCE(metadata->>'language', 'unknown') AS language,
      COUNT(*) AS row_count
    FROM college_knowledge
    GROUP BY 1, 2
    ORDER BY 1, 2
    """
    rows = run_query(q, fetch=True) or []
    print("source\tlanguage\trow_count")
    for source, language, row_count in rows:
        print(f"{source}\t{language}\t{row_count}")


if __name__ == "__main__":
    main()
