import { supabase } from '@/lib/supabase'
import type { MiSuscripcionData, Plan, PagoUsuario, CheckLimitResult } from '@/types/suscripcion'

// Tables planes/pagos/suscripciones aren't in generated types yet.
// Use untyped client access pattern (same as admin.ts).
const from = supabase.from.bind(supabase) as (table: string) => ReturnType<typeof supabase.from>

export async function fetchMiSuscripcion(): Promise<MiSuscripcionData> {
  const { data, error } = await (supabase.rpc as CallableFunction)('get_mi_suscripcion')
  if (error) throw error
  return data as MiSuscripcionData
}

export async function fetchPlanes(): Promise<Plan[]> {
  const { data, error } = await (from('planes') as unknown as { select: (q: string) => { eq: (col: string, val: unknown) => { order: (col: string) => Promise<{ data: unknown; error: unknown }> } } })
    .select('id, nombre, descripcion, precio_mensual, limite_proyectos, limite_imports')
    .eq('activo', true)
    .order('orden')
  if (error) throw error
  return data as Plan[]
}

export async function fetchMisPagos(): Promise<PagoUsuario[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await (from('pagos') as unknown as { select: (q: string) => { eq: (col: string, val: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }> } } })
    .select('id, monto, moneda, estado, voucher_url, referencia, banco, fecha_pago, nota_admin, revisado_en, creado_en, plan_id')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false })
  if (error) throw error

  const { data: planes } = await (from('planes') as unknown as { select: (q: string) => Promise<{ data: unknown; error: unknown }> })
    .select('id, nombre')
  const planMap = new Map(((planes as Array<{ id: string; nombre: string }>) ?? []).map(p => [p.id, p.nombre]))

  return ((data as Array<Record<string, unknown>>) ?? []).map(p => ({
    ...p,
    plan_nombre: planMap.get(p.plan_id as string) ?? 'Desconocido',
  })) as PagoUsuario[]
}

export async function crearPago(params: {
  plan_id: string
  monto: number
  banco: string
  referencia: string
  fecha_pago: string
  voucher_url: string | null
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await (from('pagos') as unknown as { insert: (row: unknown) => Promise<{ error: unknown }> })
    .insert({
      usuario_id: user.id,
      plan_id: params.plan_id,
      monto: params.monto,
      moneda: 'DOP',
      estado: 'pendiente',
      banco: params.banco,
      referencia: params.referencia,
      fecha_pago: params.fecha_pago,
      voucher_url: params.voucher_url,
    })
  if (error) throw error
}

export async function uploadVoucher(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('vouchers')
    .upload(path, file, { contentType: file.type })
  if (error) throw error

  return path
}

export async function checkPlanLimit(tipo: 'proyectos' | 'imports'): Promise<CheckLimitResult> {
  const { data, error } = await (supabase.rpc as CallableFunction)('check_plan_limit', { tipo })
  if (error) throw error
  return data as CheckLimitResult
}
