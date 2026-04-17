# ESQUEMA DE BASE DE DATOS

## Diagrama de relaciones

```
              ┌─────────────────────────┐
              │      materiales         │ ◄─── CATÁLOGO MAESTRO
              │─────────────────────────│      204 materiales
              │ codigo (PK) ────────────┼──┐   con precios de 6 proveedores
              │ descripcion             │  │
              │ unidad                  │  │
              │ precio_igmelec          │  │
              │ precio_grape            │  │
              │ precio_bellon           │  │
              │ precio_ochoa            │  │
              │ precio_maenca           │  │
              │ precio_transdeci        │  │
              └─────────────────────────┘  │
                                           │
      ┌────────────────────────────────────┼─────────────────────────┐
      │                                    │                         │
      ▼                                    ▼                         ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────────┐
│ uucc_material_       │    │ totales_             │    │ analisis_costo_          │
│ estructura           │    │ materiales           │    │ estructura               │
│──────────────────────│    │──────────────────────│    │──────────────────────────│
│ id                   │    │ id                   │    │ id                       │
│ estructura (texto)   │    │ codigo_material (FK) │    │ estructura (texto)       │
│ codigo_material (FK) │    │ descripcion          │    │ codigo_material (FK)     │
│ descripcion          │    │ total                │    │ descripcion              │
│ cantidad             │    │                      │    │ cantidad                 │
│ total_uso            │    │ 204 filas            │    │ unidad                   │
│                      │    │ (uno por material)   │    │ precio_unitario          │
│ 4,055 filas          │    └──────────────────────┘    │ subtotal (VIRTUAL)       │
│ (BOM por estructura) │                                │                          │
└──────────────────────┘                                │ 115 filas (12 estructs.) │
                                                        └──────────────────────────┘

┌──────────────────────────┐          ┌──────────────────────────┐
│ estructuras_catalogo     │          │ estructuras_mano_obra    │
│──────────────────────────│          │──────────────────────────│
│ id                       │          │ id                       │
│ nombre (UNIQUE)          │  ←───────│ descripcion              │  (cruce por texto,
│ tipo (categoría)         │          │ precio / itbis / total   │   no FK formal)
│ 525 filas                │          │ 69 filas                 │
└──────────────────────────┘          └──────────────────────────┘
```

## DDL con comentarios

### 1. `materiales` — catálogo maestro (204)

```sql
CREATE TABLE materiales (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    item             INTEGER,              -- # de item en la lista original
    codigo           INTEGER UNIQUE NOT NULL,   -- código interno EDEESTE (ej: 1006264)
    descripcion      TEXT    NOT NULL,
    unidad           TEXT,                 -- M, UND, MTS, LB, etc.
    precio_igmelec   REAL,  -- IGMELEC — actualizado 28-02-2022, SIN ITBIS
    precio_grape     REAL,  -- GRAPE DOMINICANA — actualizado 28-02-2022
    precio_bellon    REAL,  -- BELLÓN — actualizado 06-01-2023
    precio_ochoa     REAL,  -- OCHOA — actualizado 06-01-2023
    precio_maenca    REAL,  -- MAENCA
    precio_transdeci REAL   -- TRANSDECI
);
```

> **Por qué 204 materiales si el archivo de precios trae 92:**
> Se añadieron 112 códigos extra que aparecen en los BOMs (`uucc_material_estructura`) o en `totales_materiales` pero no tenían precio en `Precios_de_Materiales`. Quedan registrados con descripción pero `precio_* = NULL` para no romper las foreign keys.

### 2. `estructuras_catalogo` (525)

```sql
CREATE TABLE estructuras_catalogo (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    tipo   TEXT   -- categoría: POSTERIA, ARMADOS 34.5 KV, TRANSFORMADORES, ETC.
);
```

El catálogo usa nombres largos con prefijo (`TE-IZADO DE POSTE HAV-300-9`, `TE-MONT 3Ø RED...`), mientras que los BOMs usan códigos cortos (`HAV-300-9`, `MT-301`). Ver **RELACIONES.md** para el cruce.

### 3. `estructuras_mano_obra` (69)

```sql
CREATE TABLE estructuras_mano_obra (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT NOT NULL,      -- p. ej. "IZADO DE POSTE HAV-300-9"
    precio      REAL,               -- precio sin ITBIS
    itbis       REAL,               -- 18% de precio
    total       REAL                -- precio + itbis
);
```

### 4. `uucc_material_estructura` — BOM por estructura (4,055) ⭐

```sql
CREATE TABLE uucc_material_estructura (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    estructura      TEXT NOT NULL,                -- p. ej. "MT-301 (55-5)"
    codigo_material INTEGER NOT NULL REFERENCES materiales(codigo),
    descripcion     TEXT,
    cantidad        REAL,                         -- unidades por estructura
    total_uso       REAL                          -- total usado en proyecto
);
```

**Esta es la tabla más valiosa** — contiene la receta completa (cantidad de cada material) para armar cada una de las 417 estructuras únicas del proyecto.

### 5. `totales_materiales` (204)

```sql
CREATE TABLE totales_materiales (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_material INTEGER UNIQUE REFERENCES materiales(codigo),
    descripcion     TEXT,
    total           REAL   -- total de ese material usado en TODO el proyecto
);
```

### 6. `analisis_costo_estructura` (115)

```sql
CREATE TABLE analisis_costo_estructura (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    estructura      TEXT,               -- "ESTRUCTURA PR-101", etc.
    codigo_material INTEGER REFERENCES materiales(codigo),
    descripcion     TEXT,
    cantidad        REAL,
    unidad          TEXT,
    precio_unitario REAL,
    subtotal        REAL GENERATED ALWAYS AS (
        CASE WHEN cantidad IS NOT NULL AND precio_unitario IS NOT NULL
             THEN ROUND(cantidad * precio_unitario, 2) ELSE NULL END
    ) VIRTUAL
);
```

12 estructuras cubiertas: PR-101, PR-202, MT-301, MT-302, MT-307, MT-301+MT-307=MT, FV-MT, HA-105, (trafo 25kVA), AL-BT, F1-BT, SUB-BT.

## Vistas

```sql
-- Precio de referencia consolidado (prioriza IGMELEC → GRAPE → BELLON → OCHOA)
CREATE VIEW v_materiales_precio AS ...

-- Costo de materiales por estructura en el análisis detallado
CREATE VIEW v_costo_por_estructura AS
SELECT estructura, COUNT(*) cant_items, ROUND(SUM(subtotal),2) costo_materiales_total
FROM analisis_costo_estructura WHERE subtotal IS NOT NULL GROUP BY estructura;

-- Costo UUCC teórico (usando precios de proveedor para los BOMs)
CREATE VIEW v_costo_uucc_por_estructura AS
SELECT u.estructura, COUNT(DISTINCT u.codigo_material) materiales_distintos,
       SUM(u.cantidad) cantidad_total,
       ROUND(SUM(u.cantidad * COALESCE(m.precio_igmelec,m.precio_grape,0)),2) costo_materiales_rd
FROM uucc_material_estructura u
LEFT JOIN materiales m ON u.codigo_material = m.codigo
GROUP BY u.estructura ORDER BY costo_materiales_rd DESC;

-- Uso total × precio para priorizar compras
CREATE VIEW v_materiales_uso_total AS ...
```

## Consultas útiles

```sql
-- 1. BOM completo de una estructura
SELECT u.descripcion, u.cantidad, m.unidad,
       COALESCE(m.precio_igmelec, m.precio_grape) AS precio,
       ROUND(u.cantidad * COALESCE(m.precio_igmelec, m.precio_grape), 2) AS subtotal
FROM uucc_material_estructura u
LEFT JOIN materiales m ON u.codigo_material = m.codigo
WHERE u.estructura = 'MT-301 (55-5)'
ORDER BY subtotal DESC NULLS LAST;

-- 2. ¿En cuántas estructuras se usa cada material?
SELECT m.codigo, m.descripcion, COUNT(DISTINCT u.estructura) AS usado_en_n_estructuras
FROM materiales m
LEFT JOIN uucc_material_estructura u ON m.codigo = u.codigo_material
GROUP BY m.codigo
ORDER BY usado_en_n_estructuras DESC;

-- 3. Materiales huérfanos (sin precio)
SELECT codigo, descripcion
FROM materiales
WHERE precio_igmelec IS NULL AND precio_grape IS NULL
  AND precio_bellon IS NULL AND precio_ochoa IS NULL;

-- 4. Costo total estimado del proyecto (materiales)
SELECT ROUND(SUM(COALESCE(t.total,0) * COALESCE(m.precio_igmelec, m.precio_grape, 0)), 2)
       AS costo_total_materiales_rd
FROM totales_materiales t
JOIN materiales m ON t.codigo_material = m.codigo;
```
