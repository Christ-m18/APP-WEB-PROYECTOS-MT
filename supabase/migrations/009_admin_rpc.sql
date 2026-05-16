-- ============================================================
-- MT Presupuestos SIE -- Panel de Administracion
-- RPC SECURITY DEFINER: solo admins activos pueden invocar.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _rol text;
  _activo boolean;
  result jsonb;
BEGIN
  -- 1. Validar autenticacion
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- 2. Validar perfil admin activo
  SELECT rol, activo INTO _rol, _activo
  FROM perfiles WHERE id = _uid;

  IF _rol IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  IF _activo IS NOT NULL AND _activo = false THEN
    RAISE EXCEPTION 'Acceso denegado: usuario inactivo';
  END IF;

  -- 3. Construir respuesta
  SELECT jsonb_build_object(
    'usuarios', (
      SELECT jsonb_build_object(
        'total', count(*),
        'activos', count(*) FILTER (WHERE activo IS DISTINCT FROM false),
        'inactivos', count(*) FILTER (WHERE activo = false),
        'admins', count(*) FILTER (WHERE rol = 'admin'),
        'normales', count(*) FILTER (WHERE rol IS DISTINCT FROM 'admin'),
        'recientes', (
          SELECT coalesce(jsonb_agg(row_to_json(u)::jsonb ORDER BY u.creado_en DESC), '[]'::jsonb)
          FROM (
            SELECT id, nombre, apellido, email, rol, activo, creado_en
            FROM perfiles ORDER BY creado_en DESC NULLS LAST LIMIT 10
          ) u
        )
      ) FROM perfiles
    ),
    'proyectos', (
      SELECT jsonb_build_object(
        'total', count(*),
        'por_estado', (
          SELECT coalesce(jsonb_object_agg(coalesce(estado, 'sin_estado'), cnt), '{}'::jsonb)
          FROM (SELECT estado, count(*) AS cnt FROM proyectos GROUP BY estado) s
        ),
        'recientes', (
          SELECT coalesce(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.creado_en DESC), '[]'::jsonb)
          FROM (
            SELECT p.id, p.nombre, p.cliente, p.estado, p.creado_en, p.usuario_id,
                   pf.nombre AS usuario_nombre, pf.apellido AS usuario_apellido
            FROM proyectos p
            LEFT JOIN perfiles pf ON pf.id = p.usuario_id
            ORDER BY p.creado_en DESC NULLS LAST LIMIT 10
          ) r
        ),
        'total_presupuestado', (
          SELECT coalesce(sum(pa.cantidad * pa.precio_unitario), 0)
          FROM partidas pa
        ),
        'ranking_usuarios', (
          SELECT coalesce(jsonb_agg(row_to_json(ru)::jsonb ORDER BY ru.total_proyectos DESC), '[]'::jsonb)
          FROM (
            SELECT p.usuario_id, pf.nombre, pf.apellido, count(*) AS total_proyectos
            FROM proyectos p
            LEFT JOIN perfiles pf ON pf.id = p.usuario_id
            GROUP BY p.usuario_id, pf.nombre, pf.apellido
            ORDER BY total_proyectos DESC
            LIMIT 10
          ) ru
        )
      ) FROM proyectos
    ),
    'imports', (
      SELECT jsonb_build_object(
        'total', count(*),
        'exitosos', count(*) FILTER (WHERE error IS NULL),
        'con_error', count(*) FILTER (WHERE error IS NOT NULL),
        'duracion_media_ms', round(coalesce(avg(duracion_ms), 0)),
        'tokens_input_total', coalesce(sum(tokens_input), 0),
        'tokens_output_total', coalesce(sum(tokens_output), 0),
        'modelos', (
          SELECT coalesce(jsonb_object_agg(coalesce(modelo, 'desconocido'), cnt), '{}'::jsonb)
          FROM (SELECT modelo, count(*) AS cnt FROM imports_planos GROUP BY modelo) m
        ),
        'recientes', (
          SELECT coalesce(jsonb_agg(row_to_json(ri)::jsonb ORDER BY ri.creado_en DESC), '[]'::jsonb)
          FROM (
            SELECT ip.id, ip.archivo_nombre, ip.archivo_bytes, ip.paginas, ip.modelo,
                   ip.tokens_input, ip.tokens_output, ip.duracion_ms, ip.error, ip.creado_en,
                   pf.nombre AS usuario_nombre, pf.apellido AS usuario_apellido
            FROM imports_planos ip
            LEFT JOIN perfiles pf ON pf.id = ip.usuario_id
            ORDER BY ip.creado_en DESC LIMIT 10
          ) ri
        ),
        'errores_recientes', (
          SELECT coalesce(jsonb_agg(row_to_json(er)::jsonb ORDER BY er.creado_en DESC), '[]'::jsonb)
          FROM (
            SELECT ip.id, ip.archivo_nombre, ip.error, ip.creado_en,
                   pf.nombre AS usuario_nombre
            FROM imports_planos ip
            LEFT JOIN perfiles pf ON pf.id = ip.usuario_id
            WHERE ip.error IS NOT NULL
            ORDER BY ip.creado_en DESC LIMIT 10
          ) er
        )
      ) FROM imports_planos
    ),
    'rate_limits', (
      SELECT jsonb_build_object(
        'total_registros', count(*),
        'top_consumidores', (
          SELECT coalesce(jsonb_agg(row_to_json(tc)::jsonb ORDER BY tc.total_requests DESC), '[]'::jsonb)
          FROM (
            SELECT rl.usuario_id, pf.nombre, pf.apellido,
                   sum(rl.contador) AS total_requests
            FROM rate_limits_imports rl
            LEFT JOIN perfiles pf ON pf.id = rl.usuario_id
            GROUP BY rl.usuario_id, pf.nombre, pf.apellido
            ORDER BY total_requests DESC
            LIMIT 10
          ) tc
        )
      ) FROM rate_limits_imports
    ),
    'catalogos', (
      SELECT jsonb_build_object(
        'total_materiales', (SELECT count(*) FROM materiales),
        'total_estructuras', (SELECT count(DISTINCT estructura) FROM uucc_material_estructura),
        'total_mano_obra_activa', (SELECT count(*) FROM estructuras_mano_obra WHERE activo = true),
        'materiales_sin_precio', (
          SELECT count(*) FROM materiales
          WHERE precio_igmelec IS NULL AND precio_grape IS NULL
        ),
        'estructuras_sin_costo', (
          SELECT count(DISTINCT e.estructura) FROM uucc_material_estructura e
          LEFT JOIN v_costo_uucc_por_estructura v ON v.estructura = e.estructura
          WHERE v.costo_materiales_rd IS NULL OR v.costo_materiales_rd = 0
        )
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Permitir que usuarios autenticados invoquen la funcion (la validacion interna filtra no-admins)
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;
