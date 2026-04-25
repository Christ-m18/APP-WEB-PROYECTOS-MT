export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      estructuras_mano_obra: {
        Row: {
          activo: boolean | null
          categoria: string
          descripcion: string
          estructura: string | null
          id: number
          precio: number
          unidad: string
        }
        Insert: {
          activo?: boolean | null
          categoria: string
          descripcion: string
          estructura?: string | null
          id?: number
          precio: number
          unidad?: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          descripcion?: string
          estructura?: string | null
          id?: number
          precio?: number
          unidad?: string
        }
        Relationships: []
      }
      imports_planos: {
        Row: {
          archivo_bytes: number
          archivo_nombre: string
          creado_en: string
          duracion_ms: number | null
          error: string | null
          id: string
          items_extraidos: Json
          modelo: string | null
          paginas: number | null
          proyecto_id: string | null
          tokens_input: number | null
          tokens_output: number | null
          usuario_id: string
        }
        Insert: {
          archivo_bytes: number
          archivo_nombre: string
          creado_en?: string
          duracion_ms?: number | null
          error?: string | null
          id?: string
          items_extraidos?: Json
          modelo?: string | null
          paginas?: number | null
          proyecto_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          usuario_id: string
        }
        Update: {
          archivo_bytes?: number
          archivo_nombre?: string
          creado_en?: string
          duracion_ms?: number | null
          error?: string | null
          id?: string
          items_extraidos?: Json
          modelo?: string | null
          paginas?: number | null
          proyecto_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_planos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      materiales: {
        Row: {
          codigo: number
          descripcion: string
          id: number
          item: number | null
          precio_bellon: number | null
          precio_grape: number | null
          precio_igmelec: number | null
          precio_maenca: number | null
          precio_ochoa: number | null
          precio_transdeci: number | null
          unidad: string | null
        }
        Insert: {
          codigo: number
          descripcion: string
          id?: number
          item?: number | null
          precio_bellon?: number | null
          precio_grape?: number | null
          precio_igmelec?: number | null
          precio_maenca?: number | null
          precio_ochoa?: number | null
          precio_transdeci?: number | null
          unidad?: string | null
        }
        Update: {
          codigo?: number
          descripcion?: string
          id?: number
          item?: number | null
          precio_bellon?: number | null
          precio_grape?: number | null
          precio_igmelec?: number | null
          precio_maenca?: number | null
          precio_ochoa?: number | null
          precio_transdeci?: number | null
          unidad?: string | null
        }
        Relationships: []
      }
      partidas: {
        Row: {
          cantidad: number
          detalles: Json | null
          estructura: string
          id: string
          orden: number
          precio_unitario: number
          proyecto_id: string | null
          total: number | null
        }
        Insert: {
          cantidad?: number
          detalles?: Json | null
          estructura: string
          id?: string
          orden?: number
          precio_unitario: number
          proyecto_id?: string | null
          total?: number | null
        }
        Update: {
          cantidad?: number
          detalles?: Json | null
          estructura?: string
          id?: string
          orden?: number
          precio_unitario?: number
          proyecto_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partidas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean | null
          actualizado_en: string | null
          apellido: string
          avatar_url: string | null
          creado_en: string | null
          email: string
          empresa: string | null
          id: string
          nombre: string
          rol: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          actualizado_en?: string | null
          apellido: string
          avatar_url?: string | null
          creado_en?: string | null
          email: string
          empresa?: string | null
          id: string
          nombre: string
          rol?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          actualizado_en?: string | null
          apellido?: string
          avatar_url?: string | null
          creado_en?: string | null
          email?: string
          empresa?: string | null
          id?: string
          nombre?: string
          rol?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          aplicar_itbis: boolean | null
          cliente: string
          creado_en: string | null
          descripcion: string | null
          estado: string | null
          fecha: string | null
          id: string
          nombre: string
          overhead: number | null
          usuario_id: string | null
          voltaje: string | null
        }
        Insert: {
          aplicar_itbis?: boolean | null
          cliente: string
          creado_en?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha?: string | null
          id?: string
          nombre: string
          overhead?: number | null
          usuario_id?: string | null
          voltaje?: string | null
        }
        Update: {
          aplicar_itbis?: boolean | null
          cliente?: string
          creado_en?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha?: string | null
          id?: string
          nombre?: string
          overhead?: number | null
          usuario_id?: string | null
          voltaje?: string | null
        }
        Relationships: []
      }
      uucc_material_estructura: {
        Row: {
          cantidad: number | null
          codigo_material: number
          descripcion: string | null
          estructura: string
          id: number
          total_uso: number | null
        }
        Insert: {
          cantidad?: number | null
          codigo_material: number
          descripcion?: string | null
          estructura: string
          id?: number
          total_uso?: number | null
        }
        Update: {
          cantidad?: number | null
          codigo_material?: number
          descripcion?: string | null
          estructura?: string
          id?: number
          total_uso?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uucc_material_estructura_codigo_material_fkey"
            columns: ["codigo_material"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["codigo"]
          },
        ]
      }
    }
    Views: {
      v_costo_uucc_por_estructura: {
        Row: {
          cantidad_total: number | null
          costo_materiales_rd: number | null
          estructura: string | null
          materiales_distintos: number | null
        }
        Relationships: []
      }
      v_materiales_precio: {
        Row: {
          codigo: number | null
          descripcion: string | null
          precio_referencia: number | null
          unidad: string | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
