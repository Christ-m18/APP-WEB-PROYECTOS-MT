import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import styles from './Auth.module.css'

type Status = 'loading' | 'success' | 'error'

// Mirrors @supabase/auth-js EmailOtpType (not re-exported by supabase-js)
type OtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email'

const VALID_OTP_TYPES = new Set<string>([
  'signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email',
])

function toOtpType(raw: string | null): OtpType | null {
  return raw !== null && VALID_OTP_TYPES.has(raw) ? (raw as OtpType) : null
}

// Populate OAuth profile fields on first login (nombre/apellido come from the provider).
// Uses UPDATE ... WHERE nombre IS NULL so it never overwrites user-edited profiles.
async function populateOAuthProfile(session: Session): Promise<void> {
  const provider = session.user.app_metadata['provider'] as string | undefined
  if (provider !== 'google' && provider !== 'facebook') return

  const meta = session.user.user_metadata
  const toStr = (v: unknown): string => (typeof v === 'string' ? v : '')
  const fullName = toStr(meta['full_name']) || toStr(meta['name'])
  const nombre = toStr(meta['given_name']) || fullName.split(' ')[0] || ''
  const apellido = toStr(meta['family_name']) || fullName.split(' ').slice(1).join(' ')

  if (nombre) {
    await supabase
      .from('perfiles')
      .update({ nombre, apellido: apellido || undefined })
      .eq('id', session.user.id)
      .is('nombre', null)
  }
}

function isOAuthProvider(session: Session): boolean {
  const provider = session.user.app_metadata['provider'] as string | undefined
  return provider === 'google' || provider === 'facebook'
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [isOAuth, setIsOAuth] = useState(false)
  // Prevents double-finalization in React StrictMode and concurrent renders
  const handled = useRef(false)

  useEffect(() => {
    // --- 1. Handle OAuth provider errors (e.g. user cancelled Google login) ---
    const oauthError = searchParams.get('error')
    const oauthErrorDesc = searchParams.get('error_description')
    if (oauthError) {
      const msg = oauthErrorDesc ?? oauthError
      setErrorMsg(msg.replace(/_/g, ' '))
      setStatus('error')
      return
    }

    // --- 2. Timeout safety net ---
    const timeoutId = setTimeout(() => {
      if (!handled.current) {
        setErrorMsg('No se pudo verificar la sesión. El enlace puede haber expirado.')
        setStatus('error')
      }
    }, 10_000)

    // --- 3. Finalize: update profile, clear cache, navigate ---
    const finalize = async (session: Session) => {
      if (handled.current) return
      handled.current = true
      clearTimeout(timeoutId)

      setIsOAuth(isOAuthProvider(session))

      try {
        await populateOAuthProfile(session)
      } catch {
        // Best-effort: profile update failure must not block auth flow
      }

      queryClient.clear()
      setStatus('success')
      setTimeout(() => void navigate('/app', { replace: true }), 2000)
    }

    // --- 4. Subscribe to auth state BEFORE initiating any exchange ---
    // This is the key fix: onAuthStateChange fires AFTER the session is
    // fully persisted in storage, which avoids the race condition that
    // getSession() has when called immediately after exchangeCodeForSession.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        void finalize(session)
      }
    })

    // --- 5. Trigger the appropriate exchange (fires SIGNED_IN when done) ---
    //
    // Supabase uses two different URL formats for confirmation emails:
    //   A) PKCE flow (default v2): ?code={code}
    //      → exchangeCodeForSession requires the PKCE verifier stored in
    //        sessionStorage from when signUp was called (same browser session).
    //   B) Token-hash flow (newer email templates): ?token_hash={hash}&type={type}
    //      → verifyOtp works cross-session / cross-browser (no verifier needed).
    //
    // emailRedirectTo in signUp ensures Supabase always uses /auth/callback as
    // the post-verification destination, regardless of the dashboard Site URL.

    const onExchangeError = (error: { message: string }) => {
      if (!handled.current) {
        clearTimeout(timeoutId)
        subscription.unsubscribe()
        setErrorMsg(error.message)
        setStatus('error')
      }
    }

    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const otpType = toOtpType(searchParams.get('type'))

    if (code) {
      // Format A: PKCE
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) onExchangeError(error)
      })
    } else if (tokenHash && otpType) {
      // Format B: token hash (newer Supabase email templates)
      void supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType }).then(({ error }) => {
        if (error) onExchangeError(error)
      })
    }
    // If neither param is present, the timeout fires with the fallback message.

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
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
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900 }}>
              Verificando cuenta...
            </h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
              Por favor espera un momento.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              className={styles.iconCircle}
              style={{ margin: '0 auto 1.5rem', background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#86efac' }}
            >
              <CheckCircle size={32} strokeWidth={2.5} />
            </div>
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
              {isOAuth ? '¡Acceso Concedido!' : '¡Correo Verificado!'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.7' }}>
              {isOAuth
                ? 'Tu identidad fue verificada exitosamente.'
                : 'Tu cuenta ha sido activada exitosamente.'}
              <br />
              Serás redirigido al portal en unos segundos...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              className={styles.iconCircle}
              style={{ margin: '0 auto 1.5rem', background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
            >
              <XCircle size={32} strokeWidth={2.5} />
            </div>
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
              Error de Verificación
            </h2>
            <p style={{ color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {errorMsg}
            </p>
            <a href="/login" style={{ color: '#a5b4fc', fontWeight: 800, textDecoration: 'none' }}>
              Volver al inicio de sesión
            </a>
          </>
        )}

      </div>
    </div>
  )
}
