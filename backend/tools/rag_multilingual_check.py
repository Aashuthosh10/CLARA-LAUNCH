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
    "hi": "SVIT \u092e\u0947\u0902 admission process \u0915\u094d\u092f\u093e \u0939\u0948?",
    "kn": "SVIT admission process enu?",
    "ta": "SVIT admission process \u0b8e\u0ba9\u0bcd\u0ba9?",
    "te": "SVIT admission process \u0c0f\u0c2e\u0c3f\u0c1f\u0c3f?",
    "ml": "SVIT admission process \u0d0e\u0d28\u0d4d\u0d24\u0d3e\u0d23\u0d4d?",
}


def main() -> int:
    out: dict[str, dict[str, object]] = {}
    failed: list[str] = []
    for lang, query in TEST_QUERIES.items():
        context = get_relevant_context(query, top_k=4, max_tokens=1200, lang_key=lang)
        has_context = bool(context.strip())
        if not has_context:
            failed.append(lang)
        out[lang] = {
            "query": query,
            "context_chars": len(context),
            "has_context": has_context,
            "preview": context[:220].replace("\n", " "),
        }
    print(json.dumps(out, ensure_ascii=True, indent=2))
    if failed:
        print(f"FAIL: missing RAG context for language(s): {', '.join(failed)}")
        return 1
    print("OK: multilingual RAG returned context for all target languages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
