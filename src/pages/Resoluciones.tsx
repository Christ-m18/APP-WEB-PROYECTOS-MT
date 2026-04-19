import { useState, useMemo, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEstructuras, useMaterialesPorEstructura } from '@/hooks/useEstructuras'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRD } from '@/utils/calculos'
import { Search, ChevronDown, ChevronUp, Package, Box } from 'lucide-react'
import styles from './Resoluciones.module.css'

// ─── Detalle de materiales (fila expandible) ──────────────────────────────────

function MaterialesDetalle({ estructura }: { estructura: string }) {
  const { data: mats = [], isLoading } = useMaterialesPorEstructura(estructura)

  if (isLoading) {
    return (
      <tr>
        <td colSpan={3} className={styles.subTableContainer}>
          <div style={{ padding: '2rem' }}>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={3} className={styles.subTableContainer}>
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className={styles.subTableWrapper}
        >
          {mats.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground opacity-50">
              <Box size={32} />
              <p className="mt-2 text-sm italic">Sin materiales en esta estructura.</p>
            </div>
          ) : (
            <div className={styles.tableResponsive}>
              <table className={styles.tableMat}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem' }}>CÓDIGO</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem' }}>DESCRIPCIÓN</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem' }}>UNIDAD</th>
                  <th className={styles.numCell} style={{ padding: '0.75rem 1rem', fontSize: '0.7rem' }}>CANT.</th>
                  <th className={styles.numCell} style={{ padding: '0.75rem 1rem', fontSize: '0.7rem' }}>PRECIO IGMELEC</th>
                </tr>
              </thead>
              <tbody>
                {mats.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--color-primary-lt)' }}>{m.materiales.codigo}</td>
                    <td>{m.materiales.descripcion}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{m.materiales.unidad}</td>
                    <td className={styles.numCell} style={{ fontWeight: 700 }}>{m.cantidad}</td>
                    <td className={styles.numCell} style={{ color: 'var(--color-accent)', fontFamily: 'monospace' }}>{formatRD(m.materiales.precio_igmelec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </motion.div>
      </td>
    </tr>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Resoluciones() {
  const { data: estructuras = [], isLoading } = useEstructuras()
  const [filtro, setFiltro] = useState('')
  const [expandida, setExpandida] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      estructuras.filter((e) =>
        e.estructura.toLowerCase().includes(filtro.toLowerCase())
      ),
    [estructuras, filtro]
  )

  const toggle = (nombre: string) =>
    setExpandida((prev) => (prev === nombre ? null : nombre))

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64 mb-4" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className={styles.title}>Catálogo de Estructuras SIE</h1>
      <p className={styles.sub}>
        Explora las estructuras técnicas de media tensión optimizadas según las resoluciones vigentes. 
        Desliza para revisar los componentes de cada estructura.
      </p>

      {/* Buscador de alto rendimiento */}
      <div style={{ position: 'relative', maxWidth: '500px', marginBottom: '2.5rem' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)' }} />
        <input
          style={{
            width: '100%',
            padding: '0.75rem 1rem 0.75rem 2.5rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '0.9rem',
            outline: 'none',
          }}
          placeholder="Filtrar estructura por identificador..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <div style={{ position: 'absolute', right: '-120px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <Package size={14} />
          <span>{estructuras.length} CARGADAS</span>
        </div>
      </div>

      {/* Tabla estilo Obsidian */}
      <div className={styles.table}>
        <div className={styles.tableResponsive}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className={styles.expandCell}></th>
              <th>IDENTIFICADOR</th>
              <th style={{ textAlign: 'right' }}>VALORIZACIÓN MATERIALES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className={styles.emptyRow}>
                  <div className="py-12 flex flex-col items-center opacity-30">
                    <Search size={48} />
                    <p className="mt-4">Búsqueda sin resultados en el registro actual.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((est) => {
                const isOpen = expandida === est.estructura
                return (
                  <Fragment key={est.estructura}>
                    <tr
                      className={[styles.expandRow, isOpen ? styles.rowExpanded : ''].join(' ')}
                      onClick={() => toggle(est.estructura)}
                    >
                      <td className={styles.expandCell}>
                        <span style={{ color: isOpen ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </td>
                      <td className={styles.codigo}>{est.estructura}</td>
                      <td className={styles.precio} style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '1rem', color: 'var(--color-accent)' }}>
                        {formatRD(est.costo_materiales_rd)}
                      </td>
                    </tr>
                    <AnimatePresence>
                      {isOpen && (
                        <MaterialesDetalle
                          estructura={est.estructura}
                        />
                      )}
                    </AnimatePresence>
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
