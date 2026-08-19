"""M5.0 — ContentUnit model, registry, resolver, and context identity tests."""

from __future__ import annotations

import unittest

from backend.services.content.content_unit_registry import (
    all_unit_descriptors,
    get_unit_descriptor,
    list_department_unit_descriptors,
    unit_id_for,
)
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.resolver import ContentResolver
from backend.services.content.surface_narration_mapper import extract_department_units
from backend.services.content.types import SURFACE_DEPARTMENT_OVERVIEW, ResolveRequest
from backend.services.content.validators import compute_unit_hash, validate_content_unit


class TestDepartmentUnits(unittest.TestCase):
    def test_cse_five_independent_units(self) -> None:
        descriptors = list_department_unit_descriptors("cse")
        self.assertEqual(len(descriptors), 5)
        unit_ids = [d.unit_id for d in descriptors]
        self.assertEqual(
            unit_ids,
            [
                "cse.overview",
                "cse.hod",
                "cse.achievements",
                "cse.placements",
                "cse.fees",
            ],
        )

    def test_unique_unit_id_per_section(self) -> None:
        ids = [d.unit_id for d in all_unit_descriptors()]
        self.assertEqual(len(ids), len(set(ids)))

    def test_stable_section_id_mapping(self) -> None:
        self.assertEqual(unit_id_for("cse", "hod_voice"), "cse.hod")
        self.assertEqual(unit_id_for("cse", "fees"), "cse.fees")

    def test_body_matches_content_resolver(self) -> None:
        content = ContentResolver().resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_OVERVIEW,
                department="cse",
                language="English",
                language_code="en",
            )
        )
        self.assertIsNotNone(content)
        assert content is not None
        units = extract_department_units(content, lang_key="en")
        self.assertEqual(len(units), 5)
        by_section = {u.section_id: u for u in units}
        for sec in content.sections:
            unit = by_section[sec.id]
            self.assertEqual(unit.body.strip(), (sec.body or "").strip())

    def test_deterministic_content_hash(self) -> None:
        u1 = resolve_unit(unit_id="cse.fees", language="English", language_code="en")
        u2 = resolve_unit(unit_id="cse.fees", language="English", language_code="en")
        self.assertIsNotNone(u1)
        self.assertIsNotNone(u2)
        assert u1 is not None and u2 is not None
        self.assertEqual(u1.content_hash, u2.content_hash)

    def test_unknown_unit_returns_none(self) -> None:
        self.assertIsNone(resolve_unit(unit_id="unknown.xyz", language="English", language_code="en"))

    def test_language_preserved(self) -> None:
        unit = resolve_unit(unit_id="cse.hod", language="Kannada", language_code="kn")
        self.assertIsNotNone(unit)
        assert unit is not None
        self.assertEqual(unit.language_code, "kn")

    def test_canonical_source_preserved(self) -> None:
        unit = resolve_unit(unit_id="cse.overview", language="English", language_code="en")
        self.assertIsNotNone(unit)
        assert unit is not None
        self.assertIn("locales", unit.canonical_source)


class TestContextIdentity(unittest.TestCase):
    def test_same_topic_different_context_different_unit_ids(self) -> None:
        fees_global = get_unit_descriptor("fees.overview")
        fees_cse = get_unit_descriptor("cse.fees")
        self.assertIsNotNone(fees_global)
        self.assertIsNotNone(fees_cse)
        assert fees_global is not None and fees_cse is not None
        self.assertNotEqual(fees_global.unit_id, fees_cse.unit_id)
        self.assertNotEqual(fees_global.context, fees_cse.context)

    def test_fees_overview_not_cse_fees(self) -> None:
        self.assertNotEqual("fees.overview", "cse.fees")
        g = resolve_unit(unit_id="fees.overview", language="English", language_code="en")
        c = resolve_unit(unit_id="cse.fees", language="English", language_code="en")
        self.assertIsNotNone(g)
        self.assertIsNotNone(c)
        assert g is not None and c is not None
        self.assertNotEqual(g.unit_id, c.unit_id)

    def test_documents_overview_not_admission_documents(self) -> None:
        doc_g = get_unit_descriptor("documents.overview")
        doc_a = get_unit_descriptor("admission.documents_required")
        self.assertIsNotNone(doc_g)
        self.assertIsNotNone(doc_a)
        assert doc_g is not None and doc_a is not None
        self.assertNotEqual(doc_g.unit_id, doc_a.unit_id)
        self.assertNotEqual(doc_g.context, doc_a.context)

    def test_cse_hod_not_cse_aiml_hod(self) -> None:
        self.assertNotEqual(
            get_unit_descriptor("cse.hod"),
            get_unit_descriptor("cse_aiml.hod"),
        )
        h1 = resolve_unit(unit_id="cse.hod", language="English", language_code="en")
        h2 = resolve_unit(unit_id="cse_aiml.hod", language="English", language_code="en")
        self.assertIsNotNone(h1)
        self.assertIsNotNone(h2)
        assert h1 is not None and h2 is not None
        self.assertNotEqual(h1.unit_id, h2.unit_id)
        self.assertNotEqual(h1.body, h2.body)

    def test_shared_source_distinct_units(self) -> None:
        doc_g = resolve_unit(unit_id="documents.overview", language="English", language_code="en")
        doc_a = resolve_unit(unit_id="admission.documents_required", language="English", language_code="en")
        self.assertIsNotNone(doc_g)
        self.assertIsNotNone(doc_a)
        assert doc_g is not None and doc_a is not None
        self.assertEqual(doc_g.canonical_source, doc_a.canonical_source)
        self.assertNotEqual(doc_g.unit_id, doc_a.unit_id)
        self.assertNotEqual(doc_g.context, doc_a.context)

    def test_resolution_preserves_context_metadata(self) -> None:
        unit = resolve_unit(unit_id="cse.placements", language="English", language_code="en")
        self.assertIsNotNone(unit)
        assert unit is not None
        self.assertEqual(unit.context, "department")
        self.assertEqual(unit.context_id, "cse")
        self.assertEqual(unit.entity_id, "cse")

    def test_no_topic_only_collapse(self) -> None:
        """Registry must not use topic alone as globally unique identity."""
        fees_global = get_unit_descriptor("fees.overview")
        fees_dept = get_unit_descriptor("cse.fees")
        self.assertIsNotNone(fees_global)
        self.assertIsNotNone(fees_dept)
        assert fees_global is not None and fees_dept is not None
        self.assertEqual(fees_global.unit_suffix, "overview")
        self.assertEqual(fees_dept.unit_suffix, "fees")
        self.assertNotEqual(fees_global.context, fees_dept.context)

    def test_unit_validation(self) -> None:
        unit = resolve_unit(unit_id="cse.overview", language="English", language_code="en")
        self.assertIsNotNone(unit)
        assert unit is not None
        result = validate_content_unit(unit)
        self.assertTrue(result.ok, msg=result.failures)
        expected = compute_unit_hash(
            unit_id=unit.unit_id,
            context=unit.context,
            context_id=unit.context_id,
            section_id=unit.section_id,
            body=unit.body,
            language_code=unit.language_code,
            canonical_source=unit.canonical_source,
        )
        self.assertEqual(unit.content_hash, expected)


if __name__ == "__main__":
    unittest.main()
