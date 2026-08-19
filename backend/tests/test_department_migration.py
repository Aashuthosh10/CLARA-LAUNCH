"""Milestone 4.1 — Department canonical migration parity tests."""

from __future__ import annotations

import unittest

from backend.services.answer_generation import INTENT_DEPARTMENT_OVERVIEW
from backend.services.content.department_resolver import resolve_department_key
from backend.services.content.resolver import ContentResolver
from backend.services.content.surface_narration_mapper import map_canonical_content_to_segments
from backend.services.content.types import SURFACE_DEPARTMENT_OVERVIEW, ResolveRequest
from backend.services.narration_plan import finalize_segment_list
from backend.services.orchestration.narration_resolver import resolve_narration
from backend.services.orchestration.presentation_bundle import (
    build_presentation_bundle,
    compute_contract_hash,
)
from backend.services.orchestration.types import ConversationResolution, PresentationMode


def _dept_resolution(*, language: str = "English", code: str = "en") -> ConversationResolution:
    return ConversationResolution(
        language=language,
        language_code_key=code,
        tts_code=f"{code}-IN" if code != "en" else "en-IN",
        intent=INTENT_DEPARTMENT_OVERVIEW,
        show_card=SURFACE_DEPARTMENT_OVERVIEW,
        card_surface=SURFACE_DEPARTMENT_OVERVIEW,
        should_generate_presentation=True,
        presentation_mode=PresentationMode.CARD_PRESENTATION.value,
        department_label="CSE",
    )


class TestDepartmentResolver(unittest.TestCase):
    def test_cse_never_returned_as_json_key(self) -> None:
        for label in ("CSE", "cse", "Computer Science & Engineering"):
            # "Computer Science & Engineering" may only resolve via loose/name match
            res = resolve_department_key(department=label, language="en")
            if res.json_key:
                self.assertEqual(res.json_key, "cse")
                self.assertNotEqual(res.json_key, "CSE")

    def test_menu_and_voice_same_key(self) -> None:
        voice = resolve_department_key(department="CSE", language="en")
        menu = resolve_department_key(menu_department="CSE", language="en")
        self.assertEqual(voice.json_key, "cse")
        self.assertEqual(menu.json_key, "cse")
        self.assertEqual(voice.source, "voice")
        self.assertEqual(menu.source, "menu")


class TestDepartmentMigrationParity(unittest.TestCase):
    def _segments_via_resolver(self, *, from_menu: bool, turn_id: str, code: str = "en"):
        res = _dept_resolution(code=code, language="English" if code == "en" else code)
        ents: dict = {"department": "CSE"}
        if from_menu:
            ents["from_menu"] = True
        segs = resolve_narration(resolution=res, entities=ents, user_text="Tell me about CSE")
        self.assertIsNotNone(segs)
        assert segs is not None
        finalize_segment_list(turn_id, segs)
        return res, segs

    def test_voice_cse_five_slides(self) -> None:
        res, segs = self._segments_via_resolver(from_menu=False, turn_id="voice-1")
        self.assertEqual(len(segs), 5)
        self.assertTrue(all(s.card_id == "dept_slide" for s in segs))
        self.assertTrue(res.canonical_surface)
        self.assertTrue(res.content_hash)
        self.assertTrue(res.canonical_content_id)

    def test_menu_voice_identical_captions_and_hash(self) -> None:
        res_v, segs_v = self._segments_via_resolver(from_menu=False, turn_id="voice-t")
        res_m, segs_m = self._segments_via_resolver(from_menu=True, turn_id="menu-t")
        self.assertEqual(len(segs_v), 5)
        self.assertEqual(len(segs_m), 5)
        captions_v = [s.display_text for s in segs_v]
        captions_m = [s.display_text for s in segs_m]
        spoken_v = [s.tts_text for s in segs_v]
        spoken_m = [s.tts_text for s in segs_m]
        self.assertEqual(captions_v, captions_m)
        self.assertEqual(spoken_v, spoken_m)
        self.assertEqual(res_v.content_hash, res_m.content_hash)
        self.assertEqual(res_v.canonical_content_id, res_m.canonical_content_id)

        bundle_v = build_presentation_bundle(resolution=res_v, segments=segs_v, turn_id="voice-t")
        bundle_m = build_presentation_bundle(resolution=res_m, segments=segs_m, turn_id="menu-t")
        self.assertEqual(bundle_v.contract_hash, bundle_m.contract_hash)
        self.assertEqual(bundle_v.content_hash, bundle_m.content_hash)
        self.assertNotEqual(bundle_v.presentation_id, bundle_m.presentation_id)

    def test_content_hash_deterministic(self) -> None:
        c1 = ContentResolver().resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_OVERVIEW,
                department="cse",
                language="English",
                language_code="en",
            )
        )
        c2 = ContentResolver().resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_OVERVIEW,
                department="cse",
                language="English",
                language_code="en",
            )
        )
        self.assertIsNotNone(c1)
        self.assertIsNotNone(c2)
        assert c1 is not None and c2 is not None
        self.assertEqual(c1.hash, c2.hash)
        self.assertEqual(
            [s.id for s in c1.sections],
            ["intro", "hod_voice", "achievements", "placement", "fees"],
        )

    def test_contract_hash_deterministic_for_identical_captions(self) -> None:
        _, segs = self._segments_via_resolver(from_menu=False, turn_id="t1")
        captions = [s.display_text for s in segs]
        spoken = [s.tts_text for s in segs]
        h1 = compute_contract_hash(
            language_code="en",
            card_surface=SURFACE_DEPARTMENT_OVERVIEW,
            display_captions=captions,
            spoken_summaries=spoken,
        )
        h2 = compute_contract_hash(
            language_code="en",
            card_surface=SURFACE_DEPARTMENT_OVERVIEW,
            display_captions=captions,
            spoken_summaries=spoken,
        )
        self.assertEqual(h1, h2)

    def test_mapper_public_api(self) -> None:
        content = ContentResolver().resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_OVERVIEW,
                department="cse",
                language="English",
                language_code="en",
            )
        )
        self.assertIsNotNone(content)
        segs = map_canonical_content_to_segments(content, lang_key="en")
        self.assertEqual(len(segs), 5)
        self.assertEqual(
            [s.section_id for s in segs],
            ["intro", "hod_voice", "achievements", "placement", "fees"],
        )

    def test_unknown_department_voice_turn_emits_no_card(self) -> None:
        # M5.4: a spoken unknown department is fail-closed — the response decision
        # clarifies instead of narrating a guessed department.
        res = _dept_resolution()
        res.department_label = "NotARealDepartmentXYZ"
        segs_v = resolve_narration(
            resolution=res,
            entities={"department": "NotARealDepartmentXYZ"},
            user_text="tell me about NotARealDepartmentXYZ",
        )
        self.assertIsNone(segs_v)

    def test_unknown_department_menu_click_keeps_unlisted_segment(self) -> None:
        res2 = _dept_resolution()
        res2.department_label = "NotARealDepartmentXYZ"
        segs_m = resolve_narration(
            resolution=res2,
            entities={"department": "NotARealDepartmentXYZ", "from_menu": True},
            user_text="NotARealDepartmentXYZ",
        )
        self.assertIsNotNone(segs_m)
        assert segs_m is not None
        self.assertEqual(len(segs_m), 1)
        self.assertEqual(segs_m[0].card_id, "dept")

    def test_kannada_section_ids(self) -> None:
        content = ContentResolver().resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_OVERVIEW,
                department="cse",
                language="Kannada",
                language_code="kn",
            )
        )
        self.assertIsNotNone(content)
        assert content is not None
        self.assertEqual(
            [s.id for s in content.sections],
            ["intro", "hod_voice", "achievements", "placement", "fees"],
        )
        segs = map_canonical_content_to_segments(content, lang_key="kn")
        self.assertEqual(len(segs), 5)
        # Titles use dept_labels (Kannada for non-intro chrome)
        self.assertIn("HOD", segs[1].display_text)

    def test_hindi_and_tamil_section_count(self) -> None:
        for code, lang in (("hi", "Hindi"), ("ta", "Tamil")):
            content = ContentResolver().resolve(
                ResolveRequest(
                    surface=SURFACE_DEPARTMENT_OVERVIEW,
                    department="cse",
                    language=lang,
                    language_code=code,
                )
            )
            self.assertIsNotNone(content, msg=code)
            assert content is not None
            segs = map_canonical_content_to_segments(content, lang_key=code)
            self.assertEqual(len(segs), 5, msg=code)


if __name__ == "__main__":
    unittest.main()
