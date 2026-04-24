import type { ManoObraRow, Partida, ResumenPresupuesto } from '@/types'

export function totalPartida(cantidad: number, precioUnitario: number): number {
  return cantidad * precioUnitario
}

export function subtotal(partidas: Partida[]): number {
  return partidas.reduce((acc, p) => acc + (p.total ?? (Number(p.cantidad) * Number(p.precio_unitario))), 0)
}

export function calcularITBIS(base: number, pct = 0.18): number {
  return base * pct
}

export interface ResumenOptions {
  porcentajeOverhead?: number
  aplicarITBIS?: boolean
}

export function resumenPresupuesto(
  partidas: Partida[],
  options: ResumenOptions = {}
): ResumenPresupuesto {
  const { porcentajeOverhead = 0, aplicarITBIS = false } = options
  const sub = Number(subtotal(partidas)) || 0
  const overheadPct = Number(porcentajeOverhead) || 0
  const costoOverhead = sub * (overheadPct / 100)
  const baseITBIS = sub + costoOverhead
  const montoITBIS = aplicarITBIS ? calcularITBIS(baseITBIS) : 0
  const total = baseITBIS + montoITBIS

  return {
    subtotal: sub,
    costoOverhead,
    baseITBIS,
    montoITBIS,
    total,
    porcentajeOverhead,
    aplicarITBIS,
  }
}

export function formatRD(valor: number | null | undefined): string {
  const num = Number(valor)
  if (isNaN(num)) return 'RD$ 0.00'
  return `RD$ ${num.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function calcularTotalProyecto(
  partidas: Partida[],
  todaManoObra: ManoObraRow[],
  overheadPct: number,
  aplicarITBIS: boolean
): number {
  const { total: totalPartidas } = resumenPresupuesto(partidas, {
    porcentajeOverhead: overheadPct,
    aplicarITBIS
  })

  let totalMOBase = 0
  partidas.forEach(p => {
    if (!p.estructura) return
    const moForEst = todaManoObra.filter(m => m.estructura === p.estructura)
    moForEst.forEach(mo => {
      totalMOBase += (Number(p.cantidad) || 1) * Number(mo.precio)
    })
  })

  // MO overhead (sin ITBIS, en RD el ITBIS suele aplicar a materiales en este contexto, o bien el usuario reportó que la suma es excesiva por esto)
  const moOverhead = totalMOBase * (overheadPct / 100)
  const totalMOFinal = totalMOBase + moOverhead

  return totalPartidas + totalMOFinal
}
