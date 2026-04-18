import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePerfil } from '@/hooks/usePerfil'
import { supabase } from '@/lib/supabase'
import { Cpu, User, UserCircle, Camera, LogOut, ChevronDown, Settings } from 'lucide-react'
import styles from './Header.module.css'

export default function Header() {
  const navigate = useNavigate()
  const [initials, setInitials] = useState<string | React.ReactElement>('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { data: perfil, isLoading } = usePerfil()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function resolveIdentity() {
      if (isLoading) return
      if (perfil?.nombre) {
        const n = (perfil.nombre || '')[0]
        const a = (perfil.apellido || '')[0] || ''
        setInitials((n + a).toUpperCase())
      } else {
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

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    await supabase.auth.signOut()
    void navigate('/')
  }

  const avatarContent = perfil?.avatar_url ? (
    <img src={perfil.avatar_url} alt="avatar" className={styles.avatarImg} />
  ) : (
    initials || <User size={18} />
  )

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

        <div className={styles.avatarWrapper} ref={dropdownRef}>
          <button
            className={styles.avatar}
            onClick={() => setDropdownOpen(v => !v)}
            title="Mi cuenta"
            type="button"
          >
            {avatarContent}
            <ChevronDown
              size={12}
              className={styles.chevron}
              style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownUser}>
                <div className={styles.dropdownAvatar}>{avatarContent}</div>
                <div>
                  <p className={styles.dropdownName}>
                    {perfil?.nombre ? `${perfil.nombre} ${perfil.apellido ?? ''}`.trim() : 'Usuario'}
                  </p>
                  <p className={styles.dropdownEmail}>{perfil?.email ?? ''}</p>
                </div>
              </div>

              <div className={styles.dropdownDivider} />

              <button
                className={styles.dropdownItem}
                onClick={() => { setDropdownOpen(false); void navigate('/app/perfil') }}
                type="button"
              >
                <UserCircle size={16} /> Mi Perfil
              </button>

              <button
                className={styles.dropdownItem}
                onClick={() => { setDropdownOpen(false); void navigate('/app/perfil', { state: { openAvatarUpload: true } }) }}
                type="button"
              >
                <Camera size={16} /> Cambiar Avatar
              </button>

              <button
                className={styles.dropdownItem}
                onClick={() => { setDropdownOpen(false); void navigate('/app/perfil', { state: { openSettings: true } }) }}
                type="button"
              >
                <Settings size={16} /> Configuración
              </button>

              <div className={styles.dropdownDivider} />

              <button
                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                onClick={() => void handleLogout()}
                type="button"
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
