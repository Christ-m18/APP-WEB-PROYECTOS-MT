// Supabase Edge Function: extract-plano
// Recibe un PDF en base64 y devuelve las estructuras MT detectadas por Claude Vision.
// Deploy: `supabase functions deploy extract-plano`
// Secret requerido: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 8192
const ANTHROPIC_VERSION = '2023-06-01'

const SYSTEM_PROMPT = `Eres un asistente experto en planos eléctricos de media tensión (MT) según la regulación SIE de República Dominicana.

Tu única tarea es extraer TODAS las estructuras MT descritas en el plano PDF adjunto. Las estructuras pueden aparecer en tres formatos dentro del mismo plano (a veces varios simultáneamente):

1. **Etiquetas junto a símbolos** — cada poste o estructura rotulada con su código (ej: "MT-301", "MT-301 (55-5)", "PR-101", "HAV-300-9", "ET-1").
2. **Tablas resumen** — tabla con columnas tipo "Estructura | Cantidad" que totaliza las estructuras del plano.
3. **Leyendas** — sección donde se declaran los símbolos usados, a veces con conteos.

REGLAS ESTRICTAS:
- Si la misma estructura aparece en más de una fuente (ej: 5 etiquetas visibles Y en tabla resumen "5"), cuéntala UNA sola vez. Prefiere el valor de la tabla/leyenda sobre el conteo de etiquetas cuando ambos existen.
- Si solo hay etiquetas (sin tabla resumen), cuenta cada ocurrencia visible.
- Conserva los códigos EXACTAMENTE como aparecen, incluyendo paréntesis y sufijos (ej: "MT-301 (55-5)", no "MT-301").
- No inventes ni infiere códigos no visibles. Si hay una etiqueta borrosa o ilegible, reporta lo que ves con confianza baja.
- Ignora anotaciones que no sean códigos de estructura MT (cotas, nombres de calles, notas generales, flechas de norte).
- Nivel de confianza:
  * 0.95–1.0: código legible y verificable por múltiples fuentes (etiqueta + tabla).
  * 0.7–0.94: código legible pero una sola fuente, o ligeramente impreciso.
  * <0.7: ambigüedad visual o texto parcialmente ilegible.

Responde SIEMPRE y ÚNICAMENTE con JSON válido con este esquema EXACTO, sin markdown, sin texto explicativo:
{
  "items": [
    { "codigo": string, "cantidad": number, "fuente": "etiqueta"|"tabla"|"leyenda"|"otro", "pagina": number, "confianza": number }
  ]
}`

const USER_PROMPT = `Analiza este plano PDF y extrae todas las estructuras MT según las reglas del sistema. Responde solo con el objeto JSON.`

interface RequestBody {
  archivoBase64: string
  nombreArchivo: string
  proyectoId?: string | null
}

interface ItemExtraido {
  codigo: string
  cantidad: number
  fuente: 'etiqueta' | 'tabla' | 'leyenda' | 'otro'
  pagina: number
  confianza: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

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
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'unauthorized' }, 401)

    const body = (await req.json()) as RequestBody
    if (!body.archivoBase64 || typeof body.archivoBase64 !== 'string') {
      return json({ error: 'archivoBase64 requerido' }, 400)
    }
    if (!body.nombreArchivo || typeof body.nombreArchivo !== 'string') {
      return json({ error: 'nombreArchivo requerido' }, 400)
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'server_misconfigured' }, 500)

    const archivoBytes = Math.ceil(body.archivoBase64.length * 0.75)
    auditBase = {
      usuario_id: user.id,
      proyecto_id: body.proyectoId ?? null,
      archivo_nombre: body.nombreArchivo,
      archivo_bytes: archivoBytes,
      modelo: MODEL,
    }

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: body.archivoBase64,
                },
              },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      }),
    })

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text()
      await logAudit(supabase, {
        ...auditBase,
        error: `anthropic_${anthropicResp.status}: ${errText.slice(0, 500)}`,
        duracion_ms: Date.now() - t0,
      })
      return json({ error: 'anthropic_api_error', status: anthropicResp.status }, 502)
    }

    const data = await anthropicResp.json()
    const textBlock = (data.content ?? []).find(
      (b: { type: string }) => b.type === 'text'
    ) as { type: string; text: string } | undefined
    if (!textBlock) {
      await logAudit(supabase, {
        ...auditBase,
        error: 'no_text_block_in_response',
        duracion_ms: Date.now() - t0,
      })
      return json({ error: 'malformed_response' }, 502)
    }

    const parsed = parseJsonResponse(textBlock.text)
    const items = sanitizeItems(parsed?.items)

    await logAudit(supabase, {
      ...auditBase,
      items_extraidos: items,
      tokens_input: data.usage?.input_tokens ?? null,
      tokens_output: data.usage?.output_tokens ?? null,
      duracion_ms: Date.now() - t0,
    })

    return json({ items })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: 'internal_error', detail: msg }, 500)
  }
})

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
    } catch {
      // siguiente estrategia
    }
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
  } catch {
    // audit failures should not break the response
  }
}
