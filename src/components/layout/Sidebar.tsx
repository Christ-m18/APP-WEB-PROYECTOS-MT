import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { 
  LayoutDashboard, 
  FolderSearch, 
  PlusSquare, 
  FileSpreadsheet, 
  UserCircle, 
  LogOut 
} from 'lucide-react'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/app',                   label: 'Dashboard',               icon: <LayoutDashboard size={20} />, end: true  },
  { to: '/app/proyectos',         label: 'Proyectos',               icon: <FolderSearch size={20} />,    end: false },
  { to: '/app/presupuesto/nuevo', label: 'Nuevo Presupuesto',       icon: <PlusSquare size={20} />,      end: false },
  { to: '/app/resoluciones',      label: 'Estructuras SIE',         icon: <FileSpreadsheet size={20} />, end: false },
  { to: '/app/perfil',            label: 'Mi Perfil',               icon: <UserCircle size={20} />,      end: false },
] as const

interface SidebarProps {
  isCollapsed?: boolean
}

export default function Sidebar({ isCollapsed }: SidebarProps) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    void navigate('/')
  }

  return (
    <aside className={[styles.sidebar, isCollapsed ? styles.collapsed : ''].join(' ')}>
      <nav className={styles.nav}>
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [styles.link, isActive ? styles.active : ''].join(' ')
            }
          >
            <span className={styles.icon}>{icon}</span>
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.logoutSection}>
        <button onClick={handleLogout} className={styles.btnLogOut}>
          <span className={styles.icon}>
            <LogOut size={20} />
          </span>
          <span className={styles.label}>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
