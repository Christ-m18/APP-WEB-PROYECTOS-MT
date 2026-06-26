import { useState } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { recordLegalConsent, type ConsentMethod } from '@/lib/legalConsent'
import styles from './oauth-buttons.module.css'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
)

interface OAuthButtonsProps {
  /**
   * Si se pasa `false`, los botones quedan deshabilitados y al hacer clic se
   * invoca `onConsentRequired`. Si se pasa `true`, el flujo OAuth se inicia y
   * el consentimiento se registra en `localStorage`. Si es `undefined`, no se
   * aplica el gate (compatibilidad hacia atrás).
   */
  consentAccepted?: boolean
  /**
   * Se invoca cuando el usuario hace clic en un proveedor sin haber aceptado
   * el consentimiento legal.
   */
  onConsentRequired?: () => void
  /**
   * Etiqueta del método de consentimiento que se registrará al iniciar OAuth.
   * Default: `'oauth_login'`.
   */
  consentMethod?: ConsentMethod
}

export function OAuthButtons({
  consentAccepted,
  onConsentRequired,
  consentMethod = 'oauth_login',
}: OAuthButtonsProps = {}) {
  const [loading, setLoading] = useState<Provider | null>(null)

  const gateActive = consentAccepted !== undefined
  const blocked = gateActive && consentAccepted !== true

  const handleOAuth = async (provider: Provider) => {
    if (blocked) {
      onConsentRequired?.()
      return
    }
    // Registramos el consentimiento ANTES de redirigir para que sobreviva al
    // round-trip OAuth: AuthCallback lo encontrará al volver del proveedor.
    if (gateActive) {
      recordLegalConsent(consentMethod)
    }
    setLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.warn('OAuth error:', error.message)
      setLoading(null)
    }
    // On success the browser navigates away; state cleanup is not needed
  }

  const disabled = loading !== null
  const buttonTitle = blocked
    ? 'Debes aceptar los Términos antes de continuar'
    : undefined

  return (
    <div className={styles.oauthButtons} aria-describedby={blocked ? 'oauth-consent-warning' : undefined}>
      <button
        type="button"
        className={styles.oauthBtn}
        disabled={disabled}
        aria-disabled={blocked ? 'true' : undefined}
        title={buttonTitle}
        onClick={() => void handleOAuth('google')}
      >
        <GoogleIcon />
        {loading === 'google' ? 'Redirigiendo...' : 'Continuar con Google'}
      </button>
      <button
        type="button"
        className={styles.oauthBtn}
        disabled={disabled}
        aria-disabled={blocked ? 'true' : undefined}
        title={buttonTitle}
        onClick={() => void handleOAuth('facebook')}
      >
        <FacebookIcon />
        {loading === 'facebook' ? 'Redirigiendo...' : 'Continuar con Facebook'}
      </button>
      {blocked && (
        <p
          id="oauth-consent-warning"
          role="status"
          style={{
            margin: '0.4rem 0 0',
            fontSize: '0.72rem',
            color: '#fb7185',
            textAlign: 'center',
          }}
        >
          Marca la casilla de aceptación de Términos para continuar con un proveedor externo.
        </p>
      )}
    </div>
  )
}
