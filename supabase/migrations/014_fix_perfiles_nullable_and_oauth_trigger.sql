-- ============================================================
-- Fix: perfiles.nombre/apellido nullable + trigger OAuth support
--
-- Root cause: perfiles.nombre and apellido had NOT NULL constraints
-- (added manually in the dashboard, not in the original migration).
-- OAuth users (Google/Facebook) don't provide 'nombre'/'apellido' in
-- raw_user_meta_data — they provide 'given_name', 'family_name',
-- 'full_name'. The trigger was doing raw_user_meta_data->>'nombre'
-- which returned NULL, violating the constraint and aborting the
-- entire user creation with "Database error saving new user".
-- ============================================================

-- 1. Drop NOT NULL — OAuth users won't have these at signup time.
--    AuthCallback.populateOAuthProfile fills them in after verification.
ALTER TABLE public.perfiles ALTER COLUMN nombre  DROP NOT NULL;
ALTER TABLE public.perfiles ALTER COLUMN apellido DROP NOT NULL;

-- 2. Update handle_new_user to support both flows:
--    Email/password: raw_user_meta_data has 'nombre' and 'apellido' (from form).
--    OAuth (Google/Facebook): metadata has 'given_name', 'family_name', 'full_name'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_gratis_id uuid;
  _nombre        text;
  _apellido      text;
  _full_name     text;
BEGIN
  _full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  );

  -- Try form metadata first (email/password signup), then OAuth provider fields
  _nombre := COALESCE(
    NULLIF(new.raw_user_meta_data->>'nombre',     ''),
    NULLIF(new.raw_user_meta_data->>'given_name', ''),
    NULLIF(split_part(_full_name, ' ', 1),        '')
  );

  _apellido := COALESCE(
    NULLIF(new.raw_user_meta_data->>'apellido',    ''),
    NULLIF(new.raw_user_meta_data->>'family_name', ''),
    NULLIF(
      CASE WHEN position(' ' IN _full_name) > 0
        THEN substring(_full_name FROM position(' ' IN _full_name) + 1)
        ELSE NULL
      END, '')
  );

  INSERT INTO public.perfiles (id, email, nombre, apellido)
  VALUES (new.id, new.email, _nombre, _apellido);

  -- Assign free plan automatically on signup
  SELECT id INTO plan_gratis_id
  FROM public.planes
  WHERE nombre = 'Gratis' AND activo = true
  LIMIT 1;

  IF plan_gratis_id IS NOT NULL THEN
    INSERT INTO public.suscripciones (usuario_id, plan_id, estado, fecha_inicio)
    VALUES (new.id, plan_gratis_id, 'activa', CURRENT_DATE);
  END IF;

  RETURN new;
END;
$$;
