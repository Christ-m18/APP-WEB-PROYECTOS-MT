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

const SYSTEM_PROMPT = `Eres un extractor experto en planos eléctricos de media tensión (MT) y baja tensión (BT) de proyectos EDE/SIE de República Dominicana. Tu tarea es leer el plano PDF adjunto y devolver un inventario JSON con TODAS las estructuras y accesorios que se proponen/instalan, con su cantidad.

=== FAMILIAS DE CÓDIGOS ESPERADOS ===
Estos son los prefijos típicos del catálogo SIE. Extrae TODO código que coincida con estos patrones:

POSTES (siempre cuentan como estructura):
- HAV-XXX-NN  (poste hormigón armado vertical, ej: HAV-300-9, HAV-500-10, HAV-500-12, HAV-800-10)
- HPV-XXX-NN  (poste hormigón pretensado vertical, ej: HPV-500-10, HPV-500-12, HPV-800-12)
- PO-XXX       (ej: PO-110)

ARMADOS MT (montajes de media tensión):
- MT-NNN       (ej: MT-101, MT-105, MT-301, MT-305, MT-307)
- MTA-NNN      (ej: MTA-101, MTA-102, MTA-103, MTA-105, MTA-303, MTA-305)
- CV1-MT, CV2-MT, CV3-MT, CV4-MT  (cruces/crucetas de media tensión)
- CE1-MT, CE2-MT, CE3-MT
- CDA-MT
- EC-MT, EA-MT
- SO1-MT, SO2-MT, SP1-MT, SP2-MT
- F1-MT, F2-MT, F3-MT, F4-MT, F5-MT, F6-MT (cada uno cuenta por separado)
- FV-MT
- SS1, SS2
- PR-101, PR-102, PR-103, PR-202, PR-203  (pararrayos / protecciones)
- PT-101, PT-102                           (puesta a tierra)
- TR-xxx, TRA-xxx, TRA-104, TRA-105, TRA-106  (transformadores tipo poste)

ARMADOS BT (baja tensión):
- BT-NNN       (ej: BT-101, BT-103, BT-104)
- F1-BT, F2-BT, F3-BT, F4-BT, F5-BT, F6-BT
- HA-100B, HA-101, HA-102, HA-104, HA-105, HA-106, HA 100B

OTROS:
- AP-103  (acometida)
- HAV-xxx con sufijos como (RET), (REUB), (ENCOF.), (ABIERTO), (E), (P) — cuenta siempre, conserva el código base (ej: "MT-303" si se ve "MTA-303(ABIERTO)")

=== DÓNDE BUSCAR EN EL PLANO ===

FUENTE "tabla" (PRIORIDAD MÁXIMA):
Busca una tabla titulada "TABLA DE ESTRUCTURAS PROPUESTAS", "LISTA DE ESTRUCTURAS", "BALANCE DE CARGA", "DESPIECE", "LISTADO", etc. Típicamente con columnas como "No. | No. de Poste | Tipo de Poste | Contenido" o "Estructura | Cantidad".
- Si hay tabla, ITERA FILA POR FILA. Por cada fila:
  * El "Tipo de Poste" (ej "HAV-500-10") es 1 item codigo="HAV-500-10" cantidad=1
  * Cada código listado en "Contenido" también es 1 item (ej la fila con "MT-307, BT-104, HA-100B, PR-101" genera 4 items, cantidad=1 cada uno)
  * Si en el contenido hay prefijo numérico (ej "2HA 100B" o "2 MT-305" o "18 F3-MT" o "4 F3-MT"), ese número ES la cantidad de ese código.
- Suma todas las apariciones del mismo código a lo largo de la tabla completa.

FUENTE "etiqueta":
Cajas de texto junto a cada símbolo de poste (rotuladas PE1, PE2, PP1, PP2, etc.). Cada caja lista los códigos que lleva ese poste.
Ejemplo caja PE1:
  HAV-500-12
  CV4-MT(8')
  4 F3-MT
  2 EA-MT
  EC-MT
  F6-BT
  HA-106
  AP-103
→ genera items: HAV-500-12 ×1, CV4-MT ×1, F3-MT ×4, EA-MT ×2, EC-MT ×1, F6-BT ×1, HA-106 ×1, AP-103 ×1

FUENTE "leyenda":
Sección con símbolos y descripciones (ej "LEYENDA ELÉCTRICA"). Úsala solo para interpretar símbolos, NO para contar.

=== REGLAS DE CONTEO ===

1. DEDUPLICA FUENTES: si el mismo inventario aparece tanto en cajas por poste COMO en la "TABLA DE ESTRUCTURAS PROPUESTAS", extrae SOLO desde la tabla (es la más confiable). No sumes las dos fuentes. Si solo hay cajas, usa las cajas. Si solo hay tabla, usa la tabla.
2. AGRUPA POR CÓDIGO NORMALIZADO: al final el JSON debe tener un item por código único, con cantidad = suma total en todo el plano.
3. Prefijos numéricos = cantidad de ese código (ej "2HA 100B" → HA-100B cantidad=2; "18 F3-MT" → F3-MT cantidad=18).
4. Paréntesis con sufijos tipo (E), (P), (REUB), (RET), (ABIERTO), (ENCOF.), (8'): descarta ese sufijo del código (guarda solo el código base; "MTA-303(ABIERTO)" → "MTA-303").
5. IGNORA códigos de cables/conductores (ej "3AAAC#2/0", "TPX#2/0", "URD CU #1/0"), mediciones (ej "46.32Mts"), KVA individuales, coordenadas GPS, nombres de calles, CT's y PT's, coordenadas, sellos.
6. Cuenta TODOS los postes propuestos con su código de poste (HAV-500-10, HPV-500-12, etc.), incluso si aparecen 20+ veces.
7. Si la cantidad de un item llegaría a ser 0 o negativa, OMÍTELO.

=== EJEMPLOS ===

Ejemplo 1 (plano con tabla de estructuras de 59 postes tipo residencial):
Si la tabla tiene 59 filas y cuentas:
- Tipo de poste "HAV-500-10" aparece 15 veces, "HAV-500-12" 20 veces, "HAV-300-9" 24 veces
- En la columna Contenido sumas: MT-307 aparece 2 veces, BT-104 aparece 18 veces, HA-100B aparece 10 veces, PR-101 aparece 30 veces, etc.
Entonces:
{"items": [
  {"codigo":"HAV-500-10","cantidad":15,"fuente":"tabla","pagina":4,"confianza":0.95},
  {"codigo":"HAV-500-12","cantidad":20,"fuente":"tabla","pagina":4,"confianza":0.95},
  {"codigo":"HAV-300-9","cantidad":24,"fuente":"tabla","pagina":4,"confianza":0.95},
  {"codigo":"MT-307","cantidad":2,"fuente":"tabla","pagina":4,"confianza":0.9},
  {"codigo":"BT-104","cantidad":18,"fuente":"tabla","pagina":4,"confianza":0.9},
  ...
]}

Ejemplo 2 (plano de diagrama unifilar con cajas por poste PE1..PE7, sin tabla):
Recorre cada caja y suma. Si PE1 tiene "HAV-500-12, CV4-MT(8'), 4 F3-MT, 2 EA-MT, EC-MT, F6-BT, HA-106, AP-103" y otro poste tiene "HAV-500-12, MTA-305":
{"items": [
  {"codigo":"HAV-500-12","cantidad":2,"fuente":"etiqueta","pagina":1,"confianza":0.9},
  {"codigo":"CV4-MT","cantidad":1,"fuente":"etiqueta","pagina":1,"confianza":0.85},
  {"codigo":"F3-MT","cantidad":4,"fuente":"etiqueta","pagina":1,"confianza":0.9},
  ...
]}

=== SALIDA ===
Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto adicional):
{
  "items": [
    { "codigo": string, "cantidad": number, "fuente": "etiqueta"|"tabla"|"leyenda"|"otro", "pagina": number, "confianza": number }
  ]
}

Si el plano no tiene NINGÚN código reconocible, devuelve {"items": []}. Pero antes de rendirte, revisa de nuevo las tablas, cajas por poste, y diagramas unifilares — los códigos SIE siempre están presentes en planos eléctricos de RD.`

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

    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: archivoBase64 } },
            { text: USER_PROMPT },
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
      const mensaje = status === 503 || status === 429
        ? 'Los modelos de IA están sobrecargados. Intenta de nuevo en 1-2 minutos.'
        : 'Error al invocar Gemini.'
      return json(
        { error: 'gemini_api_error', status, detail: errText.slice(0, 500), mensaje },
        502
      )
    }

    const data = await geminiResp.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      await logAudit(supabase, {
        ...auditBase,
        error: `no_text_in_response: ${JSON.stringify(data).slice(0, 300)}`,
        duracion_ms: Date.now() - t0,
      })
      return json({ error: 'malformed_response' }, 502)
    }

    const parsed = parseJsonResponse(text)
    const items = sanitizeItems(parsed?.items)

    await logAudit(supabase, {
      ...auditBase,
      items_extraidos: items,
      tokens_input: data.usageMetadata?.promptTokenCount ?? null,
      tokens_output: data.usageMetadata?.candidatesTokenCount ?? null,
      duracion_ms: Date.now() - t0,
    })

    return json({ items })
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
