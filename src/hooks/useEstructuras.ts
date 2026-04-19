import { useQuery } from '@tanstack/react-query'
import { fetchEstructuras, fetchMaterialesPorEstructura, fetchMaterialesParaMultiplesEstructuras, fetchTodaManoObra } from '@/lib/db'

export const ESTRUCTURAS_KEY = ['estructuras'] as const

export function useEstructuras() {
  return useQuery({
    queryKey: ESTRUCTURAS_KEY,
    queryFn: fetchEstructuras,
    staleTime: Infinity, // catalog data rarely changes
  })
}

export function useMaterialesPorEstructura(estructura: string) {
  return useQuery({
    queryKey: ['materiales', estructura],
    queryFn: () => fetchMaterialesPorEstructura(estructura),
    enabled: !!estructura,
    staleTime: Infinity,
  })
}

export function useMaterialesMultiples(estructuras: string[]) {
  const sortedIds = [...new Set(estructuras)].sort().join(',')
  return useQuery({
    queryKey: ['materiales-multiples', sortedIds],
    queryFn: () => fetchMaterialesParaMultiplesEstructuras([...new Set(estructuras)]),
    enabled: estructuras.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

export function useTodaManoObra() {
  return useQuery({
    queryKey: ['toda-mano-obra'],
    queryFn: fetchTodaManoObra,
    staleTime: Infinity, // Mano de Obra pricing rarely changes
  })
}
