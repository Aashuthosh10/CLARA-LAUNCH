-- Run once after first docker compose up.
-- Example: PGPASSWORD=yourpass psql -h 127.0.0.1 -U clara_user -d clara_db -f scripts/db/init_pgvector.sql

CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS college_knowledge;

CREATE TABLE IF NOT EXISTS college_knowledge (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    embedding VECTOR(768),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_college_embedding
ON college_knowledge
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
