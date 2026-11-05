import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown } from 'lucide-react'
import styles from './ProModal.module.css'

interface ProModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: React.ReactNode
  upgradeText?: string
  backText?: string
  onBack?: () => void
  upgradeUrl?: string
}

export default function ProModal({
  isOpen,
  onClose,
  title = 'Funcionalidad Pro',
  description,
  upgradeText = 'Mejorar Mi Plan',
  backText = 'Volver',
  onBack,
  upgradeUrl = '/app/suscripcion',
}: ProModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      onClose()
    }
  }

  const handleUpgrade = () => {
    onClose()
    void navigate(upgradeUrl)
  }

  return (
    <div className={styles.overlay} onClick={handleBack}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrap}>
          <Crown size={48} />
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>
          {description ?? (
            <>
              Crear nuevos presupuestos requiere el plan <strong>Pro</strong> una vez alcanzado el límite de tu plan inicial gratuito.
              Mejora tu plan para gestionar tus presupuestos sin restricciones.
            </>
          )}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnUpgrade}
            onClick={handleUpgrade}
          >
            <Crown size={18} />
            {upgradeText}
          </button>
          <button
            type="button"
            className={styles.btnBack}
            onClick={handleBack}
          >
            {backText}
          </button>
        </div>
      </div>
    </div>
  )
}

