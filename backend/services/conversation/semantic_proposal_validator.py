"""Fail-closed validation of an LLM semantic proposal.

Does not repair invented entities, topics, or unitIds into canonical pairs.
Dropped unknown items are recorded; a CARD hint with no surviving items is rejected.
"""

from __future__ import annotations

import json
import re
from typing import Any

from backend.services.answer_generation import DEPARTMENT_JSON_KEY_ORDER
from backend.services.content.department_identity import match_department_spans_exclusive
from backend.services.conversation.response_decision import DomainRelevance, ResponseMode
from backend.services.conversation.semantic_proposal import (
    ALLOWED_CLARIFY_REASONS,
    ALLOWED_CLARIFY_TARGETS,
    ALLOWED_PROPOSAL_KEYS,
    ALLOWED_SCOPES,
    CANONICAL_TOPICS,
    FORBIDDEN_PROPOSAL_KEYS,
    ProposalValidationResult,
    SemanticProposal,
)

_UNITID_SHAPE = re.compile(r"\.")


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


def _reject(reason: str, raw: dict[str, Any] | None = None) -> ProposalValidationResult:
    return ProposalValidationResult(
        proposal=None,
        status="rejected",
        reject_reason=reason,
        raw=raw,
    )


def _validate_items(
    items_in: Any,
    *,
    utterance: str,
) -> tuple[tuple[tuple[str, str], ...], str | None]:
    if not isinstance(items_in, list):
        return (), "items_not_a_list"
    kept: list[tuple[str, str]] = []
    utterance_keys = {span.json_key for span in match_department_spans_exclusive(utterance or "")}
    registry = set(DEPARTMENT_JSON_KEY_ORDER)

    for item in items_in:
        if not isinstance(item, dict):
            return (), "malformed_item"
        entity = item.get("entity")
        topic = item.get("topic")
        if not isinstance(entity, str) or not isinstance(topic, str):
            return (), "malformed_item"
        entity = entity.strip().lower()
        topic = topic.strip().lower()
        if not entity or not topic:
            return (), "malformed_item"
        if _UNITID_SHAPE.search(entity) or _UNITID_SHAPE.search(topic):
            return (), "unitid_shaped_item"
        if entity not in registry:
            return (), "invented_entity"
        if topic not in CANONICAL_TOPICS:
            return (), "invented_topic"
        if utterance_keys and entity not in utterance_keys:
            return (), "entity_not_in_utterance_spans"
        kept.append((entity, topic))

    if utterance_keys and kept:
        leaked = {entity for entity, _ in kept} - utterance_keys
        if leaked:
            return (), "entity_span_leak"
    return tuple(kept), None


def validate_semantic_proposal(
    raw_obj: dict[str, Any] | None,
    *,
    utterance: str,
    parse_error: str | None = None,
) -> ProposalValidationResult:
    """Accept a proposal or discard it. Never rewrite it into a valid one."""
    if parse_error:
        return _reject(parse_error, raw_obj if isinstance(raw_obj, dict) else None)
    if not isinstance(raw_obj, dict):
        return _reject("not_an_object")

    forbidden = [k for k in raw_obj if k in FORBIDDEN_PROPOSAL_KEYS or str(k).lower() == "unitid"]
    if forbidden:
        return _reject("forbidden_key:" + ",".join(sorted(str(k) for k in forbidden)), raw_obj)

    extra = [k for k in raw_obj if k not in ALLOWED_PROPOSAL_KEYS]
    if extra:
        return _reject("extra_keys:" + ",".join(sorted(str(k) for k in extra)), raw_obj)

    domain_raw = raw_obj.get("domain")
    mode_raw = raw_obj.get("mode_hint")
    scope = raw_obj.get("scope", "single")
    confidence = raw_obj.get("confidence")
    if domain_raw not in {d.value for d in DomainRelevance}:
        return _reject("invalid_domain", raw_obj)
    if mode_raw not in {m.value for m in ResponseMode}:
        return _reject("invalid_mode_hint", raw_obj)
    if scope == "multi" or scope not in ALLOWED_SCOPES:
        return _reject("invalid_scope", raw_obj)
    if confidence not in {"HIGH", "MEDIUM", "LOW"}:
        return _reject("invalid_confidence", raw_obj)
    if confidence == "LOW":
        return _reject("low_confidence", raw_obj)

    target = raw_obj.get("clarification_target", "none")
    reason = raw_obj.get("clarification_reason", "none")
    if target not in ALLOWED_CLARIFY_TARGETS:
        return _reject("invalid_clarification_target", raw_obj)
    if reason not in ALLOWED_CLARIFY_REASONS:
        return _reject("invalid_clarification_reason", raw_obj)

    answer_topic = raw_obj.get("answer_topic", "")
    if answer_topic is None:
        answer_topic = ""
    if not isinstance(answer_topic, str):
        return _reject("invalid_answer_topic", raw_obj)

    items, item_error = _validate_items(raw_obj.get("items", []), utterance=utterance)
    if item_error:
        return _reject(item_error, raw_obj)

    if mode_raw == "CARD" and not items:
        return _reject("card_without_items", raw_obj)

    proposal = SemanticProposal(
        domain=DomainRelevance(domain_raw),
        mode_hint=ResponseMode(mode_raw),
        items=items,
        scope=str(scope),
        clarification_target=None if target == "none" else str(target),
        clarification_reason=None if reason == "none" else str(reason),
        answer_topic=answer_topic.strip(),
        confidence=confidence,  # type: ignore[arg-type]
        diagnostics={"raw_keys": sorted(raw_obj.keys())},
    )
    return ProposalValidationResult(
        proposal=proposal,
        status="accepted",
        reject_reason=None,
        raw=raw_obj,
    )
