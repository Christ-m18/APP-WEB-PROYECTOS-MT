import { useNavigate } from 'react-router-dom'
import { useProyectos } from '@/hooks/useProyectos'
import { usePerfil } from '@/hooks/usePerfil'
import { formatRD, resumenPresupuesto } from '@/utils/calculos'
import { 
  Plus, 
  Briefcase, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  FileSpreadsheet,
  Zap,
  Activity,
  History,
  Users
} from 'lucide-react'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: proyectos = [], isLoading } = useProyectos()
  const { data: perfil } = usePerfil()

  const totalInversion = proyectos.reduce((acc, p) => {
    const partidas = p.partidas || []
    const r = resumenPresupuesto(partidas, {
      porcentajeOverhead: p.overhead || 0,
      aplicarITBIS: p.aplicar_itbis || false,
    })
    return acc + (r.total || 0)
  }, 0)

  const stats = [
    { 
      label: 'Proyectos Activos', 
      value: proyectos.length, 
      icon: <Briefcase size={24} />, 
    },
    { 
      label: 'Capital Invertido', 
      value: formatRD(totalInversion), 
      icon: <TrendingUp size={24} />, 
    },
    { 
      label: 'Éxito (Aprobados)', 
      value: proyectos.filter(p => p.estado === 'aprobado').length, 
      icon: <CheckCircle2 size={24} />, 
    },
    { 
      label: 'Total Clientes', 
      value: new Set(proyectos.map(p => p.cliente)).size, 
      icon: <Users size={24} />, 
    },
  ]

  return (
    <div className={styles.page}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className={styles.pageTitle}>Panel de Control</h1>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '1rem' }}>
            Bienvenido, <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{perfil?.nombre || 'Ingeniero'}</span>. Gestiona tus presupuestos SIE.
          </p>
        </div>
        <div className={styles.actions} style={{ marginBottom: 0 }}>
          <button className={styles.btnPrimary} onClick={() => void navigate('/app/presupuesto/nuevo')}>
            <Plus size={20} strokeWidth={3} /> NUEVO PROYECTO
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        {stats.map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{isLoading ? '...' : s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <section className={styles.recentSection}>
        <div className={styles.recentHeader}>
          <History size={20} color="var(--color-primary)" strokeWidth={3} />
          <h3 className={styles.recentTitle}>Actividad Reciente</h3>
        </div>
        
        {proyectos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
            <FileSpreadsheet size={64} style={{ margin: '0 auto 1.5rem', opacity: 0.1 }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No hay proyectos registrados en el sistema.</p>
            <button 
              onClick={() => void navigate('/app/presupuesto/nuevo')}
              style={{ marginTop: '1.5rem', color: 'var(--color-primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Comienza creando tu primer presupuesto
            </button>
          </div>
        ) : (
          proyectos.slice(0, 5).map(p => (
            <div 
              key={p.id} 
              className={styles.projectRow}
              onClick={() => void navigate(`/app/presupuesto/${p.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'var(--color-primary)' }}>
                   <Activity size={20} style={{ margin: '0 auto' }} />
                </div>
                <div>
                  <div className={styles.projectName}>{p.nombre}</div>
                  <div className={styles.projectClient}>{p.cliente}</div>
                </div>
              </div>
              <div className={styles.projectDate}>
                {new Date(p.fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ marginLeft: '2rem', color: 'var(--color-primary)' }}>
                <ArrowRight size={20} strokeWidth={3} />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
