"""
M5.4 live acceptance probe — real backend on :6969, no mocked socket.

Drives the production WebSocket the way the kiosk does and records, per turn:
the response mode the backend chose, the card surface it emitted, and the
narration_plan unitIds with their order.

Usage:
    python scripts/m54_live_probe.py [--url ws://127.0.0.1:6969/ws/clara]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from dataclasses import dataclass, field

import websockets

DEFAULT_URL = "ws://127.0.0.1:6969/ws/clara"
ORIGIN = "http://localhost:5176"

LANGUAGE_NAMES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
}


@dataclass
class Case:
    label: str
    language: str
    text: str
    expect_units: tuple[str, ...] | None = None
    expect_card: bool | None = None


@dataclass
class Observation:
    case: Case
    show_card: str | None = None
    unit_ids: list[str] = field(default_factory=list)
    reply: str = ""

    @property
    def ok(self) -> bool:
        if self.case.expect_units is not None and tuple(self.unit_ids) != self.case.expect_units:
            return False
        if self.case.expect_card is False and self.show_card:
            return False
        if self.case.expect_card is True and not self.show_card:
            return False
        return True


CASES: tuple[Case, ...] = (
    # Composition, English
    Case("A single unit", "en", "What is the fee for CSE Data Science?", ("cse_ds.fees",)),
    Case("B multi entity", "en", "Who are the HODs of AIML, Data Science and CSE?",
         ("cse_aiml.hod", "cse_ds.hod", "cse.hod")),
    Case("C multi topic", "en", "CSE fees and HOD", ("cse.fees", "cse.hod")),
    Case("D mixed families", "en", "Data Science overview, AIML HOD and CSE fees",
         ("cse_ds.overview", "cse_aiml.hod", "cse.fees")),
    Case("E full deck", "en", "Tell me about CSE",
         ("cse.overview", "cse.hod", "cse.achievements", "cse.placements", "cse.fees")),
    # Six-language identity
    Case("G kannada", "kn", "ಡೇಟಾ ಸೈನ್ಸ್ ಶುಲ್ಕ", ("cse_ds.fees",)),
    Case("G hindi", "hi", "डेटा साइंस फीस", ("cse_ds.fees",)),
    Case("G tamil", "ta", "டேட்டா சயின்ஸ் கட்டணம்", ("cse_ds.fees",)),
    Case("G telugu", "te", "డేటా సైన్స్ ఫీజు", ("cse_ds.fees",)),
    Case("G malayalam", "ml", "ഡാറ്റാ സയൻസ് ഫീസ്", ("cse_ds.fees",)),
    Case("H code switch", "kn", "AIML HOD yaaru", ("cse_aiml.hod",)),
    # Fail closed / clarify / answer / fallback
    Case("J bare hod", "en", "Who is the HOD?", expect_card=False),
    Case("K unlisted dept", "en", "Quantum Basket Weaving HOD", expect_card=False),
    Case("E' unbindable", "en", "tell me about CSE and AIML", expect_card=False),
    Case("L institutional", "en", "How good are the teachers here?", expect_card=False),
    Case("L campus life", "en", "Campus life?", expect_card=False),
    Case("M off domain", "en", "What is the capital of France?", expect_card=False),
    Case("N external compare", "en", "Compare SVIT with Harvard", expect_card=False),
)


def unit_ids_from_plan(plan: object) -> list[str]:
    if not isinstance(plan, dict):
        return []
    out: list[str] = []
    for segment in plan.get("segments") or []:
        if isinstance(segment, dict):
            uid = segment.get("unitId")
            if isinstance(uid, str) and uid.strip():
                out.append(uid.strip())
    return out


async def drain_until_settled(ws, observation: Observation | None, seconds: float) -> None:
    """Read frames until the turn's final audio frame, or the window closes."""
    try:
        async with asyncio.timeout(seconds):
            while True:
                payload = json.loads(await ws.recv())
                body = payload.get("payload") if isinstance(payload, dict) else None
                if not isinstance(body, dict):
                    continue
                if observation is not None:
                    if body.get("showCard"):
                        observation.show_card = str(body["showCard"])
                    ids = unit_ids_from_plan(body.get("narration_plan"))
                    if ids and not observation.unit_ids:
                        observation.unit_ids = ids
                    messages = body.get("messages")
                    if isinstance(messages, list) and messages:
                        last = messages[-1]
                        if isinstance(last, dict) and isinstance(last.get("text"), str):
                            observation.reply = last["text"].strip()
                if body.get("tts_streaming") is False:
                    return
    except TimeoutError:
        return


async def run_case(url: str, case: Case) -> Observation:
    observation = Observation(case=case)
    # Pings are disabled: the server's legacy websockets stack can fault while
    # interleaving a pong with a large base64 audio frame, which is a transport
    # artefact of the probe rather than anything the turn did.
    async with websockets.connect(url, origin=ORIGIN, max_size=None, ping_interval=None) as ws:
        await ws.send(
            json.dumps({"action": "language_selected", "language": LANGUAGE_NAMES[case.language]})
        )
        await drain_until_settled(ws, None, 20)

        # The turn after language selection is the guest-name prompt.
        await ws.send(json.dumps({"action": "user_message", "text": "Naveen"}))
        await drain_until_settled(ws, None, 25)

        await ws.send(json.dumps({"action": "user_message", "text": case.text}))
        await drain_until_settled(ws, observation, 60)
    return observation


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    args = parser.parse_args()

    failures = 0
    print(f"M5.4 live probe against {args.url}\n")
    for case in CASES:
        try:
            observation = await run_case(args.url, case)
        except Exception as exc:  # noqa: BLE001 - probe reports, never raises
            print(f"[ERROR] {case.label:<20} {case.text!r}: {exc}")
            failures += 1
            continue

        status = "PASS" if observation.ok else "FAIL"
        failures += 0 if observation.ok else 1
        print(
            f"[{status}] {case.label:<20} lang={case.language} "
            f"card={observation.show_card or '-'} units={observation.unit_ids or '-'}",
            flush=True,
        )
        if not observation.ok:
            print(f"         text={case.text!r}", flush=True)
            print(f"         expected units={case.expect_units} card={case.expect_card}", flush=True)
            print(f"         reply={observation.reply[:160]!r}", flush=True)

    print(f"\n{len(CASES) - failures}/{len(CASES)} live cases passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
