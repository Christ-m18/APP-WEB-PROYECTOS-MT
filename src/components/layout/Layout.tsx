import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Header from './Header'
import Sidebar from './Sidebar'
import { PageTransition } from '@/components/ui/page-transition'
import styles from './Layout.module.css'

export default function Layout() {
  const location = useLocation()
  
  // Determinamos si el sidebar debe estar contraído automáticamente (Modo Zen)
  const isBudgetPage = location.pathname.includes('/app/presupuesto')

  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        <Sidebar isCollapsed={isBudgetPage} />
        <main className={styles.main}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
