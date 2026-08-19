"""M5.5 fail-closed semantic proposal validation. No live Groq."""

from __future__ import annotations

import unittest

from backend.services.conversation.semantic_proposal_validator import (
    extract_json_object,
    validate_semantic_proposal,
)


def _ok(**kwargs):
    body = {
        "domain": "institution",
        "mode_hint": "ANSWER",
        "items": [],
        "scope": "single",
        "clarification_target": "none",
        "clarification_reason": "none",
        "answer_topic": "",
        "confidence": "HIGH",
    }
    body.update(kwargs)
    return body


class TestExtractJson(unittest.TestCase):
    def test_plain_object(self) -> None:
        obj, err = extract_json_object('{"domain": "institution"}')
        self.assertIsNone(err)
        self.assertEqual(obj["domain"], "institution")

    def test_fenced(self) -> None:
        obj, err = extract_json_object('```json\n{"domain": "unknown"}\n```')
        self.assertIsNone(err)
        self.assertEqual(obj["domain"], "unknown")

    def test_garbage(self) -> None:
        obj, err = extract_json_object("not json")
        self.assertIsNone(obj)
        self.assertEqual(err, "json_decode_error")


class TestValidateSemanticProposal(unittest.TestCase):
    def test_accepts_institutional_answer(self) -> None:
        result = validate_semantic_proposal(_ok(), utterance="How good are the teachers here?")
        self.assertEqual(result.status, "accepted")
        self.assertIsNotNone(result.proposal)
        self.assertEqual(result.proposal.mode_hint.value, "ANSWER")

    def test_rejects_unitid_key(self) -> None:
        raw = _ok(unitId="cse_ds.hod")
        result = validate_semantic_proposal(raw, utterance="Who is the HOD of Data Science?")
        self.assertEqual(result.status, "rejected")
        self.assertIn("forbidden_key", result.reject_reason or "")
        self.assertIsNone(result.proposal)

    def test_rejects_unitid_shaped_item(self) -> None:
        raw = _ok(
            mode_hint="CARD",
            items=[{"entity": "cse_ds.hod", "topic": "hod"}],
        )
        result = validate_semantic_proposal(raw, utterance="Who is the HOD of Data Science?")
        self.assertEqual(result.status, "rejected")
        self.assertEqual(result.reject_reason, "unitid_shaped_item")

    def test_rejects_invented_entity(self) -> None:
        raw = _ok(
            mode_hint="CARD",
            items=[{"entity": "cse_quantum", "topic": "hod"}],
        )
        result = validate_semantic_proposal(raw, utterance="Quantum HOD")
        self.assertEqual(result.status, "rejected")
        self.assertEqual(result.reject_reason, "invented_entity")

    def test_rejects_invented_topic(self) -> None:
        raw = _ok(
            mode_hint="CARD",
            items=[{"entity": "cse_ds", "topic": "vibe"}],
        )
        result = validate_semantic_proposal(raw, utterance="Data Science vibe")
        self.assertEqual(result.status, "rejected")
        self.assertEqual(result.reject_reason, "invented_topic")

    def test_rejects_cse_leak_beside_cse_ds(self) -> None:
        raw = _ok(
            mode_hint="CARD",
            items=[
                {"entity": "cse_ds", "topic": "hod"},
                {"entity": "cse", "topic": "hod"},
            ],
        )
        result = validate_semantic_proposal(raw, utterance="CSE Data Science HOD")
        self.assertEqual(result.status, "rejected")
        self.assertEqual(result.reject_reason, "entity_not_in_utterance_spans")

    def test_accepts_exclusive_cse_ds(self) -> None:
        raw = _ok(
            mode_hint="CARD",
            items=[{"entity": "cse_ds", "topic": "hod"}],
        )
        result = validate_semantic_proposal(raw, utterance="Who is the HOD of CSE Data Science?")
        self.assertEqual(result.status, "accepted")
        self.assertEqual(result.proposal.items, (("cse_ds", "hod"),))

    def test_rejects_scope_multi(self) -> None:
        result = validate_semantic_proposal(_ok(scope="multi"), utterance="campus life")
        self.assertEqual(result.status, "rejected")
        self.assertEqual(result.reject_reason, "invalid_scope")

    def test_rejects_low_confidence(self) -> None:
        result = validate_semantic_proposal(_ok(confidence="LOW"), utterance="campus life")
        self.assertEqual(result.status, "rejected")
        self.assertEqual(result.reject_reason, "low_confidence")

    def test_rejects_card_without_items(self) -> None:
        result = validate_semantic_proposal(_ok(mode_hint="CARD", items=[]), utterance="HOD")
        self.assertEqual(result.status, "rejected")
        self.assertEqual(result.reject_reason, "card_without_items")

    def test_rejects_extra_keys(self) -> None:
        raw = _ok(showCard="department")
        result = validate_semantic_proposal(raw, utterance="Data Science")
        self.assertEqual(result.status, "rejected")
        self.assertIn("forbidden_key", result.reject_reason or "")

    def test_does_not_repair_malformed_json(self) -> None:
        result = validate_semantic_proposal(None, utterance="x", parse_error="json_decode_error")
        self.assertEqual(result.status, "rejected")
        self.assertIsNone(result.proposal)


if __name__ == "__main__":
    unittest.main()
