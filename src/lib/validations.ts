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
    telefono: z.string().refine(v => v.replace(/\D/g, '').length >= 7, 'Teléfono inválido'),
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
  overhead: z.number().min(0).max(100),
  aplicar_itbis: z.boolean(),
})

export const perfilSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  apellido: z.string().min(2, 'Apellido requerido'),
  empresa: z.string().min(2, 'Empresa requerida'),
  telefono: z.string().refine(v => v.replace(/\D/g, '').length >= 7, 'Teléfono inválido'),
})

export const pagoSchema = z.object({
  banco: z.string().min(1, 'Banco requerido'),
  referencia: z.string().min(3, 'Referencia requerida'),
  fecha_pago: z.string().min(1, 'Fecha de pago requerida'),
  monto: z.number({ message: 'Monto requerido' }).positive('Monto debe ser mayor a 0'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegistroFormData = z.infer<typeof registroSchema>
export type ProyectoFormData = z.infer<typeof proyectoSchema>
export type PerfilFormData = z.infer<typeof perfilSchema>
export type PagoFormData = z.infer<typeof pagoSchema>
