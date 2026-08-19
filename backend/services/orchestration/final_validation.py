"""Final turn integrity validation (Milestone 3.5)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from backend.services.orchestration.presentation_bundle import PresentationBundle
from backend.services.orchestration.response_authority import ResponseAuthority
from backend.services.orchestration.types import ConversationResolution


@dataclass
class TurnIntegrityResult:
    ok: bool
    failures: list[str] = field(default_factory=list)


def validate_turn_integrity(
    resolution: ConversationResolution,
    bundle: PresentationBundle | None = None,
) -> TurnIntegrityResult:
    failures: list[str] = []
    bundle = bundle if bundle is not None else resolution.presentation_bundle

    if not resolution.authority_sealed:
        failures.append("authority_not_sealed")
    if not resolution.response_authority:
        failures.append("authority_missing")
    else:
        try:
            auth = ResponseAuthority(resolution.response_authority)
        except ValueError:
            failures.append("authority_invalid")
            return TurnIntegrityResult(ok=False, failures=failures)

        if auth == ResponseAuthority.CARD_PRESENTATION:
            if bundle is None:
                failures.append("card_authority_requires_bundle")
            else:
                if not isinstance(bundle, PresentationBundle):
                    failures.append("bundle_not_immutable_type")
                else:
                    if not bundle.contract_hash:
                        failures.append("bundle_missing_contract_hash")
                    if bundle.language_code != resolution.language_code_key:
                        failures.append("bundle_language_mismatch")
                    if not bundle.segments:
                        failures.append("bundle_empty_segments")
        else:
            if bundle is not None and auth != ResponseAuthority.CARD_PRESENTATION:
                failures.append("non_card_authority_must_not_have_bundle")

        if auth == ResponseAuthority.RETRY_TEMPLATE:
            if resolution.should_call_groq or resolution.should_call_rag or resolution.should_generate_presentation:
                failures.append("retry_flags_inconsistent")
        if auth == ResponseAuthority.FAQ:
            if resolution.should_call_groq or resolution.should_call_rag:
                failures.append("faq_flags_inconsistent")
        if auth == ResponseAuthority.GROQ:
            if resolution.should_generate_presentation and not resolution.degraded:
                failures.append("groq_must_not_generate_presentation")
        if auth == ResponseAuthority.CARD_PRESENTATION:
            if resolution.should_call_rag:
                failures.append("card_must_not_rag")

    return TurnIntegrityResult(ok=len(failures) == 0, failures=failures)
