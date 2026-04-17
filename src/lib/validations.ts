import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const registroSchema = z
  .object({
    nombre: z.string().min(2, 'Nombre requerido'),
    apellido: z.string().min(2, 'Apellido requerido'),
    empresa: z.string().min(2, 'Empresa requerida'),
    telefono: z.string().min(10, 'Teléfono inválido'),
    email: z.string().email('Correo inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const proyectoSchema = z.object({
  nombre: z.string().min(3, 'Nombre del proyecto requerido'),
  cliente: z.string().min(2, 'Cliente requerido'),
  fecha: z.string().min(1, 'Fecha requerida'),
  voltaje: z.string().min(1, 'Voltaje requerido'),
  estado: z.enum(['borrador', 'enviado', 'aprobado', 'rechazado']),
  overhead: z.coerce.number().min(0).max(100),
  aplicar_itbis: z.boolean(),
})

export const perfilSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  apellido: z.string().min(2, 'Apellido requerido'),
  empresa: z.string().min(2, 'Empresa requerida'),
  telefono: z.string().min(10, 'Teléfono inválido'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegistroFormData = z.infer<typeof registroSchema>
export type ProyectoFormData = z.infer<typeof proyectoSchema>
export type PerfilFormData = z.infer<typeof perfilSchema>
