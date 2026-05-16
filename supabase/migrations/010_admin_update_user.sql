-- ============================================================
-- MT Presupuestos SIE -- Gestion de usuarios desde panel admin
-- RPC SECURITY DEFINER: solo admins activos pueden modificar usuarios.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id uuid,
  new_rol text DEFAULT NULL,
  new_activo boolean DEFAULT NULL
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
  updated_user jsonb;
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

  -- 3. No permitir que un admin se desactive o se quite el rol a si mismo
  IF target_user_id = _uid THEN
    RAISE EXCEPTION 'No puedes modificar tu propio perfil desde este panel';
  END IF;

  -- 4. Validar que el usuario objetivo existe
  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- 5. Validar valores de rol
  IF new_rol IS NOT NULL AND new_rol NOT IN ('usuario', 'admin') THEN
    RAISE EXCEPTION 'Rol invalido: debe ser "usuario" o "admin"';
  END IF;

  -- 6. Actualizar campos proporcionados
  UPDATE perfiles
  SET
    rol = COALESCE(new_rol, perfiles.rol),
    activo = COALESCE(new_activo, perfiles.activo),
    actualizado_en = now()
  WHERE id = target_user_id;

  -- 7. Devolver el usuario actualizado
  SELECT row_to_json(p)::jsonb INTO updated_user
  FROM (
    SELECT id, nombre, apellido, email, rol, activo, creado_en
    FROM perfiles WHERE id = target_user_id
  ) p;

  RETURN updated_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, boolean) TO authenticated;
