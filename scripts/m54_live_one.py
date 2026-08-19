"""Single-case variant of the M5.4 live probe, for debugging one utterance."""

from __future__ import annotations

import asyncio
import sys

from m54_live_probe import DEFAULT_URL, Case, run_case


async def main() -> int:
    text = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "en"
    observation = await run_case(DEFAULT_URL, Case("adhoc", language, text))
    print(f"card={observation.show_card!r} units={observation.unit_ids} reply={observation.reply!r}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
