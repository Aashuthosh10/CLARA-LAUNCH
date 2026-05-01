#!/usr/bin/env python3
"""Probe backend VAD capture behavior for configured profiles.

Runs record_audio() in VAD mode with env overrides and prints capture outcome and duration.
Useful for validating timeout/stop behavior and comparing profiles consistently.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


_ROOT = Path(__file__).resolve().parents[2]


def _run_once(profile: dict[str, str], repeat: int) -> dict[str, Any]:
    code = (
        "import json, time;"
        "from backend.core.audio_pipeline import record_audio;"
        "t=time.perf_counter();"
        "wav,err,meta=record_audio();"
        "d=(time.perf_counter()-t)*1000.0;"
        "print(json.dumps({'err':err,'wav_bytes':len(wav) if wav else 0,'meta':meta,'wall_ms':round(d,2)}))"
    )
    samples: list[dict[str, Any]] = []
    for _ in range(repeat):
        env = os.environ.copy()
        env.update(profile)
        proc = subprocess.run(
            [sys.executable, "-c", code],
            cwd=str(_ROOT),
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        line = (proc.stdout or "").strip().splitlines()[-1] if (proc.stdout or "").strip() else ""
        try:
            payload = json.loads(line) if line else {"err": "NO_OUTPUT", "wav_bytes": 0, "meta": {}, "wall_ms": 0}
        except Exception:
            payload = {"err": "PARSE_ERROR", "wav_bytes": 0, "meta": {"stdout": proc.stdout, "stderr": proc.stderr}, "wall_ms": 0}
        samples.append(payload)
    return {"profile": profile, "samples": samples}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repeat", type=int, default=2)
    args = parser.parse_args()

    profiles = [
        {
            "name": "current_800_9000",
            "AUDIO_RECORD_MODE": "vad",
            "AUDIO_SILENCE_STOP_MS": "800",
            "AUDIO_MAX_UTTERANCE_MS": "9000",
            "AUDIO_VAD_AGGRESSIVENESS": "2",
        },
        {
            "name": "balanced_700_8000",
            "AUDIO_RECORD_MODE": "vad",
            "AUDIO_SILENCE_STOP_MS": "700",
            "AUDIO_MAX_UTTERANCE_MS": "8000",
            "AUDIO_VAD_AGGRESSIVENESS": "2",
        },
        {
            "name": "safer_900_9000",
            "AUDIO_RECORD_MODE": "vad",
            "AUDIO_SILENCE_STOP_MS": "900",
            "AUDIO_MAX_UTTERANCE_MS": "9000",
            "AUDIO_VAD_AGGRESSIVENESS": "2",
        },
    ]

    out: list[dict[str, Any]] = []
    for p in profiles:
        named = dict(p)
        name = named.pop("name")
        result = _run_once(named, args.repeat)
        result["name"] = name
        out.append(result)

    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
