import { useState, useRef, useMemo } from 'react'
import { useMiSuscripcion, usePlanes, useMisPagos, useCrearPago } from '@/hooks/useSuscripcion'
import { usePerfil } from '@/hooks/usePerfil'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { generarFacturaPDF } from '@/utils/facturaPDF'
import {
  Check, Upload, CreditCard, Clock, Zap, Crown, ArrowRight,
  Copy, CheckCircle2, Download, Landmark, DollarSign, RefreshCw,
} from 'lucide-react'
import styles from './Suscripcion.module.css'

// ─── Bank data ───────────────────────────────────────────────────────────────
const BANCOS = [
  { id: 'reservas', nombre: 'Banco de Reservas', cuenta: '9601750827', code: 'BDR' },
  { id: 'bhd',      nombre: 'Banco BHD',         cuenta: '38675820016', code: 'BHD' },
  { id: 'santacruz', nombre: 'Banco Santa Cruz', cuenta: '11145000018017', code: 'BSC' },
] as const

type BancoId = typeof BANCOS[number]['id']

const PRECIO_USD = 5

function generarReferencia(bancoCode: string): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `MT-${yy}${mm}${dd}-${bancoCode}-${rand}`
}

export default function Suscripcion() {
  const { data: suscripcion, isLoading: loadingSub } = useMiSuscripcion()
  const { data: planes, isLoading: loadingPlanes } = usePlanes()
  const { data: pagos, isLoading: loadingPagos } = useMisPagos()
  const { data: perfil } = usePerfil()
  const crearPagoMut = useCrearPago()
  const { rate: tasaCambio, isLoading: loadingRate } = useExchangeRate()

  const [showForm, setShowForm] = useState(false)
  const [selectedBanco, setSelectedBanco] = useState<BancoId | null>(null)
  const [voucherFile, setVoucherFile] = useState<File | null>(null)
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const planActual = suscripcion?.plan
  const uso = suscripcion?.uso
  const planPro = planes?.find(p => p.nombre === 'Pro')

  const bancoSeleccionado = useMemo(
    () => BANCOS.find(b => b.id === selectedBanco) ?? null,
    [selectedBanco]
  )

  const referencia = useMemo(
    () => bancoSeleccionado ? generarReferencia(bancoSeleccionado.code) : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedBanco]
  )

  const montoDOP = useMemo(
    () => Math.round(PRECIO_USD * tasaCambio * 100) / 100,
    [tasaCambio]
  )

  const fechaHoy = new Date().toISOString().split('T')[0]

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleVoucherChange = (file: File | null) => {
    setVoucherFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setVoucherPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setVoucherPreview(null)
    }
  }

  const handleSubmitPago = async () => {
    if (!planPro || !bancoSeleccionado) return
    try {
      await crearPagoMut.mutateAsync({
        formData: {
          banco: bancoSeleccionado.nombre,
          referencia,
          fecha_pago: fechaHoy,
          monto: montoDOP,
        },
        plan_id: planPro.id,
        voucherFile,
      })
      toast({ title: 'Pago enviado', description: 'Tu pago está pendiente de revisión. Te notificaremos cuando sea aprobado.' })
      setVoucherFile(null)
      setVoucherPreview(null)
      setSelectedBanco(null)
      setShowForm(false)
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar el pago. Intenta de nuevo.', variant: 'destructive' })
    }
  }

  const handleDescargarFactura = (pago: {
    id: string
    monto: number
    banco: string | null
    referencia: string | null
    fecha_pago: string | null
    plan_nombre: string
  }) => {
    const banco = BANCOS.find(b => b.nombre === pago.banco)
    generarFacturaPDF({
      clienteNombre: perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Cliente',
      clienteEmail: perfil?.email ?? '',
      banco: pago.banco ?? 'N/A',
      numeroCuenta: banco?.cuenta ?? 'N/A',
      referencia: pago.referencia ?? 'N/A',
      fechaPago: pago.fecha_pago ?? new Date().toISOString(),
      montoUSD: PRECIO_USD,
      montoDOP: pago.monto,
      tasaCambio: pago.monto / PRECIO_USD,
      planNombre: pago.plan_nombre,
      pagoId: pago.id,
    })
  }

  const getUsagePercent = (used: number, limit: number | null) => {
    if (limit === null || limit === 0) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageClass = (percent: number) => {
    if (percent >= 100) return styles.usageFillFull
    if (percent >= 80) return styles.usageFillWarning
    return ''
  }

  if (loadingSub || loadingPlanes) {
    return (
      <div>
        <h1 className={styles.pageTitle}>Mi Plan</h1>
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Mi Plan</h1>

      {/* Plan actual */}
      <div className={styles.planCard}>
        <div className={styles.planHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={planActual?.nombre === 'Pro' ? styles.planIconPro : styles.planIconGratis}>
              {planActual?.nombre === 'Pro' ? <Crown size={22} /> : <Zap size={22} />}
            </div>
            <div>
              <span className={styles.planName}>Plan {planActual?.nombre ?? 'Sin plan'}</span>
              <span className={`${styles.badge} ${planActual?.nombre === 'Pro' ? styles.badgePro : styles.badgeGratis}`}>
                {planActual?.nombre === 'Pro' ? 'Activo' : 'Limitado'}
              </span>
            </div>
          </div>
          {planActual?.nombre === 'Gratis' && (
            <button className={styles.btnUpgrade} onClick={() => setShowForm(true)}>
              <Crown size={16} /> Mejorar a Pro <ArrowRight size={14} />
            </button>
          )}
        </div>

        {uso && (
          <div className={styles.usageSection}>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>Proyectos</span>
              <div className={styles.usageBar}>
                <div
                  className={`${styles.usageFill} ${getUsageClass(getUsagePercent(uso.proyectos_usados, uso.proyectos_limite))}`}
                  style={{ width: `${uso.proyectos_limite ? getUsagePercent(uso.proyectos_usados, uso.proyectos_limite) : 0}%` }}
                />
              </div>
              <span className={styles.usageText}>
                {uso.proyectos_usados} / {uso.proyectos_limite ?? 'Ilimitado'}
              </span>
            </div>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>Importaciones</span>
              <div className={styles.usageBar}>
                <div
                  className={`${styles.usageFill} ${getUsageClass(getUsagePercent(uso.imports_usados, uso.imports_limite))}`}
                  style={{ width: `${uso.imports_limite ? getUsagePercent(uso.imports_usados, uso.imports_limite) : 0}%` }}
                />
              </div>
              <span className={styles.usageText}>
                {uso.imports_usados} / {uso.imports_limite ?? 'Ilimitado'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Comparacion de planes */}
      <h2 className={styles.sectionTitle}>Planes Disponibles</h2>
      <div className={styles.plansGrid}>
        {planes?.map(plan => {
          const isCurrent = planActual?.id === plan.id
          const isPro = plan.nombre === 'Pro'
          return (
            <div
              key={plan.id}
              className={`${styles.planOption} ${isCurrent ? styles.planOptionCurrent : ''} ${isPro && !isCurrent ? styles.planOptionHighlight : ''}`}
            >
              {isPro && !isCurrent && <div className={styles.recommendedTag}>Recomendado</div>}
              {isCurrent && <span className={styles.currentTag}>Plan Actual</span>}
              <div className={styles.planOptionIcon}>
                {isPro ? <Crown size={28} /> : <Zap size={28} />}
              </div>
              <div className={styles.planOptionName}>{plan.nombre}</div>
              <div className={styles.planOptionPrice}>
                {isPro ? (
                  <>US${PRECIO_USD}<span>/mes</span></>
                ) : plan.precio_mensual > 0 ? (
                  <>RD${plan.precio_mensual.toLocaleString()}<span>/mes</span></>
                ) : (
                  <>RD$0<span>/siempre</span></>
                )}
              </div>
              <div className={styles.planDivider} />
              <ul className={styles.featureList}>
                <li className={styles.featureItem}>
                  <Check size={16} className={styles.featureIcon} />
                  {plan.limite_proyectos ? `${plan.limite_proyectos} proyectos` : 'Proyectos ilimitados'}
                </li>
                <li className={styles.featureItem}>
                  <Check size={16} className={styles.featureIcon} />
                  {plan.limite_imports ? `${plan.limite_imports} importaciones` : 'Importaciones ilimitadas'}
                </li>
                <li className={styles.featureItem}>
                  <Check size={16} className={styles.featureIcon} />
                  Exportar PDF
                </li>
                {isPro && (
                  <>
                    <li className={styles.featureItem}>
                      <Check size={16} className={styles.featureIcon} />
                      Soporte prioritario
                    </li>
                    <li className={styles.featureItem}>
                      <Check size={16} className={styles.featureIcon} />
                      Sin limites de uso
                    </li>
                  </>
                )}
              </ul>
              {isPro && !isCurrent ? (
                <button className={styles.btnUpgrade} onClick={() => setShowForm(true)}>
                  <Crown size={16} /> Mejorar a Pro <ArrowRight size={14} />
                </button>
              ) : isCurrent ? (
                <div className={styles.currentPlanBtn}>
                  <Check size={16} /> Tu plan actual
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* ═══════ Formulario de pago renovado ═══════ */}
      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>
            <CreditCard size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Pagar Suscripción Pro
          </h2>

          {/* ── Precio panel ───────────────────────────────────── */}
          <div className={styles.pricePanel}>
            <div className={styles.pricePanelMain}>
              <DollarSign size={28} className={styles.pricePanelIcon} />
              <div>
                <div className={styles.pricePanelUsd}>US$ {PRECIO_USD}.00 <span>/mes</span></div>
                <div className={styles.pricePanelDop}>
                  {loadingRate ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <RefreshCw size={14} className="animate-spin" /> Calculando...
                    </span>
                  ) : (
                    <>≈ RD$ {montoDOP.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.pricePanelRate}>
              Tasa: 1 USD = {tasaCambio.toFixed(2)} DOP
            </div>
          </div>

          {/* ── Selección de banco ─────────────────────────────── */}
          <p className={styles.stepLabel}>1. Selecciona tu banco para transferir</p>
          <div className={styles.bankCards}>
            {BANCOS.map(banco => (
              <button
                key={banco.id}
                type="button"
                className={`${styles.bankCard} ${selectedBanco === banco.id ? styles.bankCardSelected : ''}`}
                onClick={() => setSelectedBanco(banco.id)}
              >
                <div className={styles.bankCardIcon}>
                  <Landmark size={22} />
                </div>
                <div className={styles.bankCardName}>{banco.nombre}</div>
                <div className={styles.bankCardAccount}>{banco.cuenta}</div>
                {selectedBanco === banco.id && (
                  <div className={styles.bankCardCheck}>
                    <CheckCircle2 size={20} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* ── Detalles de transferencia ──────────────────────── */}
          {bancoSeleccionado && (
            <>
              <p className={styles.stepLabel}>2. Realiza la transferencia con estos datos</p>
              <div className={styles.transferDetails}>
                <div className={styles.transferRow}>
                  <span className={styles.transferLabel}>Banco</span>
                  <span className={styles.transferValue}>{bancoSeleccionado.nombre}</span>
                </div>
                <div className={styles.transferRow}>
                  <span className={styles.transferLabel}>No. de Cuenta</span>
                  <div className={styles.transferCopyRow}>
                    <span className={styles.transferValueMono}>{bancoSeleccionado.cuenta}</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(bancoSeleccionado.cuenta, 'cuenta')}
                    >
                      {copiedField === 'cuenta' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className={styles.transferRow}>
                  <span className={styles.transferLabel}>Referencia</span>
                  <div className={styles.transferCopyRow}>
                    <span className={styles.transferValueMono}>{referencia}</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(referencia, 'referencia')}
                    >
                      {copiedField === 'referencia' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className={styles.transferRow}>
                  <span className={styles.transferLabel}>Monto a Transferir</span>
                  <span className={styles.transferValueHighlight}>
                    RD$ {montoDOP.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={styles.transferRow}>
                  <span className={styles.transferLabel}>Fecha</span>
                  <span className={styles.transferValue}>
                    {new Date(fechaHoy).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* ── Voucher upload ─────────────────────────────── */}
              <p className={styles.stepLabel}>3. Sube tu comprobante de transferencia</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleVoucherChange(e.target.files?.[0] ?? null)}
              />
              <div
                className={`${styles.dropzone} ${voucherFile ? styles.dropzoneActive : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleVoucherChange(e.dataTransfer.files[0] ?? null)
                }}
              >
                {voucherPreview ? (
                  <img src={voucherPreview} alt="Voucher" className={styles.dropzonePreview} />
                ) : (
                  <>
                    <Upload size={24} style={{ margin: '0 auto 0.5rem' }} />
                    <div>Arrastra tu comprobante o haz clic para seleccionar</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>JPG, PNG o WebP (max 10MB)</div>
                  </>
                )}
              </div>

              {/* ── Actions ───────────────────────────────────── */}
              <div className={styles.formActions}>
                <button type="button" className={styles.btnOutline} onClick={() => { setShowForm(false); setSelectedBanco(null) }}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.btnUpgrade}
                  disabled={crearPagoMut.isPending || !voucherFile}
                  onClick={handleSubmitPago}
                >
                  {crearPagoMut.isPending ? (
                    <>Enviando...</>
                  ) : (
                    <><CreditCard size={16} /> Confirmar Pago</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Historial de pagos */}
      <div className={styles.planCard}>
        <h2 className={styles.sectionTitle}>
          <Clock size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Historial de Pagos
        </h2>
        {loadingPagos ? (
          <Skeleton className="h-32 w-full" />
        ) : !pagos?.length ? (
          <div className={styles.emptyState}>No tienes pagos registrados</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Plan</th>
                  <th>Monto</th>
                  <th>Banco</th>
                  <th>Referencia</th>
                  <th>Estado</th>
                  <th>Factura</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(pago => (
                  <tr key={pago.id}>
                    <td>{new Date(pago.creado_en).toLocaleDateString('es-DO')}</td>
                    <td>{pago.plan_nombre}</td>
                    <td>RD${pago.monto.toLocaleString()}</td>
                    <td>{pago.banco ?? '-'}</td>
                    <td><span className={styles.refCode}>{pago.referencia ?? '-'}</span></td>
                    <td>
                      <span className={`${styles.badge} ${
                        pago.estado === 'aprobado' ? styles.badgeAprobado :
                        pago.estado === 'rechazado' ? styles.badgeRechazado :
                        styles.badgePendiente
                      }`}>
                        {pago.estado}
                      </span>
                    </td>
                    <td>
                      {pago.estado === 'aprobado' ? (
                        <button
                          type="button"
                          className={styles.invoiceBtn}
                          onClick={() => handleDescargarFactura(pago)}
                          title="Descargar factura PDF"
                        >
                          <Download size={14} /> PDF
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Soporte y Políticas */}
      <div className={styles.supportBox}>
        <div className={styles.supportIcon}>📞</div>
        <div>
          <h3>¿Necesitas ayuda con tu facturación?</h3>
          <p>
            Contáctanos vía WhatsApp o llamada al <strong>(829) 436-3538</strong>.
            <br />
            <span style={{ opacity: 0.85, fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
              * La facturación del plan Pro es mensual a partir de la primera aprobación. Si para el siguiente mes no se ha registrado un pago válido, el plan se cancelará automáticamente y volverás a los privilegios limitados hasta que se confirme un nuevo pago.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
