# PostgreSQL + pgvector Setup

CLARA uses local PostgreSQL with pgvector for RAG. Embeddings are generated locally with `sentence-transformers/paraphrase-multilingual-mpnet-base-v2`.

## Environment Variables

Set these in `.env` at the project root.

| Variable | Description | Default |
| --- | --- | --- |
| `POSTGRES_HOST` | PostgreSQL host | `127.0.0.1` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | Database name | `clara_db` |
| `POSTGRES_USER` | Database user | `clara_user` |
| `POSTGRES_PASSWORD` | Required strong password | none |

Other RAG knobs live in `backend/config/settings.py`: `RAG_TOP_K`, `RAG_MAX_TOKENS`, and `COLLEGE_KNOWLEDGE_PATH`.

## Recommended Windows Setup

1. Install Docker Desktop.
2. Copy `.env.example` to `.env`.
3. Set `POSTGRES_PASSWORD` in `.env`.
4. Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\db\init-rag-db.ps1
```

The script starts `clara-postgres`, waits for health, aligns the database role password with `.env`, creates the configured database if needed, and applies `scripts/db/init_pgvector.sql`.

## Linux/macOS Setup

Install Docker and Docker Compose, then from the project root:

```bash
docker compose up -d postgres
docker exec -i clara-postgres psql -U clara_user -d clara_db < scripts/db/init_pgvector.sql
```

If `.env` uses a custom `POSTGRES_DB`, replace `clara_db` with that value.

## Ingest Knowledge

Install backend dependencies first:

```bash
pip install -r backend/requirements/requirements.txt
```

Then ingest the knowledge base:

```bash
python -m backend.tools.ingest_college_knowledge_pg
```

The ingestion command populates `college_knowledge` from:

- `college_knowledge.txt`
- `backend/data/locales/en.json`
- `backend/data/locales/hi.json`

Re-run ingestion after changing knowledge content.

## Verify RAG

```bash
python backend/tools/test_db_rag.py
python -m backend.tools.rag_multilingual_check
```

Expected result:

- Document count is greater than zero.
- All target languages (`en`, `hi`, `kn`, `ta`, `te`, `ml`) return `has_context: true`.

## Troubleshooting

If backend logs that PostgreSQL is unavailable:

1. Confirm Docker is running.
2. Confirm `docker compose ps` shows `clara-postgres` as healthy.
3. Confirm `.env` has `POSTGRES_PASSWORD`.
4. If `.env` was changed after the Docker volume was created, run `scripts\db\init-rag-db.ps1` on Windows.
5. Verify backend and ingestion use the same `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, and `POSTGRES_USER`.

If `college_knowledge` is empty:

1. Run `python -m backend.tools.ingest_college_knowledge_pg`.
2. Run `python backend/tools/test_db_rag.py`.
3. Restart the backend after ingestion.

## Post-Migration Statement

ChromaDB has been removed. CLARA uses PostgreSQL + pgvector with local embeddings and dual-source ingestion.
