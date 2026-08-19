"""M5.3 — local semantic path has no network; parse+select is cheap."""

from __future__ import annotations

import time
import unittest

from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units


class TestM53SemanticLatency(unittest.TestCase):
    def test_parse_and_select_is_local_and_fast(self) -> None:
        raw = "Who is the HOD of CSE Data Science?"
        t0 = time.perf_counter()
        for _ in range(50):
            req = parse_semantic_request(raw_text=raw, language_code_key="en")
            self.assertIsNotNone(req)
            assert req is not None
            plan = select_content_units(req)
            self.assertIsNotNone(plan)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        self.assertLess(elapsed_ms, 500.0, msg=f"50 parse+select took {elapsed_ms:.1f}ms")
