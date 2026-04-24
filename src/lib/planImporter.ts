import type { EstructuraDB, Partida } from '@/types'

export type FuenteExtraccion = 'etiqueta' | 'tabla' | 'leyenda' | 'otro'

export interface ItemExtraido {
  codigo: string
  cantidad: number
  confianza: number
  fuente: FuenteExtraccion
  pagina: number
}

export interface CandidatoMatch {
  estructura: EstructuraDB
  score: number
}

export interface MatchResult {
  matched: { item: ItemExtraido; estructura: EstructuraDB }[]
  ambiguous: { item: ItemExtraido; candidatos: CandidatoMatch[] }[]
  unmatched: ItemExtraido[]
}

export interface ItemConfirmado {
  estructura: string
  cantidad: number
  precio_unitario: number
}

export interface MergeResult {
  partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
  nuevas: number
  sumadas: number
}

const UMBRAL_AMBIGUO = 0.6
const TOP_CANDIDATOS = 5

// ─── Normalización ────────────────────────────────────────────────────────────

export function normalizarCodigo(codigo: string): string {
  return codigo
    .trim()
    .toUpperCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
}

// Normalización "dura" para exact-match con variantes: quita sufijos de estado
// sin paréntesis (RET, REUB, ABIERTO, ENCOF.) y zero-padea el último segmento
// de códigos de poste (HAV-500-9 → HAV-500-09). Conserva paréntesis y su contenido
// porque "MT-301 (55-5)" es una variante distinta de "MT-301 (55-6)".
export function codigoCanonico(codigo: string): string {
  let n = normalizarCodigo(codigo)
  // Quita sufijos de estado sin paréntesis
  n = n.replace(/\s+(RET|REUB|ENCOF\.?|ABIERTO)\b/gi, '')
  // Quita paréntesis que contengan solo sufijos de estado o (E)/(P)
  n = n.replace(/\s*\((?:E|P|RET|REUB|ENCOF\.?|ABIERTO)\)/gi, '')
  n = n.replace(/\s+/g, ' ').trim()
  // Normaliza postes: HAV-500-9 → HAV-500-09
  n = n.replace(/^(HAV|HPV|MCH)-(\d{3})-(\d)$/, '$1-$2-0$3')
  return n
}

// Extrae el código base SIE desde un nombre (plan o catálogo descriptivo).
// Ejemplos:
//   "TE-MONT CV4 - MT Cruc. 6 VOLADIZO CRUCETA DOBLE" → "CV4-MT"
//   "TE-MONT 3Ø ALIN CON ANG HASTA 5º(MT-301)"        → "MT-301"
//   "TE-MONT (F1 - MT) Nº(2/0 - 4/0)"                 → "F1-MT"
//   "TE-MONT (HA - 106)"                              → "HA-106"
//   "MT-301 (55-5)"                                    → "MT-301"
//   "HAV-500-10"                                       → "HAV-500-10"
//   "HAV-300-9"                                        → "HAV-300-09"
//   "MTA-303(ABIERTO)"                                 → "MTA-303"
//   "AP-103 REUB"                                      → "AP-103"
export function extraerCodigoBase(nombre: string): string {
  // Normaliza conservando paréntesis (pueden contener el código)
  let texto = nombre.trim().toUpperCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ')

  const patrones: RegExp[] = [
    // Postes hormigón: HAV-500-12, HPV-800-10, MCH-500-14
    /\b(HAV|HPV|MCH)-\d{3}-\d{1,2}\b/,
    // Armados con sufijo -MT o -BT: CV4-MT, F3-MT, F6-BT, EA-MT, etc.
    /\b(CV[1-9]|CE[1-9]|SF[1-9]|SO[1-9]|SP[1-9]|F[1-9]|CSA|CDA|C45|EA|EC|ET|FV|VV|AL|SU|SV|SVAF|DE|AN|POAC)-(MT|BT|S1|D1)\b/,
    // Armados numerados con dash: MT-301, MTA-305, BT-104, PR-101, PT-101, AP-103, LB-608, TR-105, TRA-106, PO-110
    /\b(MTA?|BT|LB|PR|PT|PTLB|PT1|AP|TRA?|PO)-\d{3}[A-Z]?\b/,
    // Anclajes HA-100B, HA-106 (case-insensitive already via upper)
    /\bHA-\d{3}[A-Z]?\b/,
    // SS1, SS2 sin dash
    /\bSS[1-9]\b/,
  ]

  for (const p of patrones) {
    const m = texto.match(p)
    if (m) {
      let base = m[0].replace(/\s+/g, '')
      // Zero-pad postes
      base = base.replace(/^(HAV|HPV|MCH)-(\d{3})-(\d)$/, '$1-$2-0$3')
      return base
    }
  }

  // Fallback: si el texto ya parece código limpio y corto
  const compacto = texto.replace(/\s*\([^)]*\)/g, '').trim()
  if (/^[A-Z0-9]+(-[A-Z0-9]+)+$/.test(compacto) && compacto.length <= 20) {
    return compacto
  }

  return texto
}

export function consolidarItems(items: ItemExtraido[]): ItemExtraido[] {
  const acc = new Map<string, ItemExtraido>()
  for (const item of items) {
    const key = normalizarCodigo(item.codigo)
    const prev = acc.get(key)
    if (prev) {
      prev.cantidad += item.cantidad
      prev.confianza = Math.max(prev.confianza, item.confianza)
    } else {
      acc.set(key, { ...item, codigo: key })
    }
  }
  return [...acc.values()]
}

// ─── Similaridad ──────────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const prev: number[] = []
  const curr: number[] = []
  for (let j = 0; j <= a.length; j++) prev[j] = j
  for (let i = 1; i <= b.length; i++) {
    curr[0] = i
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= a.length; j++) prev[j] = curr[j]
  }
  return prev[a.length]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// ─── Matching ─────────────────────────────────────────────────────────────────

interface CatalogoIndexado {
  porCanonico: Map<string, EstructuraDB>
  porBase: Map<string, EstructuraDB[]>
  lista: EstructuraDB[]
}

function indexarCatalogo(catalogo: EstructuraDB[]): CatalogoIndexado {
  const porCanonico = new Map<string, EstructuraDB>()
  const porBase = new Map<string, EstructuraDB[]>()
  for (const est of catalogo) {
    const canon = codigoCanonico(est.estructura)
    if (!porCanonico.has(canon)) porCanonico.set(canon, est)
    const base = extraerCodigoBase(est.estructura)
    if (base) {
      const arr = porBase.get(base)
      if (arr) arr.push(est)
      else porBase.set(base, [est])
    }
  }
  return { porCanonico, porBase, lista: catalogo }
}

export function matchContraCatalogo(
  items: ItemExtraido[],
  catalogo: EstructuraDB[]
): MatchResult {
  const idx = indexarCatalogo(catalogo)

  const matched: MatchResult['matched'] = []
  const ambiguous: MatchResult['ambiguous'] = []
  const unmatched: MatchResult['unmatched'] = []

  for (const item of items) {
    const normal = normalizarCodigo(item.codigo)
    const canon = codigoCanonico(item.codigo)
    const base = extraerCodigoBase(item.codigo)

    // 1. Match exacto canónico
    const exacto = idx.porCanonico.get(canon)
    if (exacto) {
      matched.push({ item: { ...item, codigo: normal }, estructura: exacto })
      continue
    }

    // 2. Match por código base
    const porBase = base ? idx.porBase.get(base) : undefined
    if (porBase && porBase.length === 1) {
      matched.push({ item: { ...item, codigo: normal }, estructura: porBase[0]! })
      continue
    }
    if (porBase && porBase.length > 1) {
      // Todos los candidatos comparten el mismo código base: alta confianza
      ambiguous.push({
        item: { ...item, codigo: normal },
        candidatos: porBase.slice(0, TOP_CANDIDATOS).map((e) => ({ estructura: e, score: 0.95 })),
      })
      continue
    }

    // 3. Match fuzzy como último recurso, comparando contra código base de cada entrada
    const candidatos = idx.lista
      .map((est) => {
        const estBase = extraerCodigoBase(est.estructura)
        const scoreBase = similarity(base, estBase)
        const scoreCanon = similarity(canon, codigoCanonico(est.estructura))
        return { estructura: est, score: Math.max(scoreBase, scoreCanon) }
      })
      .filter((c) => c.score >= UMBRAL_AMBIGUO)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_CANDIDATOS)

    if (candidatos.length > 0) {
      ambiguous.push({ item: { ...item, codigo: normal }, candidatos })
    } else {
      unmatched.push({ ...item, codigo: normal })
    }
  }

  return { matched, ambiguous, unmatched }
}

// ─── Merge con partidas existentes ────────────────────────────────────────────

export function mergeConPartidas(
  partidasActuales: Omit<Partida, 'id' | 'proyecto_id'>[],
  itemsConfirmados: ItemConfirmado[]
): MergeResult {
  const partidas = partidasActuales.map((p) => ({ ...p }))
  let nuevas = 0
  let sumadas = 0

  for (const item of itemsConfirmados) {
    const claveImport = normalizarCodigo(item.estructura)
    const idx = partidas.findIndex(
      (p) => normalizarCodigo(p.estructura) === claveImport
    )
    if (idx >= 0) {
      const existente = partidas[idx]!
      const cantidadNueva = Number(existente.cantidad) + item.cantidad
      partidas[idx] = {
        ...existente,
        cantidad: cantidadNueva,
        total: cantidadNueva * Number(existente.precio_unitario),
      }
      sumadas++
    } else {
      partidas.push({
        estructura: item.estructura,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        total: item.cantidad * item.precio_unitario,
      })
      nuevas++
    }
  }

  return { partidas, nuevas, sumadas }
}
