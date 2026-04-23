import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ExportPDFOptions, Proyecto, MaterialConsolidado, ManoObraLinea, EmpresaConfig } from '@/types'
import { formatRD, resumenPresupuesto } from '@/utils/calculos'

// ─── Paleta unificada ─────────────────────────────────────────────────────────
const C = {
  primary:   [37, 99, 235]   as [number, number, number], // Blue-600
  primary2:  [29, 78, 216]   as [number, number, number], // Blue-700 (header oscuro)
  accent:    [99, 102, 241]  as [number, number, number], // Indigo-500
  dark:      [15, 23, 42]    as [number, number, number], // Slate-900
  text:      [30, 41, 59]    as [number, number, number], // Slate-800
  muted:     [71, 85, 105]   as [number, number, number], // Slate-600
  light:     [241, 245, 249] as [number, number, number], // Slate-100
  border:    [203, 213, 225] as [number, number, number], // Slate-300
  white:     [255, 255, 255] as [number, number, number],
  green:     [21, 128, 61]   as [number, number, number],
  greenBg:   [220, 252, 231] as [number, number, number],
  blueBg:    [219, 234, 254] as [number, number, number], // Blue-100
}

const PAGE_W = 210
const MARGIN = 14

// ─── Helper: dibujar rectángulo redondeado ─────────────────────────────────
function roundedRect(
  doc: jsPDF,
  x: number, y: number,
  w: number, h: number,
  r: number,
  fillColor: [number, number, number]
): void {
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
  doc.roundedRect(x, y, w, h, r, r, 'F')
}

// ─── Header principal con logo + empresa ──────────────────────────────────
function dibujarEncabezado(
  doc: jsPDF,
  proyecto: Proyecto,
  titulo: string,
  empresa?: EmpresaConfig
): number {
  const pageW = doc.internal.pageSize.width

  // Franja superior azul oscura
  doc.setFillColor(C.primary2[0], C.primary2[1], C.primary2[2])
  doc.rect(0, 0, pageW, 28, 'F')

  // ── Logo (si existe) ──────────────────────────────────────────
  let logoEndX = MARGIN
  if (empresa?.logoBase64) {
    try {
      doc.addImage(empresa.logoBase64, 'PNG', MARGIN, 4, 20, 20)
      logoEndX = MARGIN + 24
    } catch { /* logo inválido */ }
  }

  // ── Nombre empresa ────────────────────────────────────────────
  const nombreEmpresa = empresa?.nombre || 'MT Presupuestos SIE'
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.white[0], C.white[1], C.white[2])
  doc.text(nombreEmpresa, logoEndX + 2, 13)

  // Sub-datos empresa (RNC / Tel / Dirección)
  const subTexts: string[] = []
  if (empresa?.rnc) subTexts.push(`RNC: ${empresa.rnc}`)
  if (empresa?.telefono) subTexts.push(`Tel: ${empresa.telefono}`)
  if (empresa?.email) subTexts.push(empresa.email)
  if (subTexts.length > 0) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 220, 255)
    doc.text(subTexts.join('  ·  '), logoEndX + 2, 21)
  }
  if (empresa?.direccion) {
    doc.setFontSize(7)
    doc.text(empresa.direccion, logoEndX + 2, 26)
  }

  // ── Número de página en la franja ─────────────────────────────
  doc.setFontSize(8)
  doc.setTextColor(200, 220, 255)
  const fechaHoy = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(fechaHoy, pageW - MARGIN, 14, { align: 'right' })

  // ── Sección de título del documento ──────────────────────────
  let y = 40

  // Título del reporte
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.primary2[0], C.primary2[1], C.primary2[2])
  doc.text(titulo.toUpperCase(), MARGIN, y)

  // Línea decorativa bajo el título
  doc.setDrawColor(C.primary[0], C.primary[1], C.primary[2])
  doc.setLineWidth(0.8)
  doc.line(MARGIN, y + 3, MARGIN + 60, y + 3)

  y += 12

  // ── Caja de información del proyecto ─────────────────────────
  const boxH = 28
  roundedRect(doc, MARGIN, y, pageW - MARGIN * 2, boxH, 3, C.light)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])

  // Columna izquierda
  const col1 = MARGIN + 4
  const col2 = col1 + 28
  const col3 = 120
  const col4 = col3 + 22
  const row1 = y + 9
  const row2 = y + 18

  doc.text('PROYECTO:', col1, row1)
  doc.text('CLIENTE:', col1, row2)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.text[0], C.text[1], C.text[2])
  doc.text(proyecto.nombre.substring(0, 50), col2, row1)
  doc.text(proyecto.cliente.substring(0, 50), col2, row2)

  // Columna derecha
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text('ESTADO:', col3, row1)
  doc.text('TENSIÓN:', col3, row2)
  
  // Badge de estado
  const estado = (proyecto.estado || 'borrador').toUpperCase()
  const estadoColor = estado === 'APROBADO' ? C.green : estado === 'RECHAZADO' ? [180, 40, 40] as [number,number,number] : C.muted
  doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2])
  doc.text(estado, col4, row1)

  // Tensión
  doc.setTextColor(C.text[0], C.text[1], C.text[2])
  doc.text(proyecto.voltaje || 'N/A', col4, row2)

  // Fecha (esquina derecha de la caja)
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Fecha: ${proyecto.fecha}`, pageW - MARGIN - 4, row1, { align: 'right' })

  return y + boxH + 8
}

// ─── Pie de página ────────────────────────────────────────────────────────
function dibujarPie(doc: jsPDF, empresa?: EmpresaConfig): void {
  const pageCount = doc.getNumberOfPages()
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    // Línea divisoria
    doc.setDrawColor(C.border[0], C.border[1], C.border[2])
    doc.setLineWidth(0.3)
    doc.line(MARGIN, pageH - 15, pageW - MARGIN, pageH - 15)
    // Texto izquierda
    doc.setFontSize(7)
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
    doc.setFont('helvetica', 'normal')
    const firma = empresa?.nombre || 'MT Presupuestos SIE'
    doc.text(`© ${firma} — Documento generado electrónicamente`, MARGIN, pageH - 8)
    // Texto derecha
    doc.text(`Pág. ${i} / ${pageCount}`, pageW - MARGIN, pageH - 8, { align: 'right' })
  }
}

// ─── Tabla de partidas ────────────────────────────────────────────────────
function agregarTablaPartidas(
  doc: jsPDF,
  proyecto: Proyecto,
  startY: number,
  manoObra: ManoObraLinea[] = []
): number {
  const partidas = proyecto.partidas ?? []
  const resumen = resumenPresupuesto(partidas, {
    porcentajeOverhead: 0, // overhead ya aplicado silenciosamente en los precios
    aplicarITBIS: proyecto.aplicar_itbis,
  })
  const totalMO = manoObra.reduce((acc, m) => acc + m.subtotal, 0)

  // Título de sección
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.primary[0], C.primary[1], C.primary[2])
  doc.text('\u25b8  DESGLOSE DE PARTIDAS', MARGIN, startY)
  startY += 4

  autoTable(doc, {
    startY,
    head: [['#', 'ESTRUCTURA / PARTIDA', 'CANT.', 'COSTO UNIT. (RD$)', 'SUBTOTAL (RD$)']],
    body: partidas.map((p, i) => [
      i + 1,
      p.estructura,
      p.cantidad,
      formatRD(p.precio_unitario),
      formatRD(p.total),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 5,
    },
    alternateRowStyles: { fillColor: C.blueBg },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: C.text,
      lineColor: C.border,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 40 },
      4: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
    },
  })

  let finalY = (doc as any).lastAutoTable.finalY + 10

  // ── Bloque de resumen financiero ───────────────────────────────
  const boxW = 90
  const boxX = PAGE_W - MARGIN - boxW
  let boxY = finalY
  const lineH = 8

  const filas: { label: string; value: string; last?: boolean; green?: boolean }[] = [
    { label: 'SUBTOTAL MATERIALES', value: formatRD(resumen.subtotal) },
  ]
  if (resumen.montoITBIS > 0)
    filas.push({ label: 'ITBIS (18%)', value: formatRD(resumen.montoITBIS) })
  filas.push({ label: 'TOTAL MATERIALES', value: formatRD(resumen.total), last: !totalMO })
  if (totalMO > 0) {
    filas.push({ label: 'MANO DE OBRA', value: formatRD(totalMO) })
    filas.push({ label: 'TOTAL COMBINADO', value: formatRD(resumen.total + totalMO), last: true, green: true })
  }

  // Caja de fondo
  roundedRect(doc, boxX - 2, boxY - 4, boxW + 4, filas.length * lineH + 14, 3, C.light)

  filas.forEach((f, idx) => {
    const fy = boxY + idx * lineH
    if (f.last) {
      // Franja total
      const fillColor = f.green ? [22, 163, 74] as [number,number,number] : C.primary
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
      doc.rect(boxX - 2, fy - 1, boxW + 4, lineH + 4, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(C.white[0], C.white[1], C.white[2])
      doc.text(f.label, boxX + 2, fy + 5)
      doc.text(f.value, PAGE_W - MARGIN - 2, fy + 5, { align: 'right' })
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
      doc.text(f.label, boxX + 2, fy + 4)
      doc.setTextColor(C.text[0], C.text[1], C.text[2])
      doc.text(f.value, PAGE_W - MARGIN - 2, fy + 4, { align: 'right' })
    }
  })

  return finalY + filas.length * lineH + 20
}

// ─── Tabla de materiales ──────────────────────────────────────────────────
function agregarTablaMateriales(doc: jsPDF, materiales: MaterialConsolidado[], startY: number): number {
  const total = materiales.reduce((acc, m) => acc + m.subtotal, 0)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.primary[0], C.primary[1], C.primary[2])
  doc.text('▸  CONSOLIDADO DE MATERIALES', MARGIN, startY)
  startY += 4

  autoTable(doc, {
    startY,
    head: [['CÓDIGO', 'DESCRIPCIÓN DEL MATERIAL', 'UNIDAD', 'CANTIDAD', 'PRECIO UNIT.', 'VALORIZACIÓN']],
    body: materiales.map((m) => [
      m.codigo,
      m.descripcion,
      m.unidad,
      m.cantidadTotal.toLocaleString(),
      formatRD(m.precioUnitario),
      formatRD(m.subtotal),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    alternateRowStyles: { fillColor: C.blueBg },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      textColor: C.text,
      lineColor: C.border,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 6

  // Total
  roundedRect(doc, MARGIN, finalY, PAGE_W - MARGIN * 2, 11, 2, C.primary)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.white[0], C.white[1], C.white[2])
  doc.text('TOTAL MATERIALES', MARGIN + 4, finalY + 7.5)
  doc.text(formatRD(total), PAGE_W - MARGIN - 4, finalY + 7.5, { align: 'right' })

  return finalY + 18
}

// ─── Tabla de mano de obra (agrupada por estructura) ──────────────────────
function agregarTablaManoObra(doc: jsPDF, manoObra: ManoObraLinea[], startY: number): number {
  const total = manoObra.reduce((acc, m) => acc + m.subtotal, 0)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.primary[0], C.primary[1], C.primary[2])
  doc.text('▸  MANO DE OBRA POR ESTRUCTURA', MARGIN, startY)
  startY += 4

  // Group by estructura
  const grouped: Record<string, ManoObraLinea[]> = {}
  manoObra.forEach(m => {
    const key = m.estructura || 'SIN ESTRUCTURA'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  })

  // Build table body with structure sub-headers
  const body: any[][] = []
  Object.entries(grouped).forEach(([estName, items]) => {
    const subtotalEst = items.reduce((a, m) => a + m.subtotal, 0)
    // Structure header row (merged across all columns visually via styling)
    body.push([
      { content: `⬥  ${estName}  (${items.length} ${items.length === 1 ? 'actividad' : 'actividades'} · ×${items[0]?.cantidad || 1})`, colSpan: 5, styles: { fillColor: [230, 237, 255] as [number, number, number], textColor: C.primary, fontStyle: 'bold' as const, fontSize: 7.5, cellPadding: 4 } },
      { content: formatRD(subtotalEst), styles: { fillColor: [230, 237, 255] as [number, number, number], textColor: C.primary, fontStyle: 'bold' as const, fontSize: 7.5, halign: 'right' as const, cellPadding: 4 } },
    ])
    // Item rows
    items.forEach(m => {
      body.push([
        m.categoria,
        m.descripcion,
        m.unidad,
        m.cantidad,
        formatRD(m.precioUnitario),
        formatRD(m.subtotal),
      ])
    })
  })

  autoTable(doc, {
    startY,
    head: [['CATEGORÍA', 'ACTIVIDAD / DESCRIPCIÓN', 'UNIDAD', 'CANT.', 'PRECIO UNITARIO', 'SUBTOTAL']],
    body,
    theme: 'striped',
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    alternateRowStyles: { fillColor: C.blueBg },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      textColor: C.text,
      lineColor: C.border,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', textColor: C.muted },
      1: { cellWidth: 62 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 6

  // Total
  roundedRect(doc, MARGIN, finalY, PAGE_W - MARGIN * 2, 11, 2, C.primary)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.white[0], C.white[1], C.white[2])
  doc.text('TOTAL MANO DE OBRA', MARGIN + 4, finalY + 7.5)
  doc.text(formatRD(total), PAGE_W - MARGIN - 4, finalY + 7.5, { align: 'right' })

  return finalY + 18
}

// ─── Función principal ────────────────────────────────────────────────────
export async function exportarPDF({
  proyecto,
  tipo,
  materialesConsolidados,
  manoObra = [],
  empresa,
}: ExportPDFOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  if (tipo === 'presupuesto' || tipo === 'completo') {
    const y = dibujarEncabezado(doc, proyecto, 'Presupuesto Comercial', empresa)
    agregarTablaPartidas(doc, proyecto, y, manoObra)
  }

  if (tipo === 'materiales') {
    const y = dibujarEncabezado(doc, proyecto, 'Lista de Materiales', empresa)
    agregarTablaMateriales(doc, materialesConsolidados, y)
  }

  if (tipo === 'mano_obra') {
    const y = dibujarEncabezado(doc, proyecto, 'Mano de Obra por Estructura', empresa)
    agregarTablaManoObra(doc, manoObra, y)
  }

  if (tipo === 'completo') {
    doc.addPage()
    const y1 = dibujarEncabezado(doc, proyecto, 'Anexo I: Lista de Materiales', empresa)
    agregarTablaMateriales(doc, materialesConsolidados, y1)

    if (manoObra.length > 0) {
      doc.addPage()
      const y2 = dibujarEncabezado(doc, proyecto, 'Anexo II: Mano de Obra', empresa)
      agregarTablaManoObra(doc, manoObra, y2)
    }
  }

  dibujarPie(doc, empresa)
  const filename = `${tipo}-${proyecto.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf`
  doc.save(filename)
}
