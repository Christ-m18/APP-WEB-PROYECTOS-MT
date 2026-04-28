# Entrenamiento IA: Mejoras al Sistema de Extraccion de Planos Electricos

## Objetivo

Mejorar la precision del sistema de extraccion e interpretacion de planos electricos PDF (edge function `extract-plano` + `planImporter.ts`) para alcanzar un nivel de 0 errores. Las mejoras cubren:

1. **Reglas PE/PP/PROP./EXIST.** (ya implementadas en el prompt de Gemini)
2. **Cables y tramos** (ya implementados en el prompt)
3. **Transformadores TR-NNN y descripciones fisicas** (ya implementados en el prompt)
4. **Matching mejorado con el catalogo VOLUMEN-II** (requiere mejoras en `planImporter.ts`)
5. **Creacion de Knowledge Item permanente** para que todas las sesiones futuras tengan este contexto

---

## Analisis del Estado Actual

### Lo que YA esta bien implementado en `extract-plano/index.ts`:

| Regla | Estado | Detalle |
|-------|--------|---------|
| PE vs PP (poste existente vs propuesto) | OK | Lineas 36-37 del SYSTEM_PROMPT |
| Marcadores PROP./EXIST./RET./REUB. dentro de cajas | OK | Lineas 40-44 |
| Ejemplo PE2 con sub-seccion PROP. | OK | Lineas 48-62 |
| Sufijos individuales (RET), (REUB), (E), (P) | OK | Lineas 72-75 |
| Cantidad por prefijo numerico (2HA-100B = 2x) | OK | Lineas 79-83 |
| Cables propuestos vs existentes | OK | Lineas 87-102 |
| Transformadores TR-NNN con KVA | OK | Lineas 104-119 |
| Descripciones fisicas (TR TP 1O CSP 7.2 25KVA) | OK | Linea 117 |
| Familias de codigos esperados | OK | Lineas 122-130 |
| Tabla de estructuras propuestas | OK | Lineas 132-139 |

### Gaps identificados que requieren mejoras:

#### 1. `planImporter.ts` - Matching de Transformadores y Estructuras
El sistema debe realizar un matching descriptivo (ej. `TR-104 (37.5)` -> `TR TP 10 RCO 2B 7.2 37.5KVA`).
- **Ambigüedad Controlada:** Cuando la detección sea ambigua respecto a la capacidad o tipo, el sistema **NO** debe forzar un match único. Se deben presentar todos los candidatos posibles (ej. `TR TP 10 RCO 2B 7.2 25KVA`, `37.5KVA`, `50KVA`, etc.) para que el usuario elija la variante técnica correcta.
- **Nota:** `TE-MONT` en el catálogo se refiere a la mano de obra, mientras que el match principal es con la estructura completa.

#### 2. `planImporter.ts` - Patron TR con KVA entre parentesis
El patron regex para TR-NNN debe capturar correctamente `TR-104 (37.5)` como codigo con capacidad, manteniendo la precisión.

#### 3. Matching contra catalogo de VOLUMEN-II
Las estructuras en el catálogo `estructuras_catalogo.csv` deben conectarse correctamente con las descripciones del plano, normalizando espacios y variaciones de caracteres.

#### 4. Cables (Conductores)
Los cables (AAAC#2/0, TPX#2/0, etc.) no tienen match en `estructuras_catalogo`. Se debe implementar una tabla de configuración (`mapping_cables.ts`) que centralice las equivalencias entre calibres detectados y códigos de materiales EDEESTE.

---

## Cambios Propuestos

### Componente 1: Mejoras a `planImporter.ts`

#### [MODIFY] [planImporter.ts](file:///c:/Users/Christopher%20Rosario/Documents/Projects/SOFTWARE_DEVELOPMENT_PROJECTS/MT-PRESUPUESTOS-SIE/src/lib/planImporter.ts)

1. **Normalización:** Implementar capa intermedia para normalizar descripciones antes del matching.
2. **Matching Basado en Candidatos:** Modificar el flujo para que `planImporter.ts` devuelva un array con `candidatos` (score de confianza) en lugar de un objeto único, permitiendo a la UI presentar las opciones ambiguas.
3. **Gestión de Cables:** Crear tabla de equivalencias de códigos de materiales EDEESTE.

#### [MODIFY] [planImporter.test.ts](file:///c:/Users/Christopher%20Rosario/Documents/Projects/SOFTWARE_DEVELOPMENT_PROJECTS/MT-PRESUPUESTOS-SIE/src/lib/planImporter.test.ts)

Agregar tests para:
- Normalización de transformadores (`TR-104 (37.5)`).
- Asegurar que el sistema presente múltiples opciones ante ambigüedad.
- Cables: `AAAC#2/0`, `TPX#2/0`.

---

### Componente 2: Knowledge Item Permanente

#### [NEW] Knowledge Item: `reglas-extraccion-planos-electricos`

---

## Open Questions

> [!IMPORTANT]
> **Q1: Cables en el presupuesto.** Cuando el plano los detecta, ¿qué opción prefieres?
> - **Opcion A:** Crear entradas especiales en la tabla de estructuras para cables con precio por metro
> - **Opcion B:** Los cables se omiten del presupuesto de estructuras y solo aparecen en el presupuesto de materiales
> - **Opcion C:** Se agregan como items "otro" con precio manual

> [!IMPORTANT]
> **Q2: Validacion con el plano FIRMA_DIGITAL_32500-Modelo.pdf.** Para validar las mejoras necesito que:
> - Ejecutes la extraccion del plano en la app y me compartas los resultados
> - O me describas las estructuras que esperas ver en el plano para verificar manualmente

---

## Verification Plan

### Automated Tests
```bash
npx vitest run src/lib/planImporter.test.ts
```

### Manual Verification
1. Cargar planos con diferentes configuraciones de transformadores.
2. Validar que la interfaz permita la selección del transformador correcto ante la ambigüedad detectada.
