"""Phase T1 integration tests at cache and provider request boundaries."""

from __future__ import annotations

import asyncio
import hashlib
import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from backend.app import main
from backend.clients import provider_clients
from backend.services.narration_plan import NarrationSegment, finalize_segment_list
from backend.services.orchestration.presentation_bundle import build_presentation_bundle
from backend.services.tts_orchestrator import plan_response_tts, tts_cache_material


def test_cache_boundary_sanitizes_before_lookup_and_provider() -> None:
    provider = AsyncMock(return_value="audio")
    cache = MagicMock()
    cache.get.return_value = None

    with patch.object(main, "sarvam_tts_to_base64", provider), patch.object(main, "TTS_CACHE", cache):
        audio, hit = asyncio.run(
            main.tts_to_base64_cached(
                "# CSE Fees\n- Pay **₹45,000**. cse.hod",
                "en-IN",
                allow_english_fallback=False,
            )
        )

    assert (audio, hit) == ("audio", False)
    provider.assert_awaited_once_with("CSE Fees Pay ₹45,000.", "en-IN")
    key_material = provider.await_args.args[0]
    assert "#" not in key_material
    assert "cse.hod" not in key_material
    cache.get.assert_called()
    cache.set.assert_called_once()


def test_empty_sanitized_input_does_not_touch_cache_or_provider() -> None:
    provider = AsyncMock(return_value="audio")
    cache = MagicMock()

    with patch.object(main, "sarvam_tts_to_base64", provider), patch.object(main, "TTS_CACHE", cache):
        result = asyncio.run(
            main.tts_to_base64_cached(
                '{"unitId":"cse.hod","debug":true}',
                "kn-IN",
            )
        )

    assert result == (None, False)
    provider.assert_not_awaited()
    cache.get.assert_not_called()
    cache.set.assert_not_called()


def test_rejected_text_log_is_structured_safe_and_does_not_trigger_fallback(caplog) -> None:
    rejected = '{"unitId":"cse.hod","secretNarration":"DO_NOT_LOG_ME"}'
    provider = AsyncMock(return_value="audio")
    cache = MagicMock()

    with caplog.at_level(logging.WARNING, logger="backend.app.main"), patch.object(
        main,
        "sarvam_tts_to_base64",
        provider,
    ), patch.object(main, "TTS_CACHE", cache):
        result = asyncio.run(
            main.tts_to_base64_cached(
                rejected,
                "kn-IN",
                turn_id="turn-safe-log",
                utterance_kind="card_narration",
            )
        )

    assert result == (None, False)
    cache.get.assert_not_called()
    cache.set.assert_not_called()
    provider.assert_not_awaited()
    assert "TTS_TEXT_REJECTED" in caplog.text
    assert "turn_id=turn-safe-log" in caplog.text
    assert "kind=card_narration" in caplog.text
    assert "lang=kn-IN" in caplog.text
    assert "reason=empty_after_sanitization" in caplog.text
    assert f"narration_chars={len(rejected)}" in caplog.text
    assert rejected not in caplog.text
    assert "DO_NOT_LOG_ME" not in caplog.text
    assert "retrying en-IN" not in caplog.text


def test_actual_sarvam_http_builder_uses_only_sanitized_text() -> None:
    response = SimpleNamespace(
        status_code=200,
        is_success=True,
        json=lambda: {"audio": "audio"},
    )
    client = SimpleNamespace(post=AsyncMock(return_value=response))

    with patch.object(provider_clients, "SARVAM_API_KEY", "test-key"), patch.object(
        provider_clients,
        "get_http_client",
        AsyncMock(return_value=client),
    ):
        audio = asyncio.run(
            provider_clients.sarvam_tts_to_base64(
                "<b>ನಮಸ್ಕಾರ</b> 🎓 cse.hod",
                "kn-IN",
            )
        )

    assert audio == "audio"
    payload = client.post.await_args.kwargs["json"]
    assert payload["text"] == "ನಮಸ್ಕಾರ"
    assert payload["target_language_code"] == "kn-IN"


def test_direct_provider_call_rejects_empty_sanitized_text_without_network() -> None:
    get_client = AsyncMock()
    with patch.object(provider_clients, "SARVAM_API_KEY", "test-key"), patch.object(
        provider_clients,
        "get_http_client",
        get_client,
    ):
        audio = asyncio.run(
            provider_clients.sarvam_tts_to_base64(
                '{"unitId":"cse.fees"}',
                "en-IN",
            )
        )

    assert audio is None
    get_client.assert_not_awaited()


def test_real_narration_plan_reaches_contract_cache_and_provider_in_order() -> None:
    segments = [
        NarrationSegment(
            display_text="# CSE Fees\n**Total:** ₹45,000",
            tts_text="CSE fees are ₹45,000. CSE fees are ₹45,000. (unit_id=cse.fees)",
            card_index=0,
            card_id="department_overview",
            unit_id="cse.fees",
        ),
        NarrationSegment(
            display_text="AI and ML HOD\nDr. Rao",
            tts_text="AI and ML HOD is Dr. Rao.",
            card_index=1,
            card_id="department_overview",
            unit_id="cse_aiml.hod",
        ),
        NarrationSegment(
            display_text="ECE Achievements\nAccredited programme",
            tts_text="ECE achievements are listed.",
            card_index=2,
            card_id="department_overview",
            unit_id="ece.achievements",
        ),
    ]
    original_display = tuple(segment.display_text for segment in segments)
    finalize_segment_list("turn-t1-real-plan", segments)
    bundle = build_presentation_bundle(
        resolution=SimpleNamespace(
            show_card="department_overview",
            language="English",
            language_code_key="en",
            tts_code="en-IN",
        ),
        segments=segments,
        turn_id="turn-t1-real-plan",
    )
    plan = plan_response_tts(
        source_text=bundle.joined_spoken_text(),
        card_segments=list(bundle.spoken_summaries),
    )
    provider = AsyncMock(side_effect=("audio-1", "audio-2", "audio-3"))
    expected_provider_text = (
        "CSE fees are ₹45,000.",
        "AI and ML HOD is Dr. Rao.",
        "ECE achievements are listed.",
    )
    cache_keys = tuple(
        hashlib.sha256(
            tts_cache_material(
                language_code="en-IN",
                speaker=main.SARVAM_TTS_SPEAKER,
                pace=main.SARVAM_TTS_PACE,
                model="bulbul:v3",
                text=text,
            ).encode("utf-8")
        ).hexdigest()
        for text in expected_provider_text
    )
    for key in cache_keys:
        main.TTS_CACHE._store.pop(key, None)

    async def _synthesize_plan() -> None:
        for segment in plan.segments:
            await main.tts_to_base64_cached(
                segment,
                "en-IN",
                allow_english_fallback=False,
            )

    try:
        with patch.object(main, "sarvam_tts_to_base64", provider):
            asyncio.run(_synthesize_plan())

        assert tuple(call.args[0] for call in provider.await_args_list) == expected_provider_text
        assert tuple(call.args[1] for call in provider.await_args_list) == ("en-IN",) * 3
        assert tuple(main.TTS_CACHE.get(key) for key in cache_keys) == (
            "audio-1",
            "audio-2",
            "audio-3",
        )
    finally:
        for key in cache_keys:
            main.TTS_CACHE._store.pop(key, None)

    assert tuple(segment.display_text for segment in segments) == original_display
    assert bundle.display_captions == original_display
    assert plan.segments == list(bundle.spoken_summaries)
    assert [call.args[0] for call in provider.await_args_list].count("CSE fees are ₹45,000.") == 1
