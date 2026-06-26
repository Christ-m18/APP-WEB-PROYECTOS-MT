/**
 * Registro local del consentimiento legal (Términos, Privacidad, Descargo).
 *
 * Persiste en `localStorage` la versión aceptada, el timestamp ISO 8601 y el
 * método de aceptación (email vs. OAuth). Es el único almacenamiento de
 * consentimiento en el cliente; la persistencia en base de datos puede añadirse
 * más adelante mediante una migración que añada estas columnas a `perfiles` o
 * cree una tabla `consentimientos`.
 */

export const LEGAL_TERMS_VERSION = '1.0'
const STORAGE_KEY = 'mt_legal_consent'

export type ConsentMethod = 'email' | 'oauth_registro' | 'oauth_login'

export interface LegalConsentRecord {
  version: string
  timestamp: string
  method: ConsentMethod
}

/**
 * Registra el consentimiento legal en `localStorage` si no existe uno previo
 * para la versión actual de los términos. Idempotente: llamar varias veces no
 * sobreescribe el primer registro válido salvo que la versión haya cambiado.
 */
export function recordLegalConsent(method: ConsentMethod): LegalConsentRecord {
  const existing = readLegalConsent()
  if (existing && existing.version === LEGAL_TERMS_VERSION) {
    return existing
  }
  const record: LegalConsentRecord = {
    version: LEGAL_TERMS_VERSION,
    timestamp: new Date().toISOString(),
    method,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // localStorage podría no estar disponible (modo privado, cuotas, etc.).
    // En ese caso devolvemos el registro en memoria sin persistirlo.
  }
  return record
}

/**
 * Lee el consentimiento previamente registrado. Devuelve `null` si no existe o
 * si el contenido está corrupto.
 */
export function readLegalConsent(): LegalConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      'timestamp' in parsed &&
      'method' in parsed
    ) {
      return parsed as LegalConsentRecord
    }
    return null
  } catch {
    return null
  }
}

/**
 * Indica si el usuario ya aceptó la versión vigente de los términos en este
 * navegador. Útil para pre-marcar el checkbox en el login OAuth.
 */
export function hasCurrentLegalConsent(): boolean {
  const record = readLegalConsent()
  return record !== null && record.version === LEGAL_TERMS_VERSION
}
