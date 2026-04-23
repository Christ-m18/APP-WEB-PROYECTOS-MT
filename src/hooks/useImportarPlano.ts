import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ItemExtraido } from '@/lib/planImporter'

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const result = reader.result as string
      const commaIdx = result.indexOf(',')
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

interface ImportarPlanoInput {
  file: File
  proyectoId?: string | null
}

interface ImportarPlanoResponse {
  items: ItemExtraido[]
}

export function useImportarPlano() {
  return useMutation({
    mutationFn: async ({ file, proyectoId }: ImportarPlanoInput): Promise<ItemExtraido[]> => {
      const archivoBase64 = await fileToBase64(file)
      const { data, error } = await supabase.functions.invoke<ImportarPlanoResponse>(
        'extract-plano',
        {
          body: {
            archivoBase64,
            nombreArchivo: file.name,
            proyectoId: proyectoId ?? null,
          },
        }
      )
      if (error) throw new Error(error.message || 'Error al invocar la función')
      if (!data || !Array.isArray(data.items)) {
        throw new Error('Respuesta inválida del servidor')
      }
      return data.items
    },
  })
}
