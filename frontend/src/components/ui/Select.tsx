/**
 * Select — Core UI Component
 * Dropdown with search, optional multi-select support
 */
import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  description?: string
}

interface SelectProps {
  value: string | string[]
  onChange: (value: string | string[]) => void
  options: SelectOption[]
  label?: string
  placeholder?: string
  required?: boolean
  searchable?: boolean
  multiple?: boolean
  error?: string
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Auswählen...',
  required,
  searchable = false,
  multiple = false,
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const selectedValues = Array.isArray(value) ? value : [value].filter(Boolean)
  const selectedLabels = selectedValues
    .map(v => options.find(o => o.value === v)?.label)
    .filter(Boolean)

  const displayText = selectedLabels.length > 0
    ? selectedLabels.join(', ')
    : placeholder

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : []
      const next = current.includes(optionValue)
        ? current.filter(v => v !== optionValue)
        : [...current, optionValue]
      onChange(next)
    } else {
      onChange(optionValue)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}{required && ' *'}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border ${
          error ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'
        } text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none transition-colors text-left`}
      >
        <span className={selectedValues.length > 0 ? 'text-black truncate' : 'text-gray-400'}>
          {displayText}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Suchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-black focus:border-black outline-none"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(o => {
              const isSelected = selectedValues.includes(o.value)
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-gray-50 font-medium text-black' : 'text-gray-700'
                  }`}
                >
                  <div className="min-w-0">
                    <span>{o.label}</span>
                    {o.description && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{o.description}</p>
                    )}
                  </div>
                  {isSelected && <Check size={14} className="text-black flex-shrink-0 ml-2" />}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-3.5 py-3 text-sm text-gray-400 text-center">Keine Optionen gefunden</div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* Multi-select tags */}
      {multiple && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedValues.map(v => {
            const opt = options.find(o => o.value === v)
            return (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-700">
                {opt?.label}
                <button type="button" onClick={() => handleSelect(v)} className="text-gray-400 hover:text-gray-600">
                  <X size={10} />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
