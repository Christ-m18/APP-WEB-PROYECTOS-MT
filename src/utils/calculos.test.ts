import { describe, it, expect } from 'vitest'
import {
  totalPartida,
  subtotal,
  calcularITBIS,
  resumenPresupuesto,
  formatRD,
} from '@/utils/calculos'
import type { Partida } from '@/types'

const p = (cantidad: number, precioUnitario: number): Partida => ({
  estructura: 'TEST',
  cantidad,
  precio_unitario: precioUnitario,
  total: cantidad * precioUnitario,
})

describe('totalPartida', () => {
  it('multiplies cantidad by precio', () => {
    expect(totalPartida(3, 1000)).toBe(3000)
  })
  it('returns 0 when cantidad is 0', () => {
    expect(totalPartida(0, 5000)).toBe(0)
  })
  it('handles decimal prices', () => {
    expect(totalPartida(2, 1500.5)).toBeCloseTo(3001)
  })
})

describe('subtotal', () => {
  it('sums all partidas totals', () => {
    expect(subtotal([p(2, 1000), p(3, 500)])).toBe(3500)
  })
  it('returns 0 for empty array', () => {
    expect(subtotal([])).toBe(0)
  })
  it('handles single partida', () => {
    expect(subtotal([p(5, 200)])).toBe(1000)
  })
})

describe('calcularITBIS', () => {
  it('returns 18% of base by default', () => {
    expect(calcularITBIS(10000)).toBe(1800)
  })
  it('uses custom percentage', () => {
    expect(calcularITBIS(10000, 0.16)).toBe(1600)
  })
  it('returns 0 for 0 base', () => {
    expect(calcularITBIS(0)).toBe(0)
  })
})

describe('resumenPresupuesto', () => {
  const partidas = [p(2, 5000), p(1, 3000)]
  // subtotal = 13000

  it('calculates subtotal correctly', () => {
    const r = resumenPresupuesto(partidas)
    expect(r.subtotal).toBe(13000)
  })

  it('applies overhead correctly', () => {
    const r = resumenPresupuesto(partidas, { porcentajeOverhead: 10 })
    expect(r.costoOverhead).toBe(1300)
    expect(r.baseITBIS).toBe(14300)
    expect(r.total).toBe(14300)
  })

  it('applies ITBIS on base + overhead', () => {
    const r = resumenPresupuesto(partidas, { porcentajeOverhead: 10, aplicarITBIS: true })
    expect(r.montoITBIS).toBeCloseTo(2574)
    expect(r.total).toBeCloseTo(16874)
  })

  it('does not apply ITBIS when disabled', () => {
    const r = resumenPresupuesto(partidas, { aplicarITBIS: false })
    expect(r.montoITBIS).toBe(0)
  })

  it('handles empty partidas', () => {
    const r = resumenPresupuesto([])
    expect(r.total).toBe(0)
  })

  it('handles overhead=0', () => {
    const r = resumenPresupuesto(partidas, { porcentajeOverhead: 0 })
    expect(r.costoOverhead).toBe(0)
  })
})

describe('formatRD', () => {
  it('formats currency with RD$ prefix', () => {
    const result = formatRD(1000)
    expect(result).toMatch(/^RD\$/)
  })

  it('includes value in output', () => {
    const result = formatRD(10000)
    expect(result).toContain('10')
  })

  it('formats decimal places', () => {
    const result = formatRD(1234.5)
    expect(result).toContain('1,234.50')
  })
})
