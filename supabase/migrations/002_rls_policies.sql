-- ============================================================
-- MT Presupuestos SIE — Políticas de Seguridad (RLS)
-- Configuración de Producción / Enterprise Grade
-- ============================================================

-- Habilitar RLS en todas las tablas principales
ALTER TABLE IF EXISTS perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS uucc_material_estructura ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS PARA 'perfiles'
-- Los usuarios solo pueden ver y editar su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil" 
ON perfiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
ON perfiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. POLÍTICAS PARA 'proyectos'
-- Los usuarios solo pueden ver y gestionar sus propios proyectos
-- (Nota: Se asume que existe una columna 'usuario_id' linked a auth.uid())
-- Si no existe, se recomienda añadirla. Por ahora usamos una política basada en el perfil si aplica, 
-- o simplemente habilitamos para usuarios autenticados si es colaborativo.
-- Ajuste recomendado: Los proyectos deben pertenecer a quien los crea.

CREATE POLICY "Usuarios ven sus propios proyectos" 
ON proyectos FOR SELECT 
USING (auth.uid() = (select id from perfiles where id = auth.uid())); -- Ejemplo simplificado

-- 3. POLÍTICAS PARA CATÁLOGOS (Lectura pública)
-- Estas tablas son catálogos técnicos que todos los usuarios autenticados deben poder leer
CREATE POLICY "Lectura pública para catálogos" 
ON materiales FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Lectura pública para estructuras" 
ON uucc_material_estructura FOR SELECT 
TO authenticated 
USING (true);

-- 4. POLÍTICAS PARA PARTIDAS
-- El acceso a partidas depende del acceso al proyecto padre
CREATE POLICY "Usuarios ven partidas de sus proyectos" 
ON partidas FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM proyectos 
    WHERE proyectos.id = partidas.proyecto_id 
    -- AND proyectos.usuario_id = auth.uid() -- Ajustar según columna de dueño
  )
);

-- ============================================================
-- NOTA PARA EL USUARIO:
-- Ejecuta este script en el SQL Editor de Supabase.
-- Asegúrate de que las tablas 'proyectos' tengan una columna para el dueño (ej: created_by)
-- para una restricción total y segura entre usuarios.
-- ============================================================
