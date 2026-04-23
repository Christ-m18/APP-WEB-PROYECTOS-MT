# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server (HMR is **disabled** via `vite.config.ts`; refresh manually after edits).
- `npm run build` — `tsc` type-check then `vite build`. Build fails on any TS error.
- `npm run typecheck` — `tsc --noEmit` only.
- `npm run lint` — ESLint with `--max-warnings 0`. Uses `plugin:@typescript-eslint/strict-type-checked`; `no-explicit-any` is an **error**, `console.log` is a warning (only `console.warn`/`console.error` allowed).
- `npm test` — Vitest in watch mode.
- `npm run test:coverage` — one-shot run with V8 coverage.
- Run a single test file: `npx vitest run src/utils/calculos.test.ts`
- Run tests matching a name: `npx vitest -t "resumenPresupuesto"`

Required env vars (read in `src/lib/supabase.ts`, throws at startup if missing): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Architecture

**Domain:** Budgeting app for medium-voltage (MT) electrical projects per Dominican Republic's SIE regulations. Currency is RD$, tax is ITBIS (18%). Domain identifiers are in **Spanish**: `proyectos` (budgets/projects), `partidas` (line items), `estructuras` (MT structure catalog, e.g. `MT-301`, `HAV-300-9`), `materiales`, `perfiles`, `mano_obra` (labor). Preserve Spanish names when adding code — they match Supabase column names.

### State & data flow

There is **no client state store** — prior Zustand was removed. Data flows through three lanes:

1. **Server state (TanStack Query v5)** — all Supabase reads/writes go through typed wrappers in `src/lib/db.ts`, exposed as hooks in `src/hooks/` (`useProyectos`, `useEstructuras`, `usePerfil`). `src/lib/queryClient.ts` sets `staleTime: 5m`, `refetchOnWindowFocus: false`. Catalog hooks (`useEstructuras`, `useTodaManoObra`) override with `staleTime: Infinity` because reference data doesn't change.
2. **Form state (RHF + Zod)** — all forms use `react-hook-form` with `zodResolver`. Schemas live in `src/lib/validations.ts` and **export both the schema and the inferred type** (e.g. `ProyectoFormData = z.infer<typeof proyectoSchema>`). Always import the type from here instead of redeclaring.
3. **Local UI state** — plain `useState` in page components. Per-user defaults like empresa/logo persist in `localStorage` under `mt_empresa_config` (see `NuevoPresupuesto.tsx`).

### Routing & code splitting

`src/App.tsx` lazy-imports every page so each route is a separate chunk. Extra manual chunks in `vite.config.ts`: `vendor` (react+router), `supabase`, `pdf`. Public routes (`/`, `/login`, `/registro`, `/confirmar-correo`, `/auth/callback`) are outside the layout; authenticated routes nest under `/app/*` which renders `Layout` (Header + Sidebar + `<Outlet>` with Framer Motion `PageTransition` keyed on `location.pathname`).

### Supabase schema

Two schema layers coexist — be careful which one you're touching:

- **App schema** (`supabase/migrations/001_schema.sql`): `proyectos`, `partidas`, `estructuras`, `materiales`, `estructura_materiales`, `perfiles`. RLS is enabled; `proyectos`/`perfiles` are scoped by `usuario_id = auth.uid()` (see `db.ts` — all project queries call `supabase.auth.getUser()` first).
- **Reference schema** (`Estructuras_MT/` CSVs + SQL): read-only catalog of ~417 structures and ~4,055 BOM rows from real SIE projects. Queried via the view `v_costo_uucc_por_estructura` (structure → aggregate material cost) and table `uucc_material_estructura` (structure → materials with `cantidad`, joined to `materiales` for pricing). Labor pricing comes from `estructuras_mano_obra`. Do not write to these tables from the app.

The `partidas.total` column is **generated in Postgres** — never send it on insert/update (see `createProyecto` / `updateProyecto`). Updates replace partidas wholesale: delete-all-then-insert, not diff-and-patch.

### Calculations

`src/utils/calculos.ts` is the single source of truth for money math: `subtotal`, `calcularITBIS` (18%), `resumenPresupuesto` (subtotal → overhead % → ITBIS → total), `formatRD`, `calcularTotalProyecto` (includes labor). Tested in `src/utils/calculos.test.ts`. PDF export in `src/utils/exportPDF.ts` calls back into these — don't duplicate formula logic in the PDF layer.

### UI primitives & styling

`src/components/ui/` holds shadcn-style wrappers around Radix (`button`, `input`, `toast`, `badge`, `skeleton`, `searchable-select`, `phone-input`, `page-transition`). Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for class composition. Tailwind config at `tailwind.config.ts` defines a custom `primary`/`accent`/`success` palette — prefer these tokens over raw hex. Some pages also use CSS Modules (`*.module.css`) alongside Tailwind.

`Resoluciones.tsx` uses `@tanstack/react-virtual` to render ~4,000 catalog rows — preserve virtualization when editing that page.

### Path alias & imports

`@/*` maps to `src/*` (both `tsconfig.json` `paths` and `vite.config.ts` `resolve.alias`). Use `@/lib/db`, `@/hooks/useProyectos`, etc. — do not use relative `../../` imports. `consistent-type-imports` is enforced: use `import type { ... }` for type-only imports.

### Security

`index.html` ships a CSP (`default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https://flagcdn.com`) plus `X-Content-Type-Options`, `Referrer-Policy`. When adding an external asset host (fonts, images, APIs), update the CSP or it will be blocked at runtime.

## Notes for edits

- There are stray `.js`/`.jsx` stubs next to `.tsx` files from the 2026-04 TypeScript migration — they are dead; delete rather than sync.
- `createProyecto`/`updateProyecto` intentionally cast `Partida` rows through `any` to strip generated columns — keep the normalization when adding partida fields.
- Layout uses CSS Modules (`Layout.module.css`, `Sidebar.module.css`, etc.) that aren't checked in as `.ts` — don't attempt to refactor module-CSS class access to Tailwind without also removing the `.module.css` file.
