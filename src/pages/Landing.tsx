import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, BarChart3, ArrowRight, Cpu, MousePointerClick, ShieldCheck, FileCheck } from 'lucide-react'
import styles from './Landing.module.css'

export default function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Seguimiento ultra-preciso usando píxeles directos
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const features = [
    { 
      title: 'Cálculo Real-Time', 
      desc: 'Procesamiento instantáneo de costos y materiales.',
      icon: <Zap size={24} /> 
    },
    { 
      title: 'Estándar SIE RD', 
      desc: 'Normativa oficial de la Superintendencia 2024.',
      icon: <BarChart3 size={24} /> 
    },
    { 
      title: 'Exportación Pro', 
      desc: 'Generación de reportes PDF de alta fidelidad.',
      icon: <FileCheck size={24} /> 
    },
    { 
      title: 'Seguridad TLS', 
      desc: 'Cifrado de datos de grado bancario (AES-256).',
      icon: <ShieldCheck size={24} /> 
    }
  ]

  return (
    <div className={styles.landing}>
      <div className={styles.interactiveGrid} />
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className={styles.logoCircle}
        >
          <Cpu size={42} color="var(--color-primary)" strokeWidth={2.5} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className={styles.badge}>
            <MousePointerClick size={14} /> <span>SISTEMA DE INGENIERÍA SIE PRO</span>
          </div>
          <h1 className={styles.title}>
            Presupuestos de <span>Media Tensión</span>
          </h1>
          <p className={styles.subtitle}>
            La plataforma técnica líder para la valorización de proyectos eléctricos en República Dominicana. 
            Precisión, normativa y rapidez en un solo lugar.
          </p>
        </motion.div>

        <motion.div 
          className={styles.actions}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <button className={styles.btnPrimary} onClick={() => void navigate('/login')}>
            INGRESAR AL SISTEMA <ArrowRight size={18} strokeWidth={3} />
          </button>
          <button className={styles.btnSecondary} onClick={() => void navigate('/registro')}>
            SOLICITAR ACCESO
          </button>
        </motion.div>

        {/* Feature row - Ahora con descripciones */}
        <motion.div 
          className={styles.featureRow}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
        >
          {features.map((f, i) => (
            <div key={i} className={styles.featureItem}>
              <span className={styles.featureIconSmall}>{f.icon}</span>
              <div className={styles.featureTextContainer}>
                <span className={styles.featureTextSmall}>{f.title}</span>
                <p className={styles.featureDescriptionSmall}>{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <div className={styles.footer}>
          <span>© {new Date().getFullYear()} MT Presupuestos SIE</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>DOMINICANA DIGITAL</span>
            <span>v2.9.0-GOLD</span>
          </div>
        </div>
      </div>
    </div>
  )
}
