// ─── Database row shapes (match Supabase table columns) ───────────────────────

export interface Perfil {
  id: string
  nombre: string
  apellido: string
  empresa: string
  telefono: string
  email: string
  rol: string
  activo: boolean
  avatar_url?: string | null
}

export interface Material {
  codigo: string
  descripcion: string
  unidad: string
  precio_igmelec: number
  precio_grape: number
}

export interface UuccMaterialEstructura {
  id: number
  cantidad: number
  estructura: string
  materiales: Material
}

export interface EstructuraDB {
  estructura: string
  costo_materiales_rd: number
}

export interface Partida {
  id?: string
  proyecto_id?: string
  estructura: string
  cantidad: number
  precio_unitario: number
  total: number
  detalles?: string
  orden?: number
}

export interface Proyecto {
  id: string
  nombre: string
  cliente: string
  fecha: string
  voltaje: string
  estado: string
  aplicar_itbis: boolean
  overhead: number
  creado_en?: string
  partidas?: Partida[]
}

// ─── Application-level shapes ─────────────────────────────────────────────────

export interface ResumenPresupuesto {
  subtotal: number
  costoOverhead: number
  baseITBIS: number
  montoITBIS: number
  total: number
  porcentajeOverhead: number
  aplicarITBIS: boolean
}

export interface MaterialConsolidado {
  codigo: string
  descripcion: string
  unidad: string
  precioUnitario: number
  cantidadTotal: number
  subtotal: number
}

export interface ManoObraLinea {
  categoria: string
  descripcion: string
  unidad: string
  precioUnitario: number
  subtotal: number
}

export type EstadoPresupuesto = 'borrador' | 'enviado' | 'aprobado' | 'rechazado'

export type TipoExportPDF = 'presupuesto' | 'materiales' | 'mano_obra' | 'completo'

export interface ExportPDFOptions {
  proyecto: Proyecto
  tipo: TipoExportPDF
  materialesConsolidados: MaterialConsolidado[]
  manoObra?: ManoObraLinea[]
  empresa?: EmpresaConfig
}

export interface EmpresaConfig {
  nombre: string
  rnc?: string
  direccion?: string
  telefono?: string
  email?: string
  logoBase64?: string
}

