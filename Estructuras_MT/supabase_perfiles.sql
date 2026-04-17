-- =============================================================
-- TABLA DE PERFILES DE USUARIO
-- Extensión de Supabase Auth para datos de perfil
-- =============================================================

CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    empresa TEXT,
    telefono TEXT,
    email TEXT NOT NULL,
    rol TEXT DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario', 'supervisor')),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Política: cada usuario puede leer su propio perfil
CREATE POLICY "Usuarios leen su propio perfil"
  ON perfiles FOR SELECT
  USING (auth.uid() = id);

-- Política: cada usuario puede actualizar su propio perfil
CREATE POLICY "Usuarios actualizan su propio perfil"
  ON perfiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: insertar durante registro (el usuario inserta su propio perfil)
CREATE POLICY "Usuarios insertan su propio perfil"
  ON perfiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_perfil
  BEFORE UPDATE ON perfiles
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

-- =============================================================
-- VINCULAR PROYECTOS AL USUARIO
-- Agregar columna usuario_id a proyectos si no existe
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proyectos' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE proyectos ADD COLUMN usuario_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Política: usuarios solo ven sus propios proyectos
-- (Nota: ejecutar después de vincular usuario_id)
-- CREATE POLICY "Usuarios ven sus proyectos"
--   ON proyectos FOR ALL
--   USING (auth.uid() = usuario_id)
--   WITH CHECK (auth.uid() = usuario_id);
