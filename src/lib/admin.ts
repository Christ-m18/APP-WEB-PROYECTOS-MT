import { supabase } from '@/lib/supabase'
import type { AdminOverview, AdminPagosData, AdminUsuarioReciente } from '@/types/admin'

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('get_admin_overview')

  if (error) throw error
  return data as AdminOverview
}

export async function adminUpdateUser(
  targetUserId: string,
  updates: { rol?: string; activo?: boolean }
): Promise<AdminUsuarioReciente> {
  const { data, error } = await (supabase.rpc as CallableFunction)('admin_update_user', {
    target_user_id: targetUserId,
    new_rol: updates.rol ?? null,
    new_activo: updates.activo ?? null,
  })

  if (error) throw error
  return data as AdminUsuarioReciente
}

export async function fetchAdminPagos(): Promise<AdminPagosData> {
  const { data, error } = await (supabase.rpc as CallableFunction)('admin_get_pagos')
  if (error) throw error
  return data as AdminPagosData
}

export async function adminReviewPago(
  pagoId: string,
  nuevoEstado: 'aprobado' | 'rechazado',
  nota?: string
): Promise<{ ok: boolean; estado: string }> {
  const { data, error } = await (supabase.rpc as CallableFunction)('admin_review_pago', {
    pago_id: pagoId,
    nuevo_estado: nuevoEstado,
    nota: nota ?? null,
  })
  if (error) throw error
  return data as { ok: boolean; estado: string }
}

export async function getVoucherSignedUrl(voucherPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('vouchers')
    .createSignedUrl(voucherPath, 300) // 5 min
  if (error) throw error
  return data.signedUrl
}
