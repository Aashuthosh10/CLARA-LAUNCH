"""Runtime integrity layer (Milestone 2) — validate / sync only; no business ownership."""

from backend.services.runtime.context import (
    freeze_localization,
    get_runtime_context,
    release_localization,
    sync_runtime_from_session,
)
from backend.services.runtime.conversation_snapshot import (
    ConversationSnapshot,
    build_conversation_snapshot,
    get_last_conversation_snapshot,
    store_conversation_snapshot,
)
from backend.services.runtime.diagnostics import get_runtime_timeline, log_runtime_event
from backend.services.runtime.localization import verify_localization_consistency
from backend.services.runtime.ownership import validate_callback_token
from backend.services.runtime.presentation_contract import validate_presentation_contract
from backend.services.runtime.presentation_integrity import validate_before_narration_plan
from backend.services.runtime.startup import run_startup_integrity
from backend.services.runtime.translation_cache import get_cached_translation, put_cached_translation
from backend.services.runtime.turn_finalizer import (
    finalize_turn,
    is_turn_finalized,
    reject_if_finalized,
    reject_late_callback,
)
from backend.services.runtime.types import PresentationContractResult

__all__ = [
    "ConversationSnapshot",
    "PresentationContractResult",
    "build_conversation_snapshot",
    "finalize_turn",
    "freeze_localization",
    "get_cached_translation",
    "get_last_conversation_snapshot",
    "get_runtime_context",
    "get_runtime_timeline",
    "is_turn_finalized",
    "log_runtime_event",
    "put_cached_translation",
    "reject_if_finalized",
    "reject_late_callback",
    "release_localization",
    "run_startup_integrity",
    "store_conversation_snapshot",
    "sync_runtime_from_session",
    "validate_before_narration_plan",
    "validate_callback_token",
    "validate_presentation_contract",
    "verify_localization_consistency",
]
