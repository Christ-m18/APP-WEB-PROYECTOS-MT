// Supabase Edge Function: extract-plano
// Recibe un PDF en base64 y devuelve las estructuras MT detectadas por Gemini Vision.
// Secret requerido en Supabase: GEMINI_API_KEY

// @ts-ignore: Deno specifiers not recognized by standard TS
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore: Deno specifiers not recognized by standard TS
import { createClient } from 'jsr:@supabase/supabase-js@2'

// @ts-ignore: Declaración global para evitar errores en editores sin la extensión de Deno
declare const Deno: any;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Cadena de fallback solo con modelos free-tier multimodales (PDF/vision).
// Orden: mejor calidad primero, luego mayor cuota. Si uno da 503/429, cae al siguiente.
const MODELOS = [
  'gemini-2.5-flash',       // free: 5 RPM, 250K TPM, 20 RPD
  'gemini-2.0-flash',       // free: estable, buen fallback
  'gemini-2.5-flash-lite',  // free: 10 RPM, 250K TPM, 20 RPD (mayor RPM que 2.5-flash)
  'gemini-2.0-flash-lite',  // free: último recurso, menor calidad
]
const MAX_TOKENS = 16384
// Intentos por modelo. 2 intentos con pausa de 2.5s = total máx 4 modelos x 2 x ~3s ≈ 24s (dentro del timeout de Edge 60s).
const PAUSAS_MS = [0, 2500]

const SYSTEM_PROMPT = `Eres un INGENIERO ELÉCTRICO experto en planos de distribución de media tensión (MT) y baja tensión (BT) de proyectos EDE/SIE de República Dominicana. Tu única tarea es leer el plano PDF adjunto y devolver un inventario JSON SOLO con estructuras, accesorios y CABLES PROPUESTOS (obra nueva). Lo existente, a retirar o a reubicar NO va al inventario.

=== REGLA MAESTRA: PROPUESTO vs EXISTENTE ===

Cada caja de texto agrupa items de UN poste. La PRIMERA línea es el ID del poste y define el modo INICIAL de la caja:
- \`PE#\` (Poste Existente, ej PE1, PE2, PE3, PE5) → modo INICIAL = EXCLUIR (el poste y sus items existían).
- \`PP#\` (Poste Propuesto, ej PP1, PP4, PP55) → modo INICIAL = INCLUIR (poste nuevo).

DENTRO de la caja pueden aparecer marcadores de SUB-SECCIÓN que CAMBIAN el modo:
- \`PROP.\`, \`PROPUESTO\`, \`PROP:\`  → cambia modo a INCLUIR
- \`EXIST.\`, \`EXISTENTE\`, \`EXIST:\` → cambia modo a EXCLUIR
- \`RET.\`, \`RETIRAR\`, \`A RETIRAR\` → cambia modo a EXCLUIR
- \`REUB.\`, \`REUBICAR\`           → cambia modo a EXCLUIR

Procesas la caja LÍNEA POR LÍNEA en orden. Cada línea hereda el modo actual hasta que un marcador lo cambie.

EJEMPLO CRÍTICO (PE con sub-sección PROP. — caso muy común):
  PE2          ← modo=EXCLUIR (PE)
  PH-40(RET)   ← excluir (modo + sufijo RET)
  MT-104(RET)  ← excluir
  BT-104(RET)  ← excluir
  2SU-BT(REUB) ← excluir (REUB)
  SU-BT(RET)   ← excluir
  2HA-100B(RET)← excluir
  S6(RET)      ← excluir
  PROP.        ← cambia modo a INCLUIR
  HAV-500-12   ← INCLUIR ×1
  MT-106       ← INCLUIR ×1
  F1-MT        ← INCLUIR ×1
  F2-BT        ← INCLUIR ×1
  F1-BT        ← INCLUIR ×1
  2HA-100B     ← INCLUIR ×2

EJEMPLO PP con sub-sección EXIST.:
  PP4          ← modo=INCLUIR (PP)
  HAV-500-10   ← INCLUIR
  MT-307       ← INCLUIR
  EXIST.       ← cambia modo a EXCLUIR
  TR-104 (RET) ← excluir
  HA-106       ← excluir (modo)

Sufijos INDIVIDUALES en una línea (siempre excluyen ESA línea, sin afectar el modo):
- \`(RET)\`, \`(REUB)\`, \`(E)\` → EXCLUIR esa línea (ej: \`MT-104(RET)\`, \`PE6(RET)\`).
- Sufijos SIN paréntesis también cuentan: \`HPV-500-10 RET\`, \`MTA-102 RET\`, \`AP-103 REUB\` → EXCLUIR.
- Combinaciones de sufijos: Si un item tiene \`(E)\` pero también \`(N)\` o similar (ej \`AAAC#2(E)(N)\`, \`3PVC#8(E)(RET)\`), la regla de exclusión por \`(E)\` o \`(RET)\` PREDOMINA. ¡EXCLUIR!
- \`(P)\` → INCLUIR esa línea.
- \`(ABIERTO)\`, \`(ENCOF.)\`, \`(C6)\`, \`(C8)\`, \`(8')\`, \`(8 ́)\`, \`(2/0-4/0)\`, \`(34.5 KV)\` → especificadores técnicos, NO afectan estado.

Lineas sueltas con SOLO \`(E)\` o \`(P)\` debajo de un poste (sin codigo en la misma linea):
- Si ves una linea que dice solo \`(E)\` despues de un bloque PE/PP, eso confirma estado EXISTENTE del bloque. NO la trates como item.
- Si ves \`(P)\` sola, confirma PROPUESTO. NO la trates como item.

EJEMPLO COMPLEJO con sufijos SIN parentesis y multiple paginas:
  PE5           <- modo=EXCLUIR
  HPV-500-10 RET  <- EXCLUIR (sufijo RET sin parentesis)
  MTA-102 RET   <- EXCLUIR (sufijo RET sin parentesis)
  HA-106 RET    <- EXCLUIR
  AP-103 REUB   <- EXCLUIR (sufijo REUB sin parentesis)
  PE5           <- sigue modo=EXCLUIR (repeticion del poste en diagrama unifilar, IGNORAR)
  HPV-500-10    <- EXCLUIR (modo)
  MTA-105(RET)  <- EXCLUIR

EJEMPLO PE con linea PROP: inline:
  PE7           <- modo=EXCLUIR
  (E)           <- NO es item, confirma existente
  FV-MT (E)     <- EXCLUIR (espacio + (E) = existente)
  PROP: F1-BT   <- F1-BT es PROPUESTO, INCLUIR x1
  NEUTRO#2/0 (P) <- INCLUIR (cable propuesto)

EJEMPLO PP con sub-seccion (E) suelta:
  PP4           <- modo=INCLUIR
  HPV-500-12    <- INCLUIR
  MTA-305       <- INCLUIR
  PR-203        <- INCLUIR
  SO2-MT        <- INCLUIR
  PO-110        <- INCLUIR
  PR-101        <- INCLUIR
  (ya aparecio PP4 con los MISMOS items en otra pagina? NO DUPLIQUES)

=== CANTIDAD POR PREFIJO NUMÉRICO ===

Si la línea inicia con un número pegado o separado por espacio, ESE número es la cantidad:
- \`2HA-100B\` → HA-100B ×2
- \`2 MT-305\` → MT-305 ×2 (ojo al espacio)
- \`4 F3-MT\` → F3-MT ×4
- \`18 F3-MT\` → F3-MT ×18
- \`3 URD CU #1/0\` → cable URD CU #1/0 (ver sección CABLES más abajo)

=== CABLES (importante, no ignorar) ===

Los cables aparecen como pares: longitud (en metros) + calibre. Pueden estar al lado de un tramo del plano o dentro de una caja.

Patrones típicos:
- \`55m (P) AAAC#2/0(P)\` → cable AAAC#2/0 propuesto, 55 metros
- \`55m (P) TPX#2/0(P)\` → cable TPX#2/0 propuesto, 55 metros
- \`54m (E) AAAC#2(E) TPX#2/0(E)\` → cables EXISTENTES → EXCLUIR
- \`9AAAC#2/0(E)\` → cable existente, EXCLUIR (el 9 NO es cantidad si va con sufijo (E); refiere a # de conductores existentes)
- \`3AAAC#2/0(P)\` o \`4AAAC#2/0(P)\` → cable propuesto; el dígito al inicio puede ser # de fases. La CANTIDAD del item es los METROS del tramo asociado, NO el dígito.
- Notaciones anómalas: \`3 URD CU # 1/0 AWG\` o \`4AAAC#/2/0(P)\`. Normaliza eliminando espacios extra tras el # y slashes mal puestos (\`URD CU #1/0\`, \`AAAC#2/0\`).
- \`NEUTRO#2/0 (P)\` → Considéralo un cable válido de tipo \`NEUTRO#2/0\`.
- \`46.32Mts 3AAAC#2/0(P)\` → cable propuesto, 46.32 metros. "Mts" = metros (equivale a "m"). El 3 es fases, NO cantidad.
- \`51.32Mts 3AAAC#2/0(P)\` → mismo calibre, 51.32 metros más a sumar.
- \`45.00Mts\` SOLA sin calibre → IGNORAR (es solo distancia de vano).
- \`3URD#1/0 AWG AISL. 15KV NEU. CONC. AL. 33% (P)\` → cable muy largo, extráelo como \`URD #1/0\`. Ignora descripciones extra de aislamiento, voltaje o tubería si ya reconoces el calibre principal.

FORMATOS de distancia a reconocer:
- \`55m\`, \`55 m\`, \`55M\`, \`55Mts\`, \`55 Mts\`, \`55.00Mts\`, \`46.32Mts\` — todos equivalen a metros.
- La distancia puede tener decimales: \`46.32\`, \`51.32\`, \`36.39\`.
- Cuando la distancia aparece ANTES del calibre (ej \`46.32Mts 3AAAC#2/0(P)\`), los metros se asocian a ese cable.

REGLAS para cables:
1. Cable PROPUESTO (\`(P)\` o sin sufijo si está en caja PP/sección PROP.) → INCLUIR. \`codigo\` = el calibre tal cual (ej \`AAAC#2/0\`, \`TPX#2/0\`, \`URD #1/0\`). Conserva el \`#\`. Quita el prefijo de fases (3, 4) del codigo.
2. Cable EXISTENTE (\`(E)\`) → EXCLUIR. IMPORTANTE: Si el sufijo \`(E)\` o \`(P)\` aparece al final de una descripción larga de varias líneas (ej: URD CU... XLPE... (E)), aplícalo al cable principal.
3. La CANTIDAD del cable = SUMA de metros de TODOS los tramos propuestos del MISMO calibre en TODO el plano. Si hay 46.32 + 51.32 + 45.00 de AAAC#2/0(P) en distintos tramos → 1 item codigo='AAAC#2/0' cantidad=143 (redondeado).
4. Si solo ves el calibre sin metros visibles, asume 0 metros y NO lo incluyas (mejor omitir que adivinar).
5. Cables comunes a reconocer: \`AAAC#2/0\`, \`AAAC#4/0\`, \`AAAC#2\`, \`AAAC 477\`, \`AAAC 336\`, \`TPX#2/0\`, \`TPX#4/0\`, \`TPX#3/0\`, \`URD CU #1/0\`, \`URD #1/0\`, \`URD#2\`, \`Triplex 2/0\`, \`Triplex 3/0\`, \`Triplex 4/0\`, \`TRIPLEX 2/0\`, \`NEUTRO#2/0\`.
6. Para cables, \`fuente: "otro"\`.
7. En la TABLA DE CAIDA DE TESION (si existe), la columna "CONDUTOR" o "CONDUCTOR" indica el tipo de cable BT usado (ej \`TRIPLEX 2/0\`). NO lo cuentes como item separado; los metros BT se derivan de los tramos del diagrama, no de esta tabla.

=== TRANSFORMADORES (TR-NNN y descripciones físicas) ===

Códigos de ESTRUCTURA SIE para transformadores:
- Monofásicos (1Ø): TR-101, TR-102, TR-103, TR-104, TR-105, TR-106, TR-107, TR-108, TR-109, TR-110, TR-111
- Trifásicos (3Ø): TR-301, TR-302, TR-303, TR-304, TR-305, TR-306
- Variantes: TRA-XXX (algunos planos usan TRA en lugar de TR; tratarlos equivalentes)

Cuando aparece la KVA o capacidad (con o sin la palabra KVA) entre paréntesis después del código (ej \`TR-104(37.5)\`, \`TR-105 (75)\`), CONSERVA esa anotación en el código devuelto:
- \`TR-104(37.5)\` → codigo = \`TR-104 (37.5)\`
- \`TR-104(50)\` → codigo = \`TR-104 (50)\`
- \`TR-105 (75)\` → codigo = \`TR-105 (75)\`
- Diferentes capacidades del mismo TR-NNN se cuentan como ITEMS DISTINTOS porque el costo difiere.

Si el TR aparece con su KVA y fase abajo, ej:
\`TR-1\`
\`37.5 KVA\`
\`FASE A\`
Ignora la "FASE A". Busca el TR-NNN correspondiente si \`TR-1\` es solo un identificador de proyecto, pero si la tabla usa \`TR-1\` como código, devuélvelo como \`TR-1 (37.5)\`.

Descripciones físicas tipo \`TR TP 1Ø CSP 7.2 25KVA\`, \`TR TP 1Ø RCO 2B 7.2 50KVA\`, \`TR TP 3Ø CSP 7.2 75KVA\` son listados del catálogo de transformadores físicos. Si aparecen SUELTAS en el plano sin TR-NNN cerca, devuélvelas como item LITERAL con el codigo entero (ej codigo=\`TR TP 1Ø CSP 7.2 50KVA\`); el usuario las mapeará. NO inventes un TR-NNN.

Aplican las mismas reglas PE/PP/RET/REUB/(E)/(P) a TR-NNN y a las descripciones físicas.

=== FAMILIAS DE CÓDIGOS ESPERADOS ===

POSTES: HAV-XXX-NN, HPV-XXX-NN, MCH-XXX-NN, PO-XXX, MAD-XX-X (postes de madera), PC-XX (postes de concreto), PM-XX (postes metálicos)
PASES MT 1Ø: MT-101..MT-111 (alineamiento, ángulo, fin de línea monofásico)
PASES MT 2Ø: MT-201..MT-217 (bifásicos — ¡no confundir con 1Ø!)
PASES MT 3Ø: MT-301..MT-322, MTA-101..MTA-308, MTAF-XXX, LB-601..LB-611
PASES MT ESPECIALES: MT-401..MT-411 (Voladizo), MT-501..MT-508 (Verticales)
ARMADOS MT: CV1..CV5-MT, CE1..CE3-MT, CDA-MT, CSA-MT, C45-MT, EC-MT, EA-MT, ET-MT, SO1/SO2-MT, SP1/SP2-MT, SF1/SF2-MT, F1..F6-MT, FV-MT, VV-MT, SS1, SS2
PROTECCIONES Y TIERRAS: PR-101..PR-110, PT-101..PT-107, POAC-101, PH-NN
TRANSFORMADORES: TR-101..TR-310, TRA-XXX
ARMADOS BT: BT-101..BT-107, BT-201..BT-207, F1..F6-BT, HA-101..HA-108, AL-BT, SU-BT, SV-BT, SVAF-BT, SV-BT2, DE-BT
ANCLAJES: AN-201..AN-206, AN-S1, AN-D1
LUMINARIAS: AP-103, AP-104
S6, S1 y otras señales pueden aparecer; trátalas como estructuras válidas si están bajo PP/PROP.

=== TABLA DE ESTRUCTURAS PROPUESTAS ===

Si encuentras una tabla con columnas tipo \`No. | No. de Poste | Tipo de Poste | Contenido\` o \`Estructura | Cantidad\`:
- ITERA fila por fila.
- Si la fila es \`PE#\` → EXCLUIR toda la fila.
- Si la fila es \`PP#\` → procesar el "Tipo de Poste" + cada código en "Contenido". Aplicar las reglas de sufijos individuales.
- Si una columna explícita marca estado (Existente/Retirar/Reubicar) → respetarla.
- Si el plano tiene tanto cajas como tabla, USA SOLO la tabla (es más confiable). Si solo cajas, usa cajas.
- Si el título de la tabla dice "TABLA DE ESTRUCTURAS PROPUESTAS", TODAS las filas son propuestas (incluir todo).

FORMATO COMMA-SEPARATED en tablas:
Algunos planos listan las estructuras de un poste separadas por comas en UNA sola columna:
  \`MT-307, BT-104, HA-100B, PR-101\`
  \`MT-105, BT-101, 2HA 100B, TR-105, PR-101\`
Cada valor separado por coma es un item independiente. Aplica las reglas de cantidad por prefijo numérico.

NORMALIZACIÓN DE CÓDIGOS en tablas:
En tablas, los códigos pueden aparecer con ESPACIO en vez de guión:
  \`HA 100B\` = \`HA-100B\`, \`BT 104\` = \`BT-104\`, \`MT 105\` = \`MT-105\`, \`PR 101\` = \`PR-101\`
  \`2HA 100B\` = \`HA-100B\` ×2 (el 2 es cantidad, normalizar espacio a guión)
  \`HAV 100B\` es distinto: NO es lo mismo que HAV-100B; revisa contexto.
Al devolver el item, USA SIEMPRE el formato con guión: \`HA-100B\`, \`BT-104\`, \`MT-105\`.

FILAS CON SOLO POSTE (sin estructuras listadas):
Si una fila PP tiene "Tipo de Poste" (ej \`HAV-500-12\`) pero la columna de estructuras está VACÍA, el poste es un item válido por sí solo:
  \`PP9 | HAV-500-12 | (vacío)\` → INCLUIR \`HAV-500-12\` ×1
  \`PP10 | HAV-300-10 | (vacío)\` → INCLUIR \`HAV-300-10\` ×1
Estos postes se necesitan para la distribución aunque no tengan armados.

=== BALANCE DE CARGA Y TRANSFORMADORES EN DIAGRAMA ===

Algunos planos tienen una tabla "BALANCE DE CARGA" que lista transformadores como \`TR-1\`, \`TR-2\`, etc. con su KVA y poste asignado. Estos NO son códigos de estructura SIE; son identificadores del PROYECTO.
Lo importante es cruzar: el poste asignado (ej PP18) debe tener un TR-NNN en la tabla de estructuras.

En el diagrama unifilar, los transformadores pueden aparecer como anotaciones descriptivas:
  \`TRANSFORMADOR TIPO POSTE\`
  \`1Ø, 7,200 V, 120-240 V, 60HZ\`
  \`SUMERGIDO EN ACEITE\`
  \`FUSIBLE 7.15 AMP Tipo D\`
  \`FUSIBLE 5.15 AMP Tipo C\`
Estas descripciones son INFORMATIVAS; NO las devuelvas como items. El item real es el TR-NNN que aparezca en la tabla de estructuras para ese poste.

Si ves \`SECCIONADOR FUSIBLE (CUT OUT) 100 Amp.\` o \`APARTARRAYO 10 KV\` como símbolos en la leyenda, NO los cuentes como items separados; forman parte de la estructura del transformador (TR-NNN ya los incluye en su BOM).

=== REGLAS GLOBALES DE CONTEO ===

1. AGRUPA POR CÓDIGO FINAL: el JSON final tiene un item por código único, cantidad = suma total tras exclusiones.
2. Conserva sufijos de capacidad/calibre como parte del código (TR-104 (37.5), AAAC#2/0).
3. Quita sufijos de estado del código guardado (\`MTA-303(ABIERTO)\` → conservar como \`MTA-303 (ABIERTO)\` solo si ABIERTO es especificador técnico — sí lo es; pero \`MTA-303(RET)\` se excluye antes de llegar al codigo). Sufijos como \`(N)\` (Nuevo/Neutro) o \`(CT)\` son informativos, no los uses para excluir.
4. IGNORA: mediciones tipo \`46.32Mts\` SUELTAS sin cable asociado, mediciones en pulgadas (\`15"\`, \`6"\`), KVA totalizadores de tabla resumen, coordenadas GPS, nombres de calles, sellos, símbolos de norte, descripciones largas que no sean códigos (\`INTERRUPTOR AUTOMÁTICO DE TRANSFERENCIA\`, \`TRACTION POWER SUBSTATION\`), información de parcelas (A=293.22m2, 6.58 KVA por parcela), leyendas eléctricas (solo informativas), accesorios sueltos sin formato de estructura (\`CT Y PT\`, \`CT'S Y PT'S\`).
5. Si cantidad final = 0, OMITE.
6. confianza: 0.95+ cuando el código aparece en tabla resumen o múltiples fuentes; 0.7-0.9 si solo en una caja; <0.7 si hay ambigüedad visual.
7. NORMALIZA siempre los códigos: espacios entre familia y número se convierten en guión (\`HA 100B\` → \`HA-100B\`, \`MT 105\` → \`MT-105\`, \`BT 104\` → \`BT-104\`).
8. Para postes de madera: \`MAD-30-5\` normalizar a \`M - 9 - CL5\` si el plano usa esa convención, o dejar como \`MAD-30-5\` para que el usuario mapee.
9. NO DUPLIQUES: Si el mismo poste aparece en el diagrama de planta Y en el diagrama unifilar (segunda pagina), es el MISMO poste. Cuenta cada estructura UNA sola vez. Unifica resultados de todas las paginas eliminando duplicados.
10. Marcadores \`PROP:\` y \`PROP.\` son equivalentes. \`PROP: F1-BT\` significa que F1-BT es propuesto.
11. Identificadores de proyecto como \`CT-167857\`, \`A1\`, \`N/P:...\`, \`CIRC:...\` NO son estructuras. IGNORA.
12. \`FV-MT (E)\` → EXCLUIR (existente). El espacio antes de \`(E)\` no cambia la regla.

=== fuente del item ===

- "etiqueta" → caja por poste
- "tabla" → tabla de estructuras propuestas
- "leyenda" → solo si proviene de una sección leyenda con conteo explícito (raro)
- "otro" → cables, descripciones físicas literales, items que no encajan

=== SALIDA ===

Responde SOLO con JSON válido (sin markdown, sin texto adicional):
{"items":[{"codigo":string,"cantidad":number,"fuente":"etiqueta"|"tabla"|"leyenda"|"otro","pagina":number,"confianza":number}]}

Si todo el plano son items existentes (sin propuestos), devuelve {"items":[]}.

{{EJEMPLOS_RAG}}`

const USER_PROMPT = `Extrae el inventario de estructuras de este plano PDF. Analiza TODAS las páginas. Recorre las tablas fila por fila, las cajas junto a cada poste uno por uno, y suma las apariciones por código. Devuelve solo el objeto JSON con items.`

interface RequestBody {
  archivoBase64?: string
  storagePath?: string
  nombreArchivo: string
  proyectoId?: string | null
}

const RATE_LIMIT_POR_MINUTO = 5

interface ItemExtraido {
  codigo: string
  cantidad: number
  fuente: 'etiqueta' | 'tabla' | 'leyenda' | 'otro'
  pagina: number
  confianza: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const t0 = Date.now()
  let auditBase: Record<string, unknown> = {}

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'missing_auth' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'unauthorized' }, 401)

    const body = (await req.json()) as RequestBody
    if (!body.nombreArchivo || typeof body.nombreArchivo !== 'string') {
      return json({ error: 'nombreArchivo requerido' }, 400)
    }
    if (!body.archivoBase64 && !body.storagePath) {
      return json({ error: 'archivoBase64 o storagePath requerido' }, 400)
    }

    // ── Rate limiting (5 req/min por usuario) ──────────────────
    const limitOk = await checkRateLimit(supabase, user.id)
    if (!limitOk) {
      return json(
        { error: 'rate_limited', mensaje: `Máximo ${RATE_LIMIT_POR_MINUTO} importaciones por minuto. Espera 60s.` },
        429
      )
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return json({ error: 'server_misconfigured_missing_GEMINI_API_KEY' }, 500)

    // ── Resolver base64: directo o desde storage ───────────────
    let archivoBase64: string
    if (body.archivoBase64) {
      archivoBase64 = body.archivoBase64
    } else {
      const downloaded = await descargarDesdeStorage(supabase, body.storagePath!, user.id)
      if (!downloaded) return json({ error: 'storage_path_invalid' }, 400)
      archivoBase64 = downloaded
    }

    const archivoBytes = Math.ceil(archivoBase64.length * 0.75)

    // ── Cache por SHA-256 del archivo ──────────────────────────
    const hash = await sha256Hex(archivoBase64)
    const cacheado = await buscarEnCache(supabase, user.id, hash)
    if (cacheado) {
      await logAudit(supabase, {
        usuario_id: user.id,
        proyecto_id: body.proyectoId ?? null,
        archivo_nombre: body.nombreArchivo,
        archivo_bytes: archivoBytes,
        modelo: 'cache',
        items_extraidos: cacheado,
        hash_sha256: hash,
        duracion_ms: Date.now() - t0,
      })
      return json({ items: cacheado, cache: true })
    }

    auditBase = {
      usuario_id: user.id,
      proyecto_id: body.proyectoId ?? null,
      archivo_nombre: body.nombreArchivo,
      archivo_bytes: archivoBytes,
      hash_sha256: hash,
    }

    // ── RAG: buscar ejemplos similares ─────────────────────────
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )
    let ragBlock = ''
    try {
      const queryText = `Plano electrico MT: ${body.nombreArchivo}`
      const queryEmb = await generarEmbedding(queryText, apiKey)
      if (queryEmb) {
        const ejemplos = await buscarEjemplosSimilares(queryEmb, supabaseService)
        if (ejemplos.length > 0) {
          ragBlock = construirPromptConRAG(ejemplos)
        }
      }
    } catch { /* RAG failure is non-blocking */ }

    const promptFinal = SYSTEM_PROMPT.replace('{{EJEMPLOS_RAG}}', ragBlock)

    // ── Llamada a Gemini con RAG ──────────────────────────────
    const result1 = await extraerConGemini(apiKey, promptFinal, archivoBase64, USER_PROMPT, auditBase, supabase, t0)

    // Si Gemini devolvio error de API, informar al usuario
    if (result1.apiError) {
      return json(
        { error: 'gemini_api_error', status: result1.apiStatus, detail: result1.apiError, mensaje: result1.apiStatus === 503 || result1.apiStatus === 429 ? 'Los modelos de IA estan sobrecargados. Intenta de nuevo en 1-2 minutos.' : 'Error al invocar Gemini.' },
        502
      )
    }

    // ── Retry con prompt reforzado si vacio ───────────────────
    let itemsFinal = procesarItemsPostGemini(result1.items)
    if (itemsFinal.length === 0 && result1.items.length === 0) {
      const retryPrompt = `${USER_PROMPT} IMPORTANTE: Este plano SI contiene estructuras propuestas. Revisa TODAS las paginas con extremo cuidado. Busca tablas de estructuras, cajas de texto junto a postes PP, y cualquier codigo tipo MT-XXX, BT-XXX, HAV-XXX, HA-XXX, TR-XXX, AAAC, TPX, etc. No devuelvas items vacios.`
      const result2 = await extraerConGemini(apiKey, promptFinal, archivoBase64, retryPrompt, { ...auditBase, retry: true }, supabase, t0)
      if (!result2.apiError) {
        itemsFinal = procesarItemsPostGemini(result2.items)
      }
    }

    // ── Guardar en dataset RAG ─────────────────────────────────
    if (itemsFinal.length > 0) {
      try {
        const resumen = generarResumenPlano(itemsFinal, body.nombreArchivo)
        const emb = await generarEmbedding(resumen, apiKey)
        if (emb) {
          await guardarEnDataset(supabaseService, hash, itemsFinal, resumen, emb)
        }
      } catch { /* dataset save is non-blocking */ }
    }

    await logAudit(supabase, {
      ...auditBase,
      items_extraidos: itemsFinal,
      duracion_ms: Date.now() - t0,
    })

    return json({ items: itemsFinal })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: 'internal_error', detail: msg }, 500)
  }
})

// SHA-256 hex de un string. Usado para cache por contenido de PDF.
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Devuelve items_extraidos de un import previo exitoso del mismo usuario con el mismo hash.
// deno-lint-ignore no-explicit-any
async function buscarEnCache(supabase: any, usuarioId: string, hash: string): Promise<unknown[] | null> {
  try {
    const { data } = await supabase
      .from('imports_planos')
      .select('items_extraidos')
      .eq('usuario_id', usuarioId)
      .eq('hash_sha256', hash)
      .is('error', null)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data || !Array.isArray(data.items_extraidos) || data.items_extraidos.length === 0) return null
    return data.items_extraidos
  } catch {
    return null
  }
}

// Rate limit por usuario: incrementa contador en ventana de 1 min.
// deno-lint-ignore no-explicit-any
async function checkRateLimit(supabase: any, usuarioId: string): Promise<boolean> {
  const ventana = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString()
  try {
    // Lee actual
    const { data: existente } = await supabase
      .from('rate_limits_imports')
      .select('contador')
      .eq('usuario_id', usuarioId)
      .eq('ventana_minuto', ventana)
      .maybeSingle()
    const actual = existente?.contador ?? 0
    if (actual >= RATE_LIMIT_POR_MINUTO) return false
    // Upsert incremento
    await supabase
      .from('rate_limits_imports')
      .upsert(
        { usuario_id: usuarioId, ventana_minuto: ventana, contador: actual + 1 },
        { onConflict: 'usuario_id,ventana_minuto' }
      )
    return true
  } catch {
    // En caso de error de tabla (no migrada aún) permitimos el request para no bloquear.
    return true
  }
}

// Descarga el PDF del bucket privado planos_tmp y lo devuelve en base64.
// Solo permite paths del usuario autenticado: <userId>/<filename>.
// deno-lint-ignore no-explicit-any
async function descargarDesdeStorage(supabase: any, path: string, usuarioId: string): Promise<string | null> {
  if (!path.startsWith(`${usuarioId}/`)) return null
  try {
    const { data, error } = await supabase.storage.from('planos_tmp').download(path)
    if (error || !data) return null
    const buf = new Uint8Array(await (data as Blob).arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!)
    return btoa(bin)
  } catch {
    return null
  }
}

async function callGeminiConReintentos(
  apiKey: string,
  requestBody: string
): Promise<{ response: Response | null; modeloUsado: string; intentos: number }> {
  let intentosTotales = 0
  let ultimaResp: Response | null = null
  for (const modelo of MODELOS) {
    for (const pausa of PAUSAS_MS) {
      if (pausa > 0) await new Promise((r) => setTimeout(r, pausa))
      intentosTotales++
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: requestBody,
          }
        )
        if (resp.ok) return { response: resp, modeloUsado: modelo, intentos: intentosTotales }
        // 503/429 = reintentar mismo modelo. 5xx/otros → saltar al siguiente modelo
        ultimaResp = resp
        if (resp.status !== 503 && resp.status !== 429) break
      } catch {
        // red falló: reintentar
      }
    }
  }
  return { response: ultimaResp, modeloUsado: MODELOS[MODELOS.length - 1]!, intentos: intentosTotales }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function parseJsonResponse(text: string): { items?: unknown[] } | null {
  const attempts = [
    () => JSON.parse(text),
    () => {
      const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
      return fenced ? JSON.parse(fenced[1]) : null
    },
    () => {
      const braced = text.match(/\{[\s\S]+\}/)
      return braced ? JSON.parse(braced[0]) : null
    },
  ]
  for (const attempt of attempts) {
    try {
      const out = attempt()
      if (out) return out
    } catch { /* next */ }
  }
  return null
}

function sanitizeItems(raw: unknown): ItemExtraido[] {
  if (!Array.isArray(raw)) return []
  const valid: ItemExtraido[] = []
  const fuentesValidas = new Set(['etiqueta', 'tabla', 'leyenda', 'otro'])
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) continue
    const o = r as Record<string, unknown>
    const codigo = typeof o.codigo === 'string' ? o.codigo.trim() : ''
    const cantidad = Number(o.cantidad)
    const confianza = Number(o.confianza)
    const pagina = Number.isFinite(Number(o.pagina)) ? Number(o.pagina) : 1
    const fuente = fuentesValidas.has(String(o.fuente)) ? (o.fuente as ItemExtraido['fuente']) : 'otro'
    if (!codigo || !Number.isFinite(cantidad) || cantidad <= 0) continue
    valid.push({
      codigo,
      cantidad: Math.round(cantidad),
      fuente,
      pagina,
      confianza: Number.isFinite(confianza) ? Math.max(0, Math.min(1, confianza)) : 0.5,
    })
  }
  return valid
}

async function logAudit(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('imports_planos').insert(row)
  } catch { /* audit failures don't break response */ }
}

// ── Gemini extraction wrapper ─────────────────────────────────

interface GeminiResult {
  items: ItemExtraido[]
  apiError?: string
  apiStatus?: number
}

async function extraerConGemini(
  apiKey: string,
  systemPrompt: string,
  archivoBase64: string,
  userPrompt: string,
  auditBase: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  t0: number
): Promise<GeminiResult> {
  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'application/pdf', data: archivoBase64 } },
          { text: userPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: MAX_TOKENS,
      responseMimeType: 'application/json',
    },
  })

  const { response: geminiResp, modeloUsado, intentos } = await callGeminiConReintentos(
    apiKey,
    requestBody
  )
  auditBase.modelo = modeloUsado
  auditBase.intentos = intentos

  if (!geminiResp || !geminiResp.ok) {
    const errText = geminiResp ? await geminiResp.text() : 'sin_respuesta'
    const status = geminiResp?.status ?? 0
    await logAudit(supabase, {
      ...auditBase,
      error: `gemini_${status}: ${errText.slice(0, 500)}`,
      duracion_ms: Date.now() - t0,
    })
    return { items: [], apiError: errText.slice(0, 500), apiStatus: status }
  }

  const data = await geminiResp.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return { items: [] }

  const parsed = parseJsonResponse(text)
  return { items: sanitizeItems(parsed?.items) }
}

// ── RAG Helper Functions ──────────────────────────────────────

function generarResumenPlano(items: ItemExtraido[], nombreArchivo: string): string {
  const estructuras = items.filter(i => !esCable(i.codigo))
  const cables = items.filter(i => esCable(i.codigo))
  const familias = new Set(estructuras.map(i => i.codigo.replace(/[-#].*$/, '')))
  const parts: string[] = [
    `Plano: ${nombreArchivo}`,
    `${estructuras.length} estructuras, ${cables.length} cables`,
    `Familias: ${[...familias].slice(0, 15).join(', ')}`,
  ]
  if (estructuras.length > 0) {
    parts.push(`Codigos: ${estructuras.slice(0, 20).map(i => `${i.codigo} x${i.cantidad}`).join(', ')}`)
  }
  if (cables.length > 0) {
    parts.push(`Cables: ${cables.slice(0, 10).map(i => `${i.codigo} ${i.cantidad}m`).join(', ')}`)
  }
  return parts.join('. ')
}

function esCable(codigo: string): boolean {
  return /^(AAAC|TPX|URD|TRIPLEX|NEUTRO|PVC|THW)/i.test(codigo.trim())
}

async function generarEmbedding(texto: string, apiKey: string): Promise<number[] | null> {
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'models/embedding-001',
          content: { parts: [{ text: texto.slice(0, 2000) }] },
          taskType: 'RETRIEVAL_DOCUMENT',
        }),
      }
    )
    if (!resp.ok) return null
    const data = await resp.json()
    return data?.embedding?.values ?? null
  } catch {
    return null
  }
}

interface EjemploRAG {
  resumen: string
  items_clean: unknown
  similarity: number
}

async function buscarEjemplosSimilares(
  embedding: number[],
  supabase: ReturnType<typeof createClient>
): Promise<EjemploRAG[]> {
  try {
    const { data, error } = await supabase.rpc('match_embeddings_mt', {
      query_embedding: JSON.stringify(embedding),
      match_count: 3,
      match_threshold: 0.75,
    })
    if (error || !data) return []
    return (data as EjemploRAG[]).filter(e => e.similarity > 0.75)
  } catch {
    return []
  }
}

function construirPromptConRAG(ejemplos: EjemploRAG[]): string {
  if (ejemplos.length === 0) return ''
  const lines = [
    '\n=== EJEMPLOS DE PLANOS SIMILARES (RAG) ===',
    '\nLos siguientes planos son similares al actual. Usa sus items como REFERENCIA, pero NO copies ciegamente.',
  ]
  for (let i = 0; i < ejemplos.length; i++) {
    const e = ejemplos[i]!
    const itemsArr = Array.isArray(e.items_clean) ? e.items_clean : []
    const itemsStr = itemsArr
      .slice(0, 15)
      .map((it: Record<string, unknown>) => `${it.codigo} x${it.cantidad}`)
      .join(', ')
    lines.push(`\n--- Ejemplo ${i + 1} (similitud: ${e.similarity.toFixed(2)}) ---`)
    lines.push(`Resumen: ${e.resumen}`)
    if (itemsStr) lines.push(`Items: ${itemsStr}`)
  }
  return lines.join('\n')
}

function normalizarCodigoEdge(codigo: string): string {
  let n = codigo.trim().toUpperCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
  // Familia espacio numero a guion
  n = n.replace(/^(\d*\s*)(MT|MTA|BT|PR|PT|TR|TRA|HA|AP|LB|PO|HAV|HPV|MCH|MAD|PC|PH|SF|SP|CV|CE|SO|CSM|DV)\s+(\d)/g, '$1$2-$3')
  // Cable hash spacing
  n = n.replace(/#\s+/g, '#')
  n = n.replace(/#\//g, '#')
  return n
}

function procesarItemsPostGemini(items: ItemExtraido[]): ItemExtraido[] {
  const FAMILIAS = /^(HAV|HPV|MCH|PC|PM|MAD|MT|MTA|MTAF|BT|LB|PR|PT|AP|TR|TRA|PO|HA|PH|AN|DV|SS|S[1-9]|L[1-9]|CV|CE|SF|SO|SP|F[1-9]|CSA|CDA|C45|EA|EC|ET|FV|VV|AL|SU|SV|SVAF|DE|POAC|CSM)/
  const CABLES = /^(AAAC|TPX|URD|TRIPLEX|NEUTRO|PVC|THW)/i

  const valid = items
    .map(item => ({
      ...item,
      codigo: normalizarCodigoEdge(item.codigo),
      cantidad: Math.max(1, Math.round(item.cantidad)),
    }))
    .filter(item => {
      const code = item.codigo
      if (FAMILIAS.test(code)) return true
      if (CABLES.test(code)) return true
      if (/-(MT|BT)$/.test(code)) return true
      return false
    })

  // Agrupar por codigo
  const acc = new Map<string, ItemExtraido>()
  for (const item of valid) {
    const key = item.codigo
    const prev = acc.get(key)
    if (prev) {
      prev.cantidad += item.cantidad
      prev.confianza = Math.max(prev.confianza, item.confianza)
    } else {
      acc.set(key, { ...item })
    }
  }
  return [...acc.values()]
}

async function guardarEnDataset(
  supabase: ReturnType<typeof createClient>,
  hash: string,
  items: ItemExtraido[],
  resumen: string,
  embedding: number[]
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('training_embeddings_mt')
      .select('id')
      .eq('hash_sha256', hash)
      .maybeSingle()
    if (existing) return // Already stored
    await supabase.from('training_embeddings_mt').insert({
      hash_sha256: hash,
      resumen,
      embedding: JSON.stringify(embedding),
      items_clean: items.map(i => ({ codigo: i.codigo, cantidad: i.cantidad, fuente: i.fuente })),
    })
  } catch { /* non-blocking */ }
}
