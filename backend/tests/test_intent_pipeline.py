import unittest

from backend.services.answer_generation import (
    INTENT_ADMISSIONS,
    INTENT_COLLEGE_OVERVIEW,
    INTENT_COURSE_MENU,
    INTENT_DEPARTMENT_FEES,
    INTENT_DEPARTMENT_OVERVIEW,
    INTENT_DOCUMENTS,
    INTENT_HOD_PROFILE,
    INTENT_NORMAL_QUERY,
    INTENT_PRINCIPAL_PROFILE,
    INTENT_TRUSTEES_PROFILE,
    INTENT_VICE_PRINCIPAL_PROFILE,
    _detect_profile_intent,
    extract_features,
    maybe_override_intent_with_executive_profile,
    normalized_text_for_executive_keyword_scan,
    resolve_intent_from_features,
)


class TestIntentPipeline(unittest.TestCase):
    def _resolve(self, text: str) -> tuple[str, str | None]:
        features = extract_features(text)
        return resolve_intent_from_features(features), features.department_name

    def test_cse_hod_yaaru(self) -> None:
        intent, dept = self._resolve("cse hod yaaru")
        self.assertEqual(intent, INTENT_HOD_PROFILE)
        self.assertEqual(dept, "CSE")

    def test_datascience_fees_bagge_helu(self) -> None:
        intent, dept = self._resolve("datascience fees bagge helu")
        self.assertEqual(intent, INTENT_DEPARTMENT_FEES)
        self.assertEqual(dept, "CSE (Data Science)")

    def test_courses_en_ide(self) -> None:
        intent, _ = self._resolve("courses en ide")
        self.assertEqual(intent, INTENT_COURSE_MENU)

    def test_multilingual_course_phrases(self) -> None:
        phrases = [
            "courses available",
            "course ide",
            "yava course",
            "course ideya",
            "college ali yaav courses ide",
            "college ali yaav yaav departments aithe",
            "course pathi solu",
            "courses enti",
            "course kurich parayu",
            "what are the courses",
            "kaunse courses hai",
            "course kya hai",
            "kaunse course",
            "enna course",
            "course iruka",
            "course enti",
            "course unnaya",
            "course ideya svit alli",
        ]
        for p in phrases:
            with self.subTest(phrase=p):
                feats = extract_features(p)
                self.assertTrue(feats.is_course_query)
                self.assertEqual(resolve_intent_from_features(feats), INTENT_COURSE_MENU)

    def test_fees_structure_without_department(self) -> None:
        intent, dept = self._resolve("fees structure")
        self.assertEqual(intent, INTENT_ADMISSIONS)
        self.assertIsNone(dept)

    def test_multilingual_fee_phrases(self) -> None:
        phrases = [
            "fees eshtu",
            "fees estu",
            "fees bagge",
            "fees kitna",
            "fee kya hai",
            "fees evlo",
            "fees entha",
        ]
        for p in phrases:
            with self.subTest(phrase=p):
                feats = extract_features(p)
                self.assertTrue(feats.is_fee_query)

    def test_datascience_fee_transliterated_phrase(self) -> None:
        intent, dept = self._resolve("cse )datascience du fees estu")
        self.assertEqual(intent, INTENT_DEPARTMENT_FEES)
        self.assertEqual(dept, "CSE (Data Science)")

    def test_fuzzy_broken_datascience_fees(self) -> None:
        intent, dept = self._resolve("cse dtascience du fees estu")
        self.assertEqual(intent, INTENT_DEPARTMENT_FEES)
        self.assertEqual(dept, "CSE (Data Science)")

    def test_ds_fees_evlo(self) -> None:
        intent, dept = self._resolve("ds fees evlo")
        self.assertEqual(intent, INTENT_DEPARTMENT_FEES)
        self.assertEqual(dept, "CSE (Data Science)")

    def test_ai_ml_fee_entha(self) -> None:
        intent, dept = self._resolve("ai ml fee entha")
        self.assertEqual(intent, INTENT_DEPARTMENT_FEES)
        self.assertEqual(dept, "CSE (AI & ML)")

    def test_fees_pathi_solu(self) -> None:
        intent, dept = self._resolve("fees pathi solu")
        self.assertEqual(intent, INTENT_ADMISSIONS)
        self.assertIsNone(dept)

    def test_fees_kurich_parayu(self) -> None:
        intent, dept = self._resolve("fees kurich parayu")
        self.assertEqual(intent, INTENT_ADMISSIONS)
        self.assertIsNone(dept)

    def test_aiml_department_query(self) -> None:
        intent, dept = self._resolve("aiml")
        self.assertEqual(intent, INTENT_DEPARTMENT_OVERVIEW)
        self.assertEqual(dept, "CSE (AI & ML)")

    def test_courses_in_cse_prefers_course_menu(self) -> None:
        intent, dept = self._resolve("courses in cse")
        self.assertEqual(intent, INTENT_COURSE_MENU)
        self.assertEqual(dept, "CSE")

    def test_principal_executive_detection_and_override(self) -> None:
        for phrase in (
            "who is the principal",
            "principal details",
            "who runs this college",
            "college head",
            "principal of svit",
            "tell me about the principal",
            "who is the principle",
            "ಪ್ರಿನ್ಸಿಪಾಲ್ ತಿಳಿಸಿ",
            "കോളേജിന് പ്രിൻസിപ്പൽ ആർ",
        ):
            with self.subTest(phrase=phrase):
                self.assertEqual(
                    maybe_override_intent_with_executive_profile(
                        INTENT_NORMAL_QUERY,
                        phrase,
                    ),
                    INTENT_PRINCIPAL_PROFILE,
                )
                self.assertEqual(
                    _detect_profile_intent(normalized_text_for_executive_keyword_scan(phrase)),
                    INTENT_PRINCIPAL_PROFILE,
                )

        for phrase in (
            "overview of vice principal",
            "vice principal name",
            "ಉಪ ಪ್ರಾಂಶುಪಾಲರು ಯಾರು",
        ):
            with self.subTest(phrase=phrase):
                self.assertEqual(
                    maybe_override_intent_with_executive_profile(
                        INTENT_COLLEGE_OVERVIEW,
                        phrase,
                    ),
                    INTENT_VICE_PRINCIPAL_PROFILE,
                )
                self.assertEqual(
                    _detect_profile_intent(normalized_text_for_executive_keyword_scan(phrase)),
                    INTENT_VICE_PRINCIPAL_PROFILE,
                )

        # Trustees wording without principal cues must still resolve to trustees detection (not overridden from HOD flows).
        self.assertEqual(
            maybe_override_intent_with_executive_profile(
                INTENT_TRUSTEES_PROFILE,
                "who are the founder trustees",
            ),
            INTENT_TRUSTEES_PROFILE,
        )

    def test_documents_intent_multilingual(self) -> None:
        phrases = [
            # Kannada
            "college admission ge yaav documents beku",
            "yaav documents admission ge bekagutte",
            "documents bagge helu",
            # Hindi
            "admission ke liye kya documents chahiye",
            "college documents kya hai",
            # Tamil
            "admission ku enna documents venum",
            # Telugu
            "admission ki documents enti",
            # Malayalam
            "admissioninu documents entha",
            # Mixed / broken
            "documents beku for admission",
            "college ge documents kya chahiye",
            "doccuments",
            "documnts",
        ]
        for p in phrases:
            with self.subTest(phrase=p):
                intent, _ = self._resolve(p)
                self.assertEqual(intent, INTENT_DOCUMENTS)


if __name__ == "__main__":
    unittest.main()
