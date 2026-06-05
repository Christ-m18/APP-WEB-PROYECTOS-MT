import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEstructuras, useMaterialesMultiples, useManoObraPorEstructuras } from '@/hooks/useEstructuras'
import { useProyecto, useCreateProyecto, useUpdateProyecto } from '@/hooks/useProyectos'
import { usePerfil } from '@/hooks/usePerfil'
import { useMiSuscripcion } from '@/hooks/useSuscripcion'
import { proyectoSchema, type ProyectoFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import ImportarPlanoModal from '@/components/ImportarPlanoModal'
import { mergeConPartidas } from '@/lib/planImporter'
import { resumenPresupuesto, formatRD, totalPartida } from '@/utils/calculos'
import { exportarPDF } from '@/utils/exportPDF'
import { VOLTAJES } from '@/data/estructuras_sie'
import { Plus, Trash2, Save, X, Layers, Box, Loader2, Info, FileText, Package, FileStack, Wrench, ChevronDown, Upload, Building2, FileUp, Crown, ShieldAlert, ShieldBan, Mail } from 'lucide-react'
import type { Partida, Proyecto, TipoExportPDF, MaterialConsolidado, ManoObraLinea, EmpresaConfig, ManoObraRow, Material } from '@/types'
import styles from './NuevoPresupuesto.module.css'

type TabKey = 'partidas' | 'materiales' | 'mano_obra'

export default function NuevoPresupuesto() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: estructuras = [], isLoading: loadingEst } = useEstructuras()
  const { data: proyectoExistente, isLoading: loadingProy } = useProyecto(id ?? '')
  const { data: perfil } = usePerfil()
  const { data: suscripcionData } = useMiSuscripcion()
  const createMutation = useCreateProyecto()
  const updateMutation = useUpdateProyecto()

  // Permissive while loading (undefined). Only block once data confirms Free plan.
  const esPlanGratis = suscripcionData !== undefined && suscripcionData.plan?.nombre !== 'Pro'
  // Block edit of saved projects for Free users. Creating new is always allowed.
  const editBlockedByPlan = isEditing && esPlanGratis

  const [partidas, setPartidas] = useState<Omit<Partida, 'id' | 'proyecto_id'>[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('partidas')
  const [empresaPanelOpen, setEmpresaPanelOpen] = useState(false)
  const [importarOpen, setImportarOpen] = useState(false)
  const [planLimitReached, setPlanLimitReached] = useState(false)
  const [accountBlocked, setAccountBlocked] = useState(false)

  // ─── Empresa config (persiste en localStorage) ─────────────────────────
  const [empresa, setEmpresa] = useState<EmpresaConfig>(() => {
    try {
      const saved = localStorage.getItem('mt_empresa_config')
      return saved ? JSON.parse(saved) : { nombre: '', rnc: '', direccion: '', telefono: '', email: '', logoBase64: '' }
    } catch { return { nombre: '', rnc: '', direccion: '', telefono: '', email: '', logoBase64: '' } }
  })

  const logoInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar empresa con perfil al cargar por primera vez
  useEffect(() => {
    if (perfil && !empresa.nombre) {
      const next = { ...empresa, nombre: perfil.empresa || '', telefono: perfil.telefono || '', email: perfil.email || '' }
      setEmpresa(next)
      localStorage.setItem('mt_empresa_config', JSON.stringify(next))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  const saveEmpresa = (updates: Partial<EmpresaConfig>) => {
    const next = { ...empresa, ...updates }
    setEmpresa(next)
    localStorage.setItem('mt_empresa_config', JSON.stringify(next))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => saveEmpresa({ logoBase64: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

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
        estado: (proyectoExistente.estado as ProyectoFormData['estado']) || 'borrador',
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

  // ─── Mano de Obra consolidada por estructura ────────────────────────────────
  const { data: manoObraData = [], isLoading: loadingMO } = useManoObraPorEstructuras(uniqueEstructuras)

  const matchStructureLabor = (matEstructura: string, laborEstructura: string) => {
    if (!matEstructura || !laborEstructura) return false;
    
    const matOrig = matEstructura.trim().toUpperCase();
    const labOrig = laborEstructura.trim().toUpperCase();
    
    if (matOrig === labOrig) return true;
    
    const matNorm = matOrig.replace(/\s+/g, '');
    const labNorm = labOrig.replace(/\s+/g, '');
    
    if (matNorm === labNorm) return true;
    
    // Rule: Wooden posts where labor has "POSTE " prefix
    if (labNorm.startsWith('POSTE') && matNorm === labNorm.replace('POSTE', '')) {
      return true;
    }
    
    // Rule: Prefix matching for variants separated by space
    // e.g. "MT-101 (55-5)" vs "MT-101", "M TEND. 4/3 ALUMINIO" vs "M TEND. 4/3"
    if (matOrig.startsWith(labOrig) && (matOrig[labOrig.length] === ' ' || matOrig[labOrig.length] === '(')) {
      return true;
    }
    
    // Rule: Prefix matching for variants separated by spaces in origin but normalized out
    // e.g. "PR - 202 CRUCETA DE 8'" vs "PR-202"
    if (matNorm.startsWith(labNorm)) {
       const remainder = matNorm.substring(labNorm.length);
       if (remainder.startsWith('(') || remainder.startsWith('CON') || remainder.startsWith('CRUCETA')) {
          return true;
       }
    }
    
    return false;
  };

  const manoObraConsolidada = useMemo(() => {
    // Build a list of labor items grouped by structure, respecting partida quantities
    const rows: { estructura: string; cantidadPartida: number; item: ManoObraRow; totalPrecio: number }[] = []
    partidas.forEach(partida => {
      if (!partida.estructura) return
      const cant = Number(partida.cantidad) || 1
      
      // Use smart matching to fetch associated labor
      const itemsDEst = manoObraData.filter(m => matchStructureLabor(partida.estructura, m.estructura))
      
      itemsDEst.forEach(mo => {
        rows.push({
          estructura: partida.estructura,
          cantidadPartida: cant,
          item: mo,
          totalPrecio: cant * Number(mo.precio),
        })
      })
    })
    // Sort by structure name, then category
    return rows.sort((a, b) =>
      a.estructura.localeCompare(b.estructura) ||
      (a.item.categoria ?? '').localeCompare(b.item.categoria ?? '')
    )
  }, [partidas, manoObraData])

  const totalManoObra = useMemo(() =>
    manoObraConsolidada.reduce((acc, r) => acc + r.totalPrecio, 0)
  , [manoObraConsolidada])

  const consolidado = useMemo(() => {
    const map = new Map<string, { material: Material; total: number; precioTotal: number }>()

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
        const matPrecio = Number(mat.precio_igmelec) || Number(mat.precio_grape) || 0
        existing.total += cantRequerida
        existing.precioTotal += cantRequerida * matPrecio
        
        map.set(key, existing)
      })
    })

    const results = Array.from(map.values())
    return results.sort((a, b) => (String(a.material.codigo) || '').localeCompare(String(b.material.codigo) || ''))
  }, [partidas, todosLosMateriales])

  const handleExport = async (tipo: TipoExportPDF) => {
    const formValues = getValues()

    // Mapear el value del voltaje a su etiqueta legible
    const voltajeLabel = VOLTAJES.find(v => v.value === formValues.voltaje)?.label || formValues.voltaje

    // Aplicar overhead silenciosamente en cada precio de partida
    const overheadFactor = 1 + (Number(formValues.overhead) || 0) / 100
    const partidasConOverhead = (partidas as Partida[]).map(p => ({
      ...p,
      precio_unitario: p.precio_unitario * overheadFactor,
      total: p.total * overheadFactor,
    }))

    const proyectoParaPDF = {
      ...formValues,
      voltaje: voltajeLabel,
      overhead: 0,          // ya absorbido en precios
      aplicar_itbis: formValues.aplicar_itbis,
      id: id || 'temp',
      partidas: partidasConOverhead
    }

    const materialesParaPDF: MaterialConsolidado[] = consolidado.map(c => ({
      codigo: c.material.codigo,
      descripcion: c.material.descripcion,
      unidad: c.material.unidad,
      precioUnitario: (Number(c.material.precio_igmelec) || Number(c.material.precio_grape) || 0) * overheadFactor,
      cantidadTotal: c.total,
      subtotal: c.precioTotal * overheadFactor
    }))

    const manoObraParaPDF: ManoObraLinea[] = manoObraConsolidada.map(r => ({
      estructura: r.estructura,
      categoria: r.item.categoria ?? '',
      descripcion: r.item.descripcion ?? '',
      unidad: r.item.unidad ?? '',
      cantidad: r.cantidadPartida,
      precioUnitario: Number(r.item.precio) * overheadFactor,
      subtotal: r.totalPrecio * overheadFactor
    }))

    try {
      await exportarPDF({
        proyecto: proyectoParaPDF as unknown as Proyecto,
        tipo,
        materialesConsolidados: materialesParaPDF,
        manoObra: manoObraParaPDF,
        empresa: empresa.nombre ? empresa : undefined
      })
      toast({ title: 'PDF generado correctamente' })
    } catch {
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

  const handleImportConfirm = useCallback(
    (items: { estructura: string; cantidad: number; precio_unitario: number }[]) => {
      setPartidas((prev) => {
        const result = mergeConPartidas(prev, items)
        const partes = [
          result.nuevas > 0 ? `${result.nuevas} nueva${result.nuevas !== 1 ? 's' : ''}` : null,
          result.sumadas > 0 ? `${result.sumadas} sumada${result.sumadas !== 1 ? 's' : ''}` : null,
        ].filter(Boolean)
        toast({
          title: 'Plano importado',
          description: partes.length > 0
            ? `${partes.join(', ')} al presupuesto.`
            : 'Sin cambios.',
        })
        return result.partidas
      })
    },
    []
  )

  // Debug validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.warn('Form Validation Errors:', errors)
    }
  }, [errors])

  const onSubmit = async (data: ProyectoFormData) => {
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
      const errMsg = e instanceof Error ? e.message : String(e)
      if (errMsg.includes('BLOCKED')) {
        setAccountBlocked(true)
        return
      }
      if (errMsg.includes('PLAN_LIMIT')) {
        setPlanLimitReached(true)
        return
      }
      console.error('Submission error:', e)
      toast({ 
        title: isEditing ? 'Error de Sincronización' : 'Fallo en la creación', 
        description: errMsg, 
        variant: 'destructive' 
      })
    }
  }

  const onInvalid = (errors: Record<string, unknown>) => {
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className={styles.title}>{isEditing ? 'Optimizar Proyecto' : 'Configurar Presupuesto'}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 500, marginTop: '0.25rem' }}>
            {isEditing ? 'Ajusta los parámetros y estructuras del proyecto' : 'Crea una nueva propuesta técnica y económica'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => handleExport('presupuesto')} className={styles.btnExport} title="Exportar Presupuesto Comercial">
            <FileText size={18} color="var(--color-primary)" /> Comercial
          </button>
          <button type="button" onClick={() => handleExport('materiales')} className={styles.btnExport} title="Exportar Lista de Materiales">
            <Package size={18} color="var(--color-primary)" /> Logístico
          </button>
          <button type="button" onClick={() => handleExport('mano_obra')} className={styles.btnExport} title="Exportar Mano de Obra" disabled={manoObraConsolidada.length === 0}>
            <Wrench size={18} color="var(--color-primary)" /> Mano de Obra
          </button>
          <button type="button" onClick={() => handleExport('completo')} className={styles.btnExport} title="Exportar Proyecto Completo">
            <FileStack size={18} color="var(--color-primary)" /> Completo
          </button>
        </div>
      </header>

      {/* ── Panel de configuración de empresa ────────────────────────── */}
      <div className={styles.empresaPanel}>
        <div className={styles.empresaPanelHeader} onClick={() => setEmpresaPanelOpen(o => !o)}>
          <span className={styles.empresaPanelTitle}>
            <Building2 size={16} color="var(--color-primary)" />
            Datos de empresa para PDF
            {empresa.nombre && <span style={{ color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 700, marginLeft: 4 }}>• {empresa.nombre}</span>}
          </span>
          <ChevronDown size={16} className={[styles.empresaPanelChevron, empresaPanelOpen ? styles.empresaPanelChevronOpen : ''].join(' ')} />
        </div>

        {empresaPanelOpen && (
          <div className={styles.empresaBody}>
            {/* Logo */}
            <div className={styles.logoUploadArea}>
              {empresa.logoBase64
                ? <img src={empresa.logoBase64} className={styles.logoPreview} alt="Logo" />
                : <div className={styles.logoPlaceholder}><Upload size={24} /></div>
              }
              <div className={styles.logoUploadBtn}>
                <label>
                  <Upload size={14} /> Subir Logo (PNG/JPG)
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} />
                </label>
                <span className={styles.logoHint}>Se mostrará en el encabezado del PDF. Recomendado: 200×200 px.</span>
                {empresa.logoBase64 && (
                  <button className={styles.logoRemove} type="button" onClick={() => saveEmpresa({ logoBase64: '' })}>✕ Quitar logo</button>
                )}
              </div>
            </div>
            {/* Campos */}
            <div className={styles.field}>
              <label>Nombre de la Empresa</label>
              <Input value={empresa.nombre} onChange={e => saveEmpresa({ nombre: e.target.value })} placeholder="Ej: Constructora Eléctrica MT, S.R.L." />
            </div>
            <div className={styles.field}>
              <label>RNC / NIF</label>
              <Input value={empresa.rnc || ''} onChange={e => saveEmpresa({ rnc: e.target.value })} placeholder="Ej: 1-31-12345-6" />
            </div>
            <div className={styles.field}>
              <label>Dirección</label>
              <Input value={empresa.direccion || ''} onChange={e => saveEmpresa({ direccion: e.target.value })} placeholder="Ej: C/ Primera #5, Santo Domingo" />
            </div>
            <div className={styles.field}>
              <label>Teléfono</label>
              <Input value={empresa.telefono || ''} onChange={e => saveEmpresa({ telefono: e.target.value })} placeholder="Ej: +1 (809) 000-0000" />
            </div>
            <div className={styles.field}>
              <label>Correo Electrónico</label>
              <Input value={empresa.email || ''} onChange={e => saveEmpresa({ email: e.target.value })} placeholder="Ej: info@miempresa.com" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') e.preventDefault() }}
      >
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
          <button
            type="button"
            className={[styles.tab, activeTab === 'mano_obra' ? styles.tabActivo : ''].join(' ')}
            onClick={() => setActiveTab('mano_obra')}
          >
            <Wrench size={18} /> Mano de Obra
            {manoObraConsolidada.length > 0 && <span className={styles.badge}>{manoObraConsolidada.length}</span>}
          </button>
        </div>

        {activeTab === 'partidas' && (
          <section className={[styles.card, styles.cardTable].join(' ')}>
            <div className={styles.sectionHeader} style={{ padding: '1.5rem 2rem 1rem', marginBottom: 0 }}>
              <div className={styles.sectionIcon}><Layers size={20} /></div>
              <h3 className={styles.sectionTitle}>Desglose de Partidas</h3>
            </div>
            <div className={styles.tableResponsive}>
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
                          value={Number((p.precio_unitario * (1 + (Number(overhead) || 0) / 100)).toFixed(2))}
                          onChange={(e) => {
                            const valWithOverhead = Number(e.target.value);
                            const factor = 1 + (Number(overhead) || 0) / 100;
                            updatePartidaField(i, 'precio_unitario', valWithOverhead / factor);
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: 800, textAlign: 'right', color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                          {formatRD(p.total * (1 + (Number(overhead) || 0) / 100))}
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0 2rem 1.5rem' }}>
              <button type="button" className={styles.btnAdd} onClick={addPartida} style={{ flex: 1 }}>
                <Plus size={20} /> Añadir Estructura al Presupuesto
              </button>
              <button
                type="button"
                className={styles.btnAdd}
                onClick={() => setImportarOpen(true)}
                style={{ flex: 1 }}
              >
                <FileUp size={20} /> Importar desde Plano PDF
              </button>
            </div>
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
              <div className={styles.tableResponsive} style={{ padding: '1rem 2rem 2rem' }}>
                <table className={styles.tableMat}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción del Material</th>
                      <th style={{ textAlign: 'center' }}>Unidad</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Precio Unit.</th>
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
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{formatRD((Number(item.material.precio_igmelec) || Number(item.material.precio_grape) || 0) * (1 + (Number(overhead) || 0) / 100))}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.9rem' }}>{formatRD(item.precioTotal * (1 + (Number(overhead) || 0) / 100))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'mano_obra' && (
          <section className={[styles.card, styles.cardTable].join(' ')}>
            <div className={styles.sectionHeader} style={{ padding: '1.5rem 2rem 1rem', marginBottom: 0 }}>
              <div className={styles.sectionIcon}><Wrench size={20} /></div>
              <h3 className={styles.sectionTitle}>Mano de Obra por Estructura</h3>
            </div>
            {loadingMO ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
                <Loader2 className="animate-spin mb-4" size={40} style={{ margin: '0 auto', color: 'var(--color-primary)' }} />
                <p style={{ fontWeight: 600 }}>Cargando actividades de mano de obra...</p>
              </div>
            ) : manoObraConsolidada.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
                <Wrench size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                <p style={{ fontWeight: 600 }}>Configura estructuras para proyectar la mano de obra.</p>
              </div>
            ) : (() => {
              // Group rows by estructura for visual separation
              const grouped: Record<string, typeof manoObraConsolidada> = {}
              manoObraConsolidada.forEach(row => {
                if (!grouped[row.estructura]) grouped[row.estructura] = []
                grouped[row.estructura].push(row)
              })
              const estructuraNames = Object.keys(grouped)

              return (
                <div className={styles.tableResponsive} style={{ padding: '1rem 2rem 2rem' }}>
                  <table className={styles.tableMat}>
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th>Actividad</th>
                        <th style={{ textAlign: 'center' }}>Unidad</th>
                        <th style={{ textAlign: 'center' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estructuraNames.map(estName => {
                        const items = grouped[estName]
                        const subtotalEstructura = items.reduce((a, r) => a + r.totalPrecio, 0)
                        return (
                          <React.Fragment key={estName}>
                            {/* Structure header row */}
                            <tr style={{
                              background: 'linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)',
                            }}>
                              <td colSpan={5} style={{
                                fontWeight: 900,
                                fontSize: '0.82rem',
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                color: 'var(--color-primary)',
                                padding: '0.7rem 0.75rem',
                                borderBottom: '1px solid rgba(99,102,241,0.2)',
                              }}>
                                <Layers size={14} style={{ marginRight: 6, verticalAlign: 'middle', opacity: 0.7 }} />
                                {estName}
                                <span style={{ fontWeight: 500, fontSize: '0.75rem', marginLeft: 8, color: 'var(--color-text-muted)', textTransform: 'none', letterSpacing: 0 }}>
                                  ({items.length} {items.length === 1 ? 'actividad' : 'actividades'} · ×{items[0]?.cantidadPartida})
                                </span>
                              </td>
                              <td style={{
                                textAlign: 'right',
                                fontWeight: 900,
                                fontSize: '0.85rem',
                                color: 'var(--color-primary)',
                                padding: '0.7rem 0.75rem',
                                borderBottom: '1px solid rgba(99,102,241,0.2)',
                              }}>
                                {formatRD(subtotalEstructura * (1 + (Number(overhead) || 0) / 100))}
                              </td>
                            </tr>
                            {/* Labor items for this structure */}
                            {items.map((row, idx) => (
                              <tr key={`${estName}-${idx}`}>
                                <td style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', paddingLeft: '1.5rem' }}>{row.item.categoria}</td>
                                <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{row.item.descripcion}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-text-muted)' }}>{row.item.unidad}</td>
                                <td style={{ textAlign: 'center', fontWeight: 900 }}>{row.cantidadPartida}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRD(Number(row.item.precio) * (1 + (Number(overhead) || 0) / 100))}</td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.9rem' }}>{formatRD(row.totalPrecio * (1 + (Number(overhead) || 0) / 100))}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 800, padding: '1rem 0.75rem', fontSize: '0.9rem', borderTop: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>TOTAL MANO DE OBRA</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1rem', color: 'var(--color-primary)', borderTop: '2px solid var(--color-border)', padding: '1rem 0.75rem' }}>{formatRD(totalManoObra * (1 + (Number(overhead) || 0) / 100))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })()}
          </section>
        )}

        <section className={styles.resumen}>
          <div className={styles.resumenRow}>
            <span>Subtotal Materiales</span>
            <span style={{ color: 'white' }}>{formatRD(resumen.subtotal + resumen.costoOverhead)}</span>
          </div>
          {resumen.montoITBIS > 0 && (
            <div className={styles.resumenRow}>
              <span>Gravamen ITBIS (18%)</span>
              <span style={{ color: 'white' }}>{formatRD(resumen.montoITBIS)}</span>
            </div>
          )}
          <div className={[styles.resumenRow, styles.bold].join(' ')}>
            <span>TOTAL MATERIALES</span>
            <span>{formatRD(resumen.total)}</span>
          </div>

          {totalManoObra > 0 && (
            <div className={styles.resumenMO}>
              <div className={styles.resumenMORow}>
                <span>🔧 Mano de Obra Estructura</span>
                <span>{formatRD(totalManoObra * (1 + (Number(overhead) || 0) / 100))}</span>
              </div>
              <div className={styles.resumenTotalCombinado}>
                <span>TOTAL COMBINADO</span>
                <span>{formatRD(resumen.total + (totalManoObra * (1 + (Number(overhead) || 0) / 100)))}</span>
              </div>
            </div>
          )}
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

      <ImportarPlanoModal
        open={importarOpen}
        onClose={() => setImportarOpen(false)}
        proyectoId={id ?? null}
        catalogo={estructuras}
        onConfirm={handleImportConfirm}
      />

      {/* ── Plan Limit Overlay ─────────────────────────────────── */}
      {planLimitReached && (
        <div className={styles.limitOverlay}>
          <div className={styles.limitCard}>
            <div className={styles.limitIconWrap}>
              <ShieldAlert size={48} />
            </div>
            <h2 className={styles.limitTitle}>Limite de Plan Alcanzado</h2>
            <p className={styles.limitDesc}>
              Has alcanzado el limite de <strong>3 proyectos</strong> de tu plan actual.
              Mejora tu plan para continuar creando presupuestos sin restricciones.
            </p>
            <div className={styles.limitActions}>
              <button
                type="button"
                className={styles.limitBtnUpgrade}
                onClick={() => void navigate('/app/suscripcion')}
              >
                <Crown size={18} />
                Mejorar Mi Plan
              </button>
              <button
                type="button"
                className={styles.limitBtnBack}
                onClick={() => setPlanLimitReached(false)}
              >
                Volver al Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit blocked for Free plan ───────────────────────── */}
      {editBlockedByPlan && (
        <div className={styles.limitOverlay}>
          <div className={styles.limitCard}>
            <div className={styles.limitIconWrap}>
              <Crown size={48} />
            </div>
            <h2 className={styles.limitTitle}>Funcionalidad Pro</h2>
            <p className={styles.limitDesc}>
              Editar proyectos guardados requiere el plan <strong>Pro</strong>.
              Mejora tu plan para modificar y gestionar tus presupuestos sin restricciones.
            </p>
            <div className={styles.limitActions}>
              <button
                type="button"
                className={styles.limitBtnUpgrade}
                onClick={() => void navigate('/app/suscripcion')}
              >
                <Crown size={18} />
                Mejorar Mi Plan
              </button>
              <button
                type="button"
                className={styles.limitBtnBack}
                onClick={() => void navigate('/app/proyectos')}
              >
                Volver a Proyectos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Account Blocked Overlay ───────────────────────────── */}
      {accountBlocked && (
        <div className={styles.limitOverlay}>
          <div className={styles.limitCard}>
            <div className={styles.limitIconWrap} style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#dc2626', boxShadow: '0 8px 24px -4px rgba(220, 38, 38, 0.25)' }}>
              <ShieldBan size={48} />
            </div>
            <h2 className={styles.limitTitle}>Cuenta Suspendida</h2>
            <p className={styles.limitDesc}>
              Tu cuenta ha sido <strong>desactivada por un administrador</strong>.
              No puedes crear ni editar proyectos hasta que se restablezca el acceso.
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.6, fontWeight: 500 }}>
              <Mail size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-primary)' }} />
              <span>Contacta al administrador para resolver esta situacion y recuperar el acceso a tu cuenta.</span>
            </div>
            <div className={styles.limitActions}>
              <button
                type="button"
                className={styles.limitBtnBack}
                onClick={() => void navigate('/app')}
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
