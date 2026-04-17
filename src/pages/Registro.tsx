import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { registroSchema, type RegistroFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { UserPlus, ArrowLeft, Mail, Lock, User, Building, Phone, Globe } from 'lucide-react'
import styles from './Auth.module.css'

export default function Registro() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroFormData>({ resolver: zodResolver(registroSchema) })

  const onSubmit = async (data: RegistroFormData) => {
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nombre: data.nombre,
            apellido: data.apellido,
            empresa: data.empresa,
            telefono: data.telefono,
          },
        },
      })

      if (error) {
        toast({ title: 'ERROR DE REGISTRO', description: error.message, variant: 'destructive' })
        return
      }

      if (signUpData.user) {
        try {
          await supabase.from('perfiles').insert({
            id: signUpData.user.id,
            nombre: data.nombre,
            apellido: data.apellido,
            empresa: data.empresa,
            telefono: data.telefono,
            email: data.email,
          })
        } catch (err) {
          console.warn('Profile creation deferred:', err)
        }
      }

      toast({ 
        title: 'CUENTA CREADA', 
        description: 'Hemos enviado un correo de confirmación. Por favor, revisa tu bandeja de entrada.' 
      })
      void navigate('/login')
    } catch (err) {
      toast({ title: 'ERROR INESPERADO', description: String(err), variant: 'destructive' })
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <form className={styles.card} onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <div className={styles.cardHeader}>
          <div className={styles.iconCircle}>
            <Globe size={32} color="var(--color-primary)" />
          </div>
          <h2>Crear Cuenta</h2>
          <p>Únete a la plataforma de presupuestos inteligentes</p>
        </div>

        <div className="space-y-4">
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="nombre">
                <User size={12} className="inline mr-1" /> NOMBRE
              </label>
              <Input id="nombre" type="text" {...register('nombre')} className={styles.input} placeholder="p. ej. Juan" />
              {errors.nombre && <span className={styles.alert}>{errors.nombre.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="apellido">
                APELLIDO
              </label>
              <Input id="apellido" type="text" {...register('apellido')} className={styles.input} placeholder="p. ej. Pérez" />
              {errors.apellido && <span className={styles.alert}>{errors.apellido.message}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="empresa">
              <Building size={12} className="inline mr-1" /> EMPRESA / ORGANIZACIÓN
            </label>
            <Input id="empresa" type="text" {...register('empresa')} className={styles.input} placeholder="Nombre de tu empresa" />
            {errors.empresa && <span className={styles.alert}>{errors.empresa.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="telefono">
              <Phone size={12} className="inline mr-1" /> TELÉFONO DE CONTACTO
            </label>
            <Input id="telefono" type="tel" {...register('telefono')} className={styles.input} placeholder="809-555-0000" />
            {errors.telefono && <span className={styles.alert}>{errors.telefono.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              <Mail size={12} className="inline mr-1" /> CORREO ELECTRÓNICO
            </label>
            <Input id="email" type="email" {...register('email')} className={styles.input} placeholder="tu@email.com" />
            {errors.email && <span className={styles.alert}>{errors.email.message}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                <Lock size={12} className="inline mr-1" /> CONTRASEÑA
              </label>
              <Input id="password" type="password" {...register('password')} className={styles.input} placeholder="••••••••" />
              {errors.password && <span className={styles.alert}>{errors.password.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">
                CONFIRMAR
              </label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} className={styles.input} placeholder="••••••••" />
              {errors.confirmPassword && <span className={styles.alert}>{errors.confirmPassword.message}</span>}
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className={styles.btnSubmit}>
          <UserPlus size={18} className="mr-2" /> {isSubmitting ? 'PROCESANDO...' : 'REGISTRARME'}
        </Button>

        <p className={styles.switchText}>
          ¿YA TIENES CUENTA?{' '}
          <Link to="/login" className={styles.link}>INICIAR SESIÓN</Link>
        </p>

        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={14} className="inline mr-1" /> VOLVER AL INICIO
        </Link>
      </form>
    </div>
  )
}
