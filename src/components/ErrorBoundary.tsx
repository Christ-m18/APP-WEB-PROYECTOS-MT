import { Component, type ReactNode, type ErrorInfo } from 'react'
import { reportError } from '@/lib/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
    reportError(error, { componentStack: info.componentStack })

    const isChunkError =
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch') ||
      error.name === 'ChunkLoadError'

    if (isChunkError) {
      const reloadKey = 'chunk_reload_' + window.location.pathname
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true')
        window.location.reload()
      }
    }
  }

  private reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const isChunkError =
      this.state.error?.message?.includes('dynamically imported module') ||
      this.state.error?.message?.includes('Failed to fetch') ||
      this.state.error?.name === 'ChunkLoadError'

    if (isChunkError) {
      return (
        <div
          role="alert"
          style={{
            maxWidth: '36rem',
            margin: '4rem auto',
            padding: '2rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
            Nueva versión disponible
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.5rem' }}>
            Se ha actualizado la aplicación en el servidor. Por favor, actualiza la página para continuar.
          </p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.clear()
              window.location.reload()
            }}
            style={{
              padding: '0.6rem 1.5rem',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Actualizar ahora
          </button>
        </div>
      )
    }

    return (
      <div
        role="alert"
        style={{
          maxWidth: '40rem',
          margin: '4rem auto',
          padding: '2rem',
          background: '#fff',
          border: '1px solid #fecaca',
          borderRadius: '14px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
          Ocurrió un error inesperado
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
          La aplicación se detuvo. Intenta volver a cargar o regresar al inicio.
        </p>
        {this.state.error && (
          <details style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Detalles técnicos</summary>
            <pre
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                background: '#f8fafc',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '0.7rem',
              }}
            >
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          </details>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={this.reset}
            style={{
              padding: '0.5rem 1rem',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }
}
