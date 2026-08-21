"""
M5.4 acceptance matrix — one owner per decision, proven end to end.

A–F   composition (single, multi-entity, multi-topic, mixed, full deck, order)
G–I   multilingual / native script / code-switch
J–K   ambiguous identity and unknown department
L     institutional ANSWER (short questions included)
M–N   FALLBACK (off domain, external college comparison)
O     follow-up anaphora

Every assertion names the authority that owns the decision. If one fails, fix the
authority — not the test, and never with a keyword exception.
"""

from __future__ import annotations

import unittest

from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units
from backend.services.conversation.response_decision import (
    ResponseMode,
    resolve_response_decision,
)


def plan_units(raw: str, lang: str = "en", ci_entities: dict | None = None) -> tuple[str, ...] | None:
    request = parse_semantic_request(
        raw_text=raw,
        language_code_key=lang,
        ci_entities=ci_entities,
    )
    if request is None:
        return None
    plan = select_content_units(request)
    return None if plan is None else tuple(plan.units)


def decide(raw: str, lang: str = "en", ci_intent: str | None = None) -> ResponseMode:
    request = parse_semantic_request(raw_text=raw, language_code_key=lang)
    decision = resolve_response_decision(
        text=raw,
        semantic_request=request,
        ci_intent=ci_intent,
        has_department_entity=bool(request and request.entities),
    )
    return decision.mode


class TestACompositionSingle(unittest.TestCase):
    """A — one entity, one topic. UnitSelector owns the unitId."""

    def test_single_topic_single_entity(self) -> None:
        self.assertEqual(plan_units("What is the fee for CSE Data Science?"), ("cse_ds.fees",))

    def test_hod_single_entity(self) -> None:
        self.assertEqual(plan_units("Who is the HOD of Data Science?"), ("cse_ds.hod",))

    def test_exclusive_longest_span_never_leaks_parent(self) -> None:
        # `cse` must not leak out of `cse_ds`.
        self.assertEqual(plan_units("CSE Data Science HOD"), ("cse_ds.hod",))


class TestBCompositionMultiEntity(unittest.TestCase):
    """B — one topic, N entities, in user order, for every per-department topic."""

    def test_hod_three_departments(self) -> None:
        self.assertEqual(
            plan_units("Who are the HODs of AIML, Data Science and CSE?"),
            ("cse_aiml.hod", "cse_ds.hod", "cse.hod"),
        )

    def test_fees_two_departments(self) -> None:
        self.assertEqual(
            plan_units("What are the fees for AIML and Data Science?"),
            ("cse_aiml.fees", "cse_ds.fees"),
        )

    def test_placements_two_departments(self) -> None:
        self.assertEqual(
            plan_units("AIML placements and Data Science placements"),
            ("cse_aiml.placements", "cse_ds.placements"),
        )


class TestCCompositionMultiTopic(unittest.TestCase):
    """C — N topics for one entity, in user topic order."""

    def test_two_topics_one_entity(self) -> None:
        self.assertEqual(plan_units("CSE fees and HOD"), ("cse.fees", "cse.hod"))

    def test_three_topics_one_entity(self) -> None:
        self.assertEqual(
            plan_units("Data Science HOD, placements and fees"),
            ("cse_ds.hod", "cse_ds.placements", "cse_ds.fees"),
        )


class TestDCompositionMixed(unittest.TestCase):
    """D — explicit entity+topic pairs compose across families."""

    def test_overview_plus_hod(self) -> None:
        self.assertEqual(
            plan_units("Data Science overview and AIML HOD"),
            ("cse_ds.overview", "cse_aiml.hod"),
        )

    def test_three_way_mixed(self) -> None:
        self.assertEqual(
            plan_units("Data Science overview, AIML HOD and CSE fees"),
            ("cse_ds.overview", "cse_aiml.hod", "cse.fees"),
        )


class TestEFullDepartmentDeck(unittest.TestCase):
    """E — the full deck stays atomic: one entity, overview scope, five units."""

    def test_full_deck(self) -> None:
        self.assertEqual(
            plan_units("Tell me about CSE"),
            ("cse.overview", "cse.hod", "cse.achievements", "cse.placements", "cse.fees"),
        )

    def test_full_deck_is_never_a_substitute_for_failed_resolution(self) -> None:
        self.assertIsNone(plan_units("tell me about CSE and AIML"))


class TestFOrderPreserved(unittest.TestCase):
    """F — user order is content order; no sorting, no dedupe-by-family, no cap."""

    def test_reversed_order_is_respected(self) -> None:
        self.assertEqual(
            plan_units("AIML HOD and Data Science overview"),
            ("cse_aiml.hod", "cse_ds.overview"),
        )

    def test_no_two_unit_cap(self) -> None:
        units = plan_units("CSE HOD, AIML HOD, Data Science HOD and ECE HOD")
        self.assertEqual(units, ("cse.hod", "cse_aiml.hod", "cse_ds.hod", "ece.hod"))


class TestGMultilingualNativeScript(unittest.TestCase):
    """G — entity vocabulary lives in department_identity for every language."""

    def test_kannada_fees(self) -> None:
        self.assertEqual(plan_units("ಡೇಟಾ ಸೈನ್ಸ್ ಶುಲ್ಕ", "kn"), ("cse_ds.fees",))

    def test_hindi_data_science_fees(self) -> None:
        self.assertEqual(plan_units("डेटा साइंस फीस", "hi"), ("cse_ds.fees",))

    def test_tamil_fees(self) -> None:
        self.assertEqual(plan_units("டேட்டா சயின்ஸ் கட்டணம்", "ta"), ("cse_ds.fees",))

    def test_telugu_fees(self) -> None:
        self.assertEqual(plan_units("డేటా సైన్స్ ఫీజు", "te"), ("cse_ds.fees",))

    def test_malayalam_fees(self) -> None:
        self.assertEqual(plan_units("ഡാറ്റാ സയൻസ് ഫീസ്", "ml"), ("cse_ds.fees",))


class TestHRomanizedAndCodeSwitch(unittest.TestCase):
    """H/I — romanized and code-switched input resolve at the same owners."""

    def test_romanized_kannada_fees(self) -> None:
        self.assertEqual(plan_units("data science fees yestu", "kn"), ("cse_ds.fees",))

    def test_code_switched_hod(self) -> None:
        self.assertEqual(plan_units("AIML HOD yaaru", "kn"), ("cse_aiml.hod",))

    def test_code_switched_mixed_composition(self) -> None:
        self.assertEqual(
            plan_units("CSE fees mattu HOD yaaru", "kn"),
            ("cse.fees", "cse.hod"),
        )


class TestJAmbiguousIdentity(unittest.TestCase):
    """J — a card topic with no resolvable department clarifies; it never guesses."""

    def test_bare_hod_clarifies(self) -> None:
        self.assertIsNone(plan_units("Who is the HOD?"))
        self.assertIs(decide("Who is the HOD?"), ResponseMode.CLARIFY)

    def test_bare_fees_clarifies(self) -> None:
        self.assertIsNone(plan_units("Fees?"))
        self.assertIs(decide("Fees?"), ResponseMode.CLARIFY)


class TestKUnknownDepartment(unittest.TestCase):
    """K — an unlisted department is not the nearest listed one."""

    def test_unlisted_department(self) -> None:
        self.assertIsNone(plan_units("Quantum Basket Weaving HOD"))

    def test_near_miss_is_not_snapped(self) -> None:
        self.assertIsNone(plan_units("CSS fees"))


class TestLInstitutionalAnswer(unittest.TestCase):
    """L — institutional questions answer, however short. Length is not evidence."""

    def test_short_institutional_questions_answer(self) -> None:
        for text in (
            "How good are the teachers here?",
            "Campus life?",
            "Are professors experienced?",
            "What are the labs like?",
        ):
            with self.subTest(text=text):
                self.assertIs(decide(text), ResponseMode.ANSWER)

    def test_opportunities_question_is_not_a_documents_card(self) -> None:
        self.assertIs(decide("Do students get opportunities?"), ResponseMode.ANSWER)


class TestMNFallback(unittest.TestCase):
    """M/N — genuinely out of scope, and comparison against another college."""

    def test_off_domain_is_fallback(self) -> None:
        self.assertIs(decide("What is the capital of France?"), ResponseMode.FALLBACK)

    def test_off_domain_never_becomes_a_course_menu(self) -> None:
        self.assertIsNone(plan_units("What is the capital of France?"))

    def test_external_college_comparison_is_fallback(self) -> None:
        for text in (
            "Compare SVIT with Harvard",
            "Is SVIT better than another college?",
            "Compare this college with any other college",
        ):
            with self.subTest(text=text):
                self.assertIs(decide(text), ResponseMode.FALLBACK)

    def test_intra_svit_comparison_is_not_fallback(self) -> None:
        self.assertIsNot(decide("Compare AIML and Data Science"), ResponseMode.FALLBACK)


class TestOFollowUp(unittest.TestCase):
    """O — a previous entity enters this turn only through an anaphor."""

    def test_anaphora_carries_the_previous_department(self) -> None:
        self.assertEqual(
            plan_units("What are its fees?", ci_entities={"department": "CSE (Data Science)"}),
            ("cse_ds.fees",),
        )

    def test_no_anaphora_does_not_make_the_last_department_sticky(self) -> None:
        self.assertIsNone(
            plan_units("Who is the HOD?", ci_entities={"department": "CSE (Data Science)"})
        )

    def test_a_new_entity_wins_over_the_carried_one(self) -> None:
        self.assertEqual(
            plan_units("What about AIML fees?", ci_entities={"department": "CSE (Data Science)"}),
            ("cse_aiml.fees",),
        )


if __name__ == "__main__":
    unittest.main()
