"""Production and path-scope controls for the temporary agent debug log."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.app import main


class DebugLoggingSecurityTest(unittest.TestCase):
    def test_debug_file_is_disabled_in_strict_production(self) -> None:
        with patch.object(main, "PRODUCTION_STRICT_READY", True), patch.object(
            Path, "open"
        ) as open_file:
            main._agent_debug_ndjson("test", "test", "test", {"text_len": 1})
        open_file.assert_not_called()

    def test_debug_file_stays_under_project_root(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            project_root = Path(temp_dir) / "app"
            project_root.mkdir()
            with patch.object(main, "PRODUCTION_STRICT_READY", False), patch.object(
                main, "_PROJECT_ROOT", project_root
            ):
                main._agent_debug_ndjson("test", "test", "test", {"text_len": 1})

            self.assertTrue((project_root / "debug-ba7e8c.log").is_file())
            self.assertFalse((project_root.parent / "debug-ba7e8c.log").exists())


if __name__ == "__main__":
    unittest.main()
