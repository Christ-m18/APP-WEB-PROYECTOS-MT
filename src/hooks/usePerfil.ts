import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPerfil, upsertPerfil } from '@/lib/db'
import type { Perfil } from '@/types'

export const PERFIL_KEY = ['perfil'] as const

export function usePerfil() {
  return useQuery({
    queryKey: PERFIL_KEY,
    queryFn: fetchPerfil,
  })
}

export function useUpsertPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (perfil: Partial<Perfil>) => upsertPerfil(perfil),
    onSuccess: (updated) => {
      qc.setQueryData(PERFIL_KEY, updated)
    },
  })
}
