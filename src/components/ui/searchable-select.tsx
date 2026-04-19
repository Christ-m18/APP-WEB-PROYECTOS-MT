import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, Check } from 'lucide-react'
import styles from './searchable-select.module.css'
import { formatRD } from '@/utils/calculos'
import type { EstructuraDB } from '@/types'

interface SearchableSelectProps {
  options: EstructuraDB[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export function SearchableSelect({ options, value, onChange, placeholder }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 4, // 4px margin
        left: rect.left,
        width: rect.width
      })
    }
  }, [])

  useEffect(() => {
    if (open) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  const filtered = options.filter((o) => {
    const name = String(o?.estructura || '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(!open)}
      >
        <span className={value ? styles.val : styles.placeholder}>
          {value || placeholder || 'Seleccionar Estructura...'}
        </span>
        <ChevronDown size={18} className={styles.chevron} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && createPortal(
        <div 
          className={styles.dropdown} 
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 9999
          }}
        >
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              autoFocus
              className={styles.searchInput}
              placeholder="Escribe para filtrar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className={styles.list}>
            {filtered.length === 0 ? (
              <li className={styles.noResults}>No se encontraron estructuras</li>
            ) : (
              filtered.map((o, index) => (
                <li
                  key={`${o.estructura || 'empty'}-${index}`}
                  className={[
                    styles.item,
                    value === o.estructura ? styles.itemSelected : ''
                  ].join(' ')}
                  onClick={() => {
                    onChange(o.estructura)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {value === o.estructura && <Check size={14} color="var(--color-primary)" />}
                    <span className={styles.itemCode}>{o.estructura}</span>
                  </div>
                  <span className={styles.itemPrice}>{formatRD(o.costo_materiales_rd)}</span>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}
