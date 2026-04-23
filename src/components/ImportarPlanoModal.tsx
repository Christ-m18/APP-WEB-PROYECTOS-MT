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
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" size={22} />
            <h2 className="text-lg font-semibold">Importar plano PDF</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600">
              {confirmados.length} estructura{confirmados.length !== 1 ? 's' : ''} seleccionada
              {confirmados.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
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
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        dragOver ? 'border-primary bg-blue-50' : 'border-slate-300'
      }`}
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
      <Upload size={48} className="mx-auto mb-4 text-slate-400" />
      <p className="text-slate-700 mb-2">Arrastra el plano PDF aquí</p>
      <p className="text-sm text-slate-500 mb-4">o</p>
      <label className="inline-block">
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileSelected(f)
          }}
        />
        <span className="inline-flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer text-sm font-semibold">
          Seleccionar archivo
        </span>
      </label>
      <p className="text-xs text-slate-400 mt-4">PDF, máximo {MAX_MB} MB</p>
    </div>
  )
}

function ProcessingStep({ fileName }: { fileName: string }) {
  return (
    <div className="text-center py-16">
      <Loader2 size={48} className="mx-auto mb-4 text-primary animate-spin" />
      <p className="text-slate-800 font-medium mb-1">Analizando plano</p>
      <p className="text-sm text-slate-500">{fileName}</p>
      <p className="text-xs text-slate-400 mt-4">
        Extrayendo estructuras con IA. Puede tomar 10-30 segundos.
      </p>
    </div>
  )
}

function EmptyStep({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-16">
      <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
      <p className="text-slate-800 font-medium mb-2">No se detectaron estructuras</p>
      <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
        Revisa que el plano contenga etiquetas legibles, tabla resumen o leyenda. Si el PDF es
        escaneado de baja calidad, prueba con una versión de mayor resolución.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Probar otro plano
      </Button>
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
    <div className="space-y-6">
      {matched.length > 0 && (
        <Section
          icon={<CheckCircle2 size={18} className="text-green-600" />}
          title={`Reconocidas (${matched.length})`}
          subtitle="Coincidencia exacta con el catálogo"
        >
          <div className="space-y-1">
            {matched.map((m) => (
              <label
                key={m.item.codigo}
                className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={matchedSelected.has(m.item.codigo)}
                  onChange={() => toggleMatched(m.item.codigo)}
                  className="w-4 h-4"
                />
                <span className="flex-1 font-mono text-sm">{m.estructura.estructura}</span>
                <span className="text-sm text-slate-600">×{m.item.cantidad}</span>
                <span className="text-sm text-slate-500 w-28 text-right">
                  {formatRD(m.estructura.costo_materiales_rd)}
                </span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {ambiguous.length > 0 && (
        <Section
          icon={<AlertTriangle size={18} className="text-amber-600" />}
          title={`Ambiguas (${ambiguous.length})`}
          subtitle="Elige la estructura correcta o déjala sin mapear para omitirla"
        >
          <div className="space-y-2">
            {ambiguous.map((a) => (
              <div
                key={a.item.codigo}
                className="p-3 bg-amber-50 border border-amber-200 rounded"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono text-sm font-semibold">{a.item.codigo}</span>
                  <span className="text-xs text-slate-500">extraído ×{a.item.cantidad}</span>
                </div>
                <select
                  value={ambiguousChoices.get(a.item.codigo) ?? ''}
                  onChange={(e) => setAmbiguous(a.item.codigo, e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
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
          icon={<XCircle size={18} className="text-red-600" />}
          title={`No reconocidas (${unmatched.length})`}
          subtitle="Sin coincidencia en el catálogo. Mapea manualmente o déjala sin mapear para omitirla"
        >
          <div className="space-y-2">
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
        <p className="text-center text-slate-500 py-8">No hay elementos para revisar.</p>
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
    <div>
      <div className="flex items-start gap-2 mb-3">
        {icon}
        <div>
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
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
  const [open, setOpen] = useState(false)
  const filtered = search
    ? catalogo
        .filter((c) => c.estructura.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 20)
    : []

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-sm font-semibold">{item.codigo}</span>
        <span className="text-xs text-slate-500">extraído ×{item.cantidad}</span>
      </div>
      {value ? (
        <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-300">
          <span className="font-mono text-sm">{value}</span>
          <button
            className="text-xs text-red-600 hover:underline"
            onClick={() => onChange('')}
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-2 bg-white px-2 py-1.5 border border-slate-300 rounded">
            <Search size={14} className="text-slate-400" />
            <input
              className="flex-1 text-sm outline-none"
              placeholder="Buscar estructura..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
            />
          </div>
          {open && filtered.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg">
              {filtered.map((c) => (
                <li
                  key={c.estructura}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex justify-between"
                  onClick={() => {
                    onChange(c.estructura)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  <span className="font-mono text-sm">{c.estructura}</span>
                  <span className="text-xs text-slate-500">{formatRD(c.costo_materiales_rd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
