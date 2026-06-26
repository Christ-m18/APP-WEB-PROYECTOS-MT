import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Header from './Header'
import Sidebar from './Sidebar'
import AccountBlockedOverlay from '@/components/AccountBlockedOverlay'
import LegalFooter from '@/components/legal/LegalFooter'
import { PageTransition } from '@/components/ui/page-transition'
import styles from './Layout.module.css'

export default function Layout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className={styles.shell}>
      <AccountBlockedOverlay />
      <Header toggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} />
      <div className={styles.body}>
        <Sidebar
          isMobileMenuOpen={isMobileMenuOpen}
          closeMobileMenu={() => setIsMobileMenuOpen(false)}
        />
        <main className={styles.main}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
          <LegalFooter variant="light" />
        </main>
      </div>
    </div>
  )
}
