"""CanonicalContent validator tests."""

from __future__ import annotations

import unittest

from backend.services.content.types import CanonicalContent, ContentSection
from backend.services.content.validators import compute_content_hash, validate_canonical_content


def _content(**overrides: object) -> CanonicalContent:
    sections = (
        ContentSection(id="a", title="A", body="body a"),
        ContentSection(id="b", title="B", body="body b"),
    )
    base = dict(
        content_id="test:1",
        content_type="fees",
        surface="department_fees",
        language="English",
        language_code="en",
        title="Fees",
        subtitle="",
        summary="Fee summary",
        sections=sections,
        metadata={},
        keywords=("fees",),
        presentation_mode="CARD_PRESENTATION",
        canonical_source="test#source",
        version="m4.0",
        hash="",
        created_at="2026-01-01T00:00:00+00:00",
    )
    base.update(overrides)
    if not base.get("hash"):
        base["hash"] = compute_content_hash(
            title=str(base["title"]),
            subtitle=str(base["subtitle"]),
            summary=str(base["summary"]),
            sections=base["sections"],  # type: ignore[arg-type]
            language_code=str(base["language_code"]),
            surface=str(base["surface"]),
            canonical_source=str(base["canonical_source"]),
        )
    return CanonicalContent(**base)  # type: ignore[arg-type]


class TestContentValidators(unittest.TestCase):
    def test_valid_content_passes(self) -> None:
        result = validate_canonical_content(_content())
        self.assertTrue(result.ok)
        self.assertEqual(result.failures, [])

    def test_missing_title_fails(self) -> None:
        result = validate_canonical_content(_content(title=""))
        self.assertFalse(result.ok)
        self.assertIn("missing_title", result.failures)

    def test_duplicate_section_ids_fail(self) -> None:
        sections = (
            ContentSection(id="dup", title="A", body="1"),
            ContentSection(id="dup", title="B", body="2"),
        )
        result = validate_canonical_content(_content(sections=sections, hash=""))
        self.assertFalse(result.ok)
        self.assertTrue(any(f.startswith("duplicate_section_id:") for f in result.failures))


if __name__ == "__main__":
    unittest.main()
