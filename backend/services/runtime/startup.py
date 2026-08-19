"""Startup integrity checks for runtime / locales."""

from __future__ import annotations

import logging
from pathlib import Path

from backend.config.settings import RUNTIME_STRICT_STARTUP
from backend.services.orchestration.architecture_linter import run_architecture_lint_at_startup
from backend.services.runtime.diagnostics import log_runtime_event

logger = logging.getLogger(__name__)

_LOCALE_IDS = ("en", "hi", "kn", "ta", "te", "ml")


def run_startup_integrity() -> bool:
    """
    Validate locale resources, runtime config, and architecture ownership.
    Returns True if OK. Soft-warn by default; hard-fail only when RUNTIME_STRICT_STARTUP.
    """
    root = Path(__file__).resolve().parents[2] / "data" / "locales"
    missing = [lid for lid in _LOCALE_IDS if not (root / f"{lid}.json").is_file()]
    ok = not missing
    if missing:
        msg = f"Missing locale files: {', '.join(missing)} under {root}"
        if RUNTIME_STRICT_STARTUP:
            logger.error("STARTUP_INTEGRITY_FAIL %s", msg)
            log_runtime_event("STARTUP_INTEGRITY_FAIL", reason=msg)
            raise RuntimeError(msg)
        logger.warning("STARTUP_INTEGRITY_WARN %s", msg)
        log_runtime_event("STARTUP_INTEGRITY_WARN", reason=msg)
        # Still run architecture lint (warn mode) before returning.
        run_architecture_lint_at_startup()
        return False
    logger.info("STARTUP_INTEGRITY_OK locales=%s", ",".join(_LOCALE_IDS))
    log_runtime_event("STARTUP_INTEGRITY_OK", locales=list(_LOCALE_IDS))
    arch_ok = run_architecture_lint_at_startup()
    return ok and arch_ok
