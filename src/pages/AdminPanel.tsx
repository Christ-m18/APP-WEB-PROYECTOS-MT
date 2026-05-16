import { useState } from 'react'
import { useAdminOverview, useAdminUpdateUser, useAdminPagos, useAdminReviewPago } from '@/hooks/useAdmin'
import { usePerfil } from '@/hooks/usePerfil'
import { formatRD } from '@/utils/calculos'
import { getVoucherSignedUrl } from '@/lib/admin'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  ShieldCheck,
  Users,
  Briefcase,
  FileUp,
  Gauge,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Activity,
  RefreshCw,
  Ban,
  UserCheck,
  Crown,
  UserMinus,
  CreditCard,
  DollarSign,
  TrendingUp,
  Eye,
  X,
} from 'lucide-react'
import styles from './AdminPanel.module.css'

type TabId = 'overview' | 'pagos'

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#e11d48', '#64748b']

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// --------------- Sub-components ---------------

function OverviewTab() {
  const { data: perfil } = usePerfil()
  const { data } = useAdminOverview()
  const updateUser = useAdminUpdateUser()

  if (!data) return null
  const { usuarios, proyectos, imports, rate_limits, catalogos } = data

  const handleToggleActivo = (userId: string, nombre: string, currentActivo: boolean | null) => {
    const newActivo = !(currentActivo ?? true)
    updateUser.mutate(
      { userId, updates: { activo: newActivo } },
      {
        onSuccess: () => { toast({ title: newActivo ? `${nombre} activado` : `${nombre} bloqueado` }) },
        onError: (err: Error) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }) },
      },
    )
  }

  const handleToggleRol = (userId: string, nombre: string, currentRol: string | null) => {
    const newRol = currentRol === 'admin' ? 'usuario' : 'admin'
    updateUser.mutate(
      { userId, updates: { rol: newRol } },
      {
        onSuccess: () => { toast({ title: `${nombre} ahora es ${newRol}` }) },
        onError: (err: Error) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }) },
      },
    )
  }

  // Chart data
  const estadoData = Object.entries(proyectos.por_estado).map(([name, value]) => ({ name, value }))
  const userDistData = [
    { name: 'Activos', value: usuarios.activos },
    { name: 'Inactivos', value: usuarios.inactivos },
  ].filter((d) => d.value > 0)
  const importStatusData = [
    { name: 'Exitosas', value: imports.exitosos },
    { name: 'Con error', value: imports.con_error },
  ].filter((d) => d.value > 0)

  return (
    <>
      {/* KPI Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPrimary}`}><Users size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{usuarios.total}</span>
            <span className={styles.statLabel}>Usuarios</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPrimary}`}><Briefcase size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{proyectos.total}</span>
            <span className={styles.statLabel}>Proyectos</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}><Gauge size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue} title={formatRD(proyectos.total_presupuestado)}>
              {formatRD(proyectos.total_presupuestado)}
            </span>
            <span className={styles.statLabel}>Presupuestado</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPrimary}`}><FileUp size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{imports.total}</span>
            <span className={styles.statLabel}>Importaciones</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${imports.con_error > 0 ? styles.statIconDanger : styles.statIconMuted}`}>
            <AlertTriangle size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{imports.con_error}</span>
            <span className={styles.statLabel}>Errores Import</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconMuted}`}><Package size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{catalogos.total_materiales}</span>
            <span className={styles.statLabel}>Materiales</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}><Briefcase size={14} /> Proyectos por estado</div>
          {estadoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={estadoData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                  {estadoData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [String(v), 'Proyectos']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.chartEmpty}><Briefcase size={28} /><span>Sin proyectos</span></div>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}><Users size={14} /> Distribucion de usuarios</div>
          {userDistData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={userDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                  <Cell fill="#6366f1" />
                  <Cell fill="#e11d48" />
                </Pie>
                <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 700 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.chartEmpty}><Users size={28} /><span>Sin datos</span></div>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}><FileUp size={14} /> Resultado importaciones</div>
          {importStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={importStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#e11d48" />
                </Pie>
                <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 700 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.chartEmpty}><FileUp size={28} /><span>Sin importaciones</span></div>
          )}
        </div>
      </div>

      {/* Sections Grid */}
      <div className={styles.sectionsGrid}>
        {/* Usuarios */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Users size={16} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Usuarios</h3>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Activos</span>
            <span className={styles.miniStatValue}>{usuarios.activos}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Inactivos</span>
            <span className={styles.miniStatValue}>{usuarios.inactivos}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Admins</span>
            <span className={styles.miniStatValue}>{usuarios.admins}</span>
          </div>
          {usuarios.recientes.length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.72rem' }}>
                Gestion de usuarios
              </h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {usuarios.recientes.map((u) => {
                      const isCurrentUser = u.id === perfil?.id
                      const isActive = u.activo !== false
                      return (
                        <tr key={u.id}>
                          <td className={styles.truncate}>{u.nombre} {u.apellido}</td>
                          <td><span className={u.rol === 'admin' ? styles.badgePrimary : styles.badgeMuted}>{u.rol || 'usuario'}</span></td>
                          <td><span className={isActive ? styles.badgeSuccess : styles.badgeDanger}>{isActive ? 'Activo' : 'Bloqueado'}</span></td>
                          <td>
                            {isCurrentUser ? (
                              <span className={styles.actionDisabledText}>Tu cuenta</span>
                            ) : (
                              <div className={styles.actionBtns}>
                                <button type="button" className={isActive ? styles.actionBtnDanger : styles.actionBtnSuccess} onClick={() => handleToggleActivo(u.id, u.nombre ?? 'Usuario', u.activo)} disabled={updateUser.isPending} title={isActive ? 'Bloquear' : 'Activar'}>
                                  {isActive ? <Ban size={12} /> : <UserCheck size={12} />}
                                  <span className={styles.actionBtnLabel}>{isActive ? 'Bloquear' : 'Activar'}</span>
                                </button>
                                <button type="button" className={u.rol === 'admin' ? styles.actionBtnMuted : styles.actionBtnPrimary} onClick={() => handleToggleRol(u.id, u.nombre ?? 'Usuario', u.rol)} disabled={updateUser.isPending} title={u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}>
                                  {u.rol === 'admin' ? <UserMinus size={12} /> : <Crown size={12} />}
                                  <span className={styles.actionBtnLabel}>{u.rol === 'admin' ? 'Quitar' : 'Admin'}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Proyectos */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Briefcase size={16} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Proyectos</h3>
          </div>
          {Object.entries(proyectos.por_estado).map(([estado, count]) => (
            <div key={estado} className={styles.miniStat}>
              <span className={styles.miniStatLabel} style={{ textTransform: 'capitalize' }}>{estado}</span>
              <span className={styles.miniStatValue}>{count}</span>
            </div>
          ))}
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Total presupuestado</span>
            <span className={styles.miniStatValue}>{formatRD(proyectos.total_presupuestado)}</span>
          </div>
          {proyectos.ranking_usuarios.length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.72rem' }}>Ranking de usuarios</h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Usuario</th><th>Proyectos</th></tr></thead>
                  <tbody>
                    {proyectos.ranking_usuarios.map((ru) => (
                      <tr key={ru.usuario_id}>
                        <td className={styles.truncate}>{ru.nombre} {ru.apellido}</td>
                        <td style={{ fontWeight: 800 }}>{ru.total_proyectos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Importaciones */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FileUp size={16} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Importaciones</h3>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Exitosas</span>
            <span className={styles.miniStatValue}><span className={styles.badgeSuccess}><CheckCircle2 size={11} /> {imports.exitosos}</span></span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Con error</span>
            <span className={styles.miniStatValue}><span className={imports.con_error > 0 ? styles.badgeDanger : styles.badgeMuted}><XCircle size={11} /> {imports.con_error}</span></span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Duracion media</span>
            <span className={styles.miniStatValue}><Clock size={11} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} />{imports.duracion_media_ms > 0 ? `${(imports.duracion_media_ms / 1000).toFixed(1)}s` : '-'}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Tokens (in/out)</span>
            <span className={styles.miniStatValue}>{imports.tokens_input_total.toLocaleString()} / {imports.tokens_output_total.toLocaleString()}</span>
          </div>
          {Object.keys(imports.modelos).length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '0.75rem', marginBottom: '0.5rem', fontSize: '0.72rem' }}>Modelos</h4>
              {Object.entries(imports.modelos).map(([modelo, count]) => (
                <div key={modelo} className={styles.miniStat}>
                  <span className={styles.miniStatLabel}><Cpu size={11} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} />{modelo}</span>
                  <span className={styles.miniStatValue}>{count}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Errores */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <AlertTriangle size={16} color="#e11d48" />
            <h3 className={styles.sectionTitle}>Errores Recientes</h3>
          </div>
          {imports.errores_recientes.length === 0 ? (
            <div className={styles.emptyState}><CheckCircle2 size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.2 }} /><p>Sin errores</p></div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr><th>Archivo</th><th>Error</th><th>Fecha</th></tr></thead>
                <tbody>
                  {imports.errores_recientes.map((er) => (
                    <tr key={er.id}>
                      <td className={styles.truncate}>{er.archivo_nombre}</td>
                      <td className={styles.errorText} title={er.error}>{er.error}</td>
                      <td>{formatDate(er.creado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rate Limits */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Activity size={16} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Rate Limits</h3>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Registros totales</span>
            <span className={styles.miniStatValue}>{rate_limits.total_registros}</span>
          </div>
          {rate_limits.top_consumidores.length > 0 && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '0.75rem', marginBottom: '0.5rem', fontSize: '0.72rem' }}>Top consumidores</h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Usuario</th><th>Requests</th></tr></thead>
                  <tbody>
                    {rate_limits.top_consumidores.map((tc) => (
                      <tr key={tc.usuario_id}>
                        <td className={styles.truncate}>{tc.nombre} {tc.apellido}</td>
                        <td style={{ fontWeight: 800 }}>{tc.total_requests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Catalogos */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Package size={16} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Catalogos</h3>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Materiales</span>
            <span className={styles.miniStatValue}>{catalogos.total_materiales}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Estructuras (UUCC)</span>
            <span className={styles.miniStatValue}>{catalogos.total_estructuras}</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Mano de obra activa</span>
            <span className={styles.miniStatValue}>{catalogos.total_mano_obra_activa}</span>
          </div>
          {(catalogos.materiales_sin_precio > 0 || catalogos.estructuras_sin_costo > 0) && (
            <>
              <h4 className={styles.sectionTitle} style={{ marginTop: '0.75rem', marginBottom: '0.5rem', fontSize: '0.72rem' }}>
                <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: '0.2rem', color: '#f59e0b' }} />
                Incompletos
              </h4>
              {catalogos.materiales_sin_precio > 0 && (
                <div className={styles.miniStat}>
                  <span className={styles.miniStatLabel}>Sin precio</span>
                  <span className={styles.miniStatValue}><span className={styles.badgeWarning}>{catalogos.materiales_sin_precio}</span></span>
                </div>
              )}
              {catalogos.estructuras_sin_costo > 0 && (
                <div className={styles.miniStat}>
                  <span className={styles.miniStatLabel}>Sin costo</span>
                  <span className={styles.miniStatValue}><span className={styles.badgeWarning}>{catalogos.estructuras_sin_costo}</span></span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Proyectos recientes full width */}
      {proyectos.recientes.length > 0 && (
        <div className={styles.section} style={{ marginBottom: '2rem' }}>
          <div className={styles.sectionHeader}>
            <Briefcase size={16} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Proyectos Recientes (Global)</h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead><tr><th>Proyecto</th><th>Cliente</th><th>Usuario</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>
                {proyectos.recientes.map((p) => (
                  <tr key={p.id}>
                    <td className={styles.truncate}>{p.nombre}</td>
                    <td className={styles.truncate}>{p.cliente}</td>
                    <td className={styles.truncate}>{p.usuario_nombre} {p.usuario_apellido}</td>
                    <td><span className={styles.badgeMuted} style={{ textTransform: 'capitalize' }}>{p.estado || 'sin estado'}</span></td>
                    <td>{formatDate(p.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function PagosTab() {
  const { data: pagosData, isLoading } = useAdminPagos()
  const reviewPago = useAdminReviewPago()
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null)

  const handleViewVoucher = async (path: string) => {
    try {
      const url = await getVoucherSignedUrl(path)
      setVoucherPreview(url)
    } catch {
      toast({ title: 'Error al cargar voucher', variant: 'destructive' })
    }
  }

  const handleReview = (pagoId: string, estado: 'aprobado' | 'rechazado') => {
    reviewPago.mutate(
      { pagoId, estado },
      {
        onSuccess: () => { toast({ title: `Pago ${estado}` }) },
        onError: (err: Error) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }) },
      },
    )
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Skeleton className="h-24 w-full" style={{ borderRadius: '16px' }} />
        <Skeleton className="h-24 w-full" style={{ borderRadius: '16px' }} />
      </div>
    )
  }

  if (!pagosData) return null

  const { stats, suscripciones, pendientes, recientes } = pagosData

  // Chart: ingresos por mes
  const ingresosChart = [...stats.ingresos_por_mes].reverse().map((m) => ({
    mes: m.mes,
    ingresos: m.total,
    pagos: m.cantidad,
  }))

  // Chart: distribucion por plan
  const planChart = suscripciones.por_plan.map((p) => ({ name: p.plan, value: p.total }))

  return (
    <>
      {/* Payment KPIs */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconWarning}`}><Clock size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.total_pendientes}</span>
            <span className={styles.statLabel}>Pendientes</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}><CheckCircle2 size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.total_aprobados}</span>
            <span className={styles.statLabel}>Aprobados</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconDanger}`}><XCircle size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.total_rechazados}</span>
            <span className={styles.statLabel}>Rechazados</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}><DollarSign size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue} title={formatRD(stats.ingresos_total)}>{formatRD(stats.ingresos_total)}</span>
            <span className={styles.statLabel}>Ingresos Total</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPrimary}`}><TrendingUp size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue} title={formatRD(stats.ingresos_mes_actual)}>{formatRD(stats.ingresos_mes_actual)}</span>
            <span className={styles.statLabel}>Ingresos Mes</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPrimary}`}><CreditCard size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{suscripciones.total_activas}</span>
            <span className={styles.statLabel}>Suscripciones</span>
          </div>
        </div>
      </div>

      {/* Payment Charts */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}><DollarSign size={14} /> Ingresos mensuales</div>
          {ingresosChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ingresosChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatRD(Number(v)), 'Ingresos']} labelStyle={{ fontWeight: 800 }} />
                <Bar dataKey="ingresos" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.chartEmpty}><DollarSign size={28} /><span>Sin ingresos registrados</span></div>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}><Users size={14} /> Suscripciones por plan</div>
          {planChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={planChart} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                  {planChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 700 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.chartEmpty}><CreditCard size={28} /><span>Sin suscripciones</span></div>
          )}
        </div>
      </div>

      {/* Suscripciones info */}
      {suscripciones.por_vencer_7d > 0 && (
        <div className={styles.section} style={{ marginBottom: '1.25rem', borderColor: '#f59e0b' }}>
          <div className={styles.sectionHeader}>
            <AlertTriangle size={16} color="#f59e0b" />
            <h3 className={styles.sectionTitle}>
              {suscripciones.por_vencer_7d} suscripcion(es) por vencer en 7 dias
            </h3>
          </div>
        </div>
      )}

      {/* Pagos Pendientes */}
      <div className={styles.section} style={{ marginBottom: '1.25rem' }}>
        <div className={styles.sectionHeader}>
          <Clock size={16} color="#f59e0b" />
          <h3 className={styles.sectionTitle}>Pagos Pendientes ({pendientes.length})</h3>
        </div>
        {pendientes.length === 0 ? (
          <div className={styles.emptyState}><CheckCircle2 size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.2 }} /><p>No hay pagos pendientes</p></div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr><th>Usuario</th><th>Plan</th><th>Monto</th><th>Banco</th><th>Ref</th><th>Voucher</th><th>Fecha</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {pendientes.map((p) => (
                  <tr key={p.id}>
                    <td className={styles.truncate}>{p.usuario_nombre} {p.usuario_apellido}</td>
                    <td><span className={styles.badgePrimary}>{p.plan_nombre}</span></td>
                    <td style={{ fontWeight: 800 }}>{formatRD(p.monto)}</td>
                    <td className={styles.truncate}>{p.banco || '-'}</td>
                    <td className={styles.truncate}>{p.referencia || '-'}</td>
                    <td>
                      {p.voucher_url ? (
                        <button type="button" className={styles.actionBtnPrimary} onClick={() => void handleViewVoucher(p.voucher_url as string)} title="Ver voucher">
                          <Eye size={12} /> Ver
                        </button>
                      ) : (
                        <span className={styles.badgeMuted}>Sin voucher</span>
                      )}
                    </td>
                    <td>{formatDate(p.creado_en)}</td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button type="button" className={styles.actionBtnSuccess} onClick={() => handleReview(p.id, 'aprobado')} disabled={reviewPago.isPending} title="Aprobar">
                          <CheckCircle2 size={12} /><span className={styles.actionBtnLabel}>Aprobar</span>
                        </button>
                        <button type="button" className={styles.actionBtnDanger} onClick={() => handleReview(p.id, 'rechazado')} disabled={reviewPago.isPending} title="Rechazar">
                          <XCircle size={12} /><span className={styles.actionBtnLabel}>Rechazar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagos Recientes */}
      {recientes.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <CreditCard size={16} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle}>Historial de Pagos</h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr><th>Usuario</th><th>Plan</th><th>Monto</th><th>Estado</th><th>Nota</th><th>Revisado</th></tr>
              </thead>
              <tbody>
                {recientes.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.truncate}>{r.usuario_nombre} {r.usuario_apellido}</td>
                    <td><span className={styles.badgePrimary}>{r.plan_nombre}</span></td>
                    <td style={{ fontWeight: 800 }}>{formatRD(r.monto)}</td>
                    <td>
                      <span className={r.estado === 'aprobado' ? styles.badgeSuccess : styles.badgeDanger}>
                        {r.estado === 'aprobado' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {r.estado}
                      </span>
                    </td>
                    <td className={styles.truncate}>{r.nota_admin || '-'}</td>
                    <td>{formatDate(r.revisado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voucher Preview Modal */}
      {voucherPreview && (
        <div className={styles.voucherModal} onClick={() => setVoucherPreview(null)} role="dialog" aria-label="Vista previa de voucher">
          <button type="button" onClick={() => setVoucherPreview(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: 'white' }}>
            <X size={20} />
          </button>
          <img src={voucherPreview} alt="Voucher" className={styles.voucherModalImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

// --------------- Main Component ---------------

export default function AdminPanel() {
  const { data: perfil } = usePerfil()
  const { data, isLoading, error, refetch } = useAdminOverview()
  const { data: pagosData } = useAdminPagos()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const pendingCount = pagosData?.stats.total_pendientes ?? 0

  if (isLoading) {
    return (
      <div className={styles.loadingPage}>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" style={{ marginTop: '1rem' }} />
        <div className={styles.statsGrid} style={{ marginTop: '2rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" style={{ borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.errorPage}>
        <ShieldCheck size={56} className={styles.errorPageIcon} />
        <p className={styles.errorPageTitle}>Error al cargar el panel</p>
        <p className={styles.errorPageMsg}>
          {error instanceof Error ? error.message : 'No se pudieron obtener las metricas del sistema.'}
        </p>
        <button className={styles.btnRetry} onClick={() => void refetch()} type="button">
          <RefreshCw size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={26} color="var(--color-primary)" />
          <h1 className={styles.pageTitle}>Panel de Administracion</h1>
        </div>
        <p className={styles.subtitle}>
          Bienvenido, <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{perfil?.nombre || 'Admin'}</span>. Vista general del sistema.
        </p>
      </header>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`} onClick={() => setActiveTab('overview')}>
          <Gauge size={15} /> General
        </button>
        <button type="button" className={`${styles.tab} ${activeTab === 'pagos' ? styles.tabActive : ''}`} onClick={() => setActiveTab('pagos')}>
          <CreditCard size={15} /> Pagos
          {pendingCount > 0 && <span className={styles.tabBadge}>{pendingCount}</span>}
        </button>
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'pagos' && <PagosTab />}
    </div>
  )
}
