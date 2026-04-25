-- ============================================================
-- 1. Bucket privado planos_tmp para PDFs >6MB con TTL 24h.
-- 2. Tabla rate_limits_imports para limitar extract-plano por usuario.
-- ============================================================

-- Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('planos_tmp', 'planos_tmp', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS storage: cada usuario sube/lee SOLO sus archivos bajo su UUID
DROP POLICY IF EXISTS "planos_tmp_user_rw" ON storage.objects;
CREATE POLICY "planos_tmp_user_rw"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'planos_tmp' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'planos_tmp' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Rate limits: 1 fila por (usuario, ventana-minuto)
CREATE TABLE IF NOT EXISTS public.rate_limits_imports (
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ventana_minuto timestamptz NOT NULL,
  contador integer NOT NULL DEFAULT 1,
  PRIMARY KEY (usuario_id, ventana_minuto)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_imports_ventana
  ON public.rate_limits_imports (ventana_minuto);

ALTER TABLE public.rate_limits_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_leen_sus_rate_limits" ON public.rate_limits_imports;
CREATE POLICY "usuarios_leen_sus_rate_limits"
  ON public.rate_limits_imports FOR SELECT
  USING (auth.uid() = usuario_id);

-- 3. Columna hash_sha256 para cache de extracciones en imports_planos
ALTER TABLE public.imports_planos
  ADD COLUMN IF NOT EXISTS hash_sha256 text;

CREATE INDEX IF NOT EXISTS idx_imports_planos_hash
  ON public.imports_planos (usuario_id, hash_sha256)
  WHERE hash_sha256 IS NOT NULL;
