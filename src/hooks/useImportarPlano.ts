import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ItemExtraido } from '@/lib/planImporter'

// Umbral: si el PDF supera ~5 MB (margen sobre el límite 6 MB del payload de Edge),
// lo subimos a Storage en vez de inline.
const UMBRAL_INLINE_BYTES = 5 * 1024 * 1024

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

async function subirAStorageTmp(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error } = await supabase.storage
    .from('planos_tmp')
    .upload(path, file, { contentType: 'application/pdf', upsert: false })
  if (error) throw new Error(`Subida a storage falló: ${error.message}`)
  return path
}

interface ImportarPlanoInput {
  file: File
  proyectoId?: string | null
}

interface ImportarPlanoResponse {
  items: ItemExtraido[]
  cache?: boolean
  modelo?: string
}

export function useImportarPlano() {
  return useMutation({
    mutationFn: async ({ file, proyectoId }: ImportarPlanoInput): Promise<ItemExtraido[]> => {
      const usarStorage = file.size > UMBRAL_INLINE_BYTES

      const body: Record<string, unknown> = {
        nombreArchivo: file.name,
        proyectoId: proyectoId ?? null,
      }
      if (usarStorage) {
        body.storagePath = await subirAStorageTmp(file)
      } else {
        body.archivoBase64 = await fileToBase64(file)
      }

      const { data, error } = await supabase.functions.invoke<ImportarPlanoResponse>(
        'extract-plano',
        { body }
      )
      if (error) throw new Error(error.message || 'Error al invocar la función')
      if (!data || !Array.isArray(data.items)) {
        throw new Error('Respuesta inválida del servidor')
      }
      return data.items
    },
  })
}
