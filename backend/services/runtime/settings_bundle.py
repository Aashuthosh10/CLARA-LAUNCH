"""Central settings bundles for runtime integrity (read from config.settings)."""

from __future__ import annotations

from dataclasses import dataclass

from backend.config import settings as cfg


@dataclass(frozen=True)
class ConversationSettings:
    intent_confidence_threshold: float = cfg.INTENT_CONFIDENCE_THRESHOLD


@dataclass(frozen=True)
class LocalizationSettings:
    freeze_enabled: bool = True
    verify_strict: bool = True


@dataclass(frozen=True)
class PresentationSettings:
    contract_enforced: bool = True


@dataclass(frozen=True)
class RuntimeSettings:
    diagnostics: bool = cfg.RUNTIME_DIAGNOSTICS
    ownership_enforce: bool = cfg.RUNTIME_OWNERSHIP_ENFORCE
    strict_startup: bool = cfg.RUNTIME_STRICT_STARTUP
    timeline_max: int = cfg.RUNTIME_TIMELINE_MAX


def get_conversation_settings() -> ConversationSettings:
    return ConversationSettings()


def get_localization_settings() -> LocalizationSettings:
    return LocalizationSettings(
        freeze_enabled=cfg.LOCALIZATION_FREEZE_ENABLED,
        verify_strict=cfg.LOCALIZATION_VERIFY_STRICT,
    )


def get_presentation_settings() -> PresentationSettings:
    return PresentationSettings(contract_enforced=cfg.PRESENTATION_CONTRACT_ENFORCED)


def get_runtime_settings() -> RuntimeSettings:
    return RuntimeSettings()
