import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Search } from 'lucide-react'

export interface Country {
  name: string
  iso: string
  dialCode: string
  format: string  // '#' = dígito, resto = separadores
  maxDigits: number
}

function isoToEmoji(iso: string): string {
  return iso.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('')
}

export function CountryFlag({ iso, style }: { iso: string; style?: React.CSSProperties }) {
  return (
    <span
      style={{ fontSize: '1.2rem', lineHeight: 1, flexShrink: 0, ...style }}
      aria-label={iso}
    >
      {isoToEmoji(iso)}
    </span>
  )
}

export const COUNTRIES: Country[] = [
  { name: 'Rep. Dominicana', iso: 'DO', dialCode: '+1',   format: '(###) ###-####', maxDigits: 10 },
  { name: 'Puerto Rico',     iso: 'PR', dialCode: '+1',   format: '(###) ###-####', maxDigits: 10 },
  { name: 'Estados Unidos',  iso: 'US', dialCode: '+1',   format: '(###) ###-####', maxDigits: 10 },
  { name: 'Canadá',          iso: 'CA', dialCode: '+1',   format: '(###) ###-####', maxDigits: 10 },
  { name: 'Jamaica',         iso: 'JM', dialCode: '+1',   format: '(###) ###-####', maxDigits: 10 },
  { name: 'México',          iso: 'MX', dialCode: '+52',  format: '## ####-####',   maxDigits: 10 },
  { name: 'Argentina',       iso: 'AR', dialCode: '+54',  format: '(###) ###-####', maxDigits: 10 },
  { name: 'Brasil',          iso: 'BR', dialCode: '+55',  format: '(##) #####-####', maxDigits: 11 },
  { name: 'Colombia',        iso: 'CO', dialCode: '+57',  format: '### ###-####',   maxDigits: 10 },
  { name: 'Venezuela',       iso: 'VE', dialCode: '+58',  format: '(###) ###-####', maxDigits: 10 },
  { name: 'España',          iso: 'ES', dialCode: '+34',  format: '### ### ###',    maxDigits: 9  },
  { name: 'Chile',           iso: 'CL', dialCode: '+56',  format: '# ####-####',   maxDigits: 9  },
  { name: 'Perú',            iso: 'PE', dialCode: '+51',  format: '### ###-###',    maxDigits: 9  },
  { name: 'Ecuador',         iso: 'EC', dialCode: '+593', format: '## ###-####',    maxDigits: 9  },
  { name: 'Bolivia',         iso: 'BO', dialCode: '+591', format: '########',       maxDigits: 8  },
  { name: 'Paraguay',        iso: 'PY', dialCode: '+595', format: '### ###-###',    maxDigits: 9  },
  { name: 'Uruguay',         iso: 'UY', dialCode: '+598', format: '## ###-####',    maxDigits: 9  },
  { name: 'Panamá',          iso: 'PA', dialCode: '+507', format: '####-####',      maxDigits: 8  },
  { name: 'Costa Rica',      iso: 'CR', dialCode: '+506', format: '####-####',      maxDigits: 8  },
  { name: 'Guatemala',       iso: 'GT', dialCode: '+502', format: '####-####',      maxDigits: 8  },
  { name: 'Honduras',        iso: 'HN', dialCode: '+504', format: '####-####',      maxDigits: 8  },
  { name: 'El Salvador',     iso: 'SV', dialCode: '+503', format: '####-####',      maxDigits: 8  },
  { name: 'Nicaragua',       iso: 'NI', dialCode: '+505', format: '####-####',      maxDigits: 8  },
  { name: 'Cuba',            iso: 'CU', dialCode: '+53',  format: '## ###-####',    maxDigits: 9  },
  { name: 'Haití',           iso: 'HT', dialCode: '+509', format: '####-####',      maxDigits: 8  },
]

function applyFormat(digits: string, format: string, maxDigits: number): string {
  const limited = digits.slice(0, maxDigits)
  let di = 0
  let result = ''
  for (let i = 0; i < format.length && di < limited.length; i++) {
    if (format[i] === '#') {
      result += limited[di++]
    } else {
      result += format[i]
    }
  }
  return result
}

/** Detecta el país a partir de un valor completo "+dialCode número" */
export function parsePhoneValue(value: string): { country: Country; localDigits: string } {
  const defaultCountry = COUNTRIES[0]
  if (!value) return { country: defaultCountry, localDigits: '' }

  // Ordenar por dialCode más largo primero para evitar coincidencias parciales
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length)
  for (const c of sorted) {
    if (value.startsWith(c.dialCode + ' ') || value.startsWith(c.dialCode)) {
      const rest = value.slice(c.dialCode.length).replace(/^\s+/, '')
      const digits = rest.replace(/\D/g, '')
      return { country: c, localDigits: digits }
    }
  }
  // No tiene prefijo — asumir país por defecto, tratar todo como dígitos
  return { country: defaultCountry, localDigits: value.replace(/\D/g, '') }
}

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  onCountryChange?: (country: Country) => void
  readOnly?: boolean
  className?: string
  inputClassName?: string
  placeholder?: string
  darkTheme?: boolean
}

export function PhoneInput({
  value = '',
  onChange,
  onCountryChange,
  readOnly = false,
  className,
  inputClassName,
  placeholder,
  darkTheme = false,
}: PhoneInputProps) {
  const { country: parsedCountry, localDigits: parsedDigits } = parsePhoneValue(value)
  const [selectedCountry, setSelectedCountry] = useState<Country>(parsedCountry)
  const [localDigits, setLocalDigits] = useState(parsedDigits)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Sincronizar con valor externo
  useEffect(() => {
    const { country, localDigits: digits } = parsePhoneValue(value)
    setSelectedCountry(country)
    setLocalDigits(digits)
  }, [value])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Enfocar búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [isOpen])

  const emit = useCallback((country: Country, digits: string) => {
    const formatted = applyFormat(digits, country.format, country.maxDigits)
    const fullValue = formatted ? `${country.dialCode} ${formatted}` : ''
    onChange?.(fullValue)
  }, [onChange])

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    setIsOpen(false)
    setSearch('')
    setLocalDigits('')
    onCountryChange?.(country)
    emit(country, '')
  }

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Extraer solo dígitos
    const digits = raw.replace(/\D/g, '').slice(0, selectedCountry.maxDigits)
    setLocalDigits(digits)
    emit(selectedCountry, digits)
  }

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir: backspace, delete, tab, escape, enter, flechas, ctrl+A/C/V/X, home, end
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End',
    ]
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    // Bloquear todo lo que no sea dígito
    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  const displayValue = applyFormat(localDigits, selectedCountry.format, selectedCountry.maxDigits)
  const filteredCountries = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dialCode.includes(search) ||
        c.iso.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES

  const ph = placeholder ?? selectedCountry.format.replace(/#/g, '0')

  return (
    <div ref={containerRef} className={cn('relative flex items-stretch', className)}>
      {/* Botón selector de país */}
      <button
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 shrink-0 border rounded-l-md px-2.5 transition-all duration-200',
          'text-sm font-bold select-none',
          darkTheme
            ? [
                'bg-black/20 border-white/10 text-white/80',
                'hover:bg-black/30 hover:border-white/20',
                readOnly ? 'opacity-60 cursor-default' : 'cursor-pointer',
              ]
            : [
                'bg-slate-50 border-slate-200 text-slate-700',
                'hover:bg-slate-100 hover:border-slate-300',
                readOnly ? 'bg-slate-50 cursor-default opacity-70' : 'cursor-pointer',
              ]
        )}
        style={{ height: '100%', minHeight: '2.5rem' }}
      >
        <CountryFlag iso={selectedCountry.iso} />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {selectedCountry.dialCode}
        </span>
        {!readOnly && <ChevronDown size={12} style={{ opacity: 0.6, marginLeft: 1 }} />}
      </button>

      {/* Input del número */}
      <input
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handlePhoneInput}
        onKeyDown={handlePhoneKeyDown}
        readOnly={readOnly}
        placeholder={ph}
        className={cn(
          'flex-1 min-w-0 rounded-r-md border-t border-r border-b px-3 py-2 text-sm font-medium',
          'transition-all duration-200 outline-none',
          darkTheme
            ? [
                'bg-black/25 border-white/10 text-white placeholder:text-white/30',
                'focus:bg-black/40 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15',
                readOnly ? 'cursor-default caret-transparent' : '',
              ]
            : [
                'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400',
                'hover:border-slate-300',
                'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10',
                readOnly ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-default caret-transparent' : '',
              ],
          inputClassName
        )}
      />

      {/* Dropdown de países */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-2xl border overflow-hidden"
          style={{
            width: '280px',
            background: darkTheme ? '#0f172a' : 'white',
            border: darkTheme ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.3)',
          }}
        >
          {/* Buscador */}
          <div
            style={{
              padding: '0.75rem',
              borderBottom: darkTheme ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: darkTheme ? '#64748b' : '#94a3b8',
                }}
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar país..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                  borderRadius: '8px',
                  border: darkTheme ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                  background: darkTheme ? 'rgba(0,0,0,0.3)' : '#f8fafc',
                  color: darkTheme ? 'white' : '#334155',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filteredCountries.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: darkTheme ? '#64748b' : '#94a3b8',
                  fontSize: '0.85rem',
                }}
              >
                Sin resultados
              </div>
            ) : (
              filteredCountries.map(country => (
                <button
                  key={country.iso}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 1rem',
                    textAlign: 'left',
                    background:
                      selectedCountry.iso === country.iso
                        ? darkTheme
                          ? 'rgba(79,70,229,0.2)'
                          : '#f5f3ff'
                        : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    border: 'none',
                  }}
                  onMouseEnter={e => {
                    if (selectedCountry.iso !== country.iso) {
                      ;(e.currentTarget as HTMLButtonElement).style.background = darkTheme
                        ? 'rgba(255,255,255,0.05)'
                        : '#f8fafc'
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedCountry.iso !== country.iso) {
                      ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    }
                  }}
                >
                  <CountryFlag iso={country.iso} style={{ fontSize: '1.3rem' }} />
                  <span
                    style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: darkTheme ? '#e2e8f0' : '#334155',
                    }}
                  >
                    {country.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: darkTheme ? '#6366f1' : '#6366f1',
                      fontFamily: 'monospace',
                    }}
                  >
                    {country.dialCode}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
