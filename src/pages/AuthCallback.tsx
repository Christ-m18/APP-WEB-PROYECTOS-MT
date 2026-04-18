import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import styles from './Auth.module.css'

type Status = 'loading' | 'success' | 'error'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // PKCE flow: Supabase envía un `code` como query param
        const code = searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setErrorMsg(error.message)
            setStatus('error')
            return
          }
        }

        // Verificamos que la sesión quedó activa
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setErrorMsg('No se pudo verificar la sesión. El enlace puede haber expirado.')
          setStatus('error')
          return
        }

        setStatus('success')

        // Redirigir automáticamente a la app tras 2 segundos
        setTimeout(() => void navigate('/app', { replace: true }), 2000)
      } catch (err) {
        setErrorMsg(String(err))
        setStatus('error')
      }
    }

    void handleCallback()
  }, [navigate, searchParams])

  return (
    <div className={styles.authPage}>
      <div className={styles.interactiveGrid} />
      <div className={styles.card} style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div className={styles.iconCircle} style={{ margin: '0 auto 1.5rem' }}>
              <Loader2 size={32} strokeWidth={2.5} className="animate-spin" />
            </div>
            <h2 className={styles.cardHeader} style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900 }}>
              Verificando cuenta...
            </h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Por favor espera un momento.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.iconCircle} style={{ margin: '0 auto 1.5rem', background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#86efac' }}>
              <CheckCircle size={32} strokeWidth={2.5} />
            </div>
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
              ¡Correo Verificado!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.7' }}>
              Tu cuenta ha sido activada exitosamente.
              <br />
              Serás redirigido al portal en unos segundos...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.iconCircle} style={{ margin: '0 auto 1.5rem', background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <XCircle size={32} strokeWidth={2.5} />
            </div>
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
              Error de Verificación
            </h2>
            <p style={{ color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {errorMsg}
            </p>
            <a href="/registro" style={{ color: '#a5b4fc', fontWeight: 800, textDecoration: 'none' }}>
              Volver al registro
            </a>
          </>
        )}
      </div>
    </div>
  )
}
