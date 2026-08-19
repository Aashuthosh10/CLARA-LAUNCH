"""ContentResolver happy-path and wiring-isolation tests."""

from __future__ import annotations

import pathlib
import re
import unittest

from backend.services.content import ContentResolver, ResolveRequest
from backend.services.content.types import (
    SURFACE_DEPARTMENT_FEES,
    SURFACE_DEPARTMENT_OVERVIEW,
    SURFACE_DOCUMENTS,
    SURFACE_FAQ,
    SURFACE_PRINCIPAL,
)


_IMPORT_RE = re.compile(
    r"(?:from\s+backend\.services\.content|import\s+backend\.services\.content)"
)


class TestContentResolver(unittest.TestCase):
    def setUp(self) -> None:
        self.resolver = ContentResolver()

    def test_department_overview_resolves(self) -> None:
        content = self.resolver.resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_OVERVIEW,
                department="CSE",
                language="English",
                language_code="en",
            )
        )
        self.assertIsNotNone(content)
        assert content is not None
        self.assertEqual(content.surface, SURFACE_DEPARTMENT_OVERVIEW)
        self.assertTrue(content.title.strip())
        self.assertTrue(content.summary.strip())
        self.assertTrue(content.canonical_source)
        self.assertTrue(content.hash)
        self.assertTrue(content.sections)

    def test_fees_resolves(self) -> None:
        content = self.resolver.resolve(
            ResolveRequest(
                surface=SURFACE_DEPARTMENT_FEES,
                department="CSE",
                language="English",
                language_code="en",
            )
        )
        self.assertIsNotNone(content)
        assert content is not None
        self.assertEqual(content.surface, SURFACE_DEPARTMENT_FEES)
        self.assertTrue(content.title.strip())
        self.assertIn("_FEES_AMOUNT_BY_KEY", content.canonical_source)

    def test_documents_resolves(self) -> None:
        content = self.resolver.resolve(
            ResolveRequest(
                surface=SURFACE_DOCUMENTS,
                language="English",
                language_code="en",
            )
        )
        self.assertIsNotNone(content)
        assert content is not None
        self.assertEqual(content.surface, SURFACE_DOCUMENTS)
        self.assertTrue(content.title.strip())
        self.assertGreater(len(content.sections), 0)

    def test_principal_resolves(self) -> None:
        content = self.resolver.resolve(
            ResolveRequest(
                surface=SURFACE_PRINCIPAL,
                language="English",
                language_code="en",
            )
        )
        self.assertIsNotNone(content)
        assert content is not None
        self.assertEqual(content.surface, SURFACE_PRINCIPAL)
        self.assertTrue(content.title.strip())
        self.assertIn("EXEC_PRINCIPAL", content.canonical_source)

    def test_faq_resolves(self) -> None:
        content = self.resolver.resolve(
            ResolveRequest(
                surface=SURFACE_FAQ,
                language="English",
                language_code="en",
                faq_question="Is SVIT a private college or government college?",
            )
        )
        self.assertIsNotNone(content)
        assert content is not None
        self.assertEqual(content.surface, SURFACE_FAQ)
        self.assertTrue(content.summary.strip())
        self.assertIn("faq", content.canonical_source.lower())

    def test_unknown_surface_returns_none(self) -> None:
        content = self.resolver.resolve(
            ResolveRequest(surface="not_a_real_surface", language_code="en")
        )
        self.assertIsNone(content)

    def test_no_production_wiring(self) -> None:
        """M4.2: app/main may import SurfaceSelector only; forbid other content modules."""
        backend = pathlib.Path(__file__).resolve().parents[1]
        roots = (backend / "app",)
        allowed = re.compile(
            r"from\s+backend\.services\.content\.surface_selector\s+import"
            r"|import\s+backend\.services\.content\.surface_selector"
        )
        forbidden = re.compile(
            r"from\s+backend\.services\.content(?!\.surface_selector)\b"
            r"|import\s+backend\.services\.content(?!\.surface_selector)\b"
        )
        offenders: list[str] = []
        for root in roots:
            if not root.is_dir():
                continue
            for path in root.rglob("*.py"):
                text = path.read_text(encoding="utf-8", errors="ignore")
                if forbidden.search(text) and not (
                    # entire file only uses surface_selector — still flag other content imports
                    False
                ):
                    # Flag lines that import content packages other than surface_selector
                    for i, line in enumerate(text.splitlines(), 1):
                        if "backend.services.content" in line and "surface_selector" not in line:
                            if line.strip().startswith("#"):
                                continue
                            offenders.append(f"{path.relative_to(backend)}:{i}")
        self.assertEqual(offenders, [], msg=f"app imports non-selector content: {offenders}")
        # Ensure surface_selector import remains the allowed path when present
        main_py = backend / "app" / "main.py"
        if main_py.is_file() and "surface_selector" in main_py.read_text(encoding="utf-8"):
            self.assertTrue(allowed.search(main_py.read_text(encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
