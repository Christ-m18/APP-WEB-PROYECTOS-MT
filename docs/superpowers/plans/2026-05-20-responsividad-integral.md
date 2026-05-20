# Responsividad Integral MT-PRESUPUESTOS-SIE

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all responsiveness issues across mobile (320px–768px), tablet (768px–1024px), and desktop (1024px+) without breaking existing layouts or business logic.

**Architecture:** Pure CSS/style changes across CSS Modules and one TSX file (Dashboard.tsx inline styles). No logic changes. All fixes respect the existing CSS Module + Tailwind hybrid setup.

**Tech Stack:** React 18, Vite, TypeScript, CSS Modules, Tailwind base, CSS custom properties

---

## File Map

| File | What changes |
|---|---|
| `src/pages/Dashboard.module.css` | Add `.dashHeader`, fix `.statInfo min-width`, `.statValue` wrapping, `.projectArrow`, long-text classes |
| `src/pages/Dashboard.tsx` | Replace inline header style + inline arrow style with CSS classes |
| `src/pages/Auth.module.css` | `.rowUneven` collapses at 500px |
| `src/pages/NuevoPresupuesto.module.css` | Reduce `padding-bottom: 80px`, add mobile title size |
| `src/pages/AdminPanel.module.css` | Fix `sectionsGrid`/`chartsGrid` minmax, fix `statValue` nowrap, fix tabs overflow |
| `src/pages/Landing.module.css` | `featureItem` full-width when stacked |
| `src/pages/Perfil.module.css` | Long name/email wrapping, h2 font-size on mobile |
| `src/pages/Proyectos.module.css` | Long name/client overflow-wrap, reduce `padding-bottom: 80px` |
| `src/pages/Suscripcion.module.css` | `bankCardAccount` and `transferValueMono` word-break |
| `src/pages/Resoluciones.module.css` | Fix `overflow: hidden` on `.table` blocking mobile horizontal scroll |

---

### Task 1: Dashboard.module.css — header, stat cards, project rows

**Files:**
- Modify: `src/pages/Dashboard.module.css`

- [ ] **Step 1: Add `.dashHeader` class and update `.statInfo`/`.statValue`**

Add after the existing `.pageTitle` rule:

```css
.dashHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.projectArrow {
  color: var(--color-primary);
  flex-shrink: 0;
  margin-left: 1rem;
}
```

Update `.statInfo`:
```css
.statInfo {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
```

Update `.statValue`:
```css
.statValue {
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-text);
  line-height: 1;
  overflow-wrap: break-word;
  word-break: break-word;
}
```

Add to `.projectName` and `.projectClient`:
```css
.projectName {
  font-weight: 800;
  color: var(--color-text);
  font-size: 1rem;
  overflow-wrap: break-word;
  word-break: break-word;
}

.projectClient {
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.85rem;
  margin-top: 0.15rem;
  overflow-wrap: break-word;
}
```

- [ ] **Step 2: Add mobile responsive overrides for dashboard header**

Inside the existing `@media (max-width: 640px)` block, add:

```css
.dashHeader {
  flex-direction: column;
  align-items: flex-start;
}
.statValue {
  font-size: 1.35rem;
}
```

---

### Task 2: Dashboard.tsx — replace inline styles with CSS classes

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace inline header style**

Find:
```tsx
<header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
```
Replace with:
```tsx
<header className={styles.dashHeader}>
```

- [ ] **Step 2: Replace inline arrow icon style**

Find:
```tsx
<div style={{ marginLeft: '2rem', color: 'var(--color-primary)' }}>
```
Replace with:
```tsx
<div className={styles.projectArrow}>
```

---

### Task 3: Auth.module.css — collapse `.rowUneven` on small screens

**Files:**
- Modify: `src/pages/Auth.module.css`

- [ ] **Step 1: Add `.rowUneven` to the existing 500px media query**

Find:
```css
@media (max-width: 500px) {
  .card { padding: 2.5rem 1.5rem; }
  .row { grid-template-columns: 1fr; }
}
```
Replace with:
```css
@media (max-width: 500px) {
  .card { padding: 2.5rem 1.5rem; }
  .row, .rowUneven { grid-template-columns: 1fr; }
}
```

---

### Task 4: NuevoPresupuesto.module.css — padding-bottom and mobile title

**Files:**
- Modify: `src/pages/NuevoPresupuesto.module.css`

- [ ] **Step 1: Reduce `padding-bottom: 80px` on tableResponsive**

Find:
```css
@media (max-width: 768px) {
  .tableResponsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 80px;
  }
```
Replace with:
```css
@media (max-width: 768px) {
  .tableResponsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.5rem;
  }
```

- [ ] **Step 2: Add mobile title font-size reduction**

Add inside the existing `@media (max-width: 768px)` block:
```css
.title {
  font-size: 1.35rem;
}
```

---

### Task 5: AdminPanel.module.css — grids, statValue, tabs

**Files:**
- Modify: `src/pages/AdminPanel.module.css`

- [ ] **Step 1: Reduce minmax values in chartsGrid and sectionsGrid**

Find:
```css
.chartsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
```
Replace with:
```css
.chartsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
```

Find:
```css
.sectionsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
```
Replace with:
```css
.sectionsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
```

- [ ] **Step 2: Fix `.statValue` white-space: nowrap**

Find:
```css
.statValue {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--color-text);
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```
Replace with:
```css
.statValue {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--color-text);
  line-height: 1;
  overflow-wrap: break-word;
  word-break: break-word;
}
```

- [ ] **Step 3: Add scrollable tabs and 320px grid override**

Find the existing `@media (max-width: 640px)` block and add inside it:
```css
.chartsGrid,
.sectionsGrid {
  grid-template-columns: 1fr;
}
```

Also update the `.tabs` rule (outside media query) to allow horizontal scroll:
Find:
```css
.tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 2rem;
  background: #f1f5f9;
  padding: 0.3rem;
  border-radius: 12px;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
}
```
Replace with:
```css
.tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 2rem;
  background: #f1f5f9;
  padding: 0.3rem;
  border-radius: 12px;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}
```

---

### Task 6: Landing.module.css — featureItem full-width on mobile

**Files:**
- Modify: `src/pages/Landing.module.css`

- [ ] **Step 1: Update the 768px media query for featureRow and featureItem**

Find:
```css
@media (max-width: 768px) {
  .featureRow {
    flex-direction: column;
    border-radius: 30px;
    gap: 1.5rem;
    padding: 2rem;
  }
  .footer {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
```
Replace with:
```css
@media (max-width: 768px) {
  .featureRow {
    flex-direction: column;
    border-radius: 30px;
    gap: 1.5rem;
    padding: 2rem;
    align-items: stretch;
  }
  .featureItem {
    max-width: 100%;
  }
  .footer {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
```

---

### Task 7: Perfil.module.css — long names/emails, mobile h2

**Files:**
- Modify: `src/pages/Perfil.module.css`

- [ ] **Step 1: Add overflow-wrap to `.headerInfo h2` and `.email`**

Find:
```css
.headerInfo h2 {
  font-size: 2rem;
  font-weight: 900;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}
```
Replace with:
```css
.headerInfo h2 {
  font-size: 2rem;
  font-weight: 900;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
  overflow-wrap: break-word;
  word-break: break-word;
}
```

Find:
```css
.email {
  color: var(--color-text-muted);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
}
```
Replace with:
```css
.email {
  color: var(--color-text-muted);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  overflow-wrap: break-word;
  word-break: break-all;
  flex-wrap: wrap;
}
```

- [ ] **Step 2: Add h2 font-size reduction in the 600px media query**

Find:
```css
@media (max-width: 600px) {
  .profileHeader { flex-direction: column; text-align: center; padding: 2rem; }
  .badges { justify-content: center; }
  .email { justify-content: center; }
}
```
Replace with:
```css
@media (max-width: 600px) {
  .profileHeader { flex-direction: column; text-align: center; padding: 2rem; }
  .badges { justify-content: center; }
  .email { justify-content: center; }
  .headerInfo h2 { font-size: 1.5rem; }
}
```

---

### Task 8: Proyectos.module.css — long text wrapping, padding-bottom

**Files:**
- Modify: `src/pages/Proyectos.module.css`

- [ ] **Step 1: Add overflow-wrap to `.nombre` and `.cliente`**

Find:
```css
.nombre { 
  font-weight: 800; 
  color: var(--color-text); 
  font-size: 1rem;
}

.cliente {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 600;
  margin-top: 0.15rem;
}
```
Replace with:
```css
.nombre { 
  font-weight: 800; 
  color: var(--color-text); 
  font-size: 1rem;
  overflow-wrap: break-word;
  word-break: break-word;
}

.cliente {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 600;
  margin-top: 0.15rem;
  overflow-wrap: break-word;
}
```

- [ ] **Step 2: Reduce `padding-bottom: 80px` on tableResponsive**

Find:
```css
@media (max-width: 768px) {
  .tableResponsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 80px; 
  }
```
Replace with:
```css
@media (max-width: 768px) {
  .tableResponsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.5rem;
  }
```

---

### Task 9: Suscripcion.module.css — account numbers and transfer values

**Files:**
- Modify: `src/pages/Suscripcion.module.css`

- [ ] **Step 1: Fix `bankCardAccount` overflow**

Find:
```css
.bankCardAccount {
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary);
  background: #f5f3ff;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  letter-spacing: 0.05em;
}
```
Replace with:
```css
.bankCardAccount {
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary);
  background: #f5f3ff;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  letter-spacing: 0.05em;
  overflow-wrap: break-word;
  word-break: break-all;
  text-align: center;
}
```

- [ ] **Step 2: Fix `transferValueMono` overflow**

Find:
```css
.transferValueMono {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.05em;
}
```
Replace with:
```css
.transferValueMono {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.05em;
  overflow-wrap: break-word;
  word-break: break-all;
}
```

---

### Task 10: Resoluciones.module.css — fix overflow:hidden blocking mobile scroll

**Files:**
- Modify: `src/pages/Resoluciones.module.css`

- [ ] **Step 1: Fix `.table` overflow conflicting with mobile scroll**

The `.table` container has `overflow: hidden` (required for border-radius). On mobile the `.tableResponsive` wrapper tries to add `overflow-x: auto`, but the inner `.table` clips it. Fix by allowing overflow on mobile.

Find:
```css
@media (max-width: 768px) {
  .tableResponsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .subTableWrapper {
    padding-left: 1.5rem;
  }
}
```
Replace with:
```css
@media (max-width: 768px) {
  .tableResponsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .table {
    overflow: visible;
    border-radius: 0;
  }
  .subTableWrapper {
    padding-left: 1.5rem;
  }
}
```

---

### Task 11: Build verification and commit

**Files:**
- Run commands in `MT-PRESUPUESTOS-SIE/`

- [ ] **Step 1: Run typecheck**
```bash
cd "C:/Users/Christopher Rosario/Documents/Projects/SOFTWARE_DEVELOPMENT_PROJECTS/MT-PRESUPUESTOS-SIE" && npm run typecheck
```
Expected: Exit 0, no errors.

- [ ] **Step 2: Run lint**
```bash
npm run lint
```
Expected: Exit 0, 0 warnings.

- [ ] **Step 3: Run build**
```bash
npm run build
```
Expected: Exit 0, dist/ generated.

- [ ] **Step 4: Run tests (if available)**
```bash
npm run test:run
```
Expected: All pass (CSS changes don't affect unit tests).

- [ ] **Step 5: Commit and push**
```bash
git add -A
git commit -m "fix: improve responsiveness across all pages and viewports"
git push origin main
```

- [ ] **Step 6: Push dist/ if it has a separate git repo**
```bash
cd dist && git add -A && git commit -m "deploy: responsiveness fixes" && git push origin main
```
