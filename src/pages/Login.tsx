import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OAuthButtons } from '@/components/ui/oauth-buttons'
import { LogIn, ArrowLeft, Mail, KeyRound, CircuitBoard, AlertTriangle, MailWarning, ShieldOff } from 'lucide-react'
import LegalFooter from '@/components/legal/LegalFooter'
import styles from './Auth.module.css'

type LoginErrorType = 'email' | 'password' | 'unverified' | 'generic'

interface LoginError {
  type: LoginErrorType
  message: string
}

function parseSupabaseError(message: string): LoginError {
  const msg = message.toLowerCase()

  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return {
      type: 'unverified',
      message: 'Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada y confirma tu cuenta antes de ingresar.',
    }
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return {
      type: 'password',
      message: 'El correo o la contraseña son incorrectos. Verifica tus datos e intenta de nuevo.',
    }
  }
  if (msg.includes('user not found') || msg.includes('no user')) {
    return {
      type: 'email',
      message: 'No existe ninguna cuenta registrada con ese correo electrónico.',
    }
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return {
      type: 'generic',
      message: 'Demasiados intentos fallidos. Espera unos minutos antes de intentarlo de nuevo.',
    }
  }
  return { type: 'generic', message }
}

const errorConfig: Record<LoginErrorType, {
  icon: React.ElementType
  color: string
  bg: string
  border: string
}> = {
  email:      { icon: MailWarning,   color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.35)'  },
  password:   { icon: ShieldOff,     color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.35)'   },
  unverified: { icon: MailWarning,   color: '#eab308', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.35)'   },
  generic:    { icon: AlertTriangle, color: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.35)' },
}

export default function Login() {
  const navigate = useNavigate()
  const [loginError, setLoginError] = useState<LoginError | null>(null)

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
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setLoginError(parseSupabaseError(error.message))
      return
    }
    queryClient.clear()
    void navigate('/app')
  }

  const cfg = loginError ? errorConfig[loginError.type] : null

  return (
    <div className={styles.authPage}>
      <div className={styles.interactiveGrid} />
      <form className={styles.card} onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <div className={styles.cardHeader}>
          <div className={styles.iconCircle}>
            <CircuitBoard size={32} strokeWidth={2.5} />
          </div>
          <h2>Ingreso al Sistema</h2>
          <p>Portal de Gestión Energética SIE Pro</p>
        </div>

        <div className="space-y-5">
          <div className={styles.field}>
            <label className={styles.label}>CORREO CORPORATIVO</label>
            <div className={styles.inputWrapper}>
              <Input
                type="email"
                {...register('email')}
                className={`${styles.input} ${
                  loginError?.type === 'email' || loginError?.type === 'password'
                    ? styles.inputError
                    : ''
                }`}
                placeholder="ej: nombre@empresa.com"
                onChange={() => setLoginError(null)}
              />
              <Mail className={styles.inputIcon} size={18} />
            </div>
            {errors.email && <span className={styles.alert}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>CONTRASEÑA</label>
            <div className={styles.inputWrapper}>
              <Input
                type="password"
                {...register('password')}
                className={`${styles.input} ${
                  loginError?.type === 'password' ? styles.inputError : ''
                }`}
                placeholder="••••••••"
                onChange={() => setLoginError(null)}
              />
              <KeyRound className={styles.inputIcon} size={18} />
            </div>
            {errors.password && <span className={styles.alert}>{errors.password.message}</span>}
          </div>
        </div>

        {/* Banner de error contextual */}
        {loginError && cfg && (
          <div
            className={styles.loginErrorBanner}
            style={{
              background: cfg.bg,
              border: `1.5px solid ${cfg.border}`,
              color: cfg.color,
            }}
          >
            <cfg.icon size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <span>{loginError.message}</span>
              {loginError.type === 'unverified' && (
                <Link
                  to="/confirmar-correo"
                  className={styles.loginErrorLink}
                  style={{ color: cfg.color }}
                >
                  Ir a confirmar correo →
                </Link>
              )}
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={styles.btnSubmit}
          style={{ marginTop: '1rem' }}
        >
          <LogIn size={20} strokeWidth={3} />
          {isSubmitting ? 'AUTENTICANDO...' : 'ENTRAR AL PORTAL'}
        </Button>

        <div className={styles.oauthDivider}>
          <span className={styles.oauthDividerLine} />
          <span className={styles.oauthDividerText}>O CONTINUAR CON</span>
          <span className={styles.oauthDividerLine} />
        </div>
        <OAuthButtons />

        <p className={styles.switchText}>
          ¿SIN CREDENCIALES?{' '}
          <Link to="/registro" className={styles.link}>SOLICITAR ACCESO AQUÍ</Link>
        </p>

        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} /> VOLVER A LA PÁGINA INICIAL
        </Link>

        <LegalFooter variant="dark" />
      </form>
    </div>
  )
}
