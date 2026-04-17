import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { LogIn, ArrowLeft, Mail, Lock, CircuitBoard } from 'lucide-react'
import styles from './Auth.module.css'

export default function Login() {
  const navigate = useNavigate()
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
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <form className={styles.card} onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <div className={styles.cardHeader}>
          <div className={styles.iconCircle}>
            <CircuitBoard size={32} color="var(--color-primary)" />
          </div>
          <h2>Iniciar Sesión</h2>
          <p>Bienvenido de nuevo a la plataforma</p>
        </div>

        <div className="space-y-4">
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              <Mail size={14} className="inline mr-2" /> CORREO ELECTRÓNICO
            </label>
            <Input 
              id="email" 
              type="email" 
              {...register('email')} 
              className={styles.input} 
              placeholder="tu@email.com" 
            />
            {errors.email && <span className={styles.alert}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              <Lock size={14} className="inline mr-2" /> CONTRASEÑA
            </label>
            <Input 
              id="password" 
              type="password" 
              {...register('password')} 
              className={styles.input} 
              placeholder="••••••••" 
            />
            {errors.password && <span className={styles.alert}>{errors.password.message}</span>}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className={styles.btnSubmit}>
          <LogIn size={18} className="mr-2" /> {isSubmitting ? 'VERIFICANDO...' : 'ENTRAR'}
        </Button>

        <p className={styles.switchText}>
          ¿NO TIENES CUENTA?{' '}
          <Link to="/registro" className={styles.link}>REGÍSTRATE AQUÍ</Link>
        </p>

        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={14} className="inline mr-1" /> VOLVER AL INICIO
        </Link>
      </form>
    </div>
  )
}
