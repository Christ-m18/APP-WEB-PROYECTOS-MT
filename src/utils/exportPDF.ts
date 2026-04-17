import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ExportPDFOptions, Proyecto, MaterialConsolidado } from '@/types'
import { formatRD, resumenPresupuesto } from '@/utils/calculos'

// Colores de la marca para el PDF
const COLORS = {
  primary: [37, 99, 235] as [number, number, number], // #2563eb
  text: [30, 41, 59] as [number, number, number],    // #1e293b
  muted: [100, 116, 139] as [number, number, number], // #64748b
  border: [226, 232, 240] as [number, number, number] // #e2e8f0
}

function dibujarEncabezado(doc: jsPDF, proyecto: Proyecto, titulo: string): number {
  // Logo / Nombre de la empresa
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.text('⚡ MT Presupuestos SIE', 14, 20)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2])
  doc.text('Soluciones de Ingeniería Eléctrica', 14, 25)

  // Título del Reporte
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text(titulo.toUpperCase(), 14, 40)

  // Información del Proyecto (Cajas de datos)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMACIÓN DEL PROYECTO', 14, 50)
  
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.line(14, 52, 200, 52)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2])
  doc.text('PROYECTO:', 14, 60)
  doc.text('CLIENTE:', 14, 66)
  doc.text('FECHA:', 14, 72)

  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.setFont('helvetica', 'bold')
  doc.text(proyecto.nombre, 40, 60)
  doc.text(proyecto.cliente, 40, 66)
  doc.text(proyecto.fecha, 40, 72)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2])
  doc.text('TENSIÓN:', 130, 60)
  doc.text('ESTADO:', 130, 66)

  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.setFont('helvetica', 'bold')
  doc.text(proyecto.voltaje || 'N/A', 150, 60)
  doc.text((proyecto.estado || 'borrador').toUpperCase(), 150, 66)

  return 80
}

function dibujarPie(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2])
    const fecha = new Date().toLocaleDateString()
    doc.text(
      `Generado el ${fecha} — MT Presupuestos SIE`,
      14,
      doc.internal.pageSize.height - 10
    )
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    )
  }
}

function agregarTablaPartidas(doc: jsPDF, proyecto: Proyecto, startY: number): number {
  const partidas = proyecto.partidas ?? []
  const resumen = resumenPresupuesto(partidas, {
    porcentajeOverhead: proyecto.overhead,
    aplicarITBIS: proyecto.aplicar_itbis,
  })

  autoTable(doc, {
    startY,
    head: [['#', 'ESTRUCTURA / PARTIDA', 'CANT.', 'COSTO UNIT.', 'SUBTOTAL']],
    body: partidas.map((p, i) => [
      i + 1,
      p.estructura,
      p.cantidad,
      formatRD(p.precio_unitario),
      formatRD(p.total),
    ]),
    theme: 'striped',
    headStyles: { 
      fillColor: COLORS.primary,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 8,
      cellPadding: 4,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
    }
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Resumen Financiero
  const marginX = 130
  doc.setFontSize(9)
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2])
  doc.text('SUBTOTAL MATERIALES:', marginX, finalY)
  doc.text(formatRD(resumen.subtotal), 200, finalY, { align: 'right' })

  let currentY = finalY + 6
  if (resumen.costoOverhead > 0) {
    doc.text(`OVERHEAD (${resumen.porcentajeOverhead}%):`, marginX, currentY)
    doc.text(formatRD(resumen.costoOverhead), 200, currentY, { align: 'right' })
    currentY += 6
  }

  if (resumen.montoITBIS > 0) {
    doc.text('ITBIS (18%):', marginX, currentY)
    doc.text(formatRD(resumen.montoITBIS), 200, currentY, { align: 'right' })
    currentY += 6
  }

  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.setLineWidth(0.5)
  doc.line(marginX, currentY, 200, currentY)
  
  currentY += 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.text('TOTAL PRESUPUESTO:', marginX, currentY)
  doc.text(formatRD(resumen.total), 200, currentY, { align: 'right' })

  return currentY + 20
}

function agregarTablaMateriales(
  doc: jsPDF,
  materiales: MaterialConsolidado[],
  startY: number
): number {
  const totalMateriales = materiales.reduce((acc, m) => acc + m.subtotal, 0)

  autoTable(doc, {
    startY,
    head: [['CÓDIGO', 'DESCRIPCIÓN', 'UNIDAD', 'CANT.', 'VALORIZACIÓN']],
    body: materiales.map((m) => [
      m.codigo,
      m.descripcion,
      m.unidad,
      m.cantidadTotal.toLocaleString(),
      formatRD(m.subtotal),
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [51, 65, 85], // Slate 700
      fontSize: 8,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 7,
      cellPadding: 3,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 35 }
    }
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text('RESUMEN DE MATERIALES:', 14, finalY)
  doc.text(formatRD(totalMateriales), 200, finalY, { align: 'right' })

  return finalY + 10
}

export async function exportarPDF({
  proyecto,
  tipo,
  materialesConsolidados,
}: ExportPDFOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  if (tipo === 'presupuesto' || tipo === 'completo') {
    const y = dibujarEncabezado(doc, proyecto, 'Presupuesto Comercial')
    agregarTablaPartidas(doc, proyecto, y)
  }

  if (tipo === 'materiales') {
    const y = dibujarEncabezado(doc, proyecto, 'Consolidado de Materiales')
    agregarTablaMateriales(doc, materialesConsolidados, y)
  }

  if (tipo === 'completo') {
    doc.addPage()
    const y = dibujarEncabezado(doc, proyecto, 'Anexo: Detalle de Materiales')
    agregarTablaMateriales(doc, materialesConsolidados, y)
  }

  dibujarPie(doc)
  const filename = `${tipo}-${proyecto.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf`
  doc.save(filename)
}
