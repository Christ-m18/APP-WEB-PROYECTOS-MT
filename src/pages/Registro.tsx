import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { registroSchema, type RegistroFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { toast } from '@/components/ui/use-toast'
import { UserPlus, ArrowLeft, Mail, Lock, User, Building, ShieldCheck, KeyRound } from 'lucide-react'
import styles from './Auth.module.css'

export default function Registro() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const {
    register,
    control,
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

      void navigate('/confirmar-correo')
    } catch (err) {
      toast({ title: 'ERROR INESPERADO', description: String(err), variant: 'destructive' })
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.interactiveGrid} />
      <form className={styles.card} style={{ maxWidth: '600px' }} onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <div className={styles.cardHeader}>
          <div className={styles.iconCircle}>
            <UserPlus size={32} strokeWidth={2.5} />
          </div>
          <h2>Crea tu Cuenta</h2>
          <p>Forma parte de la red de ingenieros SIE Pro</p>
        </div>

        <div className="space-y-4">
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>NOMBRE</label>
              <div className={styles.inputWrapper}>
                <Input {...register('nombre')} className={styles.input} placeholder="Juan" />
                <User className={styles.inputIcon} size={18} />
              </div>
              {errors.nombre && <span className={styles.alert}>{errors.nombre.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>APELLIDO</label>
              <div className={styles.inputWrapper}>
                <Input {...register('apellido')} className={styles.input} placeholder="Pérez" />
                <User className={styles.inputIcon} size={18} />
              </div>
              {errors.apellido && <span className={styles.alert}>{errors.apellido.message}</span>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>EMPRESA / INSTITUCIÓN</label>
              <div className={styles.inputWrapper}>
                <Input {...register('empresa')} className={styles.input} placeholder="Nombre de la organización" />
                <Building className={styles.inputIcon} size={18} />
              </div>
              {errors.empresa && <span className={styles.alert}>{errors.empresa.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>TELÉFONO</label>
              <Controller
                name="telefono"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    darkTheme
                    inputClassName={styles.phoneInputField}
                  />
                )}
              />
              {errors.telefono && <span className={styles.alert}>{errors.telefono.message}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>CORREO ELECTRÓNICO</label>
            <div className={styles.inputWrapper}>
              <Input type="email" {...register('email')} className={styles.input} placeholder="nombre@correo.com" />
              <Mail className={styles.inputIcon} size={18} />
            </div>
            {errors.email && <span className={styles.alert}>{errors.email.message}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>CONTRASEÑA</label>
              <div className={styles.inputWrapper}>
                <Input type="password" {...register('password')} className={styles.input} placeholder="••••••••" />
                <Lock className={styles.inputIcon} size={18} />
              </div>
              {errors.password && <span className={styles.alert}>{errors.password.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>CONFIRMAR</label>
              <div className={styles.inputWrapper}>
                <Input type="password" {...register('confirmPassword')} className={styles.input} placeholder="••••••••" />
                <KeyRound className={styles.inputIcon} size={18} />
              </div>
              {errors.confirmPassword && <span className={styles.alert}>{errors.confirmPassword.message}</span>}
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className={styles.btnSubmit}>
          <ShieldCheck size={20} strokeWidth={3} /> {isSubmitting ? 'REGISTRANDO...' : 'CREAR MI CUENTA PROFESIONAL'}
        </Button>

        <p className={styles.switchText}>
          ¿YA TIENES CUENTA?{' '}
          <Link to="/login" className={styles.link}>INICIAR SESIÓN</Link>
        </p>

        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} /> VOLVER AL INICIO
        </Link>
      </form>
    </div>
  )
}
