"""Content hash stability tests."""

from __future__ import annotations

import unittest

from backend.services.content.types import ContentSection
from backend.services.content.validators import compute_content_hash


class TestContentHash(unittest.TestCase):
    def test_same_input_same_hash(self) -> None:
        sections = (ContentSection(id="a", title="A", body="hello"),)
        kwargs = dict(
            title="T",
            subtitle="S",
            summary="Sum",
            sections=sections,
            language_code="en",
            surface="documents",
            canonical_source="src",
        )
        h1 = compute_content_hash(**kwargs)
        h2 = compute_content_hash(**kwargs)
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 32)

    def test_field_change_different_hash(self) -> None:
        sections = (ContentSection(id="a", title="A", body="hello"),)
        base = dict(
            title="T",
            subtitle="S",
            summary="Sum",
            sections=sections,
            language_code="en",
            surface="documents",
            canonical_source="src",
        )
        h1 = compute_content_hash(**base)
        h2 = compute_content_hash(**{**base, "title": "T2"})
        self.assertNotEqual(h1, h2)


if __name__ == "__main__":
    unittest.main()
