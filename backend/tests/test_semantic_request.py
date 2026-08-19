from __future__ import annotations

import unittest

from backend.services.content.multilingual_terms import (
    TOPIC_FEES,
    TOPIC_HOD,
    TOPIC_OVERVIEW,
    TOPIC_PLACEMENTS,
)
from backend.services.content.semantic_request_parser import parse_semantic_request


class TestSemanticRequestParser(unittest.TestCase):
    def test_overview_full_vs_single_scope(self) -> None:
        full = parse_semantic_request(
            raw_text="Tell me about CSE",
            language_code_key="en",
        )
        self.assertIsNotNone(full)
        assert full is not None
        self.assertEqual(full.topic, TOPIC_OVERVIEW)
        self.assertEqual(full.requested_scope, "full_department")
        self.assertEqual(full.entities, ("cse",))

        single = parse_semantic_request(
            raw_text="CSE overview",
            language_code_key="en",
        )
        self.assertIsNotNone(single)
        assert single is not None
        self.assertEqual(single.topic, TOPIC_OVERVIEW)
        self.assertEqual(single.requested_scope, "single")
        self.assertEqual(single.entities, ("cse",))

    def test_atomic_topic_fees(self) -> None:
        req = parse_semantic_request(raw_text="CSE fees", language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, TOPIC_FEES)
        self.assertEqual(req.requested_scope, "single")
        self.assertEqual(req.entities, ("cse",))

    def test_atomic_topic_hod(self) -> None:
        req = parse_semantic_request(raw_text="Who is the HOD of CSE?", language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, TOPIC_HOD)
        self.assertEqual(req.requested_scope, "single")
        self.assertEqual(req.entities, ("cse",))

    def test_atomic_topic_placements(self) -> None:
        req = parse_semantic_request(raw_text="CSE placements", language_code_key="en")
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, TOPIC_PLACEMENTS)
        self.assertEqual(req.requested_scope, "single")
        self.assertEqual(req.entities, ("cse",))

    def test_multi_entity_hod_selector_level(self) -> None:
        # Kannada-ish code-switching: "mattu" = and, "yaaru" = who.
        req = parse_semantic_request(
            raw_text="CSE mattu AIML HOD yaaru?",
            language_code_key="kn",
        )
        self.assertIsNotNone(req)
        assert req is not None
        self.assertEqual(req.topic, TOPIC_HOD)
        # Multi-entity capability should be semantic (order preserved).
        self.assertEqual(req.entities, ("cse", "cse_aiml"))

    def test_unknown_topic_returns_none(self) -> None:
        req = parse_semantic_request(raw_text="CSE bus routes", language_code_key="en")
        self.assertIsNone(req)

