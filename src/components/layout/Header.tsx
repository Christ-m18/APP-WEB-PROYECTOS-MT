import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePerfil } from '@/hooks/usePerfil'
import { supabase } from '@/lib/supabase'
import { Menu, LogOut, Code, Cpu, User } from 'lucide-react'
import styles from './Header.module.css'

export default function Header() {
  const [initials, setInitials] = useState<string | JSX.Element>('')
  const { data: perfil, isLoading } = usePerfil()

  useEffect(() => {
    async function resolveIdentity() {
      if (isLoading) return

      if (perfil?.nombre) {
        const n = (perfil.nombre || '')[0]
        const a = (perfil.apellido || '')[0] || ''
        setInitials((n + a).toUpperCase())
      } else {
        // Usar session en lugar de getUser para evitar bloqueos y llamadas pesadas
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        
        if (user?.user_metadata?.nombre) {
          const n = (user.user_metadata.nombre || '')[0]
          const a = (user.user_metadata.apellido || '')[0] || ''
          setInitials((n + a).toUpperCase())
        } else if (user?.email) {
          setInitials(user.email[0].toUpperCase())
        } else {
          setInitials(<User size={18} />)
        }
      }
    }
    
    void resolveIdentity()
  }, [perfil, isLoading])

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoContainer}>
          <div className={styles.logoSymbol}>
            <Cpu size={24} color="white" />
          </div>
          <div>
            <h1 className={styles.title}>MT Presupuestos</h1>
            <span className={styles.versionBadge}>SIE Pro</span>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.statusBadge}>
          <span className={styles.pulse}></span>
          <span>Online</span>
        </div>
        
        <Link to="/app/perfil" className={styles.avatar} title="Mi Perfil">
          {initials || <User size={18} />}
        </Link>
      </div>
    </header>
  )
}
