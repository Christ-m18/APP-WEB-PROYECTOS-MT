import { useNavigate } from 'react-router-dom'
import { usePerfil } from '@/hooks/usePerfil'
import { useMiSuscripcion } from '@/hooks/useSuscripcion'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { ShieldBan, Clock, Crown, ArrowRight, LogOut, Mail } from 'lucide-react'
import styles from './AccountBlockedOverlay.module.css'

type Reason = 'blocked' | 'expired' | null

export default function AccountBlockedOverlay() {
  const navigate = useNavigate()
  const { data: perfil, isLoading: loadingPerfil } = usePerfil()
  const { data: suscripcion, isLoading: loadingSub } = useMiSuscripcion()

  if (loadingPerfil || loadingSub) return null

  let reason: Reason = null

  if (perfil && perfil.activo === false) {
    reason = 'blocked'
  } else if (
    suscripcion?.suscripcion?.estado === 'vencida' &&
    suscripcion.plan?.nombre === 'Pro'
  ) {
    reason = 'expired'
  }

  if (!reason) return null

  const handleLogout = async () => {
    queryClient.clear()
    await supabase.auth.signOut()
    void navigate('/')
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={reason === 'blocked' ? styles.iconBlocked : styles.iconExpired}>
          {reason === 'blocked' ? <ShieldBan size={48} /> : <Clock size={48} />}
        </div>

        {reason === 'blocked' ? (
          <>
            <h2 className={styles.title}>Cuenta Suspendida</h2>
            <p className={styles.desc}>
              Tu cuenta ha sido <strong>desactivada por un administrador</strong>.
              No puedes crear ni editar proyectos hasta que se restablezca el acceso.
            </p>
            <div className={styles.infoBox}>
              <Mail size={16} />
              <span>
                Contacta al administrador para resolver esta situacion
                y recuperar el acceso a tu cuenta.
              </span>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.title}>Suscripcion Vencida</h2>
            <p className={styles.desc}>
              Tu suscripcion al plan <strong>Pro</strong> ha expirado.
              Renueva tu plan para seguir disfrutando de todas las funcionalidades
              sin restricciones.
            </p>
          </>
        )}

        <div className={styles.actions}>
          {reason === 'expired' && (
            <button
              className={styles.btnUpgrade}
              onClick={() => void navigate('/app/suscripcion')}
            >
              <Crown size={18} />
              Renovar Suscripcion
              <ArrowRight size={14} />
            </button>
          )}
          <button
            className={styles.btnLogout}
            onClick={() => void handleLogout()}
          >
            <LogOut size={16} />
            Cerrar Sesion
          </button>
        </div>
      </div>
    </div>
  )
}
