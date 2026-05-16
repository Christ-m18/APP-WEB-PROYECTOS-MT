-- ============================================================
-- MT Presupuestos SIE — Sistema de Planes, Suscripciones y Pagos
-- Modelo: Gratis + Pro (suscripcion mensual, pago por transferencia)
-- ============================================================

-- 1. PLANES
-- Catalogo de planes disponibles (admin los gestiona)
-- ============================================================
CREATE TABLE IF NOT EXISTS planes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           text NOT NULL UNIQUE,
  descripcion      text,
  precio_mensual   numeric(10,2) NOT NULL DEFAULT 0,
  limite_proyectos integer,          -- NULL = ilimitado
  limite_imports   integer,          -- NULL = ilimitado
  activo           boolean NOT NULL DEFAULT true,
  orden            integer NOT NULL DEFAULT 0,
  creado_en        timestamptz DEFAULT now()
);

-- Insertar planes iniciales
INSERT INTO planes (nombre, descripcion, precio_mensual, limite_proyectos, limite_imports, activo, orden)
VALUES
  ('Gratis', 'Plan gratuito con funcionalidad limitada', 0, 3, 5, true, 0),
  ('Pro', 'Acceso completo e ilimitado', 0, NULL, NULL, true, 1)
ON CONFLICT (nombre) DO NOTHING;

-- 2. SUSCRIPCIONES
-- Registro historico de suscripciones por usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS suscripciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id      uuid NOT NULL REFERENCES planes(id),
  estado       text NOT NULL DEFAULT 'activa'
                 CHECK (estado IN ('activa', 'vencida', 'cancelada')),
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin    date,               -- NULL para plan gratis (sin vencimiento)
  creado_en    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_usuario ON suscripciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones(estado);

-- 3. PAGOS
-- Cada pago asociado a una suscripcion, con voucher de transferencia
-- ============================================================
CREATE TABLE IF NOT EXISTS pagos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suscripcion_id   uuid REFERENCES suscripciones(id) ON DELETE SET NULL,
  plan_id          uuid NOT NULL REFERENCES planes(id),
  monto            numeric(10,2) NOT NULL,
  moneda           text NOT NULL DEFAULT 'DOP',
  estado           text NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  -- Datos del voucher
  voucher_url      text,            -- Path en Supabase Storage
  referencia       text,            -- Numero de referencia bancaria
  banco            text,            -- Nombre del banco
  fecha_pago       date,            -- Fecha de la transferencia
  -- Admin review
  nota_admin       text,            -- Nota del admin al aprobar/rechazar
  revisado_por     uuid REFERENCES auth.users(id),
  revisado_en      timestamptz,
  -- Timestamps
  creado_en        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_creado ON pagos(creado_en DESC);

-- 4. RLS POLICIES
-- ============================================================
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Planes: todos pueden leer los activos
CREATE POLICY "Planes visibles para todos" ON planes
  FOR SELECT USING (activo = true);

-- Suscripciones: usuario ve las suyas
CREATE POLICY "Usuario ve sus suscripciones" ON suscripciones
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuario crea sus suscripciones" ON suscripciones
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Pagos: usuario ve y crea los suyos
CREATE POLICY "Usuario ve sus pagos" ON pagos
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuario crea sus pagos" ON pagos
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- 5. STORAGE BUCKET para vouchers
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vouchers',
  'vouchers',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Usuario sube voucher a su carpeta
CREATE POLICY "Users can upload vouchers"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'vouchers' AND auth.uid()::text = (storage.foldername(name))[1] );

-- Usuario ve sus propios vouchers
CREATE POLICY "Users can view own vouchers"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'vouchers' AND auth.uid()::text = (storage.foldername(name))[1] );

-- Admin puede ver todos los vouchers (via RPC, no direct policy needed)

-- 6. ASIGNAR PLAN GRATIS A NUEVOS USUARIOS
-- Modificar handle_new_user para crear suscripcion gratis
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  plan_gratis_id uuid;
BEGIN
  -- Crear perfil
  INSERT INTO public.perfiles (id, email, nombre, apellido)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido'
  );

  -- Asignar plan gratis
  SELECT id INTO plan_gratis_id FROM public.planes WHERE nombre = 'Gratis' AND activo = true LIMIT 1;
  IF plan_gratis_id IS NOT NULL THEN
    INSERT INTO public.suscripciones (usuario_id, plan_id, estado, fecha_inicio)
    VALUES (new.id, plan_gratis_id, 'activa', CURRENT_DATE);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ASIGNAR PLAN GRATIS A USUARIOS EXISTENTES (sin suscripcion)
-- ============================================================
DO $$
DECLARE
  plan_gratis_id uuid;
BEGIN
  SELECT id INTO plan_gratis_id FROM public.planes WHERE nombre = 'Gratis' AND activo = true LIMIT 1;
  IF plan_gratis_id IS NOT NULL THEN
    INSERT INTO public.suscripciones (usuario_id, plan_id, estado, fecha_inicio)
    SELECT p.id, plan_gratis_id, 'activa', CURRENT_DATE
    FROM public.perfiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.suscripciones s WHERE s.usuario_id = p.id AND s.estado = 'activa'
    );
  END IF;
END $$;
