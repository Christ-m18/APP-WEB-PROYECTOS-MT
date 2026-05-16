-- ============================================================
-- MT Presupuestos SIE — RPC para suscripcion del usuario
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_mi_suscripcion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  result jsonb;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT jsonb_build_object(
    'plan', jsonb_build_object(
      'id', pl.id,
      'nombre', pl.nombre,
      'descripcion', pl.descripcion,
      'precio_mensual', pl.precio_mensual,
      'limite_proyectos', pl.limite_proyectos,
      'limite_imports', pl.limite_imports
    ),
    'suscripcion', jsonb_build_object(
      'id', s.id,
      'estado', s.estado,
      'fecha_inicio', s.fecha_inicio,
      'fecha_fin', s.fecha_fin,
      'creado_en', s.creado_en
    ),
    'uso', jsonb_build_object(
      'proyectos_usados', (SELECT count(*) FROM proyectos WHERE usuario_id = _uid),
      'proyectos_limite', pl.limite_proyectos,
      'imports_usados', (SELECT count(*) FROM imports_planos WHERE usuario_id = _uid),
      'imports_limite', pl.limite_imports
    )
  ) INTO result
  FROM suscripciones s
  JOIN planes pl ON pl.id = s.plan_id
  WHERE s.usuario_id = _uid
    AND s.estado = 'activa'
  ORDER BY s.creado_en DESC
  LIMIT 1;

  -- Si no tiene suscripcion activa, devolver null
  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'plan', null,
      'suscripcion', null,
      'uso', jsonb_build_object(
        'proyectos_usados', (SELECT count(*) FROM proyectos WHERE usuario_id = _uid),
        'proyectos_limite', 0,
        'imports_usados', (SELECT count(*) FROM imports_planos WHERE usuario_id = _uid),
        'imports_limite', 0
      )
    );
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mi_suscripcion() TO authenticated;

-- ============================================================
-- RPC para verificar limites (usado por createProyecto, imports)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_plan_limit(tipo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _limite integer;
  _usado bigint;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  IF tipo = 'proyectos' THEN
    SELECT pl.limite_proyectos INTO _limite
    FROM suscripciones s JOIN planes pl ON pl.id = s.plan_id
    WHERE s.usuario_id = _uid AND s.estado = 'activa'
    ORDER BY s.creado_en DESC LIMIT 1;

    SELECT count(*) INTO _usado FROM proyectos WHERE usuario_id = _uid;
  ELSIF tipo = 'imports' THEN
    SELECT pl.limite_imports INTO _limite
    FROM suscripciones s JOIN planes pl ON pl.id = s.plan_id
    WHERE s.usuario_id = _uid AND s.estado = 'activa'
    ORDER BY s.creado_en DESC LIMIT 1;

    SELECT count(*) INTO _usado FROM imports_planos WHERE usuario_id = _uid;
  ELSE
    RAISE EXCEPTION 'Tipo invalido: use proyectos o imports';
  END IF;

  RETURN jsonb_build_object(
    'allowed', (_limite IS NULL OR _usado < _limite),
    'usado', _usado,
    'limite', _limite
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_plan_limit(text) TO authenticated;
