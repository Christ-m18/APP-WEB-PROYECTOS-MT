import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAdminOverview, adminUpdateUser, fetchAdminPagos, adminReviewPago } from '@/lib/admin'

export const ADMIN_OVERVIEW_KEY = ['admin', 'overview'] as const
export const ADMIN_PAGOS_KEY = ['admin', 'pagos'] as const

export function useAdminOverview() {
  return useQuery({
    queryKey: ADMIN_OVERVIEW_KEY,
    queryFn: fetchAdminOverview,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAdminPagos() {
  return useQuery({
    queryKey: ADMIN_PAGOS_KEY,
    queryFn: fetchAdminPagos,
    staleTime: 60 * 1000,
  })
}

export function useAdminUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; updates: { rol?: string; activo?: boolean } }) =>
      adminUpdateUser(params.userId, params.updates),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
    },
  })
}

export function useAdminReviewPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { pagoId: string; estado: 'aprobado' | 'rechazado'; nota?: string }) =>
      adminReviewPago(params.pagoId, params.estado, params.nota),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_PAGOS_KEY })
      void qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
    },
  })
}
