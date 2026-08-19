"""Presentation integrity pre-flight — calls localization + contract (validate only)."""

from __future__ import annotations

from typing import Any, Sequence

from backend.services.runtime.diagnostics import log_runtime_event
from backend.services.runtime.localization import verify_localization_consistency
from backend.services.runtime.presentation_contract import validate_presentation_contract
from backend.services.runtime.types import PresentationContractResult


def validate_before_narration_plan(
    session: dict[str, Any],
    segments: Sequence[Any] | None,
    *,
    plan_lang_key: str,
    tts_lang_code: str | None = None,
    expected_card_count: int | None = None,
    turn_id: str | None = None,
) -> PresentationContractResult:
    loc = verify_localization_consistency(
        session, plan_lang_key=plan_lang_key, tts_lang_code=tts_lang_code
    )
    if not loc.ok:
        log_runtime_event(
            "LOCALE_VERIFY_FAIL",
            reason=loc.reason,
            turn_id=turn_id,
            language=loc.display_lang,
            expected=loc.conversation_lang,
            actual=loc.caption_lang,
        )
        result = validate_presentation_contract(
            segments, expected_card_count=expected_card_count, language_verified=False
        )
        # Force failure if locale failed even if contract somehow passed.
        if result.ok:
            from backend.services.runtime.types import ContractFailure

            result.ok = False
            result.failures.append(
                ContractFailure(reason=loc.reason or "language_not_verified", expected=True, actual=False)
            )
        return result

    result = validate_presentation_contract(
        segments,
        expected_card_count=expected_card_count,
        language_verified=True,
    )
    if result.ok:
        log_runtime_event(
            "PRESENTATION_CONTRACT_OK",
            turn_id=turn_id,
            language=loc.display_lang,
            counts=result.counts,
        )
    else:
        primary = result.failures[0] if result.failures else None
        log_runtime_event(
            "PRESENTATION_CONTRACT_FAILED",
            reason=primary.reason if primary else "unknown",
            expected=primary.expected if primary else None,
            actual=primary.actual if primary else None,
            turn_id=turn_id,
            language=loc.display_lang,
            counts=result.counts,
        )
    return result
