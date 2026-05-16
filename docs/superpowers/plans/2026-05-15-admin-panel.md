# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected admin panel at `/app/admin` visible only to users with `perfiles.rol = 'admin'` and `perfiles.activo IS DISTINCT FROM false`, showing system-wide KPIs (users, projects, imports, rate limits, catalogs).

**Architecture:** A single Postgres RPC `get_admin_overview()` (`SECURITY DEFINER`) validates admin status via `auth.uid()` and returns all aggregated metrics as JSON. The frontend calls this RPC through a React Query hook. Route protection uses an `AdminRoute` wrapper that checks `usePerfil()` and redirects non-admins. The Header dropdown conditionally shows the "Panel Admin" link.

**Tech Stack:** Supabase RPC (plpgsql), React, TanStack Query v5, CSS Modules, lucide-react, react-router-dom.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/009_admin_rpc.sql` | RPC `get_admin_overview()` with admin validation |
| Create | `src/lib/admin.ts` | Supabase RPC call wrapper |
| Create | `src/hooks/useAdmin.ts` | React Query hook for admin data |
| Create | `src/types/admin.ts` | TypeScript types for admin RPC response |
| Create | `src/components/auth/AdminRoute.tsx` | Route guard component |
| Create | `src/pages/AdminPanel.tsx` | Admin panel page component |
| Create | `src/pages/AdminPanel.module.css` | Admin panel styles |
| Modify | `src/App.tsx` | Add lazy import + `/app/admin` route |
| Modify | `src/components/layout/Header.tsx` | Add "Panel Admin" dropdown item for admins |

---

### Task 1: Supabase RPC Migration

**Files:**
- Create: `supabase/migrations/009_admin_rpc.sql`

This RPC aggregates data from `perfiles`, `proyectos`, `partidas`, `imports_planos`, `rate_limits_imports`, `materiales`, `uucc_material_estructura`, and `estructuras_mano_obra`. It validates the caller is an active admin before returning anything.

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration to Supabase**

Run the migration in the Supabase SQL Editor or via CLI:
```bash
# If using Supabase CLI locally:
supabase db push
# Or paste the SQL directly into the Supabase Dashboard SQL Editor
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_admin_rpc.sql
git commit -m "feat(admin): add get_admin_overview RPC with admin validation"
```

---

### Task 2: Admin Types

**Files:**
- Create: `src/types/admin.ts`

- [ ] **Step 1: Create the admin types file**

```typescript
export interface AdminUsuarioReciente {
  id: string
  nombre: string | null
  apellido: string | null
  email: string
  rol: string | null
  activo: boolean | null
  creado_en: string | null
}

export interface AdminProyectoReciente {
  id: string
  nombre: string
  cliente: string
  estado: string | null
  creado_en: string | null
  usuario_id: string | null
  usuario_nombre: string | null
  usuario_apellido: string | null
}

export interface AdminRankingUsuario {
  usuario_id: string
  nombre: string | null
  apellido: string | null
  total_proyectos: number
}

export interface AdminImportReciente {
  id: string
  archivo_nombre: string
  archivo_bytes: number
  paginas: number | null
  modelo: string | null
  tokens_input: number | null
  tokens_output: number | null
  duracion_ms: number | null
  error: string | null
  creado_en: string
  usuario_nombre: string | null
  usuario_apellido: string | null
}

export interface AdminErrorReciente {
  id: string
  archivo_nombre: string
  error: string
  creado_en: string
  usuario_nombre: string | null
}

export interface AdminTopConsumidor {
  usuario_id: string
  nombre: string | null
  apellido: string | null
  total_requests: number
}

export interface AdminOverview {
  usuarios: {
    total: number
    activos: number
    inactivos: number
    admins: number
    normales: number
    recientes: AdminUsuarioReciente[]
  }
  proyectos: {
    total: number
    por_estado: Record<string, number>
    recientes: AdminProyectoReciente[]
    total_presupuestado: number
    ranking_usuarios: AdminRankingUsuario[]
  }
  imports: {
    total: number
    exitosos: number
    con_error: number
    duracion_media_ms: number
    tokens_input_total: number
    tokens_output_total: number
    modelos: Record<string, number>
    recientes: AdminImportReciente[]
    errores_recientes: AdminErrorReciente[]
  }
  rate_limits: {
    total_registros: number
    top_consumidores: AdminTopConsumidor[]
  }
  catalogos: {
    total_materiales: number
    total_estructuras: number
    total_mano_obra_activa: number
    materiales_sin_precio: number
    estructuras_sin_costo: number
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/admin.ts
git commit -m "feat(admin): add TypeScript types for admin overview RPC"
```

---

### Task 3: Admin Data Layer (lib + hook)

**Files:**
- Create: `src/lib/admin.ts`
- Create: `src/hooks/useAdmin.ts`

- [ ] **Step 1: Create `src/lib/admin.ts`**

```typescript
import { supabase } from '@/lib/supabase'
import type { AdminOverview } from '@/types/admin'

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('get_admin_overview')

  if (error) throw error
  return data as AdminOverview
}
```

- [ ] **Step 2: Create `src/hooks/useAdmin.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchAdminOverview } from '@/lib/admin'

export const ADMIN_OVERVIEW_KEY = ['admin', 'overview'] as const

export function useAdminOverview() {
  return useQuery({
    queryKey: ADMIN_OVERVIEW_KEY,
    queryFn: fetchAdminOverview,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin.ts src/hooks/useAdmin.ts
git commit -m "feat(admin): add fetchAdminOverview RPC wrapper and React Query hook"
```

---

### Task 4: AdminRoute Guard

**Files:**
- Create: `src/components/auth/AdminRoute.tsx`

- [ ] **Step 1: Create `AdminRoute.tsx`**

This component wraps `<Outlet />` and checks `usePerfil()`. It shows a loading skeleton while the profile loads, redirects to `/app` if the user is not an active admin, and renders children otherwise.

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { usePerfil } from '@/hooks/usePerfil'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldX } from 'lucide-react'

export default function AdminRoute() {
  const { data: perfil, isLoading } = usePerfil()

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" style={{ marginTop: '1rem' }} />
      </div>
    )
  }

  const isAdmin = perfil?.rol === 'admin' && perfil.activo !== false

  if (!isAdmin) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/AdminRoute.tsx
git commit -m "feat(admin): add AdminRoute guard component"
```

---

### Task 5: Admin Panel Page + Styles

**Files:**
- Create: `src/pages/AdminPanel.module.css`
- Create: `src/pages/AdminPanel.tsx`

- [ ] **Step 1: Create `AdminPanel.module.css`**

Follow the visual language from `Dashboard.module.css`: same card style, stat grid, section headers, table rows.

```css
.page {
  padding: 0;
}

.pageTitle {
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 1rem;
}

/* KPI Cards */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.statCard {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.statCard:hover {
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.1);
  transform: translateY(-4px);
  border-color: var(--color-primary-lt);
}

.statIcon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.statIconPrimary { background: #f5f3ff; color: var(--color-primary); }
.statIconSuccess { background: var(--color-success-bg); color: var(--color-success); }
.statIconWarning { background: #fffbeb; color: #f59e0b; }
.statIconDanger  { background: #fff1f2; color: #e11d48; }
.statIconMuted   { background: #f1f5f9; color: var(--color-text-muted); }

.statCard:hover .statIcon {
  transform: scale(1.1) rotate(5deg);
  transition: transform 0.3s ease;
}

.statInfo {
  display: flex;
  flex-direction: column;
}

.statValue {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--color-text);
  line-height: 1;
}

.statLabel {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.2rem;
}

/* Sections */
.sectionsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}

.sectionTitle {
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
}

/* Tables */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.table th {
  text-align: left;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.7rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--color-border);
}

.table td {
  padding: 0.55rem 0.6rem;
  color: var(--color-text);
  font-weight: 500;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.table tr:last-child td {
  border-bottom: none;
}

.table tr:hover td {
  background: #fbfcfe;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.badgeSuccess { background: var(--color-success-bg); color: var(--color-success); }
.badgeDanger  { background: #fff1f2; color: #e11d48; }
.badgeWarning { background: #fffbeb; color: #b45309; }
.badgeMuted   { background: #f1f5f9; color: var(--color-text-muted); }
.badgePrimary { background: #f5f3ff; color: var(--color-primary); }

/* Mini stat inside sections */
.miniStat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.85rem;
}

.miniStat:last-child {
  border-bottom: none;
}

.miniStatLabel {
  font-weight: 600;
  color: var(--color-text-muted);
}

.miniStatValue {
  font-weight: 800;
  color: var(--color-text);
}

/* Error text */
.errorText {
  font-size: 0.78rem;
  color: #e11d48;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Truncated cell */
.truncate {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Empty state */
.emptyState {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

/* Loading / Error full page */
.loadingPage {
  padding: 2rem;
}

.errorPage {
  padding: 4rem 2rem;
  text-align: center;
}

.errorPageIcon {
  color: #e11d48;
  margin-bottom: 1rem;
}

.errorPageTitle {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.errorPageMsg {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.btnRetry {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.85rem;
}

.btnRetry:hover {
  opacity: 0.9;
}

/* Responsive */
@media (max-width: 640px) {
  .statsGrid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  .sectionsGrid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Create `AdminPanel.tsx`**

```tsx
import { useAdminOverview } from '@/hooks/useAdmin'
import { usePerfil } from '@/hooks/usePerfil'
import { formatRD } from '@/utils/calculos'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShieldCheck,
  Users,
  Briefcase,
  FileUp,
  Gauge,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Activity,
  RefreshCw,
} from 'lucide-react'
import styles from './AdminPanel.module.css'

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function AdminPanel() {
  const { data: perfil } = usePerfil()
  const { data, isLoading, error, refetch } = useAdminOverview()

  if (isLoading) {
    return (
      <div className={styles.loadingPage}>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" style={{ marginTop: '1rem' }} />
        <div className={styles.statsGrid} style={{ marginTop: '2rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" style={{ borderRadius: '20px' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.errorPage}>
        <ShieldCheck size={56} className={styles.errorPageIcon} />
        <p className={styles.errorPageTitle}>Error al cargar el panel</p>
        <p className={styles.errorPageMsg}>
          {error instanceof Error ? error.message : 'No se pudieron obtener las metricas del sistema.'}
        </p>
        <button className={styles.btnRetry} onClick={() => void refetch()} type="button">
          <RefreshCw size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Reintentar
        </button>
      </div>
    )
  }

  const { usuarios, proyectos, imports, rate_limits, catalogos } = data

  const kpis = [
    { label: 'Usuarios', value: usuarios.total, icon: <Users size={22} />, variant: 'Primary' as const },
    { label: 'Proyectos', value: proyectos.total, icon: <Briefcase size={22} />, variant: 'Primary' as const },
    { label: 'Presupuestado', value: formatRD(proyectos.total_presupuestado), icon: <Gauge size={22} />, variant: 'Success' as const },
    { label: 'Importaciones', value: imports.total, icon: <FileUp size={22} />, variant: 'Primary' as const },
    { label: 'Errores Import', value: imports.con_error, icon: <AlertTriangle size={22} />, variant: imports.con_error > 0 ? 'Danger' as const : 'Muted' as const },
    { label: 'Materiales', value: catalogos.total_materiales, icon: <Package size={22} />, variant: 'Muted' as const },
  ]

  return (
    <div className={styles.page}>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={28} color="var(--color-primary)" />
          <h1 className={styles.pageTitle}>Panel de Administracion</h1>
        </div>
        <p className={styles.subtitle}>
          Bienvenido, <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{perfil?.nombre || 'Admin'}</span>. Vista general del sistema.
        </p>
      </header>

      {/* KPI Cards */}
      <div className={styles.statsGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles[`statIcon${kpi.variant}`]}`}>
              {kpi.icon}
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{kpi.value}</span>
              <span className={styles.statLabel}>{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Sections Grid */}
      <div className={styles.sectionsGrid}>
        {/* Usuarios */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Users size={18} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Usuarios</h3>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Activos</span>
            <span className={styles.miniStatValue}>{usuarios.activos}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Inactivos</span>
            <span className={styles.miniStatValue}>{usuarios.inactivos}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Admins</span>
            <span className={styles.miniStatValue}>{usuarios.admins}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Usuarios normales</span>
            <span className={styles.miniStatValue}>{usuarios.normales}</span>
          </div>
          {usuarios.recientes.length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '1rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                Registros recientes
              </h4>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.recientes.map((u) => (
                    <tr key={u.id}>
                      <td className={styles.truncate}>{u.nombre} {u.apellido}</td>
                      <td>
                        <span className={u.rol === 'admin' ? styles.badgePrimary : styles.badgeMuted}>
                          {u.rol || 'usuario'}
                        </span>
                      </td>
                      <td>{formatDate(u.creado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Proyectos */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Briefcase size={18} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Proyectos</h3>
          </div>
          {Object.entries(proyectos.por_estado).map(([estado, count]) => (
            <div key={estado} className={styles.miniStat}>
              <span className={styles.miniStatLabel} style={{ textTransform: 'capitalize' }}>{estado}</span>
              <span className={styles.miniStatValue}>{count}</span>
            </div>
          ))}
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Total presupuestado</span>
            <span className={styles.miniStatValue}>{formatRD(proyectos.total_presupuestado)}</span>
          </div>
          {proyectos.ranking_usuarios.length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '1rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                Ranking de usuarios
              </h4>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Proyectos</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectos.ranking_usuarios.map((ru) => (
                    <tr key={ru.usuario_id}>
                      <td className={styles.truncate}>{ru.nombre} {ru.apellido}</td>
                      <td style={{ fontWeight: 800 }}>{ru.total_proyectos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Importaciones */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FileUp size={18} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Importaciones de Planos</h3>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Exitosas</span>
            <span className={styles.miniStatValue}>
              <span className={styles.badgeSuccess}><CheckCircle2 size={12} /> {imports.exitosos}</span>
            </span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Con error</span>
            <span className={styles.miniStatValue}>
              <span className={imports.con_error > 0 ? styles.badgeDanger : styles.badgeMuted}>
                <XCircle size={12} /> {imports.con_error}
              </span>
            </span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Duracion media</span>
            <span className={styles.miniStatValue}>
              <Clock size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              {imports.duracion_media_ms > 0 ? `${(imports.duracion_media_ms / 1000).toFixed(1)}s` : '-'}
            </span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Tokens (in/out)</span>
            <span className={styles.miniStatValue}>
              {imports.tokens_input_total.toLocaleString()} / {imports.tokens_output_total.toLocaleString()}
            </span>
          </div>
          {Object.keys(imports.modelos).length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '1rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                Modelos usados
              </h4>
              {Object.entries(imports.modelos).map(([modelo, count]) => (
                <div key={modelo} className={styles.miniStat}>
                  <span className={styles.miniStatLabel}>
                    <Cpu size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
                    {modelo}
                  </span>
                  <span className={styles.miniStatValue}>{count}</span>
                </div>
              ))}
            </>
          )}
          {imports.recientes.length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '1rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                Archivos recientes
              </h4>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Usuario</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.recientes.map((ri) => (
                    <tr key={ri.id}>
                      <td className={styles.truncate} title={ri.archivo_nombre}>
                        {ri.archivo_nombre} ({formatBytes(ri.archivo_bytes)})
                      </td>
                      <td className={styles.truncate}>{ri.usuario_nombre || '-'}</td>
                      <td>
                        {ri.error ? (
                          <span className={styles.badgeDanger} title={ri.error}><XCircle size={10} /> Error</span>
                        ) : (
                          <span className={styles.badgeSuccess}><CheckCircle2 size={10} /> OK</span>
                        )}
                      </td>
                      <td>{formatDate(ri.creado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Errores recientes */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <AlertTriangle size={18} color="#e11d48" />
            <h3 className={styles.sectionTitle}>Errores Recientes</h3>
          </div>
          {imports.errores_recientes.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
              <p>Sin errores recientes</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Error</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {imports.errores_recientes.map((er) => (
                  <tr key={er.id}>
                    <td className={styles.truncate}>{er.archivo_nombre}</td>
                    <td className={styles.errorText} title={er.error}>{er.error}</td>
                    <td>{formatDate(er.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rate Limits */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Activity size={18} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Rate Limits</h3>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Registros totales</span>
            <span className={styles.miniStatValue}>{rate_limits.total_registros}</span>
          </div>
          {rate_limits.top_consumidores.length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '1rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                Top consumidores
              </h4>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {rate_limits.top_consumidores.map((tc) => (
                    <tr key={tc.usuario_id}>
                      <td className={styles.truncate}>{tc.nombre} {tc.apellido}</td>
                      <td style={{ fontWeight: 800 }}>{tc.total_requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Catalogos */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Package size={18} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Catalogos Tecnicos</h3>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Materiales</span>
            <span className={styles.miniStatValue}>{catalogos.total_materiales}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Estructuras (UUCC)</span>
            <span className={styles.miniStatValue}>{catalogos.total_estructuras}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Mano de obra activa</span>
            <span className={styles.miniStatValue}>{catalogos.total_mano_obra_activa}</span>
          </div>
          {(catalogos.materiales_sin_precio > 0 || catalogos.estructuras_sin_costo > 0) && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '1rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '0.3rem', color: '#f59e0b' }} />
                Datos incompletos
              </h4>
              {catalogos.materiales_sin_precio > 0 && (
                <div className={styles.miniStat}>
                  <span className={styles.miniStatLabel}>Materiales sin precio</span>
                  <span className={styles.miniStatValue}>
                    <span className={styles.badgeWarning}>{catalogos.materiales_sin_precio}</span>
                  </span>
                </div>
              )}
              {catalogos.estructuras_sin_costo > 0 && (
                <div className={styles.miniStat}>
                  <span className={styles.miniStatLabel}>Estructuras sin costo</span>
                  <span className={styles.miniStatValue}>
                    <span className={styles.badgeWarning}>{catalogos.estructuras_sin_costo}</span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Proyectos recientes (full width) */}
      {proyectos.recientes.length > 0 && (
        <div className={styles.section} style={{ marginBottom: '2rem' }}>
          <div className={styles.sectionHeader}>
            <Briefcase size={18} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Proyectos Recientes (Global)</h3>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.recientes.map((p) => (
                <tr key={p.id}>
                  <td className={styles.truncate}>{p.nombre}</td>
                  <td className={styles.truncate}>{p.cliente}</td>
                  <td className={styles.truncate}>{p.usuario_nombre} {p.usuario_apellido}</td>
                  <td>
                    <span className={styles.badgeMuted} style={{ textTransform: 'capitalize' }}>
                      {p.estado || 'sin estado'}
                    </span>
                  </td>
                  <td>{formatDate(p.creado_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminPanel.tsx src/pages/AdminPanel.module.css
git commit -m "feat(admin): add AdminPanel page and styles"
```

---

### Task 6: Wire Route and Header Menu

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Add lazy import and admin route to `src/App.tsx`**

Add two lazy imports after the existing ones:

```typescript
const AdminPanel = lazy(() => import('@/pages/AdminPanel'))
const AdminRoute = lazy(() => import('@/components/auth/AdminRoute'))
```

Add the admin route inside the `/app` layout route, after the `perfil` route and before the closing `</Route>`:

```tsx
<Route element={<AdminRoute />}>
  <Route path="admin" element={<AdminPanel />} />
</Route>
```

The full `/app` route block becomes:

```tsx
<Route path="/app" element={<Layout />}>
  <Route index element={<Dashboard />} />
  <Route path="presupuesto/nuevo" element={<NuevoPresupuesto />} />
  <Route path="presupuesto/:id" element={<NuevoPresupuesto />} />
  <Route path="proyectos" element={<Proyectos />} />
  <Route path="resoluciones" element={<Resoluciones />} />
  <Route path="perfil" element={<Perfil />} />
  <Route element={<AdminRoute />}>
    <Route path="admin" element={<AdminPanel />} />
  </Route>
</Route>
```

- [ ] **Step 2: Add "Panel Admin" to the Header dropdown**

In `src/components/layout/Header.tsx`:

Add `ShieldCheck` to the lucide-react import:
```typescript
import { Menu, Cpu, User, UserCircle, Camera, LogOut, ChevronDown, Settings, ShieldCheck } from 'lucide-react'
```

Insert a new dropdown item between the "Configuracion" button and the logout divider. The item should only render when `perfil?.rol === 'admin' && perfil.activo !== false`:

```tsx
{perfil?.rol === 'admin' && perfil.activo !== false && (
  <>
    <div className={styles.dropdownDivider} />
    <button
      className={styles.dropdownItem}
      onClick={() => { setDropdownOpen(false); void navigate('/app/admin') }}
      type="button"
    >
      <ShieldCheck size={16} /> Panel Admin
    </button>
  </>
)}
```

This block goes right after the "Configuracion" button and before the existing `<div className={styles.dropdownDivider} />` that precedes "Cerrar Sesion".

- [ ] **Step 3: Run typecheck and build**

```bash
npm run typecheck
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/Header.tsx
git commit -m "feat(admin): wire /app/admin route and add Panel Admin to header dropdown"
```

---

### Task 7: Verify Supabase Types (optional)

**Files:**
- Modify: `src/types/supabase.ts` (auto-generated)

If the RPC has been deployed to Supabase, regenerate the types so `supabase.rpc('get_admin_overview')` is properly typed:

- [ ] **Step 1: Regenerate types**

```bash
npm run db:types
```

This updates `src/types/supabase.ts` to include `get_admin_overview` in the `Functions` section.

- [ ] **Step 2: Run full CI check**

```bash
npm run ci
```

- [ ] **Step 3: Commit if types changed**

```bash
git add src/types/supabase.ts
git commit -m "chore: regenerate supabase types with admin RPC"
```
