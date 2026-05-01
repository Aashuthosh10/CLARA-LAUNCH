# Voice Latency Sync Verification

This note records the manual verification flow for CLARA's voice latency sync path.

## Preconditions

- Backend is running on `http://localhost:6969`.
- Frontend is running on `http://localhost:5176`.
- WebSocket endpoint is `ws://localhost:6969/ws/clara`.
- Voice provider credentials and audio settings are configured in `.env`.

## Verification Commands

Run from the repository root:

```powershell
python -m backend.tools.latency_probe --url ws://localhost:6969/ws/clara --turns 5 --language English --timeout 25 --origin http://localhost:5176
python -m backend.tools.latency_benchmark --turns 5 --label sync-pass --output backend/tools/sync_pass_benchmark.json
```

## Pass Criteria

- WebSocket connection succeeds with the frontend origin.
- Turns complete without protocol errors.
- Timing payloads are present when performance debug timings are enabled.
- `isSpeaking` behavior matches the expected TTS path for the current environment.

## Notes

- This is a runtime/manual verification check, not a deterministic CI test.
- Cloud-provider latency and rate limits can affect p95/p99 results.
