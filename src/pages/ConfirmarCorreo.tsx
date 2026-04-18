import { useEffect } from 'react'
import { MailCheck, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import styles from './Auth.module.css'

export default function ConfirmarCorreo() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className={styles.authPage}>
      <div className={styles.interactiveGrid} />
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <div className={styles.cardHeader}>
          <div className={styles.iconCircle}>
            <MailCheck size={32} strokeWidth={2.5} />
          </div>
          <h2>Revisa tu Correo</h2>
          <p>Te enviamos un enlace de confirmación</p>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '2rem' }}>
          Para activar tu cuenta, haz clic en el enlace que enviamos a tu correo electrónico.
          Puede tardar unos minutos en llegar — revisa también tu carpeta de spam.
        </p>

        <p style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: '1.6' }}>
          Una vez confirmado, serás redirigido automáticamente al portal.
        </p>

        <Link to="/login" className={styles.backLink} style={{ marginTop: '2rem' }}>
          <ArrowLeft size={16} /> VOLVER AL INICIO DE SESIÓN
        </Link>
      </div>
    </div>
  )
}
