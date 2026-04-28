-- ============================================================
-- MT Presupuestos SIE - RAG Training Embeddings
-- Stores semantic embeddings of successfully extracted plans
-- for retrieval-augmented generation on future extractions.
-- ============================================================

-- 1. Enable pgvector extension (free tier compatible)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Training embeddings table
CREATE TABLE IF NOT EXISTS public.training_embeddings_mt (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash_sha256  text UNIQUE NOT NULL,
  resumen      text NOT NULL,
  embedding    vector(768) NOT NULL,
  items_clean  jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata     jsonb DEFAULT '{}'::jsonb,
  creado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_embeddings_hash
  ON public.training_embeddings_mt (hash_sha256);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_training_embeddings_vector
  ON public.training_embeddings_mt
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- RLS: Edge Function writes with service role, authenticated users can read
ALTER TABLE public.training_embeddings_mt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_training"
  ON public.training_embeddings_mt FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service_role_all_training"
  ON public.training_embeddings_mt FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. RPC for cosine similarity search
CREATE OR REPLACE FUNCTION match_embeddings_mt(
  query_embedding vector(768),
  match_count int DEFAULT 3,
  match_threshold float DEFAULT 0.75
)
RETURNS TABLE (
  id uuid,
  resumen text,
  items_clean jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.resumen,
    t.items_clean,
    (1 - (t.embedding <=> query_embedding))::float AS similarity
  FROM public.training_embeddings_mt t
  WHERE 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
