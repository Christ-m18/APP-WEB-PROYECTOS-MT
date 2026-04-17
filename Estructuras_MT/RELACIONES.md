# RELACIONES ENTRE LOS DOCUMENTOS

Este documento explica cómo se cruzan los tres Excel originales y qué discrepancias hay.

## Ciclo de información

```
    ┌────────────────────────────────────────────────────────────┐
    │  1. Base_de_UUCC-Materiales.xlsx                           │
    │     - hoja "Estructuras" : catálogo (525) + BOM (4,055)    │
    │     - hoja "Hoja2"       : subconjunto resumido (122)      │
    │     - hoja "Totales"     : totales por material (204)      │
    │     - hoja "Hoja1"       : reporte pequeño (14)            │
    └────────────────────────┬───────────────────────────────────┘
                             │ codigo_material (1000000-1009999)
                             ▼
    ┌────────────────────────────────────────────────────────────┐
    │  2. Precios_de_Materiales_22-11-2022.xlsx                  │
    │     - hoja "Materiales"  : 92 materiales × 6 proveedores   │
    │     - hoja "Estructura"  : 69 tarifas mano de obra         │
    └────────────────────────┬───────────────────────────────────┘
                             │ codigo_material (1000000-1009999)
                             ▼
    ┌────────────────────────────────────────────────────────────┐
    │  3. ANALISIS_DE_COSTO.xlsx                                 │
    │     - hoja "Hoja1" : 12 estructuras × ~10 items c/u        │
    │       (referencia validada de cálculo de costo por estr.)  │
    └────────────────────────────────────────────────────────────┘
```

## Cruces y llaves

| Origen | Campo | Destino | Campo | Tipo cruce |
|---|---|---|---|---|
| uucc_material_estructura | codigo_material | materiales | codigo | FK formal |
| totales_materiales | codigo_material | materiales | codigo | FK formal |
| analisis_costo_estructura | codigo_material | materiales | codigo | FK formal |
| uucc_material_estructura | estructura | estructuras_catalogo | nombre | texto (parcial) |
| estructuras_mano_obra | descripcion | estructuras_catalogo | nombre | texto (parcial) |
| analisis_costo_estructura | estructura (sin prefijo "ESTRUCTURA ") | uucc_material_estructura | estructura | texto (requiere normalizar) |

## Observaciones clave (ya reconciliadas en el esquema)

### 1. Materiales sin precio: 114
112 códigos aparecen en BOMs o totales pero no tienen precio en ninguno de los 6 proveedores. Se insertaron igual en `materiales` para preservar las FKs. **Acción:** pedir cotización.

### 2. Estructuras en BOM sin catálogo exacto: 384
Los nombres difieren en formato:
- Catálogo: `TE-IZADO DE POSTE HAV-300-9`, `TE-MONT 3Ø RED ANTIFRAUDE (MTA-301)`
- BOM: `HAV-300-9`, `MTA-301`

El prefijo `TE-IZADO`/`TE-MONT` indica **tarea eléctrica** (mano de obra), mientras el nombre desnudo es la **estructura física**. Son el mismo concepto con dos vistas: una para facturar tareas, otra para listar materiales.

### 3. Mano de obra sin match exacto en catálogo: 64
Mismo problema: `"IZADO DE POSTE HAV-300-9"` (mano de obra) vs `"TE-IZADO DE POSTE HAV-300-9"` (catálogo). Diferencia: prefijo `TE-`. Se puede resolver con `UPPER(nombre) LIKE '%' || descripcion || '%'`.

### 4. Estructuras en análisis tienen prefijo `"ESTRUCTURA "`
`"ESTRUCTURA PR-101"` en análisis vs `"PR-101"` o similar en BOM. Requiere normalización al comparar:
```sql
SELECT * FROM analisis_costo_estructura
WHERE REPLACE(estructura, 'ESTRUCTURA ', '') = 'PR-101';
```

## Cobertura de datos

| Fuente | Estructuras cubiertas | Materiales cubiertos |
|---|---:|---:|
| Base_UUCC → catálogo | 525 únicas | — |
| Base_UUCC → BOM | 417 únicas (con detalle) | 204 |
| Precios → materiales | — | 92 (con precio) |
| Precios → mano de obra | 69 tareas | — |
| Análisis de costo | 12 estructuras | 50 (aprox.) |

## Valor agregado (lo que esta BD permite que los Excel sueltos NO)

1. **Costeo automático de estructuras UUCC** usando precio IGMELEC/GRAPE aplicado a BOMs de 4,055 líneas.
2. **Detección de materiales sin precio** que bloquearían la licitación.
3. **Análisis de sensibilidad por proveedor** (6 columnas de precio vs 1 BOM).
4. **Comparar análisis ya hecho vs cálculo teórico** para las 12 estructuras de `analisis_costo_estructura` → validar UUCC.
