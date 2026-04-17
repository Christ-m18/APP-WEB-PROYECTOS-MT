-- =============================================================
-- ESQUEMA OPERACIONAL: PROYECTOS Y PARTIDAS
-- Tablas transaccionales donde se guarda el trabajo de los usuarios
-- =============================================================

DROP TABLE IF EXISTS partidas CASCADE;
DROP TABLE IF EXISTS proyectos CASCADE;

-- TABLA A: proyectos
CREATE TABLE proyectos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    cliente TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    voltaje TEXT,
    estado TEXT DEFAULT 'activo',
    aplicar_itbis BOOLEAN DEFAULT false,
    overhead NUMERIC DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permissive Policy" ON proyectos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- TABLA B: partidas (Estructuras asignadas a un proyecto)
CREATE TABLE partidas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
    estructura TEXT NOT NULL, -- Vincula directamente con "HAV-300-09", "MTA-101", etc. en uucc_material_estructura
    cantidad NUMERIC NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(15, 2) NOT NULL, -- Costo extraído de v_costo_uucc_por_estructura
    total NUMERIC(15, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    detalles JSONB, -- Opcional para detalles menores
    orden INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE partidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permissive Policy" ON partidas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
