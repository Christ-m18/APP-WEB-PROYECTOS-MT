import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number }
}

interface FacturaData {
  clienteNombre: string
  clienteEmail: string
  banco: string
  numeroCuenta: string
  referencia: string
  fechaPago: string
  montoUSD: number
  montoDOP: number
  tasaCambio: number
  planNombre: string
  pagoId: string
}

// Palette matching app style
const C = {
  primary:  [37, 99, 235]   as [number, number, number],
  primary2: [29, 78, 216]   as [number, number, number],
  accent:   [99, 102, 241]  as [number, number, number],
  dark:     [15, 23, 42]    as [number, number, number],
  text:     [30, 41, 59]    as [number, number, number],
  muted:    [71, 85, 105]   as [number, number, number],
  light:    [241, 245, 249] as [number, number, number],
  border:   [203, 213, 225] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  green:    [21, 128, 61]   as [number, number, number],
  greenBg:  [220, 252, 231] as [number, number, number],
}

const MARGIN = 14

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

export function generarFacturaPDF(data: FacturaData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height

  // ─── Header bar ──────────────────────────────────────────────
  doc.setFillColor(C.primary2[0], C.primary2[1], C.primary2[2])
  doc.rect(0, 0, pageW, 32, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.white[0], C.white[1], C.white[2])
  doc.text('MT Presupuestos SIE', MARGIN, 15)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 220, 255)
  doc.text('Sistema de Ingeniería Eléctrica — Presupuestos de Media Tensión', MARGIN, 22)
  doc.text('info@mtpresupuestos.com', MARGIN, 28)

  // FACTURA label on the right
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.white[0], C.white[1], C.white[2])
  doc.text('FACTURA', pageW - MARGIN, 18, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(200, 220, 255)
  doc.text(`No. ${data.pagoId.substring(0, 8).toUpperCase()}`, pageW - MARGIN, 26, { align: 'right' })

  // ─── Invoice metadata ────────────────────────────────────────
  let y = 44

  // Left: Bill To
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text('FACTURADO A:', MARGIN, y)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.text[0], C.text[1], C.text[2])
  doc.text(data.clienteNombre, MARGIN, y + 7)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text(data.clienteEmail, MARGIN, y + 13)

  // Right: Invoice details
  const rightCol = pageW - MARGIN
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])

  const metaLabels = ['FECHA:', 'REFERENCIA:', 'ESTADO:']
  const fechaFormateada = new Date(data.fechaPago).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const metaValues = [fechaFormateada, data.referencia, 'PAGADO']

  metaLabels.forEach((label, i) => {
    const yRow = y + i * 7
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
    doc.text(label, rightCol - 50, yRow)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(C.text[0], C.text[1], C.text[2])
    if (label === 'ESTADO:') {
      doc.setTextColor(C.green[0], C.green[1], C.green[2])
      doc.setFont('helvetica', 'bold')
    }
    doc.text(metaValues[i], rightCol, yRow, { align: 'right' })
  })

  // ─── Divider ─────────────────────────────────────────────────
  y += 28
  doc.setDrawColor(C.border[0], C.border[1], C.border[2])
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, pageW - MARGIN, y)

  // ─── Items table ─────────────────────────────────────────────
  y += 6

  const montoDOPFormatted = `RD$ ${data.montoDOP.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const montoUSDFormatted = `US$ ${data.montoUSD.toFixed(2)}`

  autoTable(doc, {
    startY: y,
    head: [['#', 'CONCEPTO', 'CANT.', 'PRECIO (USD)', 'TOTAL (RD$)']],
    body: [
      ['1', `Suscripción ${data.planNombre} — Mensual`, '1', montoUSDFormatted, montoDOPFormatted],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 6,
    },
    alternateRowStyles: { fillColor: [245, 248, 255] as [number, number, number] },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: C.text,
      lineColor: C.border,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 80 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
    },
  })

  const tableEndY = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 8

  // ─── Totals box ──────────────────────────────────────────────
  const boxW = 100
  const boxX = pageW - MARGIN - boxW
  let bY = tableEndY

  // Exchange rate info
  roundedRect(doc, boxX, bY, boxW, 12, 2, C.light)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text('Tasa de cambio aplicada:', boxX + 4, bY + 5)
  doc.setFont('helvetica', 'bold')
  doc.text(`1 USD = ${data.tasaCambio.toFixed(2)} DOP`, boxX + boxW - 4, bY + 5, { align: 'right' })

  doc.text('Precio en USD:', boxX + 4, bY + 10)
  doc.text(montoUSDFormatted, boxX + boxW - 4, bY + 10, { align: 'right' })

  bY += 16

  // Total
  roundedRect(doc, boxX, bY, boxW, 14, 2, C.primary)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.white[0], C.white[1], C.white[2])
  doc.text('TOTAL', boxX + 4, bY + 9)
  doc.text(montoDOPFormatted, boxX + boxW - 4, bY + 9, { align: 'right' })

  bY += 24

  // ─── Payment info section ───────────────────────────────────
  roundedRect(doc, MARGIN, bY, pageW - MARGIN * 2, 28, 3, C.light)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(C.primary[0], C.primary[1], C.primary[2])
  doc.text('INFORMACIÓN DE PAGO', MARGIN + 6, bY + 7)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(C.text[0], C.text[1], C.text[2])

  const paymentInfo = [
    `Banco: ${data.banco}`,
    `Cuenta: ${data.numeroCuenta}`,
    `Referencia: ${data.referencia}`,
    `Fecha: ${fechaFormateada}`,
  ]

  paymentInfo.forEach((info, i) => {
    const col = i < 2 ? MARGIN + 6 : MARGIN + 100
    const row = i % 2 === 0 ? bY + 15 : bY + 22
    doc.text(info, col, row)
  })

  // ─── Aviso legal corto ───────────────────────────────────────
  const avisoY = bY + 6
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  const avisoLegal = doc.splitTextToSize(
    'AVISO LEGAL: Esta factura tiene carácter informativo y se emite tras la verificación manual del pago. Si requiere comprobante fiscal especial (NCF, retenciones, RNC), debe solicitarlo previamente al equipo del operador. Los pagos efectuados no son reembolsables salvo duplicidad de cobro acreditada o error imputable al operador. Para consultas: info@mtpresupuestos.com.',
    pageW - MARGIN * 2,
  ) as string[]
  avisoLegal.forEach((line, idx) => {
    doc.text(line, MARGIN, avisoY + idx * 3.5)
  })

  // ─── Footer ──────────────────────────────────────────────────
  doc.setDrawColor(C.border[0], C.border[1], C.border[2])
  doc.setLineWidth(0.3)
  doc.line(MARGIN, pageH - 22, pageW - MARGIN, pageH - 22)

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text(
    'Documento referencial. Verifique los datos con el operador antes de cualquier reclamación.',
    pageW / 2,
    pageH - 17,
    { align: 'center' },
  )

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2])
  doc.text('© MT Presupuestos SIE — Documento generado electrónicamente', MARGIN, pageH - 10)

  const fechaGeneracion = new Date().toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Generado: ${fechaGeneracion}`, pageW - MARGIN, pageH - 10, { align: 'right' })

  // ─── Save ────────────────────────────────────────────────────
  const safeName = data.referencia.replace(/[^a-zA-Z0-9-]/g, '')
  doc.save(`factura-${safeName}.pdf`)
}
