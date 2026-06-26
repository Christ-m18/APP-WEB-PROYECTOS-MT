import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LegalFooter from './LegalFooter'

interface LegalPageProps {
  title: string
  subtitle?: string
  lastUpdated?: string
  children: ReactNode
}

/**
 * Layout estandarizado para páginas legales públicas.
 * Renderiza un contenedor centrado con tipografía legible y un footer con links cruzados.
 */
export default function LegalPage({
  title,
  subtitle,
  lastUpdated = '[FECHA_DE_ULTIMA_ACTUALIZACION]',
  children,
}: LegalPageProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        color: '#e2e8f0',
        padding: '2.5rem 1rem',
      }}
    >
      <div
        style={{
          maxWidth: '820px',
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '14px',
          padding: '2.5rem clamp(1.25rem, 4vw, 3rem)',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)',
          lineHeight: 1.7,
          fontSize: '0.95rem',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'rgba(148, 163, 184, 0.9)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(99, 102, 241, 0.25)', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: '0.5rem 0 0', color: 'rgba(203, 213, 225, 0.75)', fontSize: '0.95rem' }}>{subtitle}</p>
          )}
          <p style={{ margin: '0.5rem 0 0', color: 'rgba(148, 163, 184, 0.7)', fontSize: '0.8rem' }}>
            Última actualización: {lastUpdated}
          </p>
        </header>

        <article style={{ color: 'rgba(226, 232, 240, 0.92)' }}>{children}</article>

        <LegalFooter variant="dark" />
      </div>
    </div>
  )
}
