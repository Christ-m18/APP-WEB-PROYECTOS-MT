-- ============================================================
-- MT Presupuestos SIE — Automatización de Perfiles
-- Configuración de Triggers y Creación de Tabla
-- ============================================================

-- 1. Crear tabla perfiles si no existe
CREATE TABLE IF NOT EXISTS perfiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text,
  apellido    text,
  empresa     text,
  telefono    text,
  rol         text DEFAULT 'usuario',
  email       text,
  creado_en   timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso (asegurando que el usuario solo acceda a su perfil)
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles 
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON perfiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON perfiles 
  FOR UPDATE USING (auth.uid() = id);

-- 4. Función para crear perfil automáticamente al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, apellido)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger que dispara la función anterior
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- NOTA: Ejecuta este script en el SQL Editor de Supabase.
-- Ayuda a evitar errores 406 al asegurar que cada usuario
-- tenga siempre un registro en la tabla 'perfiles'.
-- ============================================================
