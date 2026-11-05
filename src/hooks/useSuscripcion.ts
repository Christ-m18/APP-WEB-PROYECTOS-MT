import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMiSuscripcion, fetchPlanes, fetchMisPagos, crearPago, uploadVoucher } from '@/lib/suscripcion'
import type { PagoFormData } from '@/lib/validations'

const MI_SUSCRIPCION_KEY = ['mi-suscripcion'] as const
const PLANES_KEY = ['planes'] as const
const MIS_PAGOS_KEY = ['mis-pagos'] as const

export function useMiSuscripcion() {
  return useQuery({
    queryKey: MI_SUSCRIPCION_KEY,
    queryFn: fetchMiSuscripcion,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlanes() {
  return useQuery({
    queryKey: PLANES_KEY,
    queryFn: fetchPlanes,
    staleTime: 30 * 60 * 1000,
  })
}

export function useMisPagos() {
  return useQuery({
    queryKey: MIS_PAGOS_KEY,
    queryFn: fetchMisPagos,
  })
}

export function useCrearPago() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      formData: PagoFormData
      plan_id: string
      voucherFile: File | null
    }) => {
      let voucher_url: string | null = null
      if (params.voucherFile) {
        voucher_url = await uploadVoucher(params.voucherFile)
      }
      await crearPago({
        plan_id: params.plan_id,
        monto: params.formData.monto,
        banco: params.formData.banco,
        referencia: params.formData.referencia,
        fecha_pago: params.formData.fecha_pago,
        voucher_url,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MIS_PAGOS_KEY })
      void qc.invalidateQueries({ queryKey: MI_SUSCRIPCION_KEY })
    },
  })
}

export function useCanCreateProyecto(proyectosCount?: number) {
  const { data: suscripcion, isLoading } = useMiSuscripcion()
  const isPro = suscripcion?.plan?.nombre === 'Pro'
  const proyectosUsados = Math.max(
    suscripcion?.uso?.proyectos_usados ?? 0,
    proyectosCount ?? 0
  )
  const proyectosLimite = suscripcion?.uso?.proyectos_limite ?? suscripcion?.plan?.limite_proyectos ?? 3

  // Solo se bloquea si tenemos datos confirmados de que NO es Pro y ya alcanzó el límite
  const limiteAlcanzado = !isPro && suscripcion !== undefined && proyectosLimite !== null && proyectosUsados >= proyectosLimite

  return {
    canCreate: !limiteAlcanzado,
    limiteAlcanzado,
    isPro,
    proyectosUsados,
    proyectosLimite,
    isLoading,
  }
}

