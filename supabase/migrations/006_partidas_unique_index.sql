-- ============================================================
-- Índice único para prevenir duplicados exactos en partidas.
-- Protege contra inserciones concurrentes con misma (proyecto, estructura, orden).
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_partidas_unique_proy_est_orden
  ON public.partidas (proyecto_id, estructura, orden);
