import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

interface LegalFooterProps {
  className?: string
  variant?: 'dark' | 'light'
}

/**
 * Footer reutilizable con enlaces a documentos legales.
 * Se usa en páginas de auth y como pie del layout principal.
 */
export default function LegalFooter({ className, variant = 'dark' }: LegalFooterProps) {
  const baseStyle: CSSProperties = {
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    color: variant === 'dark' ? 'rgba(226, 232, 240, 0.65)' : 'rgba(51, 65, 85, 0.75)',
    textAlign: 'center',
  }

  const linkStyle: CSSProperties = {
    color: 'inherit',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  }

  return (
    <footer className={className} style={baseStyle} role="contentinfo" aria-label="Enlaces legales">
      <Link to="/terminos" style={linkStyle}>Términos y Condiciones</Link>
      <span aria-hidden="true">·</span>
      <Link to="/privacidad" style={linkStyle}>Política de Privacidad</Link>
      <span aria-hidden="true">·</span>
      <Link to="/descargo" style={linkStyle}>Descargo de Responsabilidad</Link>
    </footer>
  )
}
