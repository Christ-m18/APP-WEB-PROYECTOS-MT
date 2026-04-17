import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEstructuras, useMaterialesMultiples } from '@/hooks/useEstructuras'
import { useProyecto, useCreateProyecto, useUpdateProyecto } from '@/hooks/useProyectos'
import { proyectoSchema, type ProyectoFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { resumenPresupuesto, formatRD, totalPartida } from '@/utils/calculos'
import { exportarPDF } from '@/utils/exportPDF'
import { VOLTAJES } from '@/data/estructuras_sie'
import { Plus, Trash2, Save, X, Layers, Box, Loader2, Info, FileText, Package, FileStack } from 'lucide-react'
import type { Partida, TipoExportPDF, MaterialConsolidado } from '@/types'
import styles from './NuevoPresupuesto.module.css'

type TabKey = 'partidas' | 'materiales'

export default function NuevoPresupuesto() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: estructuras = [], isLoading: loadingEst } = useEstructuras()
  const { data: proyectoExistente, isLoading: loadingProy } = useProyecto(id ?? '')
  const createMutation = useCreateProyecto()
  const updateMutation = useUpdateProyecto()

  const [partidas, setPartidas] = useState<Omit<Partida, 'id' | 'proyecto_id'>[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('partidas')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ProyectoFormData>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      nombre: '',
      cliente: '',
      fecha: new Date().toISOString().split('T')[0],
      voltaje: '',
      estado: 'borrador',
      overhead: 0,
      aplicar_itbis: false,
    },
  })

  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (proyectoExistente && !hasLoaded) {
      reset({
        nombre: proyectoExistente.nombre || '',
        cliente: proyectoExistente.cliente || '',
        fecha: proyectoExistente.fecha || new Date().toISOString().split('T')[0],
        voltaje: proyectoExistente.voltaje || '',
        estado: (proyectoExistente.estado as any) || 'borrador',
        overhead: proyectoExistente.overhead || 0,
        aplicar_itbis: proyectoExistente.aplicar_itbis || false,
      })
      setPartidas(proyectoExistente.partidas ?? [])
      setHasLoaded(true)
    }
  }, [proyectoExistente, reset, hasLoaded])

  const overhead = watch('overhead') || 0
  const aplicarITBIS = watch('aplicar_itbis') || false
  
  const resumen = useMemo(() => {
    return resumenPresupuesto(partidas as Partida[], {
      porcentajeOverhead: Number(overhead),
      aplicarITBIS: !!aplicarITBIS,
    })
  }, [partidas, overhead, aplicarITBIS])

  // ─── Lógica de Consolidación Real-Time ──────────────────────────────────────
  const uniqueEstructuras = useMemo(() => {
    const names = partidas.map(p => p.estructura).filter(Boolean)
    return Array.from(new Set(names))
  }, [partidas])

  const { data: todosLosMateriales = [], isLoading: loadingMats } = useMaterialesMultiples(uniqueEstructuras)

  const consolidado = useMemo(() => {
    const map = new Map<string, { material: any; total: number; precioTotal: number }>()

    partidas.forEach(partida => {
      if (!partida.estructura) return
      
      const materialesDeEst = todosLosMateriales.filter(m => m.estructura === partida.estructura)
      
      materialesDeEst.forEach(m => {
        if (!m.materiales) return
        
        const rawMat = m.materiales
        const mat = Array.isArray(rawMat) ? rawMat[0] : rawMat
        if (!mat || !mat.codigo) return

        const key = mat.codigo
        const existing = map.get(key) || { material: mat, total: 0, precioTotal: 0 }
        
        const cantRequerida = (Number(partida.cantidad) || 0) * (Number(m.cantidad) || 0)
        existing.total += cantRequerida
        existing.precioTotal += cantRequerida * (Number(mat.precio_igmelec) || 0)
        
        map.set(key, existing)
      })
    })

    const results = Array.from(map.values())
    return results.sort((a, b) => (String(a.material.codigo) || '').localeCompare(String(b.material.codigo) || ''))
  }, [partidas, todosLosMateriales])

  const handleExport = async (tipo: TipoExportPDF) => {
    const formValues = getValues()
    const proyectoParaPDF = {
      ...formValues,
      id: id || 'temp',
      partidas: partidas as Partida[]
    }

    const materialesParaPDF: MaterialConsolidado[] = consolidado.map(c => ({
      codigo: c.material.codigo,
      descripcion: c.material.descripcion,
      unidad: c.material.unidad,
      precioUnitario: c.material.precio_igmelec,
      cantidadTotal: c.total,
      subtotal: c.precioTotal
    }))

    try {
      await exportarPDF({
        proyecto: proyectoParaPDF as any,
        tipo,
        materialesConsolidados: materialesParaPDF
      })
      toast({ title: 'PDF generado correctamente' })
    } catch (error) {
      toast({ title: 'Error al generar PDF', variant: 'destructive' })
    }
  }

  const addPartida = useCallback(() => {
    setPartidas((prev) => [
      ...prev,
      { estructura: '', cantidad: 1, precio_unitario: 0, total: 0 },
    ])
  }, [])

  const updatePartidaField = useCallback(
    (idx: number, field: keyof Omit<Partida, 'id' | 'proyecto_id'>, val: string | number) => {
      setPartidas((prev) => {
        const updated = [...prev]
        if (!updated[idx]) return prev
        const row = { ...updated[idx], [field]: val }
        row.total = totalPartida(Number(row.cantidad) || 0, Number(row.precio_unitario) || 0)
        updated[idx] = row
        return updated
      })
    },
    []
  )

  const removePartida = useCallback((idx: number) => {
    setPartidas((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const setEstructuraForPartida = useCallback(
    (idx: number, estructura: string) => {
      const est = estructuras.find((e) => e.estructura === estructura)
      setPartidas((prev) => {
        const updated = [...prev]
        if (!updated[idx]) return prev
        const row = { ...updated[idx] }
        row.estructura = estructura
        row.precio_unitario = est?.costo_materiales_rd ?? 0
        row.total = totalPartida(Number(row.cantidad) || 0, row.precio_unitario)
        updated[idx] = row
        return updated
      })
    },
    [estructuras]
  )

  // Debug validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.warn('Form Validation Errors:', errors)
    }
  }, [errors])

  const onSubmit = async (data: ProyectoFormData) => {
    console.log('Attempting to submit form...', { isEditing, id })
    const payload = { ...data, overhead: Number(data.overhead) || 0 }
    
    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, proyecto: payload, partidas })
        toast({ title: 'Sistema actualizado correctamente' })
        void navigate('/app/proyectos')
      } else {
        await createMutation.mutateAsync({ proyecto: payload, partidas })
        toast({ title: 'Presupuesto integrado' })
        void navigate('/app/proyectos')
      }
    } catch (e) {
      console.error('Submission error:', e)
      toast({ 
        title: isEditing ? 'Error de Sincronización' : 'Fallo en la creación', 
        description: String(e), 
        variant: 'destructive' 
      })
    }
  }

  const onInvalid = (errors: any) => {
    console.warn('Form Validation Failed:', errors)
    toast({
      title: 'Formulario Incompleto',
      description: 'Por favor verifica los campos marcados en rojo.',
      variant: 'destructive',
    })
  }

  if ((isEditing && loadingProy) || loadingEst) {
    return (
      <div className="p-6 space-y-8 animate-pulse">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className={styles.title}>{isEditing ? 'Optimizar Proyecto' : 'Configurar Presupuesto'}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 500, marginTop: '0.25rem' }}>
            {isEditing ? 'Ajusta los parámetros y estructuras del proyecto' : 'Crea una nueva propuesta técnica y económica'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={() => handleExport('presupuesto')} className={styles.btnExport} title="Exportar Presupuesto Comercial">
            <FileText size={18} color="var(--color-primary)" /> Comercial
          </button>
          <button type="button" onClick={() => handleExport('materiales')} className={styles.btnExport} title="Exportar Lista de Materiales">
            <Package size={18} color="var(--color-primary)" /> Logístico
          </button>
          <button type="button" onClick={() => handleExport('completo')} className={styles.btnExport} title="Exportar Proyecto Completo">
            <FileStack size={18} color="var(--color-primary)" /> Completo
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}><FileText size={20} /></div>
            <h3 className={styles.sectionTitle}>Parámetros Generales</h3>
          </div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>Identificación del Proyecto</label>
              <Input {...register('nombre')} placeholder="Ej: Red de Distribución Sector Sur" />
              {errors.nombre && <span className="text-red-500 text-xs font-bold mt-1">{errors.nombre.message}</span>}
            </div>
            <div className={styles.field}>
              <label>Cliente / Entidad</label>
              <Input {...register('cliente')} placeholder="Ej: ETED / Privado" />
              {errors.cliente && <span className="text-red-500 text-xs font-bold mt-1">{errors.cliente.message}</span>}
            </div>
            <div className={styles.field}>
              <label>Fecha Proyectada</label>
              <Input type="date" {...register('fecha')} />
            </div>
            <div className={styles.field}>
              <label>Nivel de Tensión</label>
              <select {...register('voltaje')}>
                <option value="">Seleccionar voltaje...</option>
                {VOLTAJES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
              {errors.voltaje && <span className="text-red-500 text-xs font-bold mt-1">{errors.voltaje.message}</span>}
            </div>
            <div className={styles.field}>
              <label>Estado Operativo</label>
              <select {...register('estado')}>
                <option value="borrador">BORRADOR</option>
                <option value="enviado">ENVIADO</option>
                <option value="aprobado">APROBADO</option>
                <option value="rechazado">RECHAZADO</option>
              </select>
              {errors.estado && <span className="text-red-500 text-xs font-bold mt-1">{errors.estado.message}</span>}
            </div>
            <div className={styles.field}>
              <label>Overhead Administrativo (%)</label>
              <Input type="number" step={0.5} {...register('overhead', { valueAsNumber: true })} />
              {errors.overhead && <span className="text-red-500 text-xs font-bold mt-1">{errors.overhead.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.checkLabel}>
                <input type="checkbox" {...register('aplicar_itbis')} />
                Aplicar Gravamen ITBIS (18.0%)
              </label>
            </div>
          </div>
          {Object.keys(errors).length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-800 text-sm font-black uppercase tracking-wider">Errores Detectados:</p>
              <ul className="list-disc list-inside text-red-600 text-xs mt-2 font-bold">
                {Object.entries(errors).map(([key, error]) => (
                  <li key={key}>{String(error?.message)}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className={styles.tabs}>
          <button
            type="button"
            className={[styles.tab, activeTab === 'partidas' ? styles.tabActivo : ''].join(' ')}
            onClick={() => setActiveTab('partidas')}
          >
            <Layers size={18} /> Estructuras / Partidas
          </button>
          <button
            type="button"
            className={[styles.tab, activeTab === 'materiales' ? styles.tabActivo : ''].join(' ')}
            onClick={() => setActiveTab('materiales')}
          >
            <Box size={18} /> Materiales Consolidados
            {consolidado.length > 0 && <span className={styles.badge}>{consolidado.length}</span>}
          </button>
        </div>

        {activeTab === 'partidas' && (
          <section className={[styles.card, styles.cardTable].join(' ')}>
            <div className={styles.sectionHeader} style={{ padding: '1.5rem 2rem 1rem', marginBottom: 0 }}>
              <div className={styles.sectionIcon}><Layers size={20} /></div>
              <h3 className={styles.sectionTitle}>Desglose de Partidas</h3>
            </div>
            <div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '45%' }}>Estructura</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ width: '18%', textAlign: 'right' }}>Costo Unit.</th>
                    <th style={{ width: '18%', textAlign: 'right' }}>Subtotal</th>
                    <th style={{ width: '4%' }}></th>
                  </tr>
                </thead>
                <tbody style={{ padding: '0 1rem' }}>
                  {partidas.map((p, i) => (
                    <tr key={i}>
                      <td style={{ paddingLeft: '2rem' }}>
                        <SearchableSelect
                          options={estructuras}
                          value={p.estructura}
                          onChange={(v) => setEstructuraForPartida(i, v)}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          min={1}
                          style={{ textAlign: 'center', fontWeight: 700 }}
                          value={p.cantidad}
                          onChange={(e) => updatePartidaField(i, 'cantidad', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          step={0.01}
                          style={{ textAlign: 'right', fontWeight: 600 }}
                          value={p.precio_unitario}
                          onChange={(e) => updatePartidaField(i, 'precio_unitario', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ fontWeight: 800, textAlign: 'right', color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                        {formatRD(p.total)}
                      </td>
                      <td style={{ textAlign: 'center', paddingRight: '2rem' }}>
                        <button type="button" className={styles.btnDel} onClick={() => removePartida(i)}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {partidas.length === 0 && (
                <div className={styles.empty} style={{ textAlign: 'center', padding: '5rem' }}>
                  <Info size={40} style={{ margin: '0 auto 1.5rem', opacity: 0.2, color: 'var(--color-primary)' }} />
                  <p style={{ fontWeight: 600 }}>No hay partidas registradas.</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Haz clic en el botón de abajo para empezar a añadir estructuras.</p>
                </div>
              )}
            </div>
            <button type="button" className={styles.btnAdd} onClick={addPartida}>
              <Plus size={20} /> Añadir Estructura al Presupuesto
            </button>
          </section>
        )}

        {activeTab === 'materiales' && (
          <section className={[styles.card, styles.cardTable].join(' ')}>
            <div className={styles.sectionHeader} style={{ padding: '1.5rem 2rem 1rem', marginBottom: 0 }}>
              <div className={styles.sectionIcon}><Box size={20} /></div>
              <h3 className={styles.sectionTitle}>Anexo de Materiales</h3>
            </div>
            {loadingMats ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
                <Loader2 className="animate-spin mb-4" size={40} style={{ margin: '0 auto', color: 'var(--color-primary)' }} />
                <p style={{ fontWeight: 600 }}>Sincronizando consolidado maestro...</p>
              </div>
            ) : consolidado.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
                <Box size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                <p style={{ fontWeight: 600 }}>Configura estructuras para proyectar el listado de materiales.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', padding: '1rem 2rem 2rem' }}>
                <table className={styles.tableMat}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción del Material</th>
                      <th style={{ textAlign: 'center' }}>Unidad</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Valorización</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidado.map((item) => (
                      <tr key={item.material.codigo}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-text)' }}>{item.material.codigo}</td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.material.descripcion}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-text-muted)' }}>{item.material.unidad}</td>
                        <td style={{ textAlign: 'right', fontWeight: 900 }}>{item.total.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.9rem' }}>{formatRD(item.precioTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className={styles.resumen}>
          <div className={styles.resumenRow}>
            <span>Subtotal de Materiales</span>
            <span style={{ color: 'white' }}>{formatRD(resumen.subtotal)}</span>
          </div>
          {resumen.costoOverhead > 0 && (
            <div className={styles.resumenRow}>
              <span>Overhead Administrativo ({overhead}%)</span>
              <span style={{ color: 'white' }}>{formatRD(resumen.costoOverhead)}</span>
            </div>
          )}
          {resumen.montoITBIS > 0 && (
            <div className={styles.resumenRow}>
              <span>Gravamen ITBIS (18%)</span>
              <span style={{ color: 'white' }}>{formatRD(resumen.montoITBIS)}</span>
            </div>
          )}
          <div className={[styles.resumenRow, styles.bold].join(' ')}>
            <span>TOTAL ESTIMADO</span>
            <span>{formatRD(resumen.total)}</span>
          </div>
        </section>

        <div className={styles.footActions}>
          <Button type="button" variant="outline" className={styles.btnCancel} onClick={() => void navigate('/app/proyectos')}>
            <X size={18} className="mr-2" /> Cancelar Operación
          </Button>
          <Button type="submit" disabled={isSubmitting} className={styles.btnSave}>
            <Save size={18} className="mr-2" />
            {isSubmitting ? 'Guardando Cambios...' : isEditing ? 'Actualizar Proyecto' : 'Generar Presupuesto'}
          </Button>
        </div>
      </form>
    </div>
  )
}
