"""Deterministic scoring for the isolated M5.5 semantic-router benchmark.

Does not import production CLARA modules. Does not repair model output.
"""

from __future__ import annotations

import json
import re
from copy import deepcopy
from typing import Any

MODES = frozenset({"CARD", "ANSWER", "CLARIFY", "FALLBACK"})
SCOPES = frozenset({"single", "full_department"})
CONFIDENCE = frozenset({"HIGH", "MEDIUM", "LOW"})
ALLOWED_KEYS = frozenset(
    {
        "mode",
        "items",
        "scope",
        "clarification_target",
        "clarification_reason",
        "confidence",
    }
)
FORBIDDEN_KEYS = frozenset(
    {
        "unitId",
        "unitid",
        "unit_id",
        "showCard",
        "surface",
        "narration",
        "tts",
        "facts",
    }
)

FAILURE_CATEGORIES = (
    "SCHEMA_ERROR",
    "HALLUCINATION",
    "ENTITY_ERROR",
    "TOPIC_ERROR",
    "PAIRING_ERROR",
    "ORDER_ERROR",
    "MODE_ERROR",
    "MULTILINGUAL_ERROR",
    "ROMANIZATION_ERROR",
    "FALLBACK_ERROR",
    "CLARIFICATION_ERROR",
    "OTHER",
)


def load_registry(path) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def extract_json_object(text: str) -> tuple[dict[str, Any] | None, str | None]:
    if not text or not str(text).strip():
        return None, "empty_content"
    raw = str(text).strip()
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.S)
    if fence:
        raw = fence.group(1)
    else:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            raw = raw[start : end + 1]
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        return None, "json_decode_error"
    if not isinstance(obj, dict):
        return None, "not_an_object"
    return obj, None


def _norm_item(item: Any) -> tuple[str, str] | None:
    if not isinstance(item, dict):
        return None
    entity = item.get("entity")
    topic = item.get("topic")
    if not isinstance(entity, str) or not isinstance(topic, str):
        return None
    return entity.strip().lower(), topic.strip().lower()


def validate_raw(
    raw_obj: dict[str, Any] | None,
    parse_error: str | None,
    registry: dict[str, Any],
) -> dict[str, Any]:
    """Return validated view without repairing missing/wrong bindings."""
    entities = set(registry["entities"])
    topics = set(registry["topics"])
    result: dict[str, Any] = {
        "schema_valid": False,
        "parse_error": parse_error,
        "forbidden_keys": [],
        "extra_keys": [],
        "invented_entities": [],
        "invented_topics": [],
        "unitid_attempt": False,
        "mode": None,
        "items": [],
        "dropped_items": [],
        "scope": None,
        "confidence": None,
        "clarification_target": None,
        "clarification_reason": None,
        "verbose": False,
    }
    if raw_obj is None:
        return result

    forbidden = [k for k in raw_obj.keys() if k in FORBIDDEN_KEYS or k.lower() == "unitid"]
    extra = [k for k in raw_obj.keys() if k not in ALLOWED_KEYS]
    result["forbidden_keys"] = forbidden
    result["extra_keys"] = extra
    result["unitid_attempt"] = bool(forbidden) or any(
        "." in str(v) for v in _walk_strings(raw_obj) if "unit" in str(v).lower() or re.search(r"\b\w+\.\w+", str(v))
    )

    mode = raw_obj.get("mode")
    scope = raw_obj.get("scope")
    confidence = raw_obj.get("confidence")
    items_in = raw_obj.get("items", [])
    schema_ok = (
        mode in MODES
        and scope in SCOPES
        and confidence in CONFIDENCE
        and isinstance(items_in, list)
        and not forbidden
        and parse_error is None
    )
    result["mode"] = mode if mode in MODES else None
    result["scope"] = scope if scope in SCOPES else None
    result["confidence"] = confidence if confidence in CONFIDENCE else None
    result["clarification_target"] = raw_obj.get("clarification_target")
    result["clarification_reason"] = raw_obj.get("clarification_reason")

    kept: list[dict[str, str]] = []
    dropped: list[dict[str, Any]] = []
    invented_e: list[str] = []
    invented_t: list[str] = []
    if isinstance(items_in, list):
        for item in items_in:
            pair = _norm_item(item)
            if pair is None:
                dropped.append({"item": item, "reason": "malformed_item"})
                schema_ok = False
                continue
            entity, topic = pair
            if "." in entity or "." in topic:
                result["unitid_attempt"] = True
                dropped.append({"item": {"entity": entity, "topic": topic}, "reason": "unitid_like"})
                continue
            if entity not in entities:
                invented_e.append(entity)
                dropped.append({"item": {"entity": entity, "topic": topic}, "reason": "invented_entity"})
                continue
            if topic not in topics:
                invented_t.append(topic)
                dropped.append({"item": {"entity": entity, "topic": topic}, "reason": "invented_topic"})
                continue
            kept.append({"entity": entity, "topic": topic})
    result["items"] = kept
    result["dropped_items"] = dropped
    result["invented_entities"] = invented_e
    result["invented_topics"] = invented_t
    result["schema_valid"] = bool(schema_ok)
    return result


def _walk_strings(obj: Any) -> list[str]:
    out: list[str] = []
    if isinstance(obj, str):
        return [obj]
    if isinstance(obj, dict):
        for v in obj.values():
            out.extend(_walk_strings(v))
    elif isinstance(obj, list):
        for v in obj:
            out.extend(_walk_strings(v))
    return out


def expected_pairs(expected: dict[str, Any]) -> list[tuple[str, str]]:
    return [(_norm_item(i) or ("", "")) for i in expected.get("items", [])]


def score_case(
    case: dict[str, Any],
    raw_obj: dict[str, Any] | None,
    parse_error: str | None,
    registry: dict[str, Any],
    raw_text: str = "",
) -> dict[str, Any]:
    expected = case["expected"]
    validated = validate_raw(raw_obj, parse_error, registry)
    exp_mode = expected["mode"]
    exp_items = expected_pairs(expected)
    got_items = [(i["entity"], i["topic"]) for i in validated["items"]]
    tags = set(case.get("tags") or [])

    mode_ok = validated["mode"] == exp_mode
    items_exact = got_items == exp_items
    items_set_ok = set(got_items) == set(exp_items)
    order_ok = True
    if len(exp_items) > 1:
        order_ok = items_exact
    elif len(exp_items) <= 1:
        order_ok = True

    exp_entities = [e for e, _ in exp_items]
    got_entities = [e for e, _ in got_items]
    exp_topics = [t for _, t in exp_items]
    got_topics = [t for _, t in got_items]
    entity_ok = got_entities == exp_entities
    topic_ok = got_topics == exp_topics
    pairing_ok = items_exact

    must_not_entities = set(case.get("must_not_entities") or [])
    leaked_forbidden_entity = bool(must_not_entities.intersection(got_entities))
    unitid_fail = bool(validated["unitid_attempt"])
    for needle in case.get("must_not_contain") or []:
        blob = json.dumps(raw_obj, ensure_ascii=False) if raw_obj else (raw_text or "")
        if needle in blob:
            if "." in needle:
                unitid_fail = True
            if needle == "unitId" and raw_obj and any(k.lower() == "unitid" for k in raw_obj):
                unitid_fail = True

    semantic_ok = mode_ok and items_exact and not unitid_fail and not leaked_forbidden_entity

    failures: list[str] = []
    if parse_error or not validated["schema_valid"]:
        failures.append("SCHEMA_ERROR")
    if validated["invented_entities"] or validated["invented_topics"] or unitid_fail:
        failures.append("HALLUCINATION")
    if not entity_ok or leaked_forbidden_entity:
        failures.append("ENTITY_ERROR")
    if not topic_ok:
        failures.append("TOPIC_ERROR")
    if not pairing_ok:
        failures.append("PAIRING_ERROR")
    if len(exp_items) > 1 and not order_ok:
        failures.append("ORDER_ERROR")
    if not mode_ok:
        failures.append("MODE_ERROR")
        if exp_mode == "FALLBACK":
            failures.append("FALLBACK_ERROR")
        if exp_mode == "CLARIFY":
            failures.append("CLARIFICATION_ERROR")
        if exp_mode == "ANSWER" and validated["mode"] == "FALLBACK":
            failures.append("FALLBACK_ERROR")
    if not semantic_ok and ("multilingual" in tags or "native_script" in tags):
        failures.append("MULTILINGUAL_ERROR")
    if not semantic_ok and "romanized" in tags:
        failures.append("ROMANIZATION_ERROR")
    if not semantic_ok and not failures:
        failures.append("OTHER")

    return {
        "id": case["id"],
        "category": case.get("category"),
        "language": case.get("language"),
        "tags": case.get("tags") or [],
        "input": case["input"],
        "expected": expected,
        "raw_output": raw_obj,
        "parse_error": parse_error,
        "validated_output": {
            "mode": validated["mode"],
            "items": validated["items"],
            "scope": validated["scope"],
            "confidence": validated["confidence"],
            "clarification_target": validated["clarification_target"],
            "clarification_reason": validated["clarification_reason"],
            "schema_valid": validated["schema_valid"],
            "dropped_items": validated["dropped_items"],
            "invented_entities": validated["invented_entities"],
            "invented_topics": validated["invented_topics"],
            "unitid_attempt": validated["unitid_attempt"],
            "extra_keys": validated["extra_keys"],
            "forbidden_keys": validated["forbidden_keys"],
        },
        "pass": {
            "semantic": semantic_ok,
            "mode": mode_ok,
            "entity": entity_ok and not leaked_forbidden_entity,
            "topic": topic_ok,
            "pairing": pairing_ok,
            "order": order_ok,
            "schema": validated["schema_valid"] and parse_error is None,
            "no_hallucination": not (
                validated["invented_entities"] or validated["invented_topics"] or unitid_fail
            ),
        },
        "failures": failures,
        "leaked_forbidden_entity": leaked_forbidden_entity,
    }


def percentile(values: list[float], p: float) -> float | None:
    if not values:
        return None
    xs = sorted(values)
    if len(xs) == 1:
        return xs[0]
    k = (len(xs) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(xs) - 1)
    if f == c:
        return xs[f]
    return xs[f] + (xs[c] - xs[f]) * (k - f)


def aggregate(runs: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(runs) or 1

    def rate(key: str) -> float:
        return sum(1 for r in runs if r["pass"][key]) / n

    by_cat: dict[str, list[dict[str, Any]]] = {}
    by_lang: dict[str, list[dict[str, Any]]] = {}
    by_tag: dict[str, list[dict[str, Any]]] = {}
    fail_counts: dict[str, int] = {c: 0 for c in FAILURE_CATEGORIES}
    for r in runs:
        by_cat.setdefault(r["category"], []).append(r)
        by_lang.setdefault(r["language"], []).append(r)
        for t in r["tags"]:
            by_tag.setdefault(t, []).append(r)
        for f in r["failures"]:
            fail_counts[f] = fail_counts.get(f, 0) + 1

    def subset_rate(rows: list[dict[str, Any]], key: str = "semantic") -> float:
        if not rows:
            return 0.0
        return sum(1 for r in rows if r["pass"][key]) / len(rows)

    multilingual = [r for r in runs if "multilingual" in r["tags"]]
    romanized = [r for r in runs if "romanized" in r["tags"]]
    code_switch = [r for r in runs if "code_switch" in r["tags"]]
    multi_card = [r for r in runs if "multi_card" in r["tags"]]
    entity_rows = [r for r in runs if "entity" in r["tags"] or r["category"] == "entity"]
    topic_rows = [r for r in runs if "topic" in r["tags"] or r["category"] == "topic"]

    semantic = rate("semantic")
    entity_topic = (rate("entity") + rate("topic")) / 2.0
    multi_lang = subset_rate(multilingual)
    multi_comp = subset_rate(multi_card)
    mode = rate("mode")
    overall = (
        0.30 * semantic
        + 0.25 * entity_topic
        + 0.20 * multi_lang
        + 0.15 * multi_comp
        + 0.10 * mode
    )
    return {
        "n": len(runs),
        "rates": {
            "semantic": semantic,
            "mode": mode,
            "entity": rate("entity"),
            "topic": rate("topic"),
            "pairing": rate("pairing"),
            "order": rate("order"),
            "schema": rate("schema"),
            "no_hallucination": rate("no_hallucination"),
            "multilingual": multi_lang,
            "romanized": subset_rate(romanized),
            "code_switch": subset_rate(code_switch),
            "multi_card": multi_comp,
            "clarify": subset_rate([r for r in runs if r["category"] == "clarify"]),
            "fallback": subset_rate([r for r in runs if r["category"] == "fallback"]),
            "answer": subset_rate([r for r in runs if r["category"] == "answer"]),
            "adversarial": subset_rate([r for r in runs if r["category"] == "adversarial"]),
            "entity_cases": subset_rate(entity_rows),
            "topic_cases": subset_rate(topic_rows),
        },
        "overall_semantic_score": overall,
        "weights": {
            "semantic_correctness": 0.30,
            "entity_topic_accuracy": 0.25,
            "multilingual_code_switching": 0.20,
            "multi_card_composition": 0.15,
            "mode_classification": 0.10,
        },
        "by_category": {k: {"n": len(v), "semantic": subset_rate(v)} for k, v in sorted(by_cat.items())},
        "by_language": {k: {"n": len(v), "semantic": subset_rate(v)} for k, v in sorted(by_lang.items())},
        "failure_counts": fail_counts,
    }
