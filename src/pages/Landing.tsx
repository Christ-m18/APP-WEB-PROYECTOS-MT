import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Shield, BarChart3, Globe, ArrowRight, UserPlus, Cpu } from 'lucide-react'
import styles from './Landing.module.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className={styles.landing}>
      {/* Orbes de fondo dinámicos */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <motion.div 
        className={styles.content}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Logo / Brand Central */}
        <div className={styles.brand}>
          <motion.div 
            className={styles.logoCircle}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Cpu size={48} color="var(--color-accent)" />
          </motion.div>
          <h1 className={styles.title}>MT Presupuestos</h1>
          <span className={styles.badge}>SIE Pro</span>
        </div>

        <p className={styles.subtitle}>
          GESTIÓN PROFESIONAL DE PROYECTOS ELÉCTRICOS
        </p>
        
        <p className={styles.description}>
          Control total sobre el catálogo oficial de estructuras de la 
          <strong> Superintendencia de Electricidad (SIE)</strong>. 
          Presupuestos de media tensión con precisión quirúrgica y una interfaz moderna.
        </p>

        {/* Feature Grid pills */}
        <div className={styles.features}>
          <div className={styles.pill}><Zap size={14} className="mr-1" /> Cálculo en Tiempo Real</div>
          <div className={styles.pill}><Shield size={14} className="mr-1" /> Seguridad Empresarial</div>
          <div className={styles.pill}><BarChart3 size={14} className="mr-1" /> Estándar SIE RD</div>
          <div className={styles.pill}><Globe size={14} className="mr-1" /> Exportación PDF</div>
        </div>

        {/* CTA Actions */}
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => void navigate('/login')}>
            INGRESAR AL SISTEMA <ArrowRight size={18} className="ml-2" />
          </button>
          <button className={styles.btnSecondary} onClick={() => void navigate('/registro')}>
            CREAR MI CUENTA <UserPlus size={18} className="ml-2" />
          </button>
        </div>

        <div className={styles.footer}>
          <p>© {new Date().getFullYear()} MT Presupuestos SIE · Dominicana Digital</p>
          <div className="flex gap-4 mt-2 opacity-40 text-[10px] tracking-widest uppercase">
            <span>Status: Operational</span>
            <span>Version: 2.1.0-SAPPHIRE</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
