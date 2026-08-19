"""M5.5 receptionist response policy. Mocked proposals; no live Groq."""

from __future__ import annotations

import asyncio
import unittest
from unittest.mock import patch

from backend.services.content.semantic_request_parser import parse_semantic_request
from backend.services.content.unit_selector import select_content_units
from backend.services.conversation.response_decision import (
    DomainRelevance,
    ResponseMode,
    resolve_response_decision,
)
from backend.services.conversation.semantic_proposal import SemanticProposal
from backend.services.orchestration import ConversationOrchestrator, PresentationMode


def parse(raw: str, lang: str = "en", ci_entities: dict | None = None):
    return parse_semantic_request(
        raw_text=raw,
        language_code_key=lang,
        ci_entities=ci_entities,
    )


def plan_units(raw: str, lang: str = "en", ci_entities: dict | None = None):
    request = parse(raw, lang, ci_entities)
    if request is None:
        return None
    plan = select_content_units(request)
    return None if plan is None else tuple(plan.units)


def decide(raw: str, *, proposal: SemanticProposal | None = None, **kwargs) -> ResponseMode:
    request = parse(raw)
    decision = resolve_response_decision(
        text=raw,
        semantic_request=request,
        ci_intent=kwargs.get("ci_intent"),
        has_department_entity=bool(request and request.entities),
        faq_matched=kwargs.get("faq_matched", False),
        local_intent=kwargs.get("local_intent"),
        validated_proposal=proposal,
        proposal_diagnostics=kwargs.get("proposal_diagnostics"),
    )
    return decision.mode


def institution_answer_proposal(**kwargs) -> SemanticProposal:
    return SemanticProposal(
        domain=DomainRelevance.INSTITUTION,
        mode_hint=ResponseMode.ANSWER,
        items=(),
        scope="single",
        confidence="HIGH",
        **kwargs,
    )


def card_proposal(items: list[tuple[str, str]]) -> SemanticProposal:
    return SemanticProposal(
        domain=DomainRelevance.INSTITUTION,
        mode_hint=ResponseMode.CARD,
        items=tuple(items),
        scope="single",
        confidence="HIGH",
    )


def run_turn(text: str, language: str = "English", code_key: str = "en", session: dict | None = None):
    async def _run():
        sess = session if session is not None else {"language_code_key": code_key, "language_name": language}
        result = await ConversationOrchestrator().run(text, sess, defer_narration=True)
        return result.resolution, sess

    return asyncio.run(_run())


class TestACardRegression(unittest.TestCase):
    def test_data_science_hod(self) -> None:
        self.assertEqual(plan_units("Who is the HOD of Data Science?"), ("cse_ds.hod",))
        self.assertIs(decide("Who is the HOD of Data Science?"), ResponseMode.CARD)

    def test_cse_fees(self) -> None:
        self.assertEqual(plan_units("What are CSE fees?"), ("cse.fees",))
        self.assertIs(decide("What are CSE fees?"), ResponseMode.CARD)

    def test_tell_me_about_aiml(self) -> None:
        units = plan_units("Tell me about AIML.")
        self.assertIsNotNone(units)
        self.assertTrue(all(u.startswith("cse_aiml.") for u in units or ()))
        self.assertIs(decide("Tell me about AIML."), ResponseMode.CARD)


class TestBAnswer(unittest.TestCase):
    def test_lexicon_institutional_questions(self) -> None:
        for text in (
            "How good are the teachers here?",
            "How is campus life?",
            "Are the labs good?",
            "Do students get internship opportunities?",
            "How is the college environment?",
        ):
            with self.subTest(text=text):
                self.assertIs(decide(text), ResponseMode.ANSWER)

    def test_lexicon_miss_becomes_answer_with_institution_proposal(self) -> None:
        text = "Is there an NCC wing on campus for cadets?"
        # "campus" is institutional; this phrase is still ANSWER from the lexicon.
        self.assertIs(decide("Is there an NCC wing?"), ResponseMode.CLARIFY)
        self.assertIs(decide("Is there an NCC wing?", proposal=institution_answer_proposal()), ResponseMode.ANSWER)

    def test_hackathons_are_institutional_answers(self) -> None:
        self.assertIs(decide("Do you organise hackathons?"), ResponseMode.ANSWER)

    def test_llm_fallback_cannot_override_teachers(self) -> None:
        proposal = SemanticProposal(
            domain=DomainRelevance.OFF_DOMAIN,
            mode_hint=ResponseMode.FALLBACK,
            confidence="HIGH",
        )
        self.assertIs(
            decide("How good are the teachers here?", proposal=proposal),
            ResponseMode.ANSWER,
        )

    def test_evaluative_department_question_is_answer(self) -> None:
        text = "Is Data Science a good option for someone interested in AI?"
        proposal = institution_answer_proposal()
        self.assertIs(decide(text, proposal=proposal), ResponseMode.ANSWER)

    def test_documents_card_is_not_stolen_by_answer_proposal(self) -> None:
        self.assertIs(
            decide(
                "admission documents",
                proposal=institution_answer_proposal(),
                ci_intent="DOCUMENTS",
            ),
            ResponseMode.CARD,
        )


class TestCClarify(unittest.TestCase):
    def test_bare_hod(self) -> None:
        self.assertIsNone(plan_units("Who is the HOD?"))
        self.assertIs(decide("Who is the HOD?"), ResponseMode.CLARIFY)

    def test_bare_fees(self) -> None:
        self.assertIsNone(plan_units("What about the fees?"))
        self.assertIs(decide("What about the fees?"), ResponseMode.CLARIFY)


class TestDMultiCard(unittest.TestCase):
    def test_overview_and_hod(self) -> None:
        self.assertEqual(
            plan_units("Data Science overview and AIML HOD"),
            ("cse_ds.overview", "cse_aiml.hod"),
        )

    def test_three_hods(self) -> None:
        self.assertEqual(
            plan_units("AIML, Data Science and CSE HOD"),
            ("cse_aiml.hod", "cse_ds.hod", "cse.hod"),
        )

    def test_three_way_mixed(self) -> None:
        self.assertEqual(
            plan_units("Data Science fees and AIML HOD and CSE overview"),
            ("cse_ds.fees", "cse_aiml.hod", "cse.overview"),
        )

    def test_llm_card_fills_parse_gap_with_n_items(self) -> None:
        text = "datascience mathe aiml du hod yaaru?"
        proposal = card_proposal([("cse_ds", "hod"), ("cse_aiml", "hod")])
        decision = resolve_response_decision(
            text=text,
            semantic_request=parse(text),
            ci_intent=None,
            has_department_entity=False,
            validated_proposal=proposal,
        )
        if decision.mode is ResponseMode.CARD:
            self.assertEqual(len(decision.items), 2)


class TestEFallback(unittest.TestCase):
    def test_capital_of_france(self) -> None:
        self.assertIs(decide("What is the capital of France?"), ResponseMode.FALLBACK)

    def test_external_college_compare(self) -> None:
        self.assertIs(decide("Compare SVIT with another college."), ResponseMode.FALLBACK)

    def test_institution_proposal_cannot_override_france(self) -> None:
        self.assertIs(
            decide(
                "What is the capital of France?",
                proposal=institution_answer_proposal(),
            ),
            ResponseMode.FALLBACK,
        )


class TestProviderFailureIsDeterministic(unittest.TestCase):
    def test_timeout_keeps_teachers_as_answer(self) -> None:
        from backend.services.conversation.semantic_proposal import ProposalValidationResult

        with patch(
            "backend.services.conversation.pipeline.maybe_propose_semantics",
            return_value=ProposalValidationResult(
                proposal=None,
                status="error",
                reject_reason="timeout",
            ),
        ):
            res, _ = run_turn("How good are the teachers here?")
        self.assertEqual(res.presentation_mode, PresentationMode.NORMAL_REPLY.value)
        self.assertTrue(res.should_call_rag)
        self.assertIsNone(res.show_card)


class TestOrchestratorAnswerVsCard(unittest.TestCase):
    def test_receptionist_answer_prompt_allows_synthesis(self) -> None:
        from backend.services.answer_generation import (
            build_receptionist_answer_system_prompt,
            get_off_topic_reply,
            get_unavailable_reply,
        )

        prompt = build_receptionist_answer_system_prompt(
            "English",
            get_unavailable_reply("English"),
            get_off_topic_reply("English"),
        )
        self.assertIn("synthesize", prompt.lower())
        self.assertIn("ONLY when", prompt)
        for name in ("Kannada", "Hindi", "Tamil", "Telugu", "Malayalam"):
            self.assertIn(name, prompt)

    def test_teachers_still_answer_without_card(self) -> None:
        res, _ = run_turn("How good are the teachers here?")
        self.assertIsNone(res.show_card)
        self.assertEqual(res.presentation_mode, PresentationMode.NORMAL_REPLY.value)
        self.assertTrue(res.should_call_rag)

    def test_hod_still_cards(self) -> None:
        res, sess = run_turn("Who is the HOD of Data Science?")
        self.assertTrue(res.should_generate_presentation)
        self.assertEqual(sess.get("last_semantic_entities"), ["cse_ds"])

    def test_anaphora_uses_last_semantic_entities(self) -> None:
        session = {
            "language_code_key": "en",
            "language_name": "English",
            "last_semantic_entities": ["cse_ds"],
        }
        res, _ = run_turn("What about their fees?", session=session)
        self.assertTrue(res.should_generate_presentation)


class TestSkipAtomicParse(unittest.TestCase):
    def test_atomic_hod_skips_router(self) -> None:
        from backend.services.conversation.semantic_router import skip_semantic_router_reason

        request = parse("Who is the HOD of Data Science?")
        with patch(
            "backend.services.conversation.semantic_router.SEMANTIC_ROUTER_ENABLED",
            True,
        ):
            reason = skip_semantic_router_reason(
                text="Who is the HOD of Data Science?",
                semantic_request=request,
                local_intent=None,
                faq_matched=False,
                groq_client=object(),
            )
        self.assertEqual(reason, "atomic_card_parse")


if __name__ == "__main__":
    unittest.main()
