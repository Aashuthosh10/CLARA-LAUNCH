# M5.5 isolated semantic-model benchmark

This directory is **not** part of CLARA production.

It compares three Groq models as semantic-understanding proposers using one prompt, one schema, and one golden set.

Do not import `backend.services.*`. Do not write `unitId`. Do not change `.env`.

## Run

From the repo root (`CLARA-LAUNCH`):

```powershell
python benchmarks/m55_semantic_models/benchmark_runner.py --probe-only
python benchmarks/m55_semantic_models/benchmark_runner.py --repeats 3
```

Outputs:

- `benchmarks/m55_semantic_models/results/latest.json`
- `results/m55_model_benchmark.json`
- `docs/M5_5_LLM_MODEL_BENCHMARK.md`

## Schema note

Mission sketch used `scope: single | multi`. M5.4 `ResponseDecision.scope` is `single | full_department`. This harness follows M5.4. Multiple cards are ordered `items`.
