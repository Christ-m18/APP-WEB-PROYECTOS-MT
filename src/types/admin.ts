export interface AdminUsuarioReciente {
  id: string
  nombre: string | null
  apellido: string | null
  email: string
  rol: string | null
  activo: boolean | null
  creado_en: string | null
}

export interface AdminProyectoReciente {
  id: string
  nombre: string
  cliente: string
  estado: string | null
  creado_en: string | null
  usuario_id: string | null
  usuario_nombre: string | null
  usuario_apellido: string | null
}

export interface AdminRankingUsuario {
  usuario_id: string
  nombre: string | null
  apellido: string | null
  total_proyectos: number
}

export interface AdminImportReciente {
  id: string
  archivo_nombre: string
  archivo_bytes: number
  paginas: number | null
  modelo: string | null
  tokens_input: number | null
  tokens_output: number | null
  duracion_ms: number | null
  error: string | null
  creado_en: string
  usuario_nombre: string | null
  usuario_apellido: string | null
}

export interface AdminErrorReciente {
  id: string
  archivo_nombre: string
  error: string
  creado_en: string
  usuario_nombre: string | null
}

export interface AdminTopConsumidor {
  usuario_id: string
  nombre: string | null
  apellido: string | null
  total_requests: number
}

// --- Payment/Subscription types ---

export interface AdminPagoPendiente {
  id: string
  monto: number
  moneda: string
  estado: string
  voucher_url: string | null
  referencia: string | null
  banco: string | null
  fecha_pago: string | null
  creado_en: string
  usuario_nombre: string | null
  usuario_apellido: string | null
  usuario_email: string | null
  plan_nombre: string
}

export interface AdminPagoReciente {
  id: string
  monto: number
  moneda: string
  estado: string
  referencia: string | null
  banco: string | null
  nota_admin: string | null
  revisado_en: string | null
  creado_en: string
  usuario_nombre: string | null
  usuario_apellido: string | null
  plan_nombre: string
}

export interface AdminIngresoPorMes {
  mes: string
  total: number
  cantidad: number
}

export interface AdminPlanDistribucion {
  plan: string
  total: number
}

export interface AdminPagosData {
  pendientes: AdminPagoPendiente[]
  recientes: AdminPagoReciente[]
  stats: {
    total_pendientes: number
    total_aprobados: number
    total_rechazados: number
    ingresos_total: number
    ingresos_mes_actual: number
    ingresos_por_mes: AdminIngresoPorMes[]
  }
  suscripciones: {
    total_activas: number
    por_plan: AdminPlanDistribucion[]
    por_vencer_7d: number
  }
}

export interface AdminOverview {
  usuarios: {
    total: number
    activos: number
    inactivos: number
    admins: number
    normales: number
    recientes: AdminUsuarioReciente[]
  }
  proyectos: {
    total: number
    por_estado: Record<string, number>
    recientes: AdminProyectoReciente[]
    total_presupuestado: number
    ranking_usuarios: AdminRankingUsuario[]
  }
  imports: {
    total: number
    exitosos: number
    con_error: number
    duracion_media_ms: number
    tokens_input_total: number
    tokens_output_total: number
    modelos: Record<string, number>
    recientes: AdminImportReciente[]
    errores_recientes: AdminErrorReciente[]
  }
  rate_limits: {
    total_registros: number
    top_consumidores: AdminTopConsumidor[]
  }
  catalogos: {
    total_materiales: number
    total_estructuras: number
    total_mano_obra_activa: number
    materiales_sin_precio: number
    estructuras_sin_costo: number
  }
}
