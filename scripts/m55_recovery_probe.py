"""M5.5 recovery live probe — real WebSocket, no mocks."""

from __future__ import annotations

import asyncio
import json
import sys

import websockets

URL = "ws://127.0.0.1:6969/ws/clara"
ORIGIN = "http://localhost:5176"

NORMAL_ANSWER_QUESTIONS = (
    "How good are the teachers here?",
    "How is campus life?",
    "Is there a library?",
    "Are there industrial visits?",
    "What is special about SVIT?",
    "Do students get internship opportunities?",
    "How are placements?",
    "Are students encouraged to participate in hackathons?",
    "What is the college environment like?",
    "What facilities are available?",
)

CARD_CASES = (
    ("CSE HOD", "Who is the HOD of CSE?", ("cse.hod",)),
    ("DS HOD", "Who is the HOD of Data Science?", ("cse_ds.hod",)),
    ("AIML HOD", "Who is the HOD of AIML?", ("cse_aiml.hod",)),
    ("Multi 2", "Data Science overview and AIML HOD", ("cse_ds.overview", "cse_aiml.hod")),
    ("Multi 3", "Data Science fees and AIML HOD and CSE overview",
     ("cse_ds.fees", "cse_aiml.hod", "cse.overview")),
)


async def drain_turn(ws, question: str, timeout_s: float = 90.0) -> dict:
    await ws.send(json.dumps({"action": "user_message", "text": question}))
    show_card = None
    unit_ids: list[str] = []
    reply = ""
    has_audio = False
    try:
        async with asyncio.timeout(timeout_s):
            while True:
                raw = await ws.recv()
                body = json.loads(raw).get("payload") or {}
                if body.get("showCard"):
                    show_card = str(body["showCard"])
                plan = body.get("narration_plan")
                if isinstance(plan, dict):
                    unit_ids = []
                    for seg in plan.get("segments") or []:
                        if isinstance(seg, dict):
                            uid = seg.get("unitId")
                            if isinstance(uid, str) and uid.strip():
                                unit_ids.append(uid.strip())
                if body.get("audioBase64"):
                    has_audio = True
                msgs = body.get("messages") or []
                if msgs and isinstance(msgs[-1], dict):
                    reply = str(msgs[-1].get("text") or "").strip()
                if body.get("tts_streaming") is False and reply:
                    return {
                        "showCard": show_card,
                        "unitIds": unit_ids,
                        "reply": reply,
                        "has_audio": has_audio,
                        "unavailable": "admission office" in reply.lower(),
                    }
    except TimeoutError:
        return {
            "showCard": show_card,
            "unitIds": unit_ids,
            "reply": reply,
            "has_audio": has_audio,
            "unavailable": "admission office" in reply.lower(),
            "timeout": True,
        }
    return {
        "showCard": show_card,
        "unitIds": unit_ids,
        "reply": reply,
        "has_audio": has_audio,
        "unavailable": "admission office" in reply.lower(),
    }


async def setup_session(ws) -> None:
    await ws.send(json.dumps({"action": "language_selected", "language": "English"}))
    await asyncio.sleep(2)
    await ws.send(json.dumps({"action": "user_message", "text": "RecoveryProbe"}))
    await asyncio.sleep(3)


async def main() -> int:
    failures = 0
    print(f"M5.5 recovery probe -> {URL}\n")

    async with websockets.connect(URL, origin=ORIGIN, max_size=None, ping_interval=None) as ws:
        await setup_session(ws)

        print("=== NORMAL ANSWER QUESTIONS ===")
        for q in NORMAL_ANSWER_QUESTIONS:
            obs = await drain_turn(ws, q)
            ok = (
                not obs.get("showCard")
                and not obs.get("unavailable")
                and bool(obs.get("reply"))
                and not obs.get("timeout")
            )
            status = "PASS" if ok else "FAIL"
            failures += 0 if ok else 1
            print(f"[{status}] {q!r}")
            if not ok:
                print(f"         {obs}")

        print("\n=== CARD CASES ===")
        for label, q, expected in CARD_CASES:
            obs = await drain_turn(ws, q, timeout_s=120)
            got = tuple(obs.get("unitIds") or [])
            ok = got == expected and not obs.get("timeout")
            status = "PASS" if ok else "FAIL"
            failures += 0 if ok else 1
            print(f"[{status}] {label}: expected={expected} got={got}")

    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
