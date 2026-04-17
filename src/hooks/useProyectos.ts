import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProyectos,
  fetchProyecto,
  createProyecto,
  updateProyecto,
  deleteProyecto,
} from '@/lib/db'
import type { Proyecto, Partida } from '@/types'

export const PROYECTOS_KEY = ['proyectos'] as const

export function useProyectos() {
  return useQuery({
    queryKey: PROYECTOS_KEY,
    queryFn: fetchProyectos,
  })
}

export function useProyecto(id: string) {
  return useQuery({
    queryKey: ['proyectos', id],
    queryFn: () => fetchProyecto(id),
    enabled: !!id,
  })
}

export function useCreateProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      proyecto,
      partidas,
    }: {
      proyecto: Omit<Proyecto, 'id' | 'creado_en'>
      partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
    }) => createProyecto(proyecto, partidas),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROYECTOS_KEY })
    },
  })
}

export function useUpdateProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      proyecto,
      partidas,
    }: {
      id: string
      proyecto: Partial<Omit<Proyecto, 'id' | 'creado_en'>>
      partidas: Omit<Partida, 'id' | 'proyecto_id'>[]
    }) => updateProyecto(id, proyecto, partidas),
    onSuccess: (updated) => {
      if (updated?.id) {
        // Update the specific project in the cache
        qc.setQueryData(['proyectos', updated.id], updated)
      }
      // Force a re-fetch of the projects list on next access
      void qc.invalidateQueries({ 
        queryKey: PROYECTOS_KEY,
        exact: true,
        refetchType: 'active'
      })
    },
  })
}

export function useDeleteProyecto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProyecto(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROYECTOS_KEY })
    },
  })
}
