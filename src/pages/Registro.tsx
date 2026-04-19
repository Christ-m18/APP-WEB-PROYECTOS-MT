import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { registroSchema, type RegistroFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { UserPlus, ArrowLeft, Mail, Lock, User, ShieldCheck, KeyRound, AlertTriangle, MailWarning, Phone } from 'lucide-react'
import styles from './Auth.module.css'

type RegErrorType = 'email_exists' | 'phone_exists' | 'weak_password' | 'generic'

interface RegError {
  type: RegErrorType
  message: string
  field?: 'email' | 'telefono'
}

function parseRegistroError(message: string, supabaseCode?: string): RegError {
  const msg = message.toLowerCase()

  // Supabase v2 devuelve este mensaje cuando el correo ya existe
  if (
    msg.includes('user already registered') ||
    msg.includes('already registered') ||
    msg.includes('email address is already') ||
    supabaseCode === 'user_already_exists'
  ) {
    return {
      type: 'email_exists',
      field: 'email',
      message: 'Este correo electrónico ya está registrado. ¿Olvidaste tu contraseña?',
    }
  }

  if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('too'))) {
    return {
      type: 'weak_password',
      message: 'La contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.',
    }
  }

  return { type: 'generic', message }
}

const errorConfig: Record<RegErrorType, {
  icon: React.ElementType
  color: string
  bg: string
  border: string
}> = {
  email_exists:  { icon: MailWarning,   color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.35)'  },
  phone_exists:  { icon: Phone,         color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.35)' },
  weak_password: { icon: AlertTriangle, color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.35)'   },
  generic:       { icon: AlertTriangle, color: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.35)' },
}

export default function Registro() {
  const navigate = useNavigate()
  const [regError, setRegError] = useState<RegError | null>(null)

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
    setRegError(null)

    try {
      // 1. Verificar si el teléfono ya existe en la base de datos
      const { data: existingPhone } = await supabase
        .from('perfiles')
        .select('id')
        .eq('telefono', data.telefono)
        .maybeSingle()

      if (existingPhone) {
        setRegError({
          type: 'phone_exists',
          field: 'telefono',
          message: 'Este número de teléfono ya está asociado a otra cuenta. Utiliza un número diferente.',
        })
        return
      }

      // 2. Intentar registro con Supabase Auth
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
        setRegError(parseRegistroError(error.message, (error as { code?: string }).code))
        return
      }

      // Supabase a veces NO retorna error pero el identities array está vacío → correo duplicado
      if (signUpData.user && signUpData.user.identities?.length === 0) {
        setRegError({
          type: 'email_exists',
          field: 'email',
          message: 'Este correo electrónico ya está registrado. ¿Olvidaste tu contraseña?',
        })
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
      setRegError({ type: 'generic', message: String(err) })
    }
  }

  const cfg = regError ? errorConfig[regError.type] : null

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
              <Input {...register('empresa')} className={styles.inputNoIcon} placeholder="Ej. Energía del Norte" />
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
                    onChange={(v) => { field.onChange(v); setRegError(null) }}
                    darkTheme
                    className={`${styles.phoneContainer} ${regError?.field === 'telefono' ? styles.inputError : ''}`}
                    inputClassName={styles.phoneInputField}
                    buttonClassName={styles.phoneCountryBtn}
                  />
                )}
              />
              {errors.telefono && <span className={styles.alert}>{errors.telefono.message}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>CORREO ELECTRÓNICO</label>
            <div className={styles.inputWrapper}>
              <Input
                type="email"
                {...register('email')}
                className={`${styles.input} ${regError?.field === 'email' ? styles.inputError : ''}`}
                placeholder="nombre@correo.com"
                onChange={() => setRegError(null)}
              />
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

        {/* Banner de error contextual */}
        {regError && cfg && (
          <div
            className={styles.loginErrorBanner}
            style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, color: cfg.color }}
          >
            <cfg.icon size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <span>{regError.message}</span>
              {regError.type === 'email_exists' && (
                <Link to="/login" className={styles.loginErrorLink} style={{ color: cfg.color }}>
                  Ir a Iniciar Sesión →
                </Link>
              )}
            </div>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className={styles.btnSubmit} style={{ marginTop: '1rem' }}>
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
