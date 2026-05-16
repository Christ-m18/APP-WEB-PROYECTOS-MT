export interface Plan {
  id: string
  nombre: string
  descripcion: string | null
  precio_mensual: number
  limite_proyectos: number | null
  limite_imports: number | null
}

export interface Suscripcion {
  id: string
  estado: 'activa' | 'vencida' | 'cancelada'
  fecha_inicio: string
  fecha_fin: string | null
  creado_en: string
}

export interface UsoActual {
  proyectos_usados: number
  proyectos_limite: number | null
  imports_usados: number
  imports_limite: number | null
}

export interface MiSuscripcionData {
  plan: Plan | null
  suscripcion: Suscripcion | null
  uso: UsoActual
}

export interface PagoUsuario {
  id: string
  monto: number
  moneda: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  voucher_url: string | null
  referencia: string | null
  banco: string | null
  fecha_pago: string | null
  nota_admin: string | null
  revisado_en: string | null
  creado_en: string
  plan_nombre: string
}

export interface CheckLimitResult {
  allowed: boolean
  usado: number
  limite: number | null
}
