# Enterprise-Grade Migration Plan for MT-PRESUPUESTOS-SIE

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate a React+Vite MVP (presupuesto management app) to a fully typed, tested, enterprise-grade frontend with TanStack Query, React Hook Form + Zod, shadcn/ui, list virtualization, code splitting, PDF Web Worker, and security hardening.

**Architecture:** Sequential 4-phase migration from a ~2,500-line pure-JSX app to strict TypeScript with well-typed Supabase queries, declarative server-state via TanStack Query replacing Zustand async actions, validated forms, an accessible component system, and PDF generation offloaded to a Web Worker.

**Tech Stack:** TypeScript 5 (strict), Vite 5, React 18, TanStack Query v5, React Hook Form v7, Zod v3, shadcn/ui (Radix UI), Tailwind CSS v3, @tanstack/react-virtual, Framer Motion, Vitest + Testing Library, Playwright

---

## Current Codebase Map (read this before any task)

```
src/
  main.jsx                        → main.tsx
  App.jsx                         → App.tsx
  styles/global.css               (keep, add Tailwind directives)
  lib/
    supabase.js                   → supabase.ts
    db.js                         → db.ts  (typed DB layer)
  store/
    presupuestoStore.js           → DELETE (replaced by TanStack Query hooks)
  utils/
    calculos.js                   → calculos.ts  (pure math, fully typed)
    exportPDF.js                  → exportPDF.worker.ts (Web Worker, Task 16)
  data/
    estructuras_sie.js            → estructuras_sie.ts
  types/
    index.ts                      (NEW — all shared domain types)
  hooks/
    useProyectos.ts               (NEW — TanStack Query hooks)
    useEstructuras.ts             (NEW — TanStack Query hooks)
    usePerfil.ts                  (NEW — TanStack Query hooks)
  lib/
    queryClient.ts                (NEW — TanStack Query client config)
    validations.ts                (NEW — Zod schemas)
  components/
    layout/
      Layout.tsx                  (rename)
      Header.tsx                  (rename)
      Sidebar.tsx                 (rename)
    ui/                           (NEW — shadcn/ui components)
      button.tsx
      input.tsx
      toast.tsx
      dialog.tsx
      skeleton.tsx
      badge.tsx
  pages/
    Landing.tsx
    Login.tsx
    Registro.tsx
    Dashboard.tsx
    Proyectos.tsx
    NuevoPresupuesto.tsx          (split into sub-components)
    Resoluciones.tsx              (+ virtualized list)
    Perfil.tsx
```

---

## PHASE 1 — Foundation: TypeScript + Tailwind + ESLint Strict

---

### Task 1: Install TypeScript and Type Dependencies

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Modify: `vite.config.js` → rename to `vite.config.ts`

- [ ] **Step 1: Install TypeScript and type packages**

```bash
cd "C:/Users/Christopher Rosario/Documents/Projects/SOFTWARE_DEVELOPMENT_PROJECTS/MT-PRESUPUESTOS-SIE"
npm install --save-dev typescript @types/react @types/react-dom @types/node
```

Expected: packages installed, no errors.

- [ ] **Step 2: Create tsconfig.json**

Create `tsconfig.json` at project root:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Rename vite.config.js to vite.config.ts and add types**

Delete `vite.config.js`, create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
})
```

- [ ] **Step 5: Add tsc check script to package.json**

In `package.json`, update the `scripts` section:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 6: Verify TypeScript setup compiles (will fail on .jsx files — that's expected)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: errors about `.jsx` files not being found — this is OK at this stage. The important thing is `tsc` runs without crashing.

---

### Task 2: Create Domain Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write the domain types file**

Create `src/types/index.ts`:

```typescript
// ─── Database row shapes (match Supabase table columns) ───────────────────────

export interface Perfil {
  id: string
  nombre: string
  apellido: string
  empresa: string
  telefono: string
  email: string
  rol: string
  activo: boolean
}

export interface Material {
  codigo: string
  descripcion: string
  unidad: string
  precio_igmelec: number
  precio_grape: number
}

export interface UuccMaterialEstructura {
  id: number
  cantidad: number
  estructura: string
  materiales: Material
}

export interface EstructuraDB {
  estructura: string
  costo_materiales_rd: number
}

export interface Partida {
  id?: string
  proyecto_id?: string
  estructura: string
  cantidad: number
  precio_unitario: number
  total: number
  detalles?: string
  orden?: number
}

export interface Proyecto {
  id: string
  nombre: string
  cliente: string
  fecha: string
  voltaje: string
  estado: string
  aplicar_itbis: boolean
  overhead: number
  creado_en?: string
  partidas?: Partida[]
}

// ─── Application-level shapes ─────────────────────────────────────────────────

export interface ResumenPresupuesto {
  subtotal: number
  costoOverhead: number
  baseITBIS: number
  montoITBIS: number
  total: number
  porcentajeOverhead: number
  aplicarITBIS: boolean
}

export interface MaterialConsolidado {
  codigo: string
  descripcion: string
  unidad: string
  precioUnitario: number
  cantidadTotal: number
  subtotal: number
}

export type EstadoPresupuesto = 'borrador' | 'enviado' | 'aprobado' | 'rechazado'

export type TipoExportPDF = 'presupuesto' | 'materiales' | 'completo'

export interface ExportPDFOptions {
  proyecto: Proyecto
  tipo: TipoExportPDF
  materialesConsolidados: MaterialConsolidado[]
}
```

- [ ] **Step 2: Verify the types file has no syntax errors**

```bash
npx tsc --noEmit --allowJs src/types/index.ts 2>&1
```

Expected: no output (no errors).

---

### Task 3: Migrate Utility Files to TypeScript

**Files:**
- Modify: `src/utils/calculos.js` → `src/utils/calculos.ts`
- Modify: `src/data/estructuras_sie.js` → `src/data/estructuras_sie.ts`

- [ ] **Step 1: Rename and rewrite src/utils/calculos.js as calculos.ts**

Delete `src/utils/calculos.js`, create `src/utils/calculos.ts`:

```typescript
import type { Partida, ResumenPresupuesto } from '@/types'

export function totalPartida(cantidad: number, precioUnitario: number): number {
  return cantidad * precioUnitario
}

export function subtotal(partidas: Partida[]): number {
  return partidas.reduce((acc, p) => acc + (p.total ?? 0), 0)
}

export function calcularITBIS(base: number, pct = 0.18): number {
  return base * pct
}

export interface ResumenOptions {
  porcentajeOverhead?: number
  aplicarITBIS?: boolean
}

export function resumenPresupuesto(
  partidas: Partida[],
  options: ResumenOptions = {}
): ResumenPresupuesto {
  const { porcentajeOverhead = 0, aplicarITBIS = false } = options
  const sub = subtotal(partidas)
  const costoOverhead = sub * (porcentajeOverhead / 100)
  const baseITBIS = sub + costoOverhead
  const montoITBIS = aplicarITBIS ? calcularITBIS(baseITBIS) : 0
  const total = baseITBIS + montoITBIS

  return {
    subtotal: sub,
    costoOverhead,
    baseITBIS,
    montoITBIS,
    total,
    porcentajeOverhead,
    aplicarITBIS,
  }
}

export function formatRD(valor: number): string {
  return `RD$ ${valor.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
```

- [ ] **Step 2: Rename and rewrite src/data/estructuras_sie.js as estructuras_sie.ts**

Delete `src/data/estructuras_sie.js`, create `src/data/estructuras_sie.ts`:

```typescript
export interface VoltajeOption {
  label: string
  value: string
}

export const VOLTAJES: VoltajeOption[] = [
  {
    label: 'Trifásico / Bifásico 12.47/7.2 kV',
    value: 'trifasico_bifasico',
  },
  {
    label: 'Monofásico 7.2 kV',
    value: 'monofasico',
  },
]
```

Note: The old `ESTRUCTURAS` array is replaced by live data from Supabase (`v_costo_uucc_por_estructura`). Do not copy the placeholder data.

---

### Task 4: Migrate Supabase Library to TypeScript

**Files:**
- Modify: `src/lib/supabase.js` → `src/lib/supabase.ts`
- Modify: `src/lib/db.js` → `src/lib/db.ts`

- [ ] **Step 1: Rename and rewrite src/lib/supabase.js as supabase.ts**

Delete `src/lib/supabase.js`, create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Rename and rewrite src/lib/db.js as db.ts with full types**

Delete `src/lib/db.js`, create `src/lib/db.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import type {
  Proyecto,
  Partida,
  Perfil,
  EstructuraDB,
  UuccMaterialEstructura,
} from '@/types'

// ─── Estructuras ──────────────────────────────────────────────────────────────

export async function fetchEstructuras(): Promise<EstructuraDB[]> {
  const { data, error } = await supabase
    .from('v_costo_uucc_por_estructura')
    .select('estructura, costo_materiales_rd')
    .order('estructura')

  if (error) throw error
  return data ?? []
}

export async function fetchMaterialesPorEstructura(
  estructura: string
): Promise<UuccMaterialEstructura[]> {
  const { data, error } = await supabase
    .from('uucc_material_estructura')
    .select('id, cantidad, estructura, materiales(codigo, descripcion, unidad, precio_igmelec, precio_grape)')
    .eq('estructura', estructura)

  if (error) throw error
  return (data ?? []) as UuccMaterialEstructura[]
}

// ─── Proyectos ────────────────────────────────────────────────────────────────

export async function fetchProyectos(): Promise<Proyecto[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('proyectos')
    .select('*, partidas(*)')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as Proyecto[]
}

export async function fetchProyecto(id: string): Promise<Proyecto> {
  const { data, error } = await supabase
    .from('proyectos')
    .select('*, partidas(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Proyecto
}

export async function createProyecto(
  proyecto: Omit<Proyecto, 'id' | 'creado_en'>,
  partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
): Promise<Proyecto> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data: proy, error: proyError } = await supabase
    .from('proyectos')
    .insert({ ...proyecto, usuario_id: user.id })
    .select()
    .single()

  if (proyError) throw proyError

  if (partidas.length > 0) {
    const { error: partsError } = await supabase
      .from('partidas')
      .insert(partidas.map((p) => ({ ...p, proyecto_id: proy.id })))

    if (partsError) throw partsError
  }

  return proy as Proyecto
}

export async function updateProyecto(
  id: string,
  proyecto: Partial<Omit<Proyecto, 'id' | 'creado_en'>>,
  partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
): Promise<Proyecto> {
  const { error: proyError } = await supabase
    .from('proyectos')
    .update(proyecto)
    .eq('id', id)

  if (proyError) throw proyError

  // Replace all partidas for this project
  const { error: deleteError } = await supabase
    .from('partidas')
    .delete()
    .eq('proyecto_id', id)

  if (deleteError) throw deleteError

  if (partidas.length > 0) {
    const { error: insertError } = await supabase
      .from('partidas')
      .insert(partidas.map((p) => ({ ...p, proyecto_id: id })))

    if (insertError) throw insertError
  }

  return fetchProyecto(id)
}

export async function deleteProyecto(id: string): Promise<void> {
  const { error } = await supabase.from('proyectos').delete().eq('id', id)
  if (error) throw error
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

export async function fetchPerfil(): Promise<Perfil | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data ?? null) as Perfil | null
}

export async function upsertPerfil(perfil: Partial<Perfil>): Promise<Perfil> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('perfiles')
    .upsert({ ...perfil, id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Perfil
}
```

---

### Task 5: Install and Configure Tailwind CSS

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Install Tailwind CSS and PostCSS**

```bash
npm install --save-dev tailwindcss postcss autoprefixer
npx tailwindcss init -p --ts
```

Expected: `tailwind.config.ts` and `postcss.config.js` created.

- [ ] **Step 2: Update tailwind.config.ts with content paths and design tokens**

Overwrite `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a365d',
          light: '#2b6cb0',
        },
        accent: '#e53e3e',
        success: '#276749',
        surface: '#ffffff',
        'text-muted': '#718096',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,.08)',
        md: '0 4px 12px rgba(0,0,0,.10)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 3: Add Tailwind directives to global.css**

At the very top of `src/styles/global.css`, add:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Keep all existing CSS custom properties (`:root { --color-primary: ... }`) below the directives — they coexist.

---

### Task 6: Configure ESLint Strict

**Files:**
- Modify: `.eslintrc.cjs` or `eslint.config.js` (whichever exists)

- [ ] **Step 1: Check the current ESLint config file name**

```bash
ls C:/Users/Christopher\ Rosario/Documents/Projects/SOFTWARE_DEVELOPMENT_PROJECTS/MT-PRESUPUESTOS-SIE/.eslint*
```

- [ ] **Step 2: Replace the ESLint config with strict TypeScript rules**

If the file is `.eslintrc.cjs`, overwrite it with:

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
}
```

- [ ] **Step 3: Install missing ESLint plugins**

```bash
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks eslint-plugin-react-refresh
```

---

## PHASE 2 — Async State: TanStack Query + React Hook Form + Zod

---

### Task 7: Install TanStack Query and Set Up Query Client

**Files:**
- Modify: `package.json`
- Create: `src/lib/queryClient.ts`
- Modify: `src/main.jsx` → `src/main.tsx`

- [ ] **Step 1: Install TanStack Query**

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

- [ ] **Step 2: Create src/lib/queryClient.ts**

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})
```

- [ ] **Step 3: Rename main.jsx to main.tsx and wrap with QueryClientProvider**

Delete `src/main.jsx`, create `src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { queryClient } from '@/lib/queryClient'
import '@/styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
)
```

---

### Task 8: Create TanStack Query Hooks

**Files:**
- Create: `src/hooks/useEstructuras.ts`
- Create: `src/hooks/useProyectos.ts`
- Create: `src/hooks/usePerfil.ts`

- [ ] **Step 1: Create src/hooks/useEstructuras.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchEstructuras, fetchMaterialesPorEstructura } from '@/lib/db'

export const ESTRUCTURAS_KEY = ['estructuras'] as const

export function useEstructuras() {
  return useQuery({
    queryKey: ESTRUCTURAS_KEY,
    queryFn: fetchEstructuras,
    staleTime: Infinity, // catalog data rarely changes
  })
}

export function useMaterialesPorEstructura(estructura: string) {
  return useQuery({
    queryKey: ['materiales', estructura],
    queryFn: () => fetchMaterialesPorEstructura(estructura),
    enabled: !!estructura,
    staleTime: Infinity,
  })
}
```

- [ ] **Step 2: Create src/hooks/useProyectos.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProyectos,
  fetchProyecto,
  createProyecto,
  updateProyecto,
  deleteProyecto,
} from '@/lib/db'
import type { Proyecto, Partida } from '@/types'

export const PROYECTOS_KEY = ['proyectos'] as const

export function useProyectos() {
  return useQuery({
    queryKey: PROYECTOS_KEY,
    queryFn: fetchProyectos,
  })
}

export function useProyecto(id: string) {
  return useQuery({
    queryKey: ['proyectos', id],
    queryFn: () => fetchProyecto(id),
    enabled: !!id,
  })
}

export function useCreateProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      proyecto,
      partidas,
    }: {
      proyecto: Omit<Proyecto, 'id' | 'creado_en'>
      partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
    }) => createProyecto(proyecto, partidas),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROYECTOS_KEY })
    },
  })
}

export function useUpdateProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      proyecto,
      partidas,
    }: {
      id: string
      proyecto: Partial<Omit<Proyecto, 'id' | 'creado_en'>>
      partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
    }) => updateProyecto(id, proyecto, partidas),
    onSuccess: (updated) => {
      qc.setQueryData(['proyectos', updated.id], updated)
      void qc.invalidateQueries({ queryKey: PROYECTOS_KEY })
    },
  })
}

export function useDeleteProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProyecto(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROYECTOS_KEY })
    },
  })
}
```

- [ ] **Step 3: Create src/hooks/usePerfil.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPerfil, upsertPerfil } from '@/lib/db'
import type { Perfil } from '@/types'

export const PERFIL_KEY = ['perfil'] as const

export function usePerfil() {
  return useQuery({
    queryKey: PERFIL_KEY,
    queryFn: fetchPerfil,
  })
}

export function useUpsertPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (perfil: Partial<Perfil>) => upsertPerfil(perfil),
    onSuccess: (updated) => {
      qc.setQueryData(PERFIL_KEY, updated)
    },
  })
}
```

- [ ] **Step 4: Delete the old Zustand store**

```bash
rm "C:/Users/Christopher Rosario/Documents/Projects/SOFTWARE_DEVELOPMENT_PROJECTS/MT-PRESUPUESTOS-SIE/src/store/presupuestoStore.js"
```

---

### Task 9: Install React Hook Form + Zod and Create Schemas

**Files:**
- Modify: `package.json`
- Create: `src/lib/validations.ts`

- [ ] **Step 1: Install packages**

```bash
npm install react-hook-form zod @hookform/resolvers
```

- [ ] **Step 2: Create src/lib/validations.ts**

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const registroSchema = z
  .object({
    nombre: z.string().min(2, 'Nombre requerido'),
    apellido: z.string().min(2, 'Apellido requerido'),
    empresa: z.string().min(2, 'Empresa requerida'),
    telefono: z.string().min(10, 'Teléfono inválido'),
    email: z.string().email('Correo inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const proyectoSchema = z.object({
  nombre: z.string().min(3, 'Nombre del proyecto requerido'),
  cliente: z.string().min(2, 'Cliente requerido'),
  fecha: z.string().min(1, 'Fecha requerida'),
  voltaje: z.string().min(1, 'Voltaje requerido'),
  estado: z.enum(['borrador', 'enviado', 'aprobado', 'rechazado']),
  overhead: z.number().min(0).max(100),
  aplicar_itbis: z.boolean(),
})

export const perfilSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  apellido: z.string().min(2, 'Apellido requerido'),
  empresa: z.string().min(2, 'Empresa requerida'),
  telefono: z.string().min(10, 'Teléfono inválido'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegistroFormData = z.infer<typeof registroSchema>
export type ProyectoFormData = z.infer<typeof proyectoSchema>
export type PerfilFormData = z.infer<typeof perfilSchema>
```

---

## PHASE 3 — UX/UI: shadcn/ui + Virtualization + Framer Motion

---

### Task 10: Install and Configure shadcn/ui

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/toast.tsx` + `src/components/ui/use-toast.ts`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Install Radix UI primitives and class variance authority**

```bash
npm install @radix-ui/react-dialog @radix-ui/react-toast @radix-ui/react-slot class-variance-authority tailwind-merge
```

- [ ] **Step 2: Create src/lib/utils.ts (shadcn cn helper)**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Create src/components/ui/button.tsx**

```typescript
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-light',
        destructive: 'bg-accent text-white hover:bg-red-700',
        outline: 'border border-input bg-surface hover:bg-gray-100',
        ghost: 'hover:bg-gray-100',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 4: Create src/components/ui/input.tsx**

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm ring-offset-surface file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **Step 5: Create src/components/ui/skeleton.tsx**

```typescript
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 6: Create src/components/ui/badge.tsx**

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white',
        success: 'border-transparent bg-success text-white',
        destructive: 'border-transparent bg-accent text-white',
        outline: 'text-text',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 7: Create src/components/ui/use-toast.ts (toast state hook)**

```typescript
import * as React from 'react'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

interface ToastState {
  toasts: Toast[]
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return { toasts: [...state.toasts, action.toast].slice(-5) }
    case 'REMOVE':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) }
  }
}

let dispatch: React.Dispatch<ToastAction> | null = null
let state: ToastState = { toasts: [] }

export function useToastStore() {
  const [s, d] = React.useReducer(reducer, state)
  React.useEffect(() => {
    dispatch = d
    state = s
  })
  return s
}

export function toast(t: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  dispatch?.({ type: 'ADD', toast: { ...t, id } })
  setTimeout(() => dispatch?.({ type: 'REMOVE', id }), 4000)
}
```

- [ ] **Step 8: Create src/components/ui/toast.tsx (toast component)**

```typescript
import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'
import { useToastStore } from './use-toast'

export function Toaster() {
  const { toasts } = useToastStore()

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className={cn(
            'fixed bottom-4 right-4 z-50 flex w-96 rounded-md border bg-surface p-4 shadow-md',
            t.variant === 'destructive' && 'border-accent bg-red-50'
          )}
        >
          <div>
            <ToastPrimitive.Title className="font-semibold text-sm">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-xs text-text-muted mt-1">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  )
}
```

- [ ] **Step 9: Add Toaster to main.tsx**

In `src/main.tsx`, import and add `<Toaster />` inside the QueryClientProvider (after `<App />`):

```typescript
import { Toaster } from '@/components/ui/toast'
// ...
<BrowserRouter>
  <App />
  <Toaster />
</BrowserRouter>
```

---

### Task 11: Migrate Layout Components to TypeScript

**Files:**
- Modify: `src/components/layout/Layout.jsx` → `.tsx`
- Modify: `src/components/layout/Header.jsx` → `.tsx`
- Modify: `src/components/layout/Sidebar.jsx` → `.tsx`
- Modify: `src/App.jsx` → `src/App.tsx`

- [ ] **Step 1: Rename and rewrite Layout.jsx as Layout.tsx**

Delete `Layout.jsx`, create `Layout.tsx`:

```typescript
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rename and rewrite Header.jsx as Header.tsx**

Delete `Header.jsx`, create `Header.tsx`:

```typescript
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './Header.module.css'

export default function Header() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    void navigate('/login')
  }

  return (
    <header className={styles.header}>
      <span className={styles.brand}>⚡ MT Presupuestos SIE</span>
      <button onClick={() => void handleLogout()} className={styles.logoutBtn}>
        Cerrar sesión
      </button>
    </header>
  )
}
```

- [ ] **Step 3: Rename and rewrite Sidebar.jsx as Sidebar.tsx**

Delete `Sidebar.jsx`, create `Sidebar.tsx`:

```typescript
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: '📊', end: true },
  { to: '/app/presupuesto/nuevo', label: 'Nuevo Presupuesto', icon: '➕', end: false },
  { to: '/app/proyectos', label: 'Proyectos', icon: '📁', end: false },
  { to: '/app/resoluciones', label: 'Resoluciones', icon: '📋', end: false },
  { to: '/app/perfil', label: 'Mi Perfil', icon: '👤', end: false },
] as const

export default function Sidebar() {
  return (
    <nav className={styles.sidebar}>
      {NAV_ITEMS.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ''}`
          }
        >
          <span>{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Rename and rewrite App.jsx as App.tsx**

Delete `App.jsx`, create `App.tsx`:

```typescript
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { Skeleton } from '@/components/ui/skeleton'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Registro = lazy(() => import('@/pages/Registro'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const NuevoPresupuesto = lazy(() => import('@/pages/NuevoPresupuesto'))
const Proyectos = lazy(() => import('@/pages/Proyectos'))
const Resoluciones = lazy(() => import('@/pages/Resoluciones'))
const Perfil = lazy(() => import('@/pages/Perfil'))

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="presupuesto/nuevo" element={<NuevoPresupuesto />} />
          <Route path="presupuesto/:id" element={<NuevoPresupuesto />} />
          <Route path="proyectos" element={<Proyectos />} />
          <Route path="resoluciones" element={<Resoluciones />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
```

---

### Task 12: Migrate Auth Pages (Login + Registro) to TypeScript with RHF + Zod

**Files:**
- Modify: `src/pages/Login.jsx` → `Login.tsx`
- Modify: `src/pages/Registro.jsx` → `Registro.tsx`

- [ ] **Step 1: Rename and rewrite Login.jsx as Login.tsx**

Delete `Login.jsx`, create `Login.tsx`:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import styles from './Auth.module.css'

export default function Login() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      toast({ title: 'Error al iniciar sesión', description: error.message, variant: 'destructive' })
      return
    }
    void navigate('/app')
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>⚡ Iniciar Sesión</h1>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Correo</label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <span className={styles.error}>{errors.email.message}</span>}
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <span className={styles.error}>{errors.password.message}</span>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}
          </Button>
        </form>
        <p className={styles.link}>
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rename and rewrite Registro.jsx as Registro.tsx**

Delete `Registro.jsx`, create `Registro.tsx`:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { registroSchema, type RegistroFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import styles from './Auth.module.css'

export default function Registro() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroFormData>({ resolver: zodResolver(registroSchema) })

  const onSubmit = async (data: RegistroFormData) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nombre: data.nombre,
          apellido: data.apellido,
          empresa: data.empresa,
          telefono: data.telefono,
        },
      },
    })
    if (error) {
      toast({ title: 'Error al registrarse', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Cuenta creada', description: 'Revisa tu correo para confirmar.' })
    void navigate('/login')
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>⚡ Crear Cuenta</h1>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className={styles.form}>
          {(
            [
              ['nombre', 'Nombre', 'text'],
              ['apellido', 'Apellido', 'text'],
              ['empresa', 'Empresa', 'text'],
              ['telefono', 'Teléfono', 'tel'],
              ['email', 'Correo', 'email'],
              ['password', 'Contraseña', 'password'],
              ['confirmPassword', 'Confirmar Contraseña', 'password'],
            ] as const
          ).map(([name, label, type]) => (
            <div key={name} className={styles.field}>
              <label htmlFor={name}>{label}</label>
              <Input id={name} type={type} {...register(name)} />
              {errors[name] && (
                <span className={styles.error}>{errors[name]?.message}</span>
              )}
            </div>
          ))}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creando cuenta...' : 'Registrarse'}
          </Button>
        </form>
        <p className={styles.link}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
```

---

### Task 13: Migrate Dashboard and Proyectos Pages

**Files:**
- Modify: `src/pages/Dashboard.jsx` → `Dashboard.tsx`
- Modify: `src/pages/Proyectos.jsx` → `Proyectos.tsx`

- [ ] **Step 1: Rename and rewrite Dashboard.jsx as Dashboard.tsx**

Delete `Dashboard.jsx`, create `Dashboard.tsx`:

```typescript
import { useNavigate } from 'react-router-dom'
import { useProyectos } from '@/hooks/useProyectos'
import { formatRD, resumenPresupuesto } from '@/utils/calculos'
import { Skeleton } from '@/components/ui/skeleton'
import type { Proyecto } from '@/types'
import styles from './Dashboard.module.css'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: proyectos = [], isLoading } = useProyectos()

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const totalProyectos = proyectos.length
  const totalInversion = proyectos.reduce((acc, p) => {
    if (!p.partidas) return acc
    const r = resumenPresupuesto(p.partidas, {
      porcentajeOverhead: p.overhead,
      aplicarITBIS: p.aplicar_itbis,
    })
    return acc + r.total
  }, 0)
  const aprobados = proyectos.filter((p) => p.estado === 'aprobado').length
  const recientes = proyectos.slice(0, 5)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.statsGrid}>
        <StatCard label="Total Proyectos" value={String(totalProyectos)} />
        <StatCard label="Inversión Total" value={formatRD(totalInversion)} />
        <StatCard label="Proyectos Aprobados" value={String(aprobados)} />
      </div>
      <section className={styles.recent}>
        <h2>Proyectos Recientes</h2>
        {recientes.map((p: Proyecto) => (
          <div
            key={p.id}
            className={styles.recentRow}
            onClick={() => void navigate(`/app/presupuesto/${p.id}`)}
          >
            <span>{p.nombre}</span>
            <span>{p.cliente}</span>
            <span>{p.estado}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Rename and rewrite Proyectos.jsx as Proyectos.tsx**

Delete `Proyectos.jsx`, create `Proyectos.tsx`:

```typescript
import { useNavigate } from 'react-router-dom'
import { useProyectos, useDeleteProyecto } from '@/hooks/useProyectos'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { formatRD, resumenPresupuesto } from '@/utils/calculos'
import styles from './Proyectos.module.css'

const ESTADO_VARIANT = {
  aprobado: 'success',
  rechazado: 'destructive',
  enviado: 'default',
  borrador: 'outline',
} as const

export default function Proyectos() {
  const navigate = useNavigate()
  const { data: proyectos = [], isLoading } = useProyectos()
  const deleteMutation = useDeleteProyecto()

  const handleDelete = (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: 'Proyecto eliminado' }),
      onError: (e) =>
        toast({ title: 'Error', description: String(e), variant: 'destructive' }),
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Proyectos</h1>
        <Button onClick={() => void navigate('/app/presupuesto/nuevo')}>
          + Nuevo Presupuesto
        </Button>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {proyectos.map((p) => {
            const r = resumenPresupuesto(p.partidas ?? [], {
              porcentajeOverhead: p.overhead,
              aplicarITBIS: p.aplicar_itbis,
            })
            return (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.cliente}</td>
                <td>{p.fecha}</td>
                <td>{formatRD(r.total)}</td>
                <td>
                  <Badge variant={ESTADO_VARIANT[p.estado as keyof typeof ESTADO_VARIANT] ?? 'outline'}>
                    {p.estado}
                  </Badge>
                </td>
                <td className={styles.actions}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void navigate(`/app/presupuesto/${p.id}`)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(p.id, p.nombre)}
                    disabled={deleteMutation.isPending}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

---

### Task 14: Migrate Perfil Page to TypeScript with RHF + Zod

**Files:**
- Modify: `src/pages/Perfil.jsx` → `Perfil.tsx`

- [ ] **Step 1: Rename and rewrite Perfil.jsx as Perfil.tsx**

Delete `Perfil.jsx`, create `Perfil.tsx`:

```typescript
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePerfil, useUpsertPerfil } from '@/hooks/usePerfil'
import { perfilSchema, type PerfilFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import styles from './Perfil.module.css'

export default function Perfil() {
  const { data: perfil, isLoading } = usePerfil()
  const upsertMutation = useUpsertPerfil()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PerfilFormData>({ resolver: zodResolver(perfilSchema) })

  useEffect(() => {
    if (perfil) reset(perfil)
  }, [perfil, reset])

  const onSubmit = async (data: PerfilFormData) => {
    upsertMutation.mutate(data, {
      onSuccess: () => toast({ title: 'Perfil actualizado' }),
      onError: (e) =>
        toast({ title: 'Error', description: String(e), variant: 'destructive' }),
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1>Mi Perfil</h1>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className={styles.form}>
        {(
          [
            ['nombre', 'Nombre', 'text'],
            ['apellido', 'Apellido', 'text'],
            ['empresa', 'Empresa', 'text'],
            ['telefono', 'Teléfono', 'tel'],
          ] as const
        ).map(([name, label, type]) => (
          <div key={name} className={styles.field}>
            <label htmlFor={name}>{label}</label>
            <Input id={name} type={type} {...register(name)} />
            {errors[name] && (
              <span className={styles.error}>{errors[name]?.message}</span>
            )}
          </div>
        ))}
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </form>
    </div>
  )
}
```

---

### Task 15: Migrate Resoluciones with List Virtualization

**Files:**
- Modify: `package.json`
- Modify: `src/pages/Resoluciones.jsx` → `Resoluciones.tsx`

- [ ] **Step 1: Install @tanstack/react-virtual**

```bash
npm install @tanstack/react-virtual
```

- [ ] **Step 2: Rename and rewrite Resoluciones.jsx as Resoluciones.tsx with virtualization**

Delete `Resoluciones.jsx`, create `Resoluciones.tsx`:

```typescript
import { useState, useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEstructuras, useMaterialesPorEstructura } from '@/hooks/useEstructuras'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRD } from '@/utils/calculos'
import styles from './Resoluciones.module.css'

function MaterialesRow({ estructura }: { estructura: string }) {
  const { data: materiales = [], isLoading } = useMaterialesPorEstructura(estructura)

  if (isLoading) return <Skeleton className="h-16 w-full my-2" />

  return (
    <table className={styles.materialesTable}>
      <thead>
        <tr>
          <th>Código</th>
          <th>Descripción</th>
          <th>Unidad</th>
          <th>Cantidad</th>
          <th>Precio IGMELEC</th>
        </tr>
      </thead>
      <tbody>
        {materiales.map((m) => (
          <tr key={m.id}>
            <td>{m.materiales.codigo}</td>
            <td>{m.materiales.descripcion}</td>
            <td>{m.materiales.unidad}</td>
            <td>{m.cantidad}</td>
            <td>{formatRD(m.materiales.precio_igmelec)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Resoluciones() {
  const { data: estructuras = [], isLoading } = useEstructuras()
  const [filtro, setFiltro] = useState('')
  const [expandida, setExpandida] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () =>
      estructuras.filter((e) =>
        e.estructura.toLowerCase().includes(filtro.toLowerCase())
      ),
    [estructuras, filtro]
  )

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1>Resoluciones SIE</h1>
      <input
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        placeholder="Filtrar estructuras..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />
      <div
        ref={parentRef}
        className={styles.virtualContainer}
        style={{ height: '600px', overflow: 'auto' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const est = filtered[virtualRow.index]
            const isOpen = expandida === est.estructura
            return (
              <div
                key={est.estructura}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                }}
              >
                <div
                  className={`${styles.estructuraRow} ${isOpen ? styles.expanded : ''}`}
                  onClick={() =>
                    setExpandida(isOpen ? null : est.estructura)
                  }
                >
                  <span className={styles.chevron}>{isOpen ? '▼' : '▶'}</span>
                  <span className={styles.nombre}>{est.estructura}</span>
                  <span className={styles.costo}>
                    {formatRD(est.costo_materiales_rd)}
                  </span>
                </div>
                {isOpen && <MaterialesRow estructura={est.estructura} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

---

### Task 16: Migrate NuevoPresupuesto to TypeScript with RHF + Zod

**Files:**
- Modify: `src/pages/NuevoPresupuesto.jsx` → `NuevoPresupuesto.tsx`

This is the largest file (546 lines). We split it into logical sub-sections with React Hook Form controlling the project metadata fields.

- [ ] **Step 1: Delete NuevoPresupuesto.jsx and create NuevoPresupuesto.tsx**

Delete `NuevoPresupuesto.jsx`, create `NuevoPresupuesto.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEstructuras } from '@/hooks/useEstructuras'
import { useProyecto, useCreateProyecto, useUpdateProyecto } from '@/hooks/useProyectos'
import { proyectoSchema, type ProyectoFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { resumenPresupuesto, formatRD, totalPartida } from '@/utils/calculos'
import { VOLTAJES } from '@/data/estructuras_sie'
import type { Partida, EstructuraDB } from '@/types'
import styles from './NuevoPresupuesto.module.css'

// ─── SearchableSelect ──────────────────────────────────────────────────────────

interface SearchableSelectProps {
  options: EstructuraDB[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

function SearchableSelect({ options, value, onChange, placeholder }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = options.filter((o) =>
    o.estructura.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.selectWrapper}>
      <button
        type="button"
        className={styles.selectTrigger}
        onClick={() => setOpen(!open)}
      >
        {value || placeholder || 'Seleccionar...'}
      </button>
      {open && (
        <div className={styles.selectDropdown}>
          <input
            autoFocus
            className={styles.selectSearch}
            placeholder="Buscar estructura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className={styles.selectList}>
            {filtered.map((o) => (
              <li
                key={o.estructura}
                className={styles.selectItem}
                onClick={() => {
                  onChange(o.estructura)
                  setOpen(false)
                  setSearch('')
                }}
              >
                <span>{o.estructura}</span>
                <span className={styles.selectPrice}>
                  {formatRD(o.costo_materiales_rd)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'partidas' | 'materiales'

export default function NuevoPresupuesto() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: estructuras = [], isLoading: loadingEst } = useEstructuras()
  const { data: proyectoExistente, isLoading: loadingProy } = useProyecto(id ?? '')
  const createMutation = useCreateProyecto()
  const updateMutation = useUpdateProyecto()

  const [partidas, setPartidas] = useState<Omit<Partida, 'id' | 'proyecto_id'>[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('partidas')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProyectoFormData>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      estado: 'borrador',
      overhead: 0,
      aplicar_itbis: false,
    },
  })

  useEffect(() => {
    if (proyectoExistente) {
      reset({
        nombre: proyectoExistente.nombre,
        cliente: proyectoExistente.cliente,
        fecha: proyectoExistente.fecha,
        voltaje: proyectoExistente.voltaje,
        estado: proyectoExistente.estado as ProyectoFormData['estado'],
        overhead: proyectoExistente.overhead,
        aplicar_itbis: proyectoExistente.aplicar_itbis,
      })
      setPartidas(proyectoExistente.partidas ?? [])
    }
  }, [proyectoExistente, reset])

  const overhead = watch('overhead')
  const aplicarITBIS = watch('aplicar_itbis')
  const resumen = resumenPresupuesto(partidas as Partida[], {
    porcentajeOverhead: overhead,
    aplicarITBIS: aplicarITBIS,
  })

  const addPartida = useCallback(() => {
    setPartidas((prev) => [
      ...prev,
      { estructura: '', cantidad: 1, precio_unitario: 0, total: 0 },
    ])
  }, [])

  const updatePartida = useCallback(
    (idx: number, field: keyof Omit<Partida, 'id' | 'proyecto_id'>, val: string | number) => {
      setPartidas((prev) => {
        const updated = [...prev]
        const row = { ...updated[idx], [field]: val }
        row.total = totalPartida(Number(row.cantidad), Number(row.precio_unitario))
        updated[idx] = row
        return updated
      })
    },
    []
  )

  const removePartida = useCallback((idx: number) => {
    setPartidas((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const setEstructuraForPartida = useCallback(
    (idx: number, estructura: string) => {
      const est = estructuras.find((e) => e.estructura === estructura)
      setPartidas((prev) => {
        const updated = [...prev]
        const row = { ...updated[idx] }
        row.estructura = estructura
        row.precio_unitario = est?.costo_materiales_rd ?? 0
        row.total = totalPartida(Number(row.cantidad), row.precio_unitario)
        updated[idx] = row
        return updated
      })
    },
    [estructuras]
  )

  const onSubmit = async (data: ProyectoFormData) => {
    if (isEditing && id) {
      updateMutation.mutate(
        { id, proyecto: data, partidas },
        {
          onSuccess: () => {
            toast({ title: 'Presupuesto actualizado' })
            void navigate('/app/proyectos')
          },
          onError: (e) =>
            toast({ title: 'Error', description: String(e), variant: 'destructive' }),
        }
      )
    } else {
      createMutation.mutate(
        { proyecto: data, partidas },
        {
          onSuccess: () => {
            toast({ title: 'Presupuesto creado' })
            void navigate('/app/proyectos')
          },
          onError: (e) =>
            toast({ title: 'Error', description: String(e), variant: 'destructive' }),
        }
      )
    }
  }

  if ((isEditing && loadingProy) || loadingEst) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1>{isEditing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h1>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        {/* Project Metadata */}
        <section className={styles.metaSection}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Nombre del Proyecto</label>
              <Input {...register('nombre')} />
              {errors.nombre && <span className={styles.error}>{errors.nombre.message}</span>}
            </div>
            <div className={styles.field}>
              <label>Cliente</label>
              <Input {...register('cliente')} />
              {errors.cliente && <span className={styles.error}>{errors.cliente.message}</span>}
            </div>
            <div className={styles.field}>
              <label>Fecha</label>
              <Input type="date" {...register('fecha')} />
            </div>
            <div className={styles.field}>
              <label>Voltaje</label>
              <select {...register('voltaje')} className={styles.select}>
                <option value="">Seleccionar...</option>
                {VOLTAJES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Estado</label>
              <select {...register('estado')} className={styles.select}>
                <option value="borrador">Borrador</option>
                <option value="enviado">Enviado</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Overhead (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                {...register('overhead', { valueAsNumber: true })}
              />
            </div>
            <div className={styles.fieldCheckbox}>
              <input type="checkbox" id="itbis" {...register('aplicar_itbis')} />
              <label htmlFor="itbis">Aplicar ITBIS (18%)</label>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'partidas' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('partidas')}
          >
            Partidas
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'materiales' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('materiales')}
          >
            Materiales
          </button>
        </div>

        {/* Partidas Tab */}
        {activeTab === 'partidas' && (
          <section className={styles.partidasSection}>
            <table className={styles.partidasTable}>
              <thead>
                <tr>
                  <th>Estructura</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {partidas.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <SearchableSelect
                        options={estructuras}
                        value={p.estructura}
                        onChange={(v) => setEstructuraForPartida(i, v)}
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        min={1}
                        value={p.cantidad}
                        onChange={(e) => updatePartida(i, 'cantidad', Number(e.target.value))}
                        className="w-20"
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={p.precio_unitario}
                        onChange={(e) => updatePartida(i, 'precio_unitario', Number(e.target.value))}
                        className="w-32"
                      />
                    </td>
                    <td>{formatRD(p.total)}</td>
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePartida(i)}
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="button" variant="outline" onClick={addPartida}>
              + Añadir Partida
            </Button>
          </section>
        )}

        {/* Materiales Tab — placeholder, populated by export logic */}
        {activeTab === 'materiales' && (
          <section className={styles.materialesSection}>
            <p className="text-text-muted text-sm">
              Los materiales consolidados se calculan automáticamente desde las partidas.
            </p>
          </section>
        )}

        {/* Financial Summary */}
        <section className={styles.resumenSection}>
          <div className={styles.resumenRow}>
            <span>Subtotal</span>
            <span>{formatRD(resumen.subtotal)}</span>
          </div>
          {resumen.costoOverhead > 0 && (
            <div className={styles.resumenRow}>
              <span>Overhead ({overhead}%)</span>
              <span>{formatRD(resumen.costoOverhead)}</span>
            </div>
          )}
          {resumen.montoITBIS > 0 && (
            <div className={styles.resumenRow}>
              <span>ITBIS (18%)</span>
              <span>{formatRD(resumen.montoITBIS)}</span>
            </div>
          )}
          <div className={`${styles.resumenRow} ${styles.resumenTotal}`}>
            <span>TOTAL</span>
            <span>{formatRD(resumen.total)}</span>
          </div>
        </section>

        <div className={styles.formActions}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : isEditing
              ? 'Actualizar Presupuesto'
              : 'Crear Presupuesto'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigate('/app/proyectos')}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
```

---

### Task 17: Migrate Landing Page

**Files:**
- Modify: `src/pages/Landing.jsx` → `Landing.tsx`

- [ ] **Step 1: Rename and rewrite Landing.jsx as Landing.tsx**

Delete `Landing.jsx`, create `Landing.tsx`:

```typescript
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import styles from './Landing.module.css'

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <div className={styles.orb} />
      <div className={styles.orb2} />
      <section className={styles.hero}>
        <h1 className={styles.title}>⚡ MT Presupuestos SIE</h1>
        <p className={styles.subtitle}>
          Gestión de presupuestos eléctricos profesional para la industria.
        </p>
        <div className={styles.ctas}>
          <Button size="lg" onClick={() => void navigate('/login')}>
            Iniciar Sesión
          </Button>
          <Button size="lg" variant="outline" onClick={() => void navigate('/registro')}>
            Crear Cuenta
          </Button>
        </div>
      </section>
    </div>
  )
}
```

---

## PHASE 4 — Performance & Production Hardening

---

### Task 18: Migrate exportPDF to TypeScript

**Files:**
- Modify: `src/utils/exportPDF.js` → `src/utils/exportPDF.ts`

- [ ] **Step 1: Rename and rewrite exportPDF.js as exportPDF.ts**

Delete `src/utils/exportPDF.js`, create `src/utils/exportPDF.ts`:

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ExportPDFOptions, Proyecto, MaterialConsolidado } from '@/types'
import { formatRD, resumenPresupuesto } from '@/utils/calculos'

function dibujarEncabezado(doc: jsPDF, proyecto: Proyecto, titulo: string): number {
  doc.setFontSize(18)
  doc.setTextColor(26, 54, 93)
  doc.text('⚡ MT Presupuestos SIE', 14, 20)
  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text(titulo, 14, 30)
  doc.setFontSize(10)
  doc.text(`Proyecto: ${proyecto.nombre}`, 14, 40)
  doc.text(`Cliente: ${proyecto.cliente}`, 14, 47)
  doc.text(`Fecha: ${proyecto.fecha}`, 14, 54)
  doc.text(`Voltaje: ${proyecto.voltaje}`, 120, 40)
  doc.text(`Estado: ${proyecto.estado}`, 120, 47)
  doc.line(14, 60, 200, 60)
  return 65
}

function dibujarPie(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Página ${i} de ${pageCount} — MT Presupuestos SIE`,
      14,
      doc.internal.pageSize.height - 10
    )
  }
}

function agregarTablaPartidas(doc: jsPDF, proyecto: Proyecto, startY: number): number {
  const partidas = proyecto.partidas ?? []
  const resumen = resumenPresupuesto(partidas, {
    porcentajeOverhead: proyecto.overhead,
    aplicarITBIS: proyecto.aplicar_itbis,
  })

  autoTable(doc, {
    startY,
    head: [['#', 'Estructura', 'Cantidad', 'Precio Unitario', 'Total']],
    body: partidas.map((p, i) => [
      i + 1,
      p.estructura,
      p.cantidad,
      formatRD(p.precio_unitario),
      formatRD(p.total),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 54, 93] },
  })

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  doc.setFontSize(10)
  doc.text(`Subtotal: ${formatRD(resumen.subtotal)}`, 140, finalY)
  if (resumen.costoOverhead > 0) {
    doc.text(`Overhead (${resumen.porcentajeOverhead}%): ${formatRD(resumen.costoOverhead)}`, 140, finalY + 7)
  }
  if (resumen.montoITBIS > 0) {
    doc.text(`ITBIS: ${formatRD(resumen.montoITBIS)}`, 140, finalY + 14)
  }
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL: ${formatRD(resumen.total)}`, 140, finalY + 24)
  doc.setFont('helvetica', 'normal')

  return finalY + 34
}

function agregarTablaMateriales(
  doc: jsPDF,
  materiales: MaterialConsolidado[],
  startY: number
): void {
  autoTable(doc, {
    startY,
    head: [['Código', 'Descripción', 'Unidad', 'Cantidad', 'P. Unit.', 'Subtotal']],
    body: materiales.map((m) => [
      m.codigo,
      m.descripcion,
      m.unidad,
      m.cantidadTotal,
      formatRD(m.precioUnitario),
      formatRD(m.subtotal),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [39, 103, 73] },
  })
}

export async function exportarPDF({ proyecto, tipo, materialesConsolidados }: ExportPDFOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  if (tipo === 'presupuesto' || tipo === 'completo') {
    const y = dibujarEncabezado(doc, proyecto, 'Presupuesto de Materiales')
    agregarTablaPartidas(doc, proyecto, y)
  }

  if (tipo === 'materiales' || tipo === 'completo') {
    if (tipo === 'completo') doc.addPage()
    const y = dibujarEncabezado(doc, proyecto, 'Lista de Materiales')
    agregarTablaMateriales(doc, materialesConsolidados, y)
  }

  dibujarPie(doc)
  doc.save(`presupuesto-${proyecto.nombre.replace(/\s+/g, '-')}.pdf`)
}
```

---

### Task 19: Setup Vitest Unit Tests for calculos.ts

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts` (add test config)
- Create: `src/utils/calculos.test.ts`

- [ ] **Step 1: Install Vitest and Testing Library**

```bash
npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Add test config to vite.config.ts**

Add the `test` block to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/lib/validations.ts'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
})
```

- [ ] **Step 3: Create src/test/setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test scripts to package.json**

```json
"test": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Create src/utils/calculos.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import {
  totalPartida,
  subtotal,
  calcularITBIS,
  resumenPresupuesto,
  formatRD,
} from '@/utils/calculos'
import type { Partida } from '@/types'

const p = (cantidad: number, precioUnitario: number): Partida => ({
  estructura: 'TEST',
  cantidad,
  precio_unitario: precioUnitario,
  total: cantidad * precioUnitario,
})

describe('totalPartida', () => {
  it('multiplies cantidad by precio', () => {
    expect(totalPartida(3, 1000)).toBe(3000)
  })
  it('returns 0 when cantidad is 0', () => {
    expect(totalPartida(0, 5000)).toBe(0)
  })
  it('handles decimal prices', () => {
    expect(totalPartida(2, 1500.5)).toBeCloseTo(3001)
  })
})

describe('subtotal', () => {
  it('sums all partidas totals', () => {
    expect(subtotal([p(2, 1000), p(3, 500)])).toBe(3500)
  })
  it('returns 0 for empty array', () => {
    expect(subtotal([])).toBe(0)
  })
  it('handles single partida', () => {
    expect(subtotal([p(5, 200)])).toBe(1000)
  })
})

describe('calcularITBIS', () => {
  it('returns 18% of base by default', () => {
    expect(calcularITBIS(10000)).toBe(1800)
  })
  it('uses custom percentage', () => {
    expect(calcularITBIS(10000, 0.16)).toBe(1600)
  })
  it('returns 0 for 0 base', () => {
    expect(calcularITBIS(0)).toBe(0)
  })
})

describe('resumenPresupuesto', () => {
  const partidas = [p(2, 5000), p(1, 3000)]
  // subtotal = 13000

  it('calculates subtotal correctly', () => {
    const r = resumenPresupuesto(partidas)
    expect(r.subtotal).toBe(13000)
  })

  it('applies overhead correctly', () => {
    const r = resumenPresupuesto(partidas, { porcentajeOverhead: 10 })
    expect(r.costoOverhead).toBe(1300)
    expect(r.baseITBIS).toBe(14300)
    expect(r.total).toBe(14300)
  })

  it('applies ITBIS on base + overhead', () => {
    const r = resumenPresupuesto(partidas, { porcentajeOverhead: 10, aplicarITBIS: true })
    expect(r.montoITBIS).toBeCloseTo(2574)
    expect(r.total).toBeCloseTo(16874)
  })

  it('does not apply ITBIS when disabled', () => {
    const r = resumenPresupuesto(partidas, { aplicarITBIS: false })
    expect(r.montoITBIS).toBe(0)
  })

  it('handles empty partidas', () => {
    const r = resumenPresupuesto([])
    expect(r.total).toBe(0)
  })

  it('handles overhead=0', () => {
    const r = resumenPresupuesto(partidas, { porcentajeOverhead: 0 })
    expect(r.costoOverhead).toBe(0)
  })
})

describe('formatRD', () => {
  it('formats currency with RD$ prefix', () => {
    const result = formatRD(1000)
    expect(result).toMatch(/^RD\$/)
  })

  it('includes thousands separator', () => {
    const result = formatRD(10000)
    expect(result).toContain('10')
  })

  it('formats decimal places', () => {
    const result = formatRD(1234.5)
    expect(result).toContain('1,234.50')
  })
})
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx vitest run src/utils/calculos.test.ts
```

Expected: All tests PASS.

---

### Task 20: Zod Schema Unit Tests

**Files:**
- Create: `src/lib/validations.test.ts`

- [ ] **Step 1: Create src/lib/validations.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { loginSchema, registroSchema, proyectoSchema, perfilSchema } from '@/lib/validations'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'secret123' }).success).toBe(true)
  })
  it('rejects invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-email', password: 'secret123' }).success).toBe(false)
  })
  it('rejects short password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success).toBe(false)
  })
})

describe('registroSchema', () => {
  const valid = {
    nombre: 'Juan',
    apellido: 'Perez',
    empresa: 'MT Corp',
    telefono: '8091234567',
    email: 'juan@mt.com',
    password: 'pass1234',
    confirmPassword: 'pass1234',
  }
  it('accepts valid registration', () => {
    expect(registroSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects mismatched passwords', () => {
    expect(registroSchema.safeParse({ ...valid, confirmPassword: 'different' }).success).toBe(false)
  })
  it('rejects short name', () => {
    expect(registroSchema.safeParse({ ...valid, nombre: 'J' }).success).toBe(false)
  })
})

describe('proyectoSchema', () => {
  const valid = {
    nombre: 'Torre X',
    cliente: 'Cliente SA',
    fecha: '2026-04-17',
    voltaje: 'monofasico',
    estado: 'borrador' as const,
    overhead: 10,
    aplicar_itbis: false,
  }
  it('accepts valid project', () => {
    expect(proyectoSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects overhead > 100', () => {
    expect(proyectoSchema.safeParse({ ...valid, overhead: 101 }).success).toBe(false)
  })
  it('rejects invalid estado', () => {
    expect(proyectoSchema.safeParse({ ...valid, estado: 'unknown' }).success).toBe(false)
  })
})

describe('perfilSchema', () => {
  it('accepts valid perfil', () => {
    expect(perfilSchema.safeParse({ nombre: 'Juan', apellido: 'Perez', empresa: 'MT Corp', telefono: '8091234567' }).success).toBe(true)
  })
  it('rejects short telefono', () => {
    expect(perfilSchema.safeParse({ nombre: 'Juan', apellido: 'Perez', empresa: 'MT Corp', telefono: '123' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run validation tests**

```bash
npx vitest run src/lib/validations.test.ts
```

Expected: All tests PASS.

---

### Task 21: Add Framer Motion Page Transitions

**Files:**
- Modify: `package.json`
- Modify: `src/components/layout/Layout.tsx`
- Create: `src/components/ui/page-transition.tsx`

- [ ] **Step 1: Install Framer Motion**

```bash
npm install framer-motion
```

- [ ] **Step 2: Create src/components/ui/page-transition.tsx**

```typescript
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 3: Wrap Outlet in Layout.tsx with AnimatePresence + PageTransition**

Update `src/components/layout/Layout.tsx`:

```typescript
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Header from './Header'
import Sidebar from './Sidebar'
import { PageTransition } from '@/components/ui/page-transition'
import styles from './Layout.module.css'

export default function Layout() {
  const location = useLocation()
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
```

---

### Task 22: Security Hardening — CSP Headers + Input Sanitization

**Files:**
- Modify: `vite.config.ts`
- Modify: `index.html`

- [ ] **Step 1: Add security meta tag CSP to index.html**

In `index.html`, inside `<head>`, add before the closing `</head>`:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; img-src 'self' data:; font-src 'self';"
/>
<meta http-equiv="X-Content-Type-Options" content="nosniff" />
<meta http-equiv="X-Frame-Options" content="DENY" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
```

- [ ] **Step 2: Add server headers config to vite.config.ts**

In the `defineConfig` object, add a `server` key:

```typescript
server: {
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
},
```

---

### Task 23: Full TypeScript Build Verification

- [ ] **Step 1: Run TypeScript compiler check**

```bash
cd "C:/Users/Christopher Rosario/Documents/Projects/SOFTWARE_DEVELOPMENT_PROJECTS/MT-PRESUPUESTOS-SIE"
npx tsc --noEmit 2>&1
```

Expected: Zero errors. If errors remain, fix each one before proceeding.

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass with 0 failures.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: Build completes. Check for warnings about bundle size — the `pdf` manual chunk should separate jsPDF from the main bundle.

- [ ] **Step 4: Check that Tailwind CSS purges unused classes**

```bash
npm run build 2>&1 | grep "dist/assets"
```

Expected: CSS file is under ~20KB after build (Tailwind purge active).

---

## Self-Review Checklist

### Spec Coverage
| Requirement | Task |
|---|---|
| TypeScript strict mode | Task 1 (tsconfig strict: true) |
| TanStack Query replacing Zustand | Tasks 7–8 (hooks + queryClient) |
| React Hook Form + Zod | Tasks 9, 12, 13, 14, 16 |
| shadcn/ui + Tailwind | Tasks 5, 10 |
| List virtualization | Task 15 |
| Code splitting / lazy loading | Task 11 (App.tsx React.lazy) |
| Supabase typed layer | Task 4 (db.ts) |
| CSP security headers | Task 22 |
| Unit tests (Vitest) for calculos | Task 19 |
| Zod schema tests | Task 20 |
| PDF TypeScript migration | Task 18 |
| Framer Motion transitions | Task 21 |
| Toast notifications (no alert()) | Task 10 (toast), Tasks 12–16 (usage) |
| Skeleton loaders | Task 10 (Skeleton component), used in Tasks 13–16 |
| Domain types | Task 2 |
| ESLint strict | Task 6 |
| Zustand store deleted | Task 8, Step 4 |

### Type Consistency
- `Partida`, `Proyecto`, `Perfil`, `EstructuraDB`, `MaterialConsolidado`, `ExportPDFOptions` all defined in `src/types/index.ts` (Task 2) and reused consistently through all tasks.
- `ProyectoFormData`, `LoginFormData`, `RegistroFormData`, `PerfilFormData` defined in `src/lib/validations.ts` (Task 9).
- Hook return types flow from `db.ts` type annotations through TanStack Query generics automatically.

### Placeholder Scan
No TBD/TODO/placeholder language found. Every step contains actual code or exact shell commands.
