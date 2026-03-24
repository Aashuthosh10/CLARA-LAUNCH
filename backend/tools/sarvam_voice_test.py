"""Standalone Sarvam TTS voice test for CLARA.

Uses the same config/env wiring as the backend so we can
confirm the actual speaker and pace being used.
Writes a WAV file at the project root for manual listening.
"""

from __future__ import annotations

import base64
from pathlib import Path
import sys

from dotenv import load_dotenv

# Ensure project root is importable whether run as module or script.
THIS_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = THIS_DIR.parent
PROJECT_ROOT = BACKEND_ROOT.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config.settings import BASE_DIR, SARVAM_API_KEY, SARVAM_TTS_PACE, SARVAM_TTS_SPEAKER


def main() -> None:
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    if not SARVAM_API_KEY:
        raise SystemExit("SARVAM_API_KEY is not set; check your .env file.")

    try:
        from sarvamai import SarvamAI
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(f"sarvamai package is not installed in this environment: {exc}") from exc

    print(f"Using Sarvam speaker='{SARVAM_TTS_SPEAKER}', pace={SARVAM_TTS_PACE}")

    client = SarvamAI(api_subscription_key=SARVAM_API_KEY)
    result = client.text_to_speech.convert(
        text="Hi, I am CLARA speaking with the configured Sarvam voice.",
        model="bulbul:v3",
        target_language_code="en-IN",
        speaker=SARVAM_TTS_SPEAKER,
        pace=SARVAM_TTS_PACE,
    )

    audios = getattr(result, "audios", None)
    if not audios:
        raise SystemExit("Sarvam TTS returned no audio chunks.")

    # Use the first audio chunk for this test.
    wav_bytes = base64.b64decode(audios[0])
    out_path = BASE_DIR / "backend" / "tools" / "assets" / "sarvam_voice_test.wav"
    out_path.write_bytes(wav_bytes)
    print(f"Wrote test audio to: {out_path}")


if __name__ == "__main__":
    main()

