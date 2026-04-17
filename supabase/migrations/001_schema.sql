-- ============================================================
-- MT Presupuestos SIE — Schema inicial
-- Proyecto: Media Tensión, República Dominicana
-- ============================================================

-- 1. ESTRUCTURAS MT
-- Catálogo de estructuras según resoluciones SIE
-- ============================================================
CREATE TABLE IF NOT EXISTS estructuras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      text UNIQUE NOT NULL,
  descripcion text NOT NULL,
  categoria   text NOT NULL,
  voltaje     text[] NOT NULL DEFAULT '{}',
  unidad      text NOT NULL DEFAULT 'UND',
  activo      boolean NOT NULL DEFAULT true,
  creado_en   timestamptz DEFAULT now()
);

-- 2. MATERIALES
-- Catálogo de materiales con precios vigentes
-- ============================================================
CREATE TABLE IF NOT EXISTS materiales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text UNIQUE NOT NULL,
  descripcion     text NOT NULL,
  unidad          text NOT NULL,
  precio_unitario numeric(14,4) NOT NULL DEFAULT 0,
  categoria       text,
  activo          boolean NOT NULL DEFAULT true,
  creado_en       timestamptz DEFAULT now()
);

-- 3. MATERIALES POR ESTRUCTURA
-- Cantidad de cada material requerida por unidad de estructura
-- ============================================================
CREATE TABLE IF NOT EXISTS estructura_materiales (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estructura_id uuid NOT NULL REFERENCES estructuras(id) ON DELETE CASCADE,
  material_id   uuid NOT NULL REFERENCES materiales(id) ON DELETE CASCADE,
  cantidad      numeric(14,4) NOT NULL DEFAULT 1,
  UNIQUE(estructura_id, material_id)
);

-- 4. PROYECTOS (presupuestos)
-- ============================================================
CREATE TABLE IF NOT EXISTS proyectos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  cliente      text NOT NULL,
  fecha        date NOT NULL DEFAULT CURRENT_DATE,
  voltaje      text NOT NULL DEFAULT '13.2',
  estado       text NOT NULL DEFAULT 'activo'
                 CHECK (estado IN ('activo','completado','cancelado')),
  aplicar_itbis boolean NOT NULL DEFAULT false,
  overhead     numeric(5,2) NOT NULL DEFAULT 0,
  notas        text,
  creado_en    timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- 5. PARTIDAS DEL PRESUPUESTO
-- ============================================================
CREATE TABLE IF NOT EXISTS partidas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id     uuid NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  estructura_id   uuid REFERENCES estructuras(id),
  codigo          text NOT NULL,
  descripcion     text NOT NULL,
  cantidad        numeric(14,2) NOT NULL DEFAULT 1,
  precio_unitario numeric(14,2) NOT NULL DEFAULT 0,
  orden           integer NOT NULL DEFAULT 0,
  creado_en       timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGER: actualizado_en en proyectos
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_actualizado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proyectos_actualizado_en
  BEFORE UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

-- ============================================================
-- VISTA: Lista de materiales por proyecto
-- Agrupa materiales por partida y categoría de estructura
-- ============================================================
CREATE OR REPLACE VIEW vista_lista_materiales AS
SELECT
  pr.id                        AS proyecto_id,
  pr.nombre                    AS proyecto_nombre,
  pa.id                        AS partida_id,
  pa.orden                     AS partida_orden,
  e.codigo                     AS estructura_codigo,
  e.descripcion                AS estructura_descripcion,
  e.categoria                  AS estructura_categoria,
  m.id                         AS material_id,
  m.codigo                     AS material_codigo,
  m.descripcion                AS material_descripcion,
  m.unidad                     AS material_unidad,
  m.precio_unitario            AS precio_material,
  em.cantidad                  AS cantidad_x_estructura,
  pa.cantidad                  AS cantidad_estructuras,
  ROUND(em.cantidad * pa.cantidad, 4)              AS cantidad_total,
  ROUND(em.cantidad * pa.cantidad * m.precio_unitario, 2) AS total_material
FROM proyectos pr
JOIN partidas pa           ON pa.proyecto_id   = pr.id
JOIN estructuras e         ON e.id             = pa.estructura_id
JOIN estructura_materiales em ON em.estructura_id = e.id
JOIN materiales m          ON m.id             = em.material_id
ORDER BY pa.orden, e.categoria, m.descripcion;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE estructuras          ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE estructura_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas             ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas (app interna sin autenticación de usuario)
CREATE POLICY "allow_all" ON estructuras
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON materiales
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON estructura_materiales
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON proyectos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON partidas
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: Estructuras ET-1 a ET-9
-- ============================================================
INSERT INTO estructuras (codigo, descripcion, categoria, voltaje, unidad) VALUES
  ('ET-1', 'Poste tangente simple — 1 circuito',    'Tangente', ARRAY['13.2','34.5'], 'UND'),
  ('ET-2', 'Poste ángulo 0° – 15°',                 'Ángulo',   ARRAY['13.2','34.5'], 'UND'),
  ('ET-3', 'Poste ángulo 15° – 30°',                'Ángulo',   ARRAY['13.2','34.5'], 'UND'),
  ('ET-4', 'Poste ángulo 30° – 60°',                'Ángulo',   ARRAY['13.2','34.5'], 'UND'),
  ('ET-5', 'Poste ángulo 60° – 90°',                'Ángulo',   ARRAY['13.2','34.5'], 'UND'),
  ('ET-6', 'Poste terminal — fin de línea',          'Terminal', ARRAY['13.2','34.5'], 'UND'),
  ('ET-7', 'Poste doble tangente',                  'Tangente', ARRAY['13.2','34.5'], 'UND'),
  ('ET-8', 'Estructura de paso — cruce vial',        'Especial', ARRAY['13.2','34.5'], 'UND'),
  ('ET-9', 'Estructura de remate — seccionador',     'Especial', ARRAY['13.2','34.5'], 'UND')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- NOTA: Los materiales y sus cantidades por estructura
-- deben cargarse desde los archivos Excel de la carpeta
-- "Estructuras MT". Usa el script supabase/seed_materiales.sql
-- una vez tengas los datos extraídos de los Excel.
-- ============================================================
