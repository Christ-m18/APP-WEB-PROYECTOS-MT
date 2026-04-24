import { describe, it, expect } from 'vitest'
import {
  normalizarCodigo,
  codigoCanonico,
  extraerCodigoBase,
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
  it('collapses spaces around dashes', () => {
    expect(normalizarCodigo('CV4 - MT')).toBe('CV4-MT')
    expect(normalizarCodigo('F1 -  MT')).toBe('F1-MT')
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

// ─── codigoCanonico ───────────────────────────────────────────────────────────

describe('codigoCanonico', () => {
  it('preserves variant parens (distinct variants stay distinct)', () => {
    expect(codigoCanonico('MT-301 (55-5)')).toBe('MT-301 (55-5)')
    expect(codigoCanonico('MT-301 (55-6)')).toBe('MT-301 (55-6)')
  })
  it('strips state suffixes in parens', () => {
    expect(codigoCanonico('MTA-303(ABIERTO)')).toBe('MTA-303')
    expect(codigoCanonico('HAV-500-10 (E)')).toBe('HAV-500-10')
    expect(codigoCanonico('MTA-102 (P)')).toBe('MTA-102')
  })
  it('normalizes spaces around dashes', () => {
    expect(codigoCanonico('CV4 - MT')).toBe('CV4-MT')
  })
  it('zero-pads single-digit poste codes', () => {
    expect(codigoCanonico('HAV-300-9')).toBe('HAV-300-09')
    expect(codigoCanonico('HPV-500-8')).toBe('HPV-500-08')
  })
  it('keeps two-digit poste codes intact', () => {
    expect(codigoCanonico('HAV-500-12')).toBe('HAV-500-12')
  })
  it('removes state suffixes without parens', () => {
    expect(codigoCanonico('MT-305 RET')).toBe('MT-305')
    expect(codigoCanonico('AP-103 REUB')).toBe('AP-103')
  })
})

// ─── extraerCodigoBase ────────────────────────────────────────────────────────

describe('extraerCodigoBase', () => {
  it('extracts base from short codes with variants', () => {
    expect(extraerCodigoBase('MT-301 (55-5)')).toBe('MT-301')
    expect(extraerCodigoBase('MT-301 (55-6)')).toBe('MT-301')
    expect(extraerCodigoBase('MTA-303 (2/0-4/0)')).toBe('MTA-303')
    expect(extraerCodigoBase('MT-307 (2/0-4/0) C6')).toBe('MT-307')
  })
  it('handles codes with spaces around dashes (DB descriptive format)', () => {
    expect(extraerCodigoBase('CV4 - MT Cruc. 6 VOLADIZO')).toBe('CV4-MT')
    expect(extraerCodigoBase('F1 - MT Nº(2/0 - 4/0)')).toBe('F1-MT')
    expect(extraerCodigoBase('HA - 100B')).toBe('HA-100B')
    expect(extraerCodigoBase('HA - 106')).toBe('HA-106')
  })
  it('handles poste codes', () => {
    expect(extraerCodigoBase('HAV-500-12')).toBe('HAV-500-12')
    expect(extraerCodigoBase('HAV-300-9')).toBe('HAV-300-09')
    expect(extraerCodigoBase('HPV-800-10')).toBe('HPV-800-10')
  })
  it('handles armados BT with description', () => {
    expect(extraerCodigoBase('F1-BT')).toBe('F1-BT')
    expect(extraerCodigoBase('F4-BT    FINAL DE LINEA EN PINZA')).toBe('F4-BT')
    expect(extraerCodigoBase('BT-104')).toBe('BT-104')
  })
  it('strips state suffixes from plan codes', () => {
    expect(extraerCodigoBase('MTA-303(ABIERTO)')).toBe('MTA-303')
    expect(extraerCodigoBase('AP-103 REUB')).toBe('AP-103')
  })
  it('handles anclajes and luminarias', () => {
    expect(extraerCodigoBase('HA-100B')).toBe('HA-100B')
    expect(extraerCodigoBase('AP-103')).toBe('AP-103')
    expect(extraerCodigoBase('AP-104')).toBe('AP-104')
  })
  it('handles protection codes', () => {
    expect(extraerCodigoBase('PR-101')).toBe('PR-101')
    expect(extraerCodigoBase('PT-101 2/0 (1 DV)')).toBe('PT-101')
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
    est('MT-301 (55-5)', 13000),
    est('MT-301 (55-6)', 13500),
    est('MT-302', 14000),
    est('MT-307 (2/0-4/0) C6', 16000),
    est('PR-101', 8000),
    est('HAV-300-9', 22000),
    est('HAV-500-12', 24000),
    est('CV4 - MT Cruc. 6 VOLADIZO', 5000),
    est('CV4 - MT Cruc. 8 VOLADIZO', 5500),
    est('F1 - MT Nº(2/0 - 4/0)', 3000),
    est('HA - 106', 2000),
    est('AP-103', 1800),
  ]

  it('matches plain code to descriptive catalog entry (CV4-MT case)', () => {
    const res = matchContraCatalogo([item('CV4-MT', 3)], catalogo)
    // Two CV4-MT variants exist (6 and 8 ft), so ambiguous
    expect(res.ambiguous).toHaveLength(1)
    const cands = res.ambiguous[0]!.candidatos
    expect(cands.length).toBe(2)
    expect(cands.every((c) => c.estructura.estructura.includes('CV4 - MT'))).toBe(true)
  })

  it('matches "F1-MT" plain code to catalog descriptive name', () => {
    const res = matchContraCatalogo([item('F1-MT', 2)], catalogo)
    expect(res.matched).toHaveLength(1)
    expect(res.matched[0]!.estructura.estructura).toBe('F1 - MT Nº(2/0 - 4/0)')
  })

  it('matches "HA-106" to catalog descriptive name with spaces', () => {
    const res = matchContraCatalogo([item('HA-106', 1)], catalogo)
    expect(res.matched).toHaveLength(1)
    expect(res.matched[0]!.estructura.estructura).toBe('HA - 106')
  })

  it('matches HAV-300-9 across zero-padding variance', () => {
    const res = matchContraCatalogo([item('HAV-300-9', 10)], catalogo)
    expect(res.matched).toHaveLength(1)
    expect(res.matched[0]!.estructura.estructura).toBe('HAV-300-9')
  })

  it('single-entry base match classifies as matched, not ambiguous', () => {
    const res = matchContraCatalogo([item('MT-307', 5)], catalogo)
    expect(res.matched).toHaveLength(1)
    expect(res.matched[0]!.estructura.estructura).toBe('MT-307 (2/0-4/0) C6')
  })

  it('ambiguous when multiple catalog entries share base code', () => {
    const res = matchContraCatalogo([item('MT-301', 4)], catalogo)
    expect(res.ambiguous).toHaveLength(1)
    expect(res.ambiguous[0]!.candidatos).toHaveLength(2)
  })

  it('case-insensitive match', () => {
    const res = matchContraCatalogo([item('mt-302', 1)], catalogo)
    expect(res.matched).toHaveLength(1)
  })

  it('exact match beats ambiguity when bare code exists', () => {
    // MT-302 and PR-101 are bare in catalog, should match exactly
    const res = matchContraCatalogo([item('PR-101', 1), item('MT-302', 2)], catalogo)
    expect(res.matched).toHaveLength(2)
  })

  it('strips status suffixes from plan code', () => {
    const res = matchContraCatalogo([item('AP-103 REUB', 1)], catalogo)
    expect(res.matched).toHaveLength(1)
    expect(res.matched[0]!.estructura.estructura).toBe('AP-103')
  })

  it('unknown code goes to unmatched', () => {
    const res = matchContraCatalogo([item('ZZZ-9999', 1)], catalogo)
    expect(res.unmatched).toHaveLength(1)
  })

  it('partitions mixed batch correctly', () => {
    const items = [
      item('F1-MT', 2),     // matched (single descriptive entry)
      item('MT-301', 1),    // ambiguous (two variants)
      item('ZZZ-999', 1),   // unmatched
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

  it('preserves existing precio_unitario when merging', () => {
    const existente = [partida('MT-301', 2, 15000)]
    const res = mergeConPartidas(existente, [
      { estructura: 'MT-301', cantidad: 3, precio_unitario: 12000 },
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
      { estructura: 'MT-301', cantidad: 4, precio_unitario: 12000 },
      { estructura: 'MT-302', cantidad: 2, precio_unitario: 14000 },
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
