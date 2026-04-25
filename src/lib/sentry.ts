// Wrapper guarded para Sentry. Se activa solo si VITE_SENTRY_DSN está definido.
// Carga el SDK dinámicamente para no agregar peso al bundle si no se usa.
//
// Setup cuando crees el proyecto en sentry.io:
//   1. npm install @sentry/react
//   2. agrega VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx en .env
//   3. (opcional) VITE_SENTRY_ENV=production / VITE_SENTRY_TRACES=0.1

interface SentryShape {
  captureException(error: unknown, ctx?: Record<string, unknown>): void
  captureMessage(msg: string, ctx?: Record<string, unknown>): void
}

let instancia: SentryShape | null = null
let inicializado = false

export async function initSentry(): Promise<void> {
  if (inicializado) return
  inicializado = true
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  try {
    // Import dinámico vía new Function para evitar que TS exija el módulo en build-time
    // cuando @sentry/react aún no está instalado. Si está instalado, se carga normalmente.
    const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>
    const mod = (await dynamicImport('@sentry/react').catch(() => null)) as {
      init: (opts: Record<string, unknown>) => void
      captureException: (e: unknown, ctx?: { extra?: Record<string, unknown> }) => void
      captureMessage: (m: string, ctx?: { extra?: Record<string, unknown> }) => void
    } | null
    if (!mod) {
      console.warn('[sentry] DSN configurado pero @sentry/react no está instalado.')
      return
    }
    mod.init({
      dsn,
      environment: (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? 'production',
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES ?? 0.1),
      sendDefaultPii: false,
    })
    instancia = {
      captureException: (e, ctx) => mod.captureException(e, ctx ? { extra: ctx } : undefined),
      captureMessage: (m, ctx) => mod.captureMessage(m, ctx ? { extra: ctx } : undefined),
    }
  } catch (err) {
    console.warn('[sentry] init falló:', err)
  }
}

export function reportError(error: unknown, ctx?: Record<string, unknown>): void {
  if (instancia) {
    instancia.captureException(error, ctx)
  } else {
    console.error('[error]', error, ctx)
  }
}

export function reportMessage(msg: string, ctx?: Record<string, unknown>): void {
  if (instancia) {
    instancia.captureMessage(msg, ctx)
  } else {
    console.warn('[msg]', msg, ctx)
  }
}
