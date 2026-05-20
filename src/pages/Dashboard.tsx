import { useNavigate } from 'react-router-dom'
import { useProyectos } from '@/hooks/useProyectos'
import { useTodaManoObra } from '@/hooks/useEstructuras'
import { usePerfil } from '@/hooks/usePerfil'
import { useMiSuscripcion } from '@/hooks/useSuscripcion'
import { formatRD, calcularTotalProyecto } from '@/utils/calculos'
import { VOLTAJES } from '@/data/estructuras_sie'
import {
  Plus,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  Activity,
  History,
  Users,
  Zap
} from 'lucide-react'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: proyectos = [], isLoading } = useProyectos()
  const { data: todaManoObra = [] } = useTodaManoObra()
  const { data: perfil } = usePerfil()
  const { data: miSuscripcion } = useMiSuscripcion()

  const totalInversion = proyectos.reduce((acc, p) => {
    const partidas = p.partidas || []
    const total = calcularTotalProyecto(partidas, todaManoObra, p.overhead || 0, p.aplicar_itbis || false)
    return acc + total
  }, 0)

  const stats = [
    { 
      label: 'Proyectos Activos', 
      value: proyectos.length, 
      icon: <Briefcase size={24} />, 
    },
    { 
      label: 'Total del presupuesto', 
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

  // --- Analíticas ---
  const borrador = proyectos.filter(p => p.estado === 'borrador').length
  const enviados = proyectos.filter(p => p.estado === 'enviado').length
  const aprobados = proyectos.filter(p => p.estado === 'aprobado').length
  const totalP = proyectos.length || 1 // avoid div zero

  const pBorrador = (borrador / totalP) * 100
  const pEnviados = (enviados / totalP) * 100
  const pAprobados = (aprobados / totalP) * 100

  // Top 3 proyectos más costosos
  const proyectosConTotal = proyectos.map(p => ({
    ...p,
    total: calcularTotalProyecto(p.partidas || [], todaManoObra, p.overhead || 0, p.aplicar_itbis || false)
  }))
  const top3 = [...proyectosConTotal].sort((a, b) => b.total - a.total).slice(0, 3)
  const maxTotal = top3[0]?.total || 1

  return (
    <div className={styles.page}>
      <header className={styles.dashHeader}>
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

      {miSuscripcion?.uso && miSuscripcion.plan?.nombre === 'Gratis' && (
        <div className={styles.statCard} style={{ marginBottom: '2rem', cursor: 'pointer' }} onClick={() => void navigate('/app/suscripcion')}>
          <div className={styles.statIcon}><Zap size={24} /></div>
          <div className={styles.statInfo} style={{ flex: 1 }}>
            <span className={styles.statLabel}>
              Plan {miSuscripcion.plan.nombre} — {miSuscripcion.uso.proyectos_usados}/{miSuscripcion.uso.proyectos_limite ?? 0} proyectos usados
            </span>
            <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, marginTop: 4 }}>
              <div style={{
                height: '100%',
                borderRadius: 3,
                width: `${miSuscripcion.uso.proyectos_limite ? Math.min((miSuscripcion.uso.proyectos_usados / miSuscripcion.uso.proyectos_limite) * 100, 100) : 0}%`,
                background: (miSuscripcion.uso.proyectos_limite && miSuscripcion.uso.proyectos_usados >= miSuscripcion.uso.proyectos_limite) ? '#ef4444' : 'var(--color-primary)',
              }} />
            </div>
          </div>
        </div>
      )}

      {proyectos.length > 0 && (
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard} style={{ flex: 1 }}>
            <h3 className={styles.chartTitle}><Activity size={18}/> Estado del Portafolio</h3>
            <div className={styles.progressBar}>
              <div style={{ width: `${pAprobados}%`, backgroundColor: '#10b981' }} title={`Aprobados: ${aprobados}`} />
              <div style={{ width: `${pEnviados}%`, backgroundColor: '#3b82f6' }} title={`En Revisión: ${enviados}`} />
              <div style={{ width: `${pBorrador}%`, backgroundColor: '#e2e8f0' }} title={`Borradores: ${borrador}`} />
            </div>
            <div className={styles.chartLegends}>
              <span style={{ color: '#10b981' }}>● Aprobados ({aprobados})</span>
              <span style={{ color: '#3b82f6' }}>● En Revisión ({enviados})</span>
              <span style={{ color: '#94a3b8' }}>● Borradores ({borrador})</span>
            </div>
          </div>

          <div className={styles.chartCard} style={{ flex: 1.5 }}>
            <h3 className={styles.chartTitle}><TrendingUp size={18}/> Top 3 Mayor Presupuesto</h3>
            <div className={styles.barList}>
              {top3.map((p, i) => (
                <div key={i} className={styles.barItem}>
                  <div className={styles.barHeader}>
                      <span>{p.nombre}</span>
                      <span style={{ color: 'var(--color-primary)' }}>{formatRD(p.total)}</span>
                  </div>
                  <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(p.total / maxTotal) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                   <Activity size={20} style={{ margin: '0 auto' }} />
                </div>
                <div>
                  <div className={styles.projectName}>{p.nombre}</div>
                  <div className={styles.projectClient}>{p.cliente} • Voltaje: {VOLTAJES.find(v => v.value === p.voltaje)?.label || p.voltaje || 'N/A'}</div>
                </div>
              </div>
              <div className={styles.projectDate}>
                {new Date(p.fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className={styles.projectArrow}>
                <ArrowRight size={20} strokeWidth={3} />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
