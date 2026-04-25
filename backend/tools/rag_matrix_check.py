"""Category x language RAG sanity matrix for CLARA."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.core.rag import get_relevant_context


QUERY_MATRIX = {
    "en": {
        "admissions": "What is the admission process at SVIT?",
        "fees": "What are fees for engineering courses at SVIT?",
        "documents": "What documents are required for admission?",
        "hod": "Who is the HOD of Computer Science department?",
        "placements": "How are placements at SVIT?",
        "overview": "Give me a college overview of SVIT.",
    },
    "hi": {
        "admissions": "SVIT mein admission process kya hai?",
        "fees": "SVIT engineering fees kya hai?",
        "documents": "Admission ke liye kaunse documents chahiye?",
        "hod": "Computer Science department ke HOD kaun hain?",
        "placements": "SVIT placements kaise hain?",
        "overview": "SVIT ka college overview batao.",
    },
    "kn": {
        "admissions": "SVIT admission process enu?",
        "fees": "SVIT engineering fees eshtu?",
        "documents": "Admission ge yava documents beku?",
        "hod": "CSE department HOD yaaru?",
        "placements": "SVIT placements hegide?",
        "overview": "SVIT college overview kodi.",
    },
    "ta": {
        "admissions": "SVIT admission process enna?",
        "fees": "SVIT engineering fees evvalavu?",
        "documents": "Admission-ku enna documents venum?",
        "hod": "CSE department HOD yaar?",
        "placements": "SVIT placements eppadi?",
        "overview": "SVIT college overview sollunga.",
    },
    "te": {
        "admissions": "SVIT admission process emiti?",
        "fees": "SVIT engineering fees entha?",
        "documents": "Admission ki ye documents kavali?",
        "hod": "CSE department HOD evaru?",
        "placements": "SVIT placements ela unnayi?",
        "overview": "SVIT college overview cheppandi.",
    },
    "ml": {
        "admissions": "SVIT admission process enthaanu?",
        "fees": "SVIT engineering fees ethra aanu?",
        "documents": "Admissioninu entha documents venam?",
        "hod": "CSE department HOD aaranu?",
        "placements": "SVIT placements engane aanu?",
        "overview": "SVIT college overview parayu.",
    },
}


def main() -> None:
    results: dict[str, dict[str, dict[str, object]]] = {}
    for lang, categories in QUERY_MATRIX.items():
        lang_res: dict[str, dict[str, object]] = {}
        for category, query in categories.items():
            context = get_relevant_context(query, top_k=4, max_tokens=1500, lang_key=lang)
            lang_res[category] = {
                "has_context": bool(context.strip()),
                "context_chars": len(context),
                "preview": context[:160].replace("\n", " "),
            }
        results[lang] = lang_res
    print(json.dumps(results, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
