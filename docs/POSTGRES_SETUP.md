# PostgreSQL + pgvector Setup (Ubuntu)

RAG storage uses **local PostgreSQL with pgvector**. No ChromaDB; embeddings are generated locally with `sentence-transformers` (BAAI/bge-base-en). Sensitive college data never leaves the system.

---

## Environment variables

Set these in `.env` at project root (copy from `.env.example`).

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | PostgreSQL host | `127.0.0.1` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | Database name | `clara_db` |
| `POSTGRES_USER` | Database user | `clara_user` |
| `POSTGRES_PASSWORD` | **Required.** Strong password; never commit. | (none) |

Other RAG-related: `RAG_TOP_K`, `RAG_MAX_TOKENS`, `COLLEGE_KNOWLEDGE_PATH` (see `backend/config/settings.py`).

---

## Ubuntu setup instructions

### 1. Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

(Or use your distribution’s Docker package.)

### 2. Set PostgreSQL password

In project root, create or edit `.env`:

```bash
POSTGRES_PASSWORD=your_strong_password_here
```

Use a strong password; the database binds only to `127.0.0.1` and is not exposed publicly.

### 3. Start PostgreSQL

From project root:

```bash
docker compose up -d
```

Container name: `clara-postgres`. Port: `127.0.0.1:5432` only.

### 4. Create schema (idempotent, safe to re-run)

Apply the pgvector extension and `college_knowledge` table. This script is non-destructive and can be re-run safely:

```bash
PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -p 5432 -U clara_user -d clara_db -f scripts/db/init_pgvector.sql
```

Or with `docker exec`:

```bash
docker exec -i clara-postgres psql -U clara_user -d clara_db < scripts/db/init_pgvector.sql
```

### 5. Install backend dependencies and run

```bash
pip install -r backend/requirements/requirements.txt
# From project root:
python -m uvicorn backend.main:app --host 0.0.0.0 --port 6969
# Or use scripts/run-backend.sh
```

### 6. Ingest college knowledge (dual source)

The canonical ingestion command now populates `college_knowledge` from:
- `college_knowledge.txt` (chunked narrative source, language=`en`)
- `backend/data/locales/en.json` and `backend/data/locales/hi.json` (flattened leaf chunks)

Run:

```bash
python -m backend.tools.ingest_college_knowledge_pg
```

This chunks the text file (~700 chars, 80 overlap), generates local embeddings, and inserts all chunks into PostgreSQL with metadata tags (`source`, `language`, `source_file`). Re-run safely after updates.

### 7. Verify ingestion and multilingual retrieval

```bash
python -c "from backend.clients.database import get_document_count; print(get_document_count())"
python -m backend.tools.rag_multilingual_check
```

Expected:
- document count > 0
- all target languages (`en`, `hi`, `kn`, `ta`, `te`, `ml`) report `has_context=true` across matrix categories.

### Troubleshooting: Empty table warning still appears

If backend still logs `college_knowledge table is empty` after ingest:
1. Verify backend is using the same DB endpoint as ingestion (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`).
2. Print backend-visible count:
   `python -c "from backend.clients.database import get_document_count; print(get_document_count())"`
3. Restart backend after ingest so startup checks refresh.
4. Re-run ingestion command and check for insert errors.

---

## Post-migration statement

**ChromaDB has been fully removed. The backend runs on PostgreSQL + pgvector with local embeddings and supports dual-source ingestion (`college_knowledge.txt` + locale leaves).**

