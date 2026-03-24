import unittest

from backend.core.language_detection import detect_language


class TestLangDetect(unittest.TestCase):
    def test_detect_kannada_script(self) -> None:
        res = detect_language("ನಮಸ್ಕಾರ ಕ್ಲಾರಾ", threshold=0.70)
        self.assertEqual(res.lang_key, "kn")
        self.assertGreaterEqual(res.confidence, 0.70)

    def test_detect_hindi_script(self) -> None:
        res = detect_language("नमस्ते क्लारा", threshold=0.70)
        self.assertEqual(res.lang_key, "hi")

    def test_stt_meta_override(self) -> None:
        res = detect_language(
            "hello there",
            stt_meta={"language_code": "ta-IN", "language_confidence": 0.92},
            threshold=0.70,
        )
        self.assertEqual(res.lang_key, "ta")
        self.assertEqual(res.method, "stt_metadata")

    def test_low_confidence_falls_back_to_english(self) -> None:
        res = detect_language(
            "hello",
            stt_meta={"language_code": "te-IN", "language_confidence": 0.2},
            threshold=0.70,
        )
        self.assertEqual(res.lang_key, "en")
        self.assertIn(res.method, {"threshold_fallback", "latin_fallback"})


if __name__ == "__main__":
    unittest.main()
