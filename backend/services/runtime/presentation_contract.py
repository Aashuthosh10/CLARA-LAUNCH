"""Mandatory Presentation Contract — validate only; never repair."""

from __future__ import annotations

from typing import Any, Sequence

from backend.services.runtime.types import ContractFailure, PresentationContractResult


def _seg_field(seg: Any, snake: str, camel: str) -> Any:
    if isinstance(seg, dict):
        if camel in seg:
            return seg.get(camel)
        return seg.get(snake)
    return getattr(seg, snake, None)


def validate_presentation_contract(
    segments: Sequence[Any] | None,
    *,
    expected_card_count: int | None = None,
    language_verified: bool = False,
) -> PresentationContractResult:
    """
    Enforce:
      card_count == scene_count == narration_count == caption_count
      == expected_audio_count == presentation_index_count
    Fail-closed. No silent repair.
    """
    failures: list[ContractFailure] = []
    segs = list(segments or [])
    n = len(segs)
    counts = {
        "cardCount": n if expected_card_count is None else expected_card_count,
        "sceneCount": n,
        "narrationCount": n,
        "captionCount": 0,
        "audioCount": 0,
        "indexCount": n,
    }

    if n == 0:
        failures.append(ContractFailure(reason="empty_segments", expected=">=1", actual=0))
        return PresentationContractResult(ok=False, failures=failures, counts=counts)

    if expected_card_count is not None and expected_card_count != n:
        failures.append(
            ContractFailure(
                reason="card_scene_count_mismatch",
                expected=expected_card_count,
                actual=n,
            )
        )

    if not language_verified:
        failures.append(ContractFailure(reason="language_not_verified", expected=True, actual=False))

    indices: list[int] = []
    segment_ids: list[str] = []
    card_ids_seen: dict[str, int] = {}

    for i, seg in enumerate(segs):
        display = str(_seg_field(seg, "display_text", "displayText") or "").strip()
        tts = str(_seg_field(seg, "tts_text", "ttsText") or "").strip()
        raw_idx = _seg_field(seg, "card_index", "cardIndex")
        seg_id = str(_seg_field(seg, "segment_id", "segmentId") or "").strip()
        card_id = _seg_field(seg, "card_id", "cardId")

        if display:
            counts["captionCount"] += 1
        else:
            failures.append(ContractFailure(reason="missing_caption", expected="non-empty displayText", actual=i))

        if tts:
            counts["audioCount"] += 1
        else:
            failures.append(ContractFailure(reason="empty_narration_tts", expected="non-empty ttsText", actual=i))

        if not display and not tts:
            failures.append(ContractFailure(reason="empty_narration", expected="text", actual=i))

        if isinstance(raw_idx, int) and not isinstance(raw_idx, bool):
            indices.append(raw_idx)
        elif raw_idx is None:
            failures.append(ContractFailure(reason="missing_card_index", expected=i, actual=None))
        else:
            try:
                indices.append(int(raw_idx))
            except (TypeError, ValueError):
                failures.append(ContractFailure(reason="invalid_card_index", expected=i, actual=raw_idx))

        if seg_id:
            if seg_id in segment_ids:
                failures.append(ContractFailure(reason="duplicate_scene_id", expected="unique", actual=seg_id))
            segment_ids.append(seg_id)
        else:
            failures.append(ContractFailure(reason="missing_scene_id", expected="segmentId", actual=i))

        if isinstance(card_id, str) and card_id.strip():
            # Same cardId may repeat across slides of one deck (e.g. dept_slide);
            # duplicate collision = same cardId with different cardIndex conflict only when
            # two segments share segment identity. Track (cardId, cardIndex) uniqueness via index.
            key = f"{card_id.strip()}#{indices[-1] if indices else i}"
            if key in card_ids_seen:
                failures.append(ContractFailure(reason="duplicate_card_identity", expected="unique", actual=key))
            card_ids_seen[key] = i

    if len(indices) == n:
        if len(set(indices)) != n:
            failures.append(ContractFailure(reason="duplicate_card_index", expected="unique", actual=indices))
        expected_seq = list(range(n))
        if sorted(indices) != expected_seq:
            failures.append(
                ContractFailure(reason="card_index_not_continuous", expected=expected_seq, actual=indices)
            )
        if indices != expected_seq:
            # Allow sorted continuous but require ascending order for presentation index count.
            failures.append(
                ContractFailure(reason="card_index_order", expected=expected_seq, actual=indices)
            )

    # Count equality contract
    if not (
        counts["sceneCount"]
        == counts["narrationCount"]
        == counts["captionCount"]
        == counts["audioCount"]
        == counts["indexCount"]
    ):
        failures.append(
            ContractFailure(
                reason="count_equality_failed",
                expected="all_equal",
                actual=dict(counts),
            )
        )
    if expected_card_count is not None and counts["cardCount"] != counts["sceneCount"]:
        failures.append(
            ContractFailure(
                reason="card_count_mismatch",
                expected=counts["cardCount"],
                actual=counts["sceneCount"],
            )
        )

    ok = len(failures) == 0
    return PresentationContractResult(ok=ok, failures=failures, counts=counts)
