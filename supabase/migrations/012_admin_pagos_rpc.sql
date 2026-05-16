-- ============================================================
-- MT Presupuestos SIE — RPCs de administracion de pagos
-- ============================================================

-- 1. APROBAR/RECHAZAR PAGO
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_review_pago(
  pago_id uuid,
  nuevo_estado text,
  nota text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _rol text;
  _activo boolean;
  _pago record;
  _plan_id uuid;
BEGIN
  -- Validar admin
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT rol, activo INTO _rol, _activo FROM perfiles WHERE id = _uid;
  IF _rol IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF _activo IS NOT NULL AND _activo = false THEN RAISE EXCEPTION 'Usuario inactivo'; END IF;

  -- Validar estado
  IF nuevo_estado NOT IN ('aprobado', 'rechazado') THEN
    RAISE EXCEPTION 'Estado invalido: debe ser aprobado o rechazado';
  END IF;

  -- Obtener pago
  SELECT * INTO _pago FROM pagos WHERE id = pago_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF _pago.estado != 'pendiente' THEN RAISE EXCEPTION 'Este pago ya fue revisado'; END IF;

  -- Actualizar pago
  UPDATE pagos SET
    estado = nuevo_estado,
    nota_admin = nota,
    revisado_por = _uid,
    revisado_en = now()
  WHERE id = pago_id;

  -- Si aprobado, activar/renovar suscripcion
  IF nuevo_estado = 'aprobado' THEN
    -- Desactivar suscripciones anteriores del usuario
    UPDATE suscripciones SET estado = 'vencida'
    WHERE usuario_id = _pago.usuario_id AND estado = 'activa';

    -- Crear nueva suscripcion activa
    INSERT INTO suscripciones (usuario_id, plan_id, estado, fecha_inicio, fecha_fin)
    VALUES (
      _pago.usuario_id,
      _pago.plan_id,
      'activa',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', nuevo_estado);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_pago(uuid, text, text) TO authenticated;

-- 2. OBTENER PAGOS PENDIENTES (para admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_pagos()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _rol text;
  _activo boolean;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT rol, activo INTO _rol, _activo FROM perfiles WHERE id = _uid;
  IF _rol IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF _activo IS NOT NULL AND _activo = false THEN RAISE EXCEPTION 'Usuario inactivo'; END IF;

  RETURN (
    SELECT jsonb_build_object(
      'pendientes', (
        SELECT coalesce(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.creado_en DESC), '[]'::jsonb)
        FROM (
          SELECT pg.id, pg.monto, pg.moneda, pg.estado, pg.voucher_url, pg.referencia,
                 pg.banco, pg.fecha_pago, pg.creado_en,
                 pf.nombre AS usuario_nombre, pf.apellido AS usuario_apellido,
                 pf.email AS usuario_email,
                 pl.nombre AS plan_nombre
          FROM pagos pg
          LEFT JOIN perfiles pf ON pf.id = pg.usuario_id
          LEFT JOIN planes pl ON pl.id = pg.plan_id
          WHERE pg.estado = 'pendiente'
          ORDER BY pg.creado_en DESC
        ) p
      ),
      'recientes', (
        SELECT coalesce(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.revisado_en DESC), '[]'::jsonb)
        FROM (
          SELECT pg.id, pg.monto, pg.moneda, pg.estado, pg.referencia,
                 pg.banco, pg.nota_admin, pg.revisado_en, pg.creado_en,
                 pf.nombre AS usuario_nombre, pf.apellido AS usuario_apellido,
                 pl.nombre AS plan_nombre
          FROM pagos pg
          LEFT JOIN perfiles pf ON pf.id = pg.usuario_id
          LEFT JOIN planes pl ON pl.id = pg.plan_id
          WHERE pg.estado IN ('aprobado', 'rechazado')
          ORDER BY pg.revisado_en DESC NULLS LAST
          LIMIT 20
        ) r
      ),
      'stats', (
        SELECT jsonb_build_object(
          'total_pendientes', count(*) FILTER (WHERE estado = 'pendiente'),
          'total_aprobados', count(*) FILTER (WHERE estado = 'aprobado'),
          'total_rechazados', count(*) FILTER (WHERE estado = 'rechazado'),
          'ingresos_total', coalesce(sum(monto) FILTER (WHERE estado = 'aprobado'), 0),
          'ingresos_mes_actual', coalesce(sum(monto) FILTER (
            WHERE estado = 'aprobado'
            AND date_trunc('month', revisado_en) = date_trunc('month', now())
          ), 0),
          'ingresos_por_mes', (
            SELECT coalesce(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.mes), '[]'::jsonb)
            FROM (
              SELECT to_char(revisado_en, 'YYYY-MM') AS mes,
                     sum(monto) AS total,
                     count(*) AS cantidad
              FROM pagos
              WHERE estado = 'aprobado' AND revisado_en IS NOT NULL
              GROUP BY to_char(revisado_en, 'YYYY-MM')
              ORDER BY mes DESC
              LIMIT 12
            ) m
          )
        )
        FROM pagos
      ),
      'suscripciones', (
        SELECT jsonb_build_object(
          'total_activas', count(*) FILTER (WHERE s.estado = 'activa'),
          'por_plan', (
            SELECT coalesce(jsonb_agg(row_to_json(pp)::jsonb), '[]'::jsonb)
            FROM (
              SELECT pl.nombre AS plan, count(*) AS total
              FROM suscripciones s2
              JOIN planes pl ON pl.id = s2.plan_id
              WHERE s2.estado = 'activa'
              GROUP BY pl.nombre
              ORDER BY total DESC
            ) pp
          ),
          'por_vencer_7d', count(*) FILTER (
            WHERE s.estado = 'activa'
            AND s.fecha_fin IS NOT NULL
            AND s.fecha_fin <= CURRENT_DATE + INTERVAL '7 days'
          )
        )
        FROM suscripciones s
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_pagos() TO authenticated;

-- 3. GENERAR SIGNED URL PARA VOUCHER (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_voucher_url(voucher_path text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _rol text;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT rol INTO _rol FROM perfiles WHERE id = _uid;
  IF _rol IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  -- Return the path; client will use supabase storage getPublicUrl or createSignedUrl
  RETURN voucher_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_voucher_url(text) TO authenticated;
