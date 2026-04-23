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

const UMBRAL_AMBIGUO = 0.7
const TOP_CANDIDATOS = 5

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, ' ')
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

export function matchContraCatalogo(
  items: ItemExtraido[],
  catalogo: EstructuraDB[]
): MatchResult {
  const catalogoIndex = new Map<string, EstructuraDB>()
  for (const est of catalogo) {
    catalogoIndex.set(normalizarCodigo(est.estructura), est)
  }

  const matched: MatchResult['matched'] = []
  const ambiguous: MatchResult['ambiguous'] = []
  const unmatched: MatchResult['unmatched'] = []

  for (const item of items) {
    const normalizado = normalizarCodigo(item.codigo)
    const exact = catalogoIndex.get(normalizado)
    if (exact) {
      matched.push({ item: { ...item, codigo: normalizado }, estructura: exact })
      continue
    }

    const candidatos = catalogo
      .map((est) => ({
        estructura: est,
        score: similarity(normalizado, normalizarCodigo(est.estructura)),
      }))
      .filter((c) => c.score >= UMBRAL_AMBIGUO)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_CANDIDATOS)

    if (candidatos.length > 0) {
      ambiguous.push({ item: { ...item, codigo: normalizado }, candidatos })
    } else {
      unmatched.push({ ...item, codigo: normalizado })
    }
  }

  return { matched, ambiguous, unmatched }
}

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
