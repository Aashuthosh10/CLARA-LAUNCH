"""Multilingual RAG retrieval sanity check (en/hi/kn/ta/te/ml)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.core.rag import get_relevant_context


TEST_QUERIES = {
    "en": "What is the admission process at SVIT?",
    "hi": "SVIT में admission process क्या है?",
    "kn": "SVIT admission process enu?",
    "ta": "SVIT admission process என்ன?",
    "te": "SVIT admission process ఏమిటి?",
    "ml": "SVIT admission process എന്താണ്?",
}


def main() -> None:
    out: dict[str, dict[str, object]] = {}
    for lang, query in TEST_QUERIES.items():
        context = get_relevant_context(query, top_k=4, max_tokens=1200, lang_key=lang)
        out[lang] = {
            "query": query,
            "context_chars": len(context),
            "has_context": bool(context.strip()),
            "preview": context[:220].replace("\n", " "),
        }
    print(json.dumps(out, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
