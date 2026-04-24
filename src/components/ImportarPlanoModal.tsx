import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  X,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { useImportarPlano } from '@/hooks/useImportarPlano'
import {
  consolidarItems,
  matchContraCatalogo,
  type ItemConfirmado,
  type ItemExtraido,
  type MatchResult,
} from '@/lib/planImporter'
import { formatRD } from '@/utils/calculos'
import type { EstructuraDB } from '@/types'
import styles from './ImportarPlanoModal.module.css'

const MAX_MB = 15
const MAX_BYTES = MAX_MB * 1024 * 1024

type Step = 'upload' | 'processing' | 'review' | 'empty'

interface Props {
  open: boolean
  onClose: () => void
  proyectoId?: string | null
  catalogo: EstructuraDB[]
  onConfirm: (items: ItemConfirmado[]) => void
}

export default function ImportarPlanoModal({
  open,
  onClose,
  proyectoId,
  catalogo,
  onConfirm,
}: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [matchedSelected, setMatchedSelected] = useState<Set<string>>(new Set())
  const [ambiguousChoices, setAmbiguousChoices] = useState<Map<string, string>>(new Map())
  const [unmatchedChoices, setUnmatchedChoices] = useState<Map<string, string>>(new Map())

  const importar = useImportarPlano()

  useEffect(() => {
    if (!open) {
      setStep('upload')
      setFile(null)
      setMatchResult(null)
      setMatchedSelected(new Set())
      setAmbiguousChoices(new Map())
      setUnmatchedChoices(new Map())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const handleFile = useCallback(
    async (f: File) => {
      if (f.type !== 'application/pdf') {
        toast({
          title: 'Archivo inválido',
          description: 'Solo se aceptan archivos PDF.',
          variant: 'destructive',
        })
        return
      }
      if (f.size > MAX_BYTES) {
        toast({
          title: 'Archivo muy grande',
          description: `Máximo ${MAX_MB} MB. Prueba dividir el plano.`,
          variant: 'destructive',
        })
        return
      }
      setFile(f)
      setStep('processing')
      try {
        const items = await importar.mutateAsync({ file: f, proyectoId: proyectoId ?? null })
        const consolidados = consolidarItems(items)
        if (consolidados.length === 0) {
          setStep('empty')
          return
        }
        const result = matchContraCatalogo(consolidados, catalogo)
        setMatchResult(result)
        setMatchedSelected(new Set(result.matched.map((m) => m.item.codigo)))
        setStep('review')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        toast({
          title: 'No se pudo analizar el plano',
          description: msg,
          variant: 'destructive',
        })
        setStep('upload')
        setFile(null)
      }
    },
    [importar, proyectoId, catalogo]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files[0]
      if (f) void handleFile(f)
    },
    [handleFile]
  )

  const confirmados: ItemConfirmado[] = useMemo(() => {
    if (!matchResult) return []
    const out: ItemConfirmado[] = []
    for (const m of matchResult.matched) {
      if (matchedSelected.has(m.item.codigo)) {
        out.push({
          estructura: m.estructura.estructura,
          cantidad: m.item.cantidad,
          precio_unitario: m.estructura.costo_materiales_rd,
        })
      }
    }
    for (const a of matchResult.ambiguous) {
      const chosen = ambiguousChoices.get(a.item.codigo)
      if (chosen) {
        const est = a.candidatos.find((c) => c.estructura.estructura === chosen)?.estructura
        if (est) {
          out.push({
            estructura: est.estructura,
            cantidad: a.item.cantidad,
            precio_unitario: est.costo_materiales_rd,
          })
        }
      }
    }
    for (const u of matchResult.unmatched) {
      const chosen = unmatchedChoices.get(u.codigo)
      if (chosen) {
        const est = catalogo.find((c) => c.estructura === chosen)
        if (est) {
          out.push({
            estructura: est.estructura,
            cantidad: u.cantidad,
            precio_unitario: est.costo_materiales_rd,
          })
        }
      }
    }
    return out
  }, [matchResult, matchedSelected, ambiguousChoices, unmatchedChoices, catalogo])

  if (!open) return null

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText size={22} style={{ color: 'var(--color-primary, #4f46e5)' }} />
            <h2 className={styles.title}>Importar plano PDF</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className={styles.body}>
          {step === 'upload' && <UploadStep onFileSelected={handleFile} onDrop={onDrop} />}
          {step === 'processing' && <ProcessingStep fileName={file?.name ?? ''} />}
          {step === 'empty' && (
            <EmptyStep
              onRetry={() => {
                setStep('upload')
                setFile(null)
              }}
            />
          )}
          {step === 'review' && matchResult && (
            <ReviewStep
              matchResult={matchResult}
              matchedSelected={matchedSelected}
              toggleMatched={(codigo) => {
                const next = new Set(matchedSelected)
                if (next.has(codigo)) next.delete(codigo)
                else next.add(codigo)
                setMatchedSelected(next)
              }}
              ambiguousChoices={ambiguousChoices}
              setAmbiguous={(codigo, val) => {
                const next = new Map(ambiguousChoices)
                if (val) next.set(codigo, val)
                else next.delete(codigo)
                setAmbiguousChoices(next)
              }}
              unmatchedChoices={unmatchedChoices}
              setUnmatched={(codigo, val) => {
                const next = new Map(unmatchedChoices)
                if (val) next.set(codigo, val)
                else next.delete(codigo)
                setUnmatchedChoices(next)
              }}
              catalogo={catalogo}
            />
          )}
        </div>

        {step === 'review' && (
          <div className={styles.footer}>
            <div className={styles.footerInfo}>
              {confirmados.length} estructura{confirmados.length !== 1 ? 's' : ''} seleccionada
              {confirmados.length !== 1 ? 's' : ''}
            </div>
            <div className={styles.footerBtns}>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                disabled={confirmados.length === 0}
                onClick={() => {
                  onConfirm(confirmados)
                  onClose()
                }}
              >
                Agregar al presupuesto
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function UploadStep({
  onFileSelected,
  onDrop,
}: {
  onFileSelected: (f: File) => void
  onDrop: (e: React.DragEvent) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <div
      className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false)
        onDrop(e)
      }}
    >
      <Upload size={48} className={styles.dropIcon} />
      <p className={styles.dropTitle}>Arrastra el plano PDF aquí</p>
      <p className={styles.dropSub}>o</p>
      <label className={styles.fileBtn}>
        Seleccionar archivo
        <input
          type="file"
          accept="application/pdf"
          className={styles.hiddenInput}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileSelected(f)
          }}
        />
      </label>
      <p className={styles.dropPdfHint}>PDF, máximo {MAX_MB} MB</p>
    </div>
  )
}

function ProcessingStep({ fileName }: { fileName: string }) {
  return (
    <div className={styles.centerBlock}>
      <Loader2 size={48} className={styles.spinIcon} />
      <p className={styles.stepTitle}>Analizando plano</p>
      <p className={styles.stepSub}>{fileName}</p>
      <p className={styles.stepHint}>
        Extrayendo estructuras con IA. Puede tomar 10-30 segundos.
      </p>
    </div>
  )
}

function EmptyStep({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.centerBlock}>
      <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: '#f59e0b' }} />
      <p className={styles.stepTitle}>No se detectaron estructuras</p>
      <p className={styles.stepHint}>
        Revisa que el plano contenga etiquetas legibles, tabla resumen o leyenda. Si el PDF es
        escaneado de baja calidad, prueba con una versión de mayor resolución.
      </p>
      <div style={{ marginTop: '1.5rem' }}>
        <Button variant="outline" onClick={onRetry}>
          Probar otro plano
        </Button>
      </div>
    </div>
  )
}

interface ReviewStepProps {
  matchResult: MatchResult
  matchedSelected: Set<string>
  toggleMatched: (codigo: string) => void
  ambiguousChoices: Map<string, string>
  setAmbiguous: (codigo: string, val: string) => void
  unmatchedChoices: Map<string, string>
  setUnmatched: (codigo: string, val: string) => void
  catalogo: EstructuraDB[]
}

function ReviewStep({
  matchResult,
  matchedSelected,
  toggleMatched,
  ambiguousChoices,
  setAmbiguous,
  unmatchedChoices,
  setUnmatched,
  catalogo,
}: ReviewStepProps) {
  const { matched, ambiguous, unmatched } = matchResult

  return (
    <div className={styles.reviewSections}>
      {matched.length > 0 && (
        <Section
          icon={<CheckCircle2 size={18} style={{ color: '#16a34a' }} />}
          title={`Reconocidas (${matched.length})`}
          subtitle="Coincidencia exacta con el catálogo"
        >
          <div className={styles.matchedList}>
            {matched.map((m) => (
              <label key={m.item.codigo} className={styles.matchedRow}>
                <input
                  type="checkbox"
                  checked={matchedSelected.has(m.item.codigo)}
                  onChange={() => toggleMatched(m.item.codigo)}
                />
                <span className={styles.matchedCode}>{m.estructura.estructura}</span>
                <span className={styles.matchedQty}>×{m.item.cantidad}</span>
                <span className={styles.matchedPrice}>
                  {formatRD(m.estructura.costo_materiales_rd)}
                </span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {ambiguous.length > 0 && (
        <Section
          icon={<AlertTriangle size={18} style={{ color: '#d97706' }} />}
          title={`Ambiguas (${ambiguous.length})`}
          subtitle="Elige la estructura correcta o déjala sin mapear para omitirla"
        >
          <div className={styles.ambiguousList}>
            {ambiguous.map((a) => (
              <div key={a.item.codigo} className={styles.ambiguousItem}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemCode}>{a.item.codigo}</span>
                  <span className={styles.itemMeta}>extraído ×{a.item.cantidad}</span>
                </div>
                <select
                  value={ambiguousChoices.get(a.item.codigo) ?? ''}
                  onChange={(e) => setAmbiguous(a.item.codigo, e.target.value)}
                  className={styles.select}
                >
                  <option value="">— no importar —</option>
                  {a.candidatos.map((c) => (
                    <option key={c.estructura.estructura} value={c.estructura.estructura}>
                      {c.estructura.estructura} · {formatRD(c.estructura.costo_materiales_rd)} ·{' '}
                      {Math.round(c.score * 100)}% match
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Section>
      )}

      {unmatched.length > 0 && (
        <Section
          icon={<XCircle size={18} style={{ color: '#dc2626' }} />}
          title={`No reconocidas (${unmatched.length})`}
          subtitle="Sin coincidencia en el catálogo. Mapea manualmente o déjala sin mapear para omitirla"
        >
          <div className={styles.unmatchedList}>
            {unmatched.map((u) => (
              <UnmatchedRow
                key={u.codigo}
                item={u}
                value={unmatchedChoices.get(u.codigo) ?? ''}
                onChange={(v) => setUnmatched(u.codigo, v)}
                catalogo={catalogo}
              />
            ))}
          </div>
        </Section>
      )}

      {matched.length === 0 && ambiguous.length === 0 && unmatched.length === 0 && (
        <p className={styles.emptyReviewMsg}>No hay elementos para revisar.</p>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        {icon}
        <div>
          <h3 className={styles.sectionTitle}>{title}</h3>
          <p className={styles.sectionSub}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function UnmatchedRow({
  item,
  value,
  onChange,
  catalogo,
}: {
  item: ItemExtraido
  value: string
  onChange: (v: string) => void
  catalogo: EstructuraDB[]
}) {
  const [search, setSearch] = useState('')
  const [openList, setOpenList] = useState(false)
  const filtered = search
    ? catalogo
        .filter((c) => c.estructura.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 20)
    : []

  return (
    <div className={styles.unmatchedItem}>
      <div className={styles.itemHeader}>
        <span className={styles.itemCode}>{item.codigo}</span>
        <span className={styles.itemMeta}>extraído ×{item.cantidad}</span>
      </div>
      {value ? (
        <div className={styles.unmatchedMapped}>
          <span className={styles.unmatchedMappedCode}>{value}</span>
          <button className={styles.unmatchedRemove} onClick={() => onChange('')}>
            Quitar
          </button>
        </div>
      ) : (
        <div className={styles.searchWrap}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar estructura..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOpenList(true)
              }}
              onFocus={() => setOpenList(true)}
            />
          </div>
          {openList && filtered.length > 0 && (
            <ul className={styles.searchResults}>
              {filtered.map((c) => (
                <li
                  key={c.estructura}
                  className={styles.searchResultRow}
                  onClick={() => {
                    onChange(c.estructura)
                    setSearch('')
                    setOpenList(false)
                  }}
                >
                  <span className={styles.searchResultCode}>{c.estructura}</span>
                  <span className={styles.searchResultPrice}>
                    {formatRD(c.costo_materiales_rd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
