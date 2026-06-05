-- ============================================================
-- Restrict proyectos UPDATE/DELETE to Pro plan users only.
--
-- Motivation: Free plan users can view and create projects
-- (subject to check_plan_limit) but cannot edit or delete them.
-- The frontend guard is in Proyectos.tsx; this is the backend
-- defense-in-depth layer.
--
-- Replaces the previous allow_all / broad SELECT policies with
-- tightly scoped per-operation policies.
-- ============================================================

-- 1. Drop all existing policies on proyectos
DROP POLICY IF EXISTS "allow_all"                       ON public.proyectos;
DROP POLICY IF EXISTS "Usuarios ven sus propios proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_select_own"            ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_insert_own"            ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_update_pro"            ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_delete_pro"            ON public.proyectos;

-- 2. SELECT: each user sees only their own projects
CREATE POLICY "proyectos_select_own"
  ON public.proyectos FOR SELECT
  USING (usuario_id = auth.uid());

-- 3. INSERT: any authenticated user can create a project.
--    Quantity limit is enforced at the app layer via check_plan_limit().
CREATE POLICY "proyectos_insert_own"
  ON public.proyectos FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- 4. UPDATE: only users on an active Pro plan can update their projects
CREATE POLICY "proyectos_update_pro"
  ON public.proyectos FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.suscripciones s
      JOIN public.planes       p ON p.id = s.plan_id
      WHERE s.usuario_id = auth.uid()
        AND p.nombre     = 'Pro'
        AND s.estado     = 'activa'
    )
  );

-- 5. DELETE: only users on an active Pro plan can delete their projects
CREATE POLICY "proyectos_delete_pro"
  ON public.proyectos FOR DELETE
  USING (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.suscripciones s
      JOIN public.planes       p ON p.id = s.plan_id
      WHERE s.usuario_id = auth.uid()
        AND p.nombre     = 'Pro'
        AND s.estado     = 'activa'
    )
  );
