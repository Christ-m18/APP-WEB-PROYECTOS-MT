-- ============================================================
-- MT Presupuestos SIE — Auditoría de importaciones de planos
-- Registra cada PDF importado y el JSON de items extraídos
-- para debugging de prompts y trazabilidad por proyecto.
-- ============================================================

CREATE TABLE IF NOT EXISTS imports_planos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proyecto_id      uuid REFERENCES proyectos(id) ON DELETE SET NULL,
  archivo_nombre   text NOT NULL,
  archivo_bytes    integer NOT NULL,
  paginas          integer,
  items_extraidos  jsonb NOT NULL DEFAULT '[]'::jsonb,
  modelo           text,
  tokens_input     integer,
  tokens_output    integer,
  duracion_ms      integer,
  error            text,
  creado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imports_planos_usuario
  ON imports_planos(usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_imports_planos_proyecto
  ON imports_planos(proyecto_id);

ALTER TABLE imports_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_leen_sus_imports"
  ON imports_planos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_crean_sus_imports"
  ON imports_planos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);
