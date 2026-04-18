import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { LogIn, ArrowLeft, Mail, Lock, CircuitBoard, KeyRound } from 'lucide-react'
import styles from './Auth.module.css'

export default function Login() {
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
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      toast({ title: 'ERROR DE ACCESO', description: error.message, variant: 'destructive' })
      return
    }
    void navigate('/app')
  }

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
                className={styles.input} 
                placeholder="ej: nombre@empresa.com" 
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
                className={styles.input} 
                placeholder="••••••••" 
              />
              <KeyRound className={styles.inputIcon} size={18} />
            </div>
            {errors.password && <span className={styles.alert}>{errors.password.message}</span>}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className={styles.btnSubmit}>
          <LogIn size={20} strokeWidth={3} /> {isSubmitting ? 'AUTENTICANDO...' : 'ENTRAR AL PORTAL'}
        </Button>

        <p className={styles.switchText}>
          ¿SIN CREDENCIALES?{' '}
          <Link to="/registro" className={styles.link}>SOLICITAR ACCESO AQUÍ</Link>
        </p>

        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} /> VOLVER A LA PÁGINA INICIAL
        </Link>
      </form>
    </div>
  )
}
