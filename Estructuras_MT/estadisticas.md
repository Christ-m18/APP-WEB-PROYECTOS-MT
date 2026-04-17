# Estadísticas y Hallazgos

## Inventario general

| Concepto | Cantidad |
|---|---:|
| Materiales en catálogo | 204 |
| Materiales con precio de al menos 1 proveedor | 92 |
| Materiales sin ningún precio | 114 |
| Estructuras UUCC en catálogo | 525 |
| Estructuras con BOM detallado | 417 |
| Líneas de BOM (material × estructura × cantidad) | 4,055 |
| Tarifas de mano de obra | 69 |
| Estructuras con análisis de costo completo | 12 |

## Distribución por tipo de estructura (top 15)

| Tipo | Cantidad |
|---|---:|
| ARMADOS TIPO PIN Y CAMPANA | 59 |
| PROTECCIONES | 47 |
| TRANSFORMADORES | 41 |
| JUMPERS Y CONEXIONES | 24 |
| ARMADO BT | 22 |
| ARMADOS TIPO PIN Y CAMPANA ANTIFRAUDE | 22 |
| POSTERIA | 21 |
| ANCLAJES | 17 |
| ENSAMBLES DIVERSOS | 16 |
| TENDIDO CONDUCTOR | 14 |
| ARMADOS 34.5 KV | 13 |
| MTA-101 (55-5) | 12 |
| MEDIDAS | 10 |
| TOTALIZADOR INDIRECTO, NO TELEMEDIDO, RED NRMAL | 10 |
| KIT BT SOCKET ANTI-FRAUDE 120V(8/2 de AL) | 8 |

## Costo total estimado del proyecto (materiales)

**RD$ 311.00**

Calculado como:
```sql
SELECT SUM(totales.total * COALESCE(precio_igmelec, precio_grape, 0))
FROM totales_materiales JOIN materiales USING (codigo)
```

## Top 10 materiales más "universales" (usados en más estructuras)

| Código | Descripción | # Estructuras |
|---|---|---:|
| 1006264 | ARANDELA PRESION ACERO GALV P/TORN 5/8" | 259 |
| 1006696 | GRAPA CONEXION DOBLE S/TOR | 253 |
| 1007094 | TUERCA CAB HEX AC GALV P/TORNILLO 5/8" | 241 |
| 1006250 | ARAN PLAN CUA AC GALV 21/4"X21/4" D 5/8" | 189 |
| 1006262 | ARANDELA PRESION ACERO GALV P/TORN 1/2" | 172 |
| 1007057 | TORNILLO HEX PAS AC GALV 5/8" X 12" | 160 |
| 1006840 | PERNO ROSCA CORRIDA AC GALV 5/8" X12" | 145 |
| 1007099 | TUERCA D/OJO AC GALV P/TORNILLO 5/8" | 132 |
| 1005947 | ALAMBRE LIGADURA ALUMINIO | 122 |
| 1006508 | CRUCETA ACERO GALV 8'-0"3" X 3" | 103 |

## Top 15 estructuras más costosas en materiales (cálculo teórico UUCC)

| Estructura | # Materiales | Cantidad total | Costo RD$ |
|---|---:|---:|---:|
| CT TP  1Ø RCO 2B 7.2  75KVA | 18 | 36.0 | 139,168.36 |
| TR TP  1Ø RCO 2B 7.2  75KVA | 7 | 10.0 | 129,498.00 |
| CT TP  1Ø RCO 2B 7.2  50KVA | 17 | 32.0 | 84,008.79 |
| CT TP 1Ø RCO 2B  7.2  37.5KVA | 17 | 32.0 | 81,208.49 |
| TR TP  1Ø RCO 2B 7.2  50KVA | 7 | 10.0 | 76,498.30 |
| TR TP 1Ø RCO 2B  7.2  37.5KVA | 7 | 10.0 | 73,698.00 |
| CT BL TP 1Ø CSP 7.2  25KVA | 18 | 42.3 | 62,377.17 |
| CT TP 1Ø RCO 2B 7.2  25KVA | 17 | 33.0 | 61,101.99 |
| TR TP 1Ø RCO 2B 7.2  25KVA | 7 | 10.0 | 53,498.00 |
| LB-611 (2/0-4/0) (57-1) | 17 | 169.0 | 46,035.43 |
| LB-611 (336-477) (57-1) | 17 | 169.0 | 39,915.43 |
| LB-611 (2/0-4/0) (55-5) | 17 | 181.0 | 36,755.43 |
| LB-611 (336-477) (55-5) | 17 | 181.0 | 30,635.43 |
| HAV-500-14 | 1 | 1.0 | 27,000.00 |
| MTA-304 (2/0-4/0) (57-1) | 16 | 112.0 | 26,192.34 |

## Análisis de costo ya validado (12 estructuras del ANALISIS_DE_COSTO.xlsx)

| Estructura | Items | Costo RD$ |
|---|---:|---:|
| ESTRUCTURA | 7 | 53,498.00 |
| ESTRUCTURA MT-301 + MT-307 = MT | 17 | 17,588.29 |
| ESTRUCTURA PR-202 | 16 | 17,149.94 |
| ESTRUCTURA MT-302 | 10 | 12,050.17 |
| ESTRUCTURA MT-307 | 12 | 10,835.67 |
| ESTRUCTURA MT-301 | 13 | 6,089.62 |
| ESTRUCTURA SUB-BT | 12 | 4,065.05 |
| ESTRUCTURA PR-101 | 3 | 3,154.92 |
| ESTRUCTURA FV-MT | 8 | 2,527.55 |
| ESTRUCTURA HA-105 | 7 | 2,167.82 |
| ESTRUCTURA F1-BT | 5 | 817.50 |
| ESTRUCTURA AL-BT | 4 | 305.90 |

## Observaciones técnicas para licitación

1. **112 materiales sin precio cotizado** — deben incluirse en RFQ antes de emitir oferta definitiva.
2. Los proveedores cotizan parcialmente: IGMELEC y GRAPE son los más completos. BELLÓN, OCHOA, MAENCA y TRANSDECI aparecen con datos muy ralos (pocos items).
3. Las estructuras con transformadores (CT TP, TR TP) son las más caras en materiales, dominadas por el costo del transformador 1Ø.
4. Los códigos de material son consistentes con el esquema EDEESTE (7 dígitos, rango 1004000-1009999).
