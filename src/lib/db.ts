import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type {
  Proyecto,
  Partida,
  Perfil,
  EstructuraDB,
  UuccMaterialEstructura,
  ManoObraRow,
} from '@/types'

type PartidaInsert = Database['public']['Tables']['partidas']['Insert']
type ProyectoInsert = Database['public']['Tables']['proyectos']['Insert']
type ProyectoUpdate = Database['public']['Tables']['proyectos']['Update']
type PerfilUpsert = Database['public']['Tables']['perfiles']['Insert']

// ─── Estructuras ──────────────────────────────────────────────────────────────

export async function fetchEstructuras(): Promise<EstructuraDB[]> {
  const { data, error } = await supabase
    .from('v_costo_uucc_por_estructura')
    .select('estructura, costo_materiales_rd')
    .order('estructura')

  if (error) throw error
  // La vista permite nulls; filtramos para devolver EstructuraDB estricto.
  return (data ?? [])
    .filter((r): r is { estructura: string; costo_materiales_rd: number } =>
      r.estructura !== null && r.costo_materiales_rd !== null
    )
}

export async function fetchMaterialesPorEstructura(
  estructura: string
): Promise<UuccMaterialEstructura[]> {
  const { data, error } = await supabase
    .from('uucc_material_estructura')
    .select('id, cantidad, estructura, materiales(codigo, descripcion, unidad, precio_igmelec, precio_grape)')
    .eq('estructura', estructura)

  if (error) throw error
  return (data ?? []) as unknown as UuccMaterialEstructura[]
}

export async function fetchMaterialesParaMultiplesEstructuras(
  estructuras: string[]
): Promise<UuccMaterialEstructura[]> {
  if (estructuras.length === 0) return []
  
  const { data, error } = await supabase
    .from('uucc_material_estructura')
    .select('id, cantidad, estructura, materiales(codigo, descripcion, unidad, precio_igmelec, precio_grape)')
    .in('estructura', estructuras)

  if (error) throw error
  return (data ?? []) as unknown as UuccMaterialEstructura[]
}

export async function fetchTodaManoObra(): Promise<ManoObraRow[]> {
  const { data, error } = await supabase
    .from('estructuras_mano_obra')
    .select('*')
    .eq('activo', true)

  if (error) throw error
  return (data ?? []) as ManoObraRow[]
}

export async function fetchManoObraPorEstructuras(
  estructuras: string[]
): Promise<ManoObraRow[]> {
  if (estructuras.length === 0) return []
  const { data, error } = await supabase
    .from('estructuras_mano_obra')
    .select('*')
    .in('estructura', estructuras)
    .eq('activo', true)

  if (error) throw error
  return (data ?? []) as ManoObraRow[]
}

// ─── Proyectos ────────────────────────────────────────────────────────────────

export async function fetchProyectos(): Promise<Proyecto[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('proyectos')
    .select('*, partidas(*)')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false })

  if (error) throw error
  return (data ?? []) as Proyecto[]
}

export async function fetchProyecto(id: string): Promise<Proyecto> {
  const { data, error } = await supabase
    .from('proyectos')
    .select('*, partidas(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Proyecto
}

// Columna `total` de partidas es generada en Postgres; hay que excluirla del insert.
type PartidaInsertable = Pick<Partida, 'estructura' | 'cantidad' | 'precio_unitario'> &
  Partial<Pick<Partida, 'orden' | 'detalles'>>

function prepararPartidaInsert(
  p: PartidaInsertable,
  proyecto_id: string,
  index: number
): PartidaInsert {
  return {
    proyecto_id,
    estructura: p.estructura || '',
    cantidad: Number(p.cantidad) || 0,
    precio_unitario: Number(p.precio_unitario) || 0,
    orden: p.orden ?? index,
    detalles: p.detalles ?? null,
  }
}

export async function createProyecto(
  proyecto: Omit<Proyecto, 'id' | 'creado_en'>,
  partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
): Promise<Proyecto> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const insertPayload: ProyectoInsert = { ...proyecto, usuario_id: user.id }
  const { data: proy, error: proyError } = await supabase
    .from('proyectos')
    .insert(insertPayload)
    .select()
    .single()

  if (proyError) throw proyError

  if (partidas.length > 0) {
    const preparedPartidas = partidas.map((p, i) => prepararPartidaInsert(p, proy.id as string, i))
    const { error: partsError } = await supabase.from('partidas').insert(preparedPartidas)
    if (partsError) throw partsError
  }

  return proy as Proyecto
}

export async function updateProyecto(
  id: string,
  proyecto: Partial<Omit<Proyecto, 'id' | 'creado_en'>>,
  partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
): Promise<Proyecto> {
  // `partidas` está en Proyecto app-level pero no en la tabla; lo removemos.
  const { partidas: _ignored, ...proyectoSinPartidas } = proyecto as Partial<Proyecto>
  const updatePayload: ProyectoUpdate = proyectoSinPartidas
  const { error: proyError } = await supabase
    .from('proyectos')
    .update(updatePayload)
    .eq('id', id)

  if (proyError) throw proyError

  // Replace all partidas for this project
  const { error: deleteError } = await supabase
    .from('partidas')
    .delete()
    .eq('proyecto_id', id)

  if (deleteError) throw deleteError

  if (partidas.length > 0) {
    const preparedPartidas = partidas.map((p, i) => prepararPartidaInsert(p, id, i))
    const { error: insertError } = await supabase.from('partidas').insert(preparedPartidas)
    if (insertError) throw insertError
  }

  return fetchProyecto(id)
}

export async function deleteProyecto(id: string): Promise<void> {
  const { error } = await supabase.from('proyectos').delete().eq('id', id)
  if (error) throw error
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

export async function fetchPerfil(): Promise<Perfil | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as Perfil | null
}

export async function upsertPerfil(perfil: Partial<Perfil>): Promise<Perfil> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  // Filtramos los campos permitidos y nos aseguramos de incluir el email
  const safeData: PerfilUpsert = {
    id: user.id,
    nombre: perfil.nombre ?? '',
    apellido: perfil.apellido ?? '',
    email: perfil.email ?? user.email ?? '',
    empresa: perfil.empresa ?? null,
    telefono: perfil.telefono ?? null,
  }
  if (perfil.avatar_url !== undefined) {
    safeData.avatar_url = perfil.avatar_url
  }

  const { data, error } = await supabase
    .from('perfiles')
    .upsert(safeData)
    .select()
    .single()

  if (error) {
    console.error('Database Upsert Error:', error)
    throw error
  }
  return data as Perfil
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const ext = file.name.split('.').pop() ?? 'jpg'
  const timestamp = Date.now()
  const path = `${user.id}/avatar-${timestamp}.${ext}`

  // Limpiar avatares anteriores para no acumular basura y evitar caché del CDN
  const { data: list } = await supabase.storage.from('avatars').list(user.id)
  if (list && list.length > 0) {
    const filesToRemove = list.map(f => `${user.id}/${f.name}`)
    await supabase.storage.from('avatars').remove(filesToRemove)
  }

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteAvatar(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data: list } = await supabase.storage.from('avatars').list(user.id)
  if (list && list.length > 0) {
    const filesToRemove = list.map(f => `${user.id}/${f.name}`)
    await supabase.storage.from('avatars').remove(filesToRemove)
  }
}

