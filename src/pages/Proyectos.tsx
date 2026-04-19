import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProyectos, useDeleteProyecto } from '@/hooks/useProyectos'
import { useTodaManoObra } from '@/hooks/useEstructuras'
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  FolderSync
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { formatRD, calcularTotalProyecto } from '@/utils/calculos'
import { VOLTAJES } from '@/data/estructuras_sie'
import styles from './Proyectos.module.css'

export default function Proyectos() {
  const navigate = useNavigate()
  const { data: proyectos = [], isLoading } = useProyectos()
  const deleteMutation = useDeleteProyecto()
  const [searchTerm, setSearchTerm] = useState('')
  const { data: todaManoObra = [] } = useTodaManoObra()

  const filtered = proyectos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: 'Proyecto eliminado con éxito' })
    } catch (e) {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado': 
        return <span className={[styles.badge, styles.green].join(' ')}><CheckCircle2 size={12} /> APROBADO</span>
      case 'enviado': 
        return <span className={[styles.badge, styles.blue].join(' ')}><Clock size={12} /> EN REVISIÓN</span>
      case 'rechazado': 
        return <span className={[styles.badge, styles.red].join(' ')}><XCircle size={12} /> RECHAZADO</span>
      default: 
        return <span className={[styles.badge, styles.gray].join(' ')}><FileText size={12} /> BORRADOR</span>
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <h1 className={styles.title}>Mis Proyectos</h1>
        <button className={styles.btnNew} onClick={() => void navigate('/app/presupuesto/nuevo')}>
          <Plus size={20} strokeWidth={3} /> NUEVO PRESUPUESTO
        </button>
      </header>

      <div className={styles.searchBar}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.25rem', color: 'var(--color-primary)' }} />
          <input 
            className={styles.searchInput}
            placeholder="Buscar por nombre de proyecto o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '3.5rem' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          <FolderSync size={18} />
          <span>{filtered.length} Registros</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Proyecto / Cliente</th>
                <th>Nivel Tensión</th>
                <th>Total General del Presupuesto</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Sincronizando archivos...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>No se encontraron registros.</td></tr>
              ) : (
                filtered.map(p => {
                  const total = calcularTotalProyecto(p.partidas ?? [], todaManoObra, p.overhead, p.aplicar_itbis)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.nombre}>{p.nombre}</div>
                        <div className={styles.cliente}>{p.cliente}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.9rem' }}>
                          {VOLTAJES.find(v => v.value === p.voltaje)?.label || p.voltaje || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 900, color: 'var(--color-primary)', fontSize: '0.95rem' }}>{formatRD(total)}</div>
                      </td>
                      <td>{getStatusBadge(p.estado)}</td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button 
                            className={styles.btnEdit} 
                            onClick={() => void navigate(`/app/presupuesto/${p.id}`)}
                            title="Editar parámetros"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            className={styles.btnDel} 
                            onClick={() => void handleDelete(p.id, p.nombre)}
                            title="Eliminar registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
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
