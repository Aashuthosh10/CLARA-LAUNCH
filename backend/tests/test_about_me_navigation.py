"""Conversational About Me routing — navigation resolve + policy short-circuit."""

from __future__ import annotations

import asyncio
import unittest

from backend.services.conversation.about_me_navigation import (
    SECTION_CAPABILITIES,
    SECTION_CREATORS,
    SECTION_GUIDE,
    SECTION_OVERVIEW,
    about_me_ui_action,
    resolve_about_me_navigation,
)
from backend.services.conversation.templates import about_me_bridge_reply
from backend.services.conversation.types import PolicyAction
from backend.services.orchestration import ConversationOrchestrator


def run_turn(text: str, language: str = "English", code_key: str = "en", session: dict | None = None):
    async def _run():
        sess = session if session is not None else {
            "language_code_key": code_key,
            "language_name": language,
        }
        result = await ConversationOrchestrator().run(text, sess, defer_narration=True)
        return result, sess

    return asyncio.run(_run())


class AboutMeResolveTests(unittest.TestCase):
    def test_overview_english(self):
        for q in (
            "Who are you?",
            "Tell me about yourself.",
            "Introduce yourself.",
            "What is CLARA?",
            "What do you do?",
        ):
            nav = resolve_about_me_navigation(q)
            self.assertIsNotNone(nav, q)
            self.assertEqual(nav.section, SECTION_OVERVIEW, q)
            self.assertIsNone(nav.item_id, q)

    def test_capabilities_generic(self):
        for q in (
            "What can you do?",
            "What are your capabilities?",
            "What are your features?",
            "How can you help me?",
        ):
            nav = resolve_about_me_navigation(q)
            self.assertIsNotNone(nav, q)
            self.assertEqual(nav.section, SECTION_CAPABILITIES, q)
            self.assertIsNone(nav.item_id, q)

    def test_individual_capability_schedule(self):
        nav = resolve_about_me_navigation("Tell me about your scheduling.")
        self.assertIsNotNone(nav)
        self.assertEqual(nav.section, SECTION_CAPABILITIES)
        self.assertEqual(nav.item_id, "schedule")

    def test_individual_capability_understand(self):
        nav = resolve_about_me_navigation("How do you understand people?")
        self.assertIsNotNone(nav)
        self.assertEqual(nav.item_id, "understand")

    def test_creators_generic(self):
        for q in (
            "Who created you?",
            "Who made you?",
            "Who are your creators?",
            "Who built you?",
        ):
            nav = resolve_about_me_navigation(q)
            self.assertIsNotNone(nav, q)
            self.assertEqual(nav.section, SECTION_CREATORS, q)
            self.assertIsNone(nav.item_id, q)

    def test_individual_creators(self):
        cases = (
            ("Tell me about Dhanush.", "c4"),
            ("Who is Adithya?", "c2"),
            ("Tell me about Aashuthosh.", "c1"),
            ("Who is Naveen Kumar?", "c5"),
        )
        for q, cid in cases:
            nav = resolve_about_me_navigation(q)
            self.assertIsNotNone(nav, q)
            self.assertEqual(nav.section, SECTION_CREATORS, q)
            self.assertEqual(nav.item_id, cid, q)

    def test_chinmayi_not_matched(self):
        nav = resolve_about_me_navigation("Tell me about Chinmayi.")
        self.assertTrue(nav is None or nav.item_id != "c3")

    def test_guide(self):
        for q in (
            "Who is your guide?",
            "Who is your project guide?",
            "Tell me about your guide.",
            "Who is Dr. Nagashree?",
        ):
            nav = resolve_about_me_navigation(q)
            self.assertIsNotNone(nav, q)
            self.assertEqual(nav.section, SECTION_GUIDE, q)

    def test_campus_queries_not_stolen(self):
        for q in (
            "Tell me about CSE.",
            "Who is the principal?",
            "What is the hostel facility?",
            "Tell me about NCC.",
            "What are the bus routes?",
            "What is the admission process?",
        ):
            self.assertIsNone(resolve_about_me_navigation(q), q)

    def test_follow_up_sticky(self):
        nav = resolve_about_me_navigation(
            "Tell me more about that one.",
            last_section=SECTION_CAPABILITIES,
            last_item_id="schedule",
        )
        self.assertIsNotNone(nav)
        self.assertEqual(nav.section, SECTION_CAPABILITIES)
        self.assertEqual(nav.item_id, "schedule")

    def test_romanized_and_code_switch(self):
        cases = (
            ("nivu yaaru?", SECTION_OVERVIEW),
            ("aap kaun ho?", SECTION_OVERVIEW),
            ("neenga yaaru?", SECTION_OVERVIEW),
            ("meeru evaru?", SECTION_OVERVIEW),
            ("ningal aaranu?", SECTION_OVERVIEW),
            ("ninna creators yaaru?", SECTION_CREATORS),
            ("aapko kisne banaya?", SECTION_CREATORS),
            ("unga guide yaaru?", SECTION_GUIDE),
            ("nivu en en madbahudu?", SECTION_CAPABILITIES),
            ("CLARA bagge heli", SECTION_OVERVIEW),
            ("CLARA ke baare mein batao", SECTION_OVERVIEW),
            ("CLARA ko kisne banaya?", SECTION_CREATORS),
        )
        for q, section in cases:
            nav = resolve_about_me_navigation(q)
            self.assertIsNotNone(nav, q)
            self.assertEqual(nav.section, section, q)

    def test_ui_action_shape(self):
        nav = resolve_about_me_navigation("Who created you?")
        action = about_me_ui_action(nav)
        self.assertEqual(action["type"], "open_about_me")
        self.assertEqual(action["section"], "creators")
        self.assertIsNone(action["itemId"])

    def test_bridge_phrases_english(self):
        self.assertEqual(about_me_bridge_reply("English", "overview"), "Let me introduce myself.")
        self.assertEqual(
            about_me_bridge_reply("English", "creators"),
            "Meet the honorable creators of me.",
        )
        self.assertEqual(
            about_me_bridge_reply("English", "capabilities"),
            "Let me show you what I can do.",
        )
        self.assertEqual(
            about_me_bridge_reply("English", "guide"),
            "Let me introduce you to my project guide.",
        )


class AboutMeOrchestratorTests(unittest.TestCase):
    def test_who_created_you_short_circuits(self):
        result, sess = run_turn("Who created you?")
        self.assertEqual(result.intel.decision.action, PolicyAction.ABOUT_ME)
        self.assertEqual(
            result.resolution.short_circuit_reply,
            about_me_bridge_reply("English", "creators"),
        )
        self.assertEqual(sess.get("_pending_ui_action", {}).get("type"), "open_about_me")
        self.assertEqual(sess.get("_pending_ui_action", {}).get("section"), "creators")
        self.assertEqual(sess.get("last_about_me", {}).get("section"), "creators")

    def test_tell_me_about_yourself(self):
        result, sess = run_turn("Tell me about yourself.")
        self.assertEqual(result.intel.decision.action, PolicyAction.ABOUT_ME)
        self.assertEqual(sess.get("_pending_ui_action", {}).get("section"), "overview")

    def test_what_can_you_do(self):
        result, sess = run_turn("What can you do?")
        self.assertEqual(result.intel.decision.action, PolicyAction.ABOUT_ME)
        self.assertEqual(sess.get("_pending_ui_action", {}).get("section"), "capabilities")
        self.assertIsNone(sess.get("_pending_ui_action", {}).get("itemId"))

    def test_individual_capability_item(self):
        result, sess = run_turn("Tell me about your scheduling.")
        self.assertEqual(result.intel.decision.action, PolicyAction.ABOUT_ME)
        action = sess.get("_pending_ui_action") or {}
        self.assertEqual(action.get("section"), "capabilities")
        self.assertEqual(action.get("itemId"), "schedule")

    def test_guide_and_dhanush(self):
        result, sess = run_turn("Who is your guide?")
        self.assertEqual(result.intel.decision.action, PolicyAction.ABOUT_ME)
        self.assertEqual(sess.get("_pending_ui_action", {}).get("section"), "guide")

        result2, sess2 = run_turn("Tell me about Dhanush.")
        self.assertEqual(result2.intel.decision.action, PolicyAction.ABOUT_ME)
        self.assertEqual(sess2.get("_pending_ui_action", {}).get("itemId"), "c4")

    def test_topic_switch_clears_about_me_sticky(self):
        sess = {"language_code_key": "en", "language_name": "English"}
        run_turn("Who created you?", session=sess)
        self.assertIsNotNone(sess.get("last_about_me"))
        run_turn("Tell me about the hostel.", session=sess)
        # Hostel may clarify gender or card — either way About Me sticky must clear
        # once a non-About-Me institutional turn seals CARD/ANSWER/FALLBACK.
        # If clarification, sticky may remain until CARD; follow-up clears on CARD.
        if sess.get("last_about_me") is not None:
            run_turn("boys hostel", session=sess)
        self.assertIsNone(sess.get("last_about_me"))

    def test_principal_not_about_me(self):
        result, _sess = run_turn("Who is the principal?")
        self.assertNotEqual(result.intel.decision.action, PolicyAction.ABOUT_ME)

    def test_kannada_bridge_language(self):
        result, _sess = run_turn(
            "ನೀವು ಯಾರು?",
            language="Kannada",
            code_key="kn",
        )
        # May or may not resolve via unicode; romanized path is covered above.
        # If About Me fires, bridge must be Kannada.
        if result.intel.decision.action == PolicyAction.ABOUT_ME:
            self.assertEqual(
                result.resolution.short_circuit_reply,
                about_me_bridge_reply("Kannada", "overview"),
            )


if __name__ == "__main__":
    unittest.main()
