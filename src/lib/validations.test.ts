import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registroSchema,
  proyectoSchema,
  perfilSchema,
} from '@/lib/validations'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'secret123' }).success
    ).toBe(true)
  })
  it('rejects invalid email', () => {
    expect(
      loginSchema.safeParse({ email: 'not-email', password: 'secret123' }).success
    ).toBe(false)
  })
  it('rejects short password', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success
    ).toBe(false)
  })
  it('rejects missing password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false)
  })
})

describe('registroSchema', () => {
  const valid = {
    nombre: 'Juan',
    apellido: 'Perez',
    empresa: 'MT Corp',
    telefono: '8091234567',
    email: 'juan@mt.com',
    password: 'pass1234',
    confirmPassword: 'pass1234',
    aceptaTerminos: true,
  }
  it('accepts valid registration', () => {
    expect(registroSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects mismatched passwords', () => {
    expect(
      registroSchema.safeParse({ ...valid, confirmPassword: 'different' }).success
    ).toBe(false)
  })
  it('rejects short name', () => {
    expect(registroSchema.safeParse({ ...valid, nombre: 'J' }).success).toBe(false)
  })
  it('rejects short apellido', () => {
    expect(registroSchema.safeParse({ ...valid, apellido: 'P' }).success).toBe(false)
  })
  it('rejects invalid email', () => {
    expect(
      registroSchema.safeParse({ ...valid, email: 'not-valid' }).success
    ).toBe(false)
  })
  it('rejects when terms are not accepted', () => {
    expect(
      registroSchema.safeParse({ ...valid, aceptaTerminos: false }).success
    ).toBe(false)
  })
  it('rejects when terms field is missing', () => {
    const { aceptaTerminos: _omit, ...sinTerminos } = valid
    void _omit
    expect(registroSchema.safeParse(sinTerminos).success).toBe(false)
  })
})

describe('proyectoSchema', () => {
  const valid = {
    nombre: 'Torre X',
    cliente: 'Cliente SA',
    fecha: '2026-04-17',
    voltaje: 'monofasico',
    estado: 'borrador' as const,
    overhead: 10,
    aplicar_itbis: false,
  }
  it('accepts valid project', () => {
    expect(proyectoSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects overhead > 100', () => {
    expect(proyectoSchema.safeParse({ ...valid, overhead: 101 }).success).toBe(false)
  })
  it('rejects overhead < 0', () => {
    expect(proyectoSchema.safeParse({ ...valid, overhead: -1 }).success).toBe(false)
  })
  it('rejects invalid estado', () => {
    expect(
      proyectoSchema.safeParse({ ...valid, estado: 'unknown' }).success
    ).toBe(false)
  })
  it('accepts all valid estados', () => {
    const estados = ['borrador', 'enviado', 'aprobado', 'rechazado'] as const
    estados.forEach((estado) => {
      expect(proyectoSchema.safeParse({ ...valid, estado }).success).toBe(true)
    })
  })
  it('rejects short nombre', () => {
    expect(proyectoSchema.safeParse({ ...valid, nombre: 'AB' }).success).toBe(false)
  })
})

describe('perfilSchema', () => {
  const valid = {
    nombre: 'Juan',
    apellido: 'Perez',
    empresa: 'MT Corp',
    telefono: '8091234567',
  }
  it('accepts valid perfil', () => {
    expect(perfilSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects short telefono', () => {
    expect(perfilSchema.safeParse({ ...valid, telefono: '123' }).success).toBe(false)
  })
  it('rejects short empresa', () => {
    expect(perfilSchema.safeParse({ ...valid, empresa: 'X' }).success).toBe(false)
  })
  it('rejects short nombre', () => {
    expect(perfilSchema.safeParse({ ...valid, nombre: 'J' }).success).toBe(false)
  })
})
