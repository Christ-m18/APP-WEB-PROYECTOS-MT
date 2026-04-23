import { describe, it, expect } from 'vitest'
import {
  normalizarCodigo,
  consolidarItems,
  matchContraCatalogo,
  mergeConPartidas,
  type ItemExtraido,
} from '@/lib/planImporter'
import type { EstructuraDB, Partida } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const item = (
  codigo: string,
  cantidad: number,
  overrides: Partial<ItemExtraido> = {}
): ItemExtraido => ({
  codigo,
  cantidad,
  confianza: 0.9,
  fuente: 'etiqueta',
  pagina: 1,
  ...overrides,
})

const est = (estructura: string, costo = 10000): EstructuraDB => ({
  estructura,
  costo_materiales_rd: costo,
})

const partida = (
  estructura: string,
  cantidad: number,
  precio_unitario: number
): Omit<Partida, 'id' | 'proyecto_id'> => ({
  estructura,
  cantidad,
  precio_unitario,
  total: cantidad * precio_unitario,
})

// ─── normalizarCodigo ─────────────────────────────────────────────────────────

describe('normalizarCodigo', () => {
  it('uppercases and trims', () => {
    expect(normalizarCodigo('  mt-301  ')).toBe('MT-301')
  })
  it('collapses internal whitespace', () => {
    expect(normalizarCodigo('MT-301   (55-5)')).toBe('MT-301 (55-5)')
  })
  it('preserves parenthetical qualifiers', () => {
    expect(normalizarCodigo('mt-301 (55-5)')).toBe('MT-301 (55-5)')
  })
  it('is idempotent', () => {
    const once = normalizarCodigo('mt-301')
    expect(normalizarCodigo(once)).toBe(once)
  })
})

// ─── consolidarItems ──────────────────────────────────────────────────────────

describe('consolidarItems', () => {
  it('sums quantities for repeated codes', () => {
    const result = consolidarItems([
      item('MT-301', 2),
      item('MT-301', 3),
      item('MT-301', 1),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]!.cantidad).toBe(6)
  })

  it('treats case and whitespace variants as the same code', () => {
    const result = consolidarItems([
      item('mt-301', 2),
      item('  MT-301  ', 3),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]!.codigo).toBe('MT-301')
    expect(result[0]!.cantidad).toBe(5)
  })

  it('keeps distinct codes separate', () => {
    const result = consolidarItems([
      item('MT-301', 2),
      item('MT-302', 3),
      item('PR-101', 1),
    ])
    expect(result).toHaveLength(3)
  })

  it('distinguishes codes with different parentheticals', () => {
    const result = consolidarItems([
      item('MT-301 (55-5)', 2),
      item('MT-301 (55-6)', 3),
    ])
    expect(result).toHaveLength(2)
  })

  it('keeps max confidence when consolidating', () => {
    const result = consolidarItems([
      item('MT-301', 1, { confianza: 0.5 }),
      item('MT-301', 1, { confianza: 0.95 }),
    ])
    expect(result[0]!.confianza).toBe(0.95)
  })

  it('returns empty array for empty input', () => {
    expect(consolidarItems([])).toEqual([])
  })
})

// ─── matchContraCatalogo ──────────────────────────────────────────────────────

describe('matchContraCatalogo', () => {
  const catalogo: EstructuraDB[] = [
    est('MT-301', 12000),
    est('MT-302', 14000),
    est('MT-307', 16000),
    est('PR-101', 8000),
    est('HAV-300-9', 22000),
    est('MT-301 (55-5)', 13000),
    est('MT-301 (55-6)', 13500),
  ]

  it('matches exact codes', () => {
    const res = matchContraCatalogo([item('MT-301', 5)], catalogo)
    expect(res.matched).toHaveLength(1)
    expect(res.matched[0]!.estructura.estructura).toBe('MT-301')
    expect(res.ambiguous).toHaveLength(0)
    expect(res.unmatched).toHaveLength(0)
  })

  it('matches case-insensitively', () => {
    const res = matchContraCatalogo([item('mt-301', 5)], catalogo)
    expect(res.matched).toHaveLength(1)
  })

  it('puts near-matches in ambiguous with candidates', () => {
    const res = matchContraCatalogo([item('MT-301 (55)', 3)], catalogo)
    expect(res.matched).toHaveLength(0)
    expect(res.ambiguous).toHaveLength(1)
    const candidatos = res.ambiguous[0]!.candidatos
    expect(candidatos.length).toBeGreaterThan(0)
    expect(candidatos[0]!.estructura.estructura).toMatch(/^MT-301/)
  })

  it('returns unmatched for completely unknown codes', () => {
    const res = matchContraCatalogo([item('ZZZ-999', 1)], catalogo)
    expect(res.unmatched).toHaveLength(1)
    expect(res.matched).toHaveLength(0)
    expect(res.ambiguous).toHaveLength(0)
  })

  it('sorts ambiguous candidates by descending score', () => {
    const res = matchContraCatalogo([item('MT-301 (55-7)', 1)], catalogo)
    const candidatos = res.ambiguous[0]!.candidatos
    for (let i = 1; i < candidatos.length; i++) {
      expect(candidatos[i - 1]!.score).toBeGreaterThanOrEqual(candidatos[i]!.score)
    }
  })

  it('caps candidates at top 5', () => {
    const manyVariants: EstructuraDB[] = Array.from({ length: 20 }, (_, i) =>
      est(`MT-30${i}`, 10000)
    )
    const res = matchContraCatalogo([item('MT-309', 1)], manyVariants)
    const total = res.matched.length + res.ambiguous.reduce((n, a) => n + a.candidatos.length, 0)
    if (res.ambiguous.length > 0) {
      expect(res.ambiguous[0]!.candidatos.length).toBeLessThanOrEqual(5)
    }
    expect(total).toBeLessThanOrEqual(5 + 1)
  })

  it('partitions a mixed batch correctly', () => {
    const items = [
      item('MT-301', 2),
      item('MT-301 (55)', 1),
      item('NONEXISTENT', 1),
    ]
    const res = matchContraCatalogo(items, catalogo)
    expect(res.matched).toHaveLength(1)
    expect(res.ambiguous).toHaveLength(1)
    expect(res.unmatched).toHaveLength(1)
  })
})

// ─── mergeConPartidas ─────────────────────────────────────────────────────────

describe('mergeConPartidas', () => {
  it('appends new partidas when code does not exist', () => {
    const res = mergeConPartidas([], [
      { estructura: 'MT-301', cantidad: 3, precio_unitario: 12000 },
    ])
    expect(res.partidas).toHaveLength(1)
    expect(res.nuevas).toBe(1)
    expect(res.sumadas).toBe(0)
    expect(res.partidas[0]!.total).toBe(36000)
  })

  it('sums cantidad into an existing partida', () => {
    const existente = [partida('MT-301', 2, 12000)]
    const res = mergeConPartidas(existente, [
      { estructura: 'MT-301', cantidad: 5, precio_unitario: 12000 },
    ])
    expect(res.partidas).toHaveLength(1)
    expect(res.partidas[0]!.cantidad).toBe(7)
    expect(res.nuevas).toBe(0)
    expect(res.sumadas).toBe(1)
  })

  it('preserves existing precio_unitario when merging (user edits win)', () => {
    const existente = [partida('MT-301', 2, 15000)] // user's manual price
    const res = mergeConPartidas(existente, [
      { estructura: 'MT-301', cantidad: 3, precio_unitario: 12000 }, // catalog price
    ])
    expect(res.partidas[0]!.precio_unitario).toBe(15000)
    expect(res.partidas[0]!.total).toBe(5 * 15000)
  })

  it('matches existing partidas case-insensitively', () => {
    const existente = [partida('mt-301', 2, 12000)]
    const res = mergeConPartidas(existente, [
      { estructura: 'MT-301', cantidad: 3, precio_unitario: 12000 },
    ])
    expect(res.partidas).toHaveLength(1)
    expect(res.sumadas).toBe(1)
  })

  it('handles a mixed batch of new + existing', () => {
    const existente = [partida('MT-301', 1, 12000), partida('PR-101', 2, 8000)]
    const res = mergeConPartidas(existente, [
      { estructura: 'MT-301', cantidad: 4, precio_unitario: 12000 }, // suma
      { estructura: 'MT-302', cantidad: 2, precio_unitario: 14000 }, // nueva
    ])
    expect(res.partidas).toHaveLength(3)
    expect(res.nuevas).toBe(1)
    expect(res.sumadas).toBe(1)
    const mt301 = res.partidas.find((p) => p.estructura === 'MT-301')!
    expect(mt301.cantidad).toBe(5)
  })

  it('does not mutate the input array', () => {
    const existente = [partida('MT-301', 2, 12000)]
    const snapshot = JSON.parse(JSON.stringify(existente))
    mergeConPartidas(existente, [
      { estructura: 'MT-301', cantidad: 3, precio_unitario: 12000 },
    ])
    expect(existente).toEqual(snapshot)
  })
})
