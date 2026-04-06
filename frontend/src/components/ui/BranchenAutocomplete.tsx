/**
 * BranchenAutocomplete — Smart search input for industry selection
 * Searches industry names AND synonyms/related keywords.
 * E.g. typing "CNC" suggests "Maschinenbau", "Metallverarbeitung", etc.
 */
import { useState, useRef, useEffect } from 'react'
import { Search, X, Check, Building2 } from 'lucide-react'
import { searchBranchen, BRANCHEN, type BranchenSearchResult } from '@/config/branchen'

interface BranchenAutocompleteProps {
  value: string                          // current branche key (e.g. 'maschinenbau')
  onChange: (brancheKey: string) => void  // called when user selects a branche
  placeholder?: string
  className?: string
}

export function BranchenAutocomplete({ value, onChange, placeholder, className }: BranchenAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BranchenSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync display text when value changes externally
  // Fallback: if value is not a BRANCHEN key, show it as-is (z.B. Label-String aus Onboarding)
  const selectedLabel = value
    ? BRANCHEN[value]?.label || value
    : ''

  useEffect(() => {
    if (query.length >= 1) {
      const r = searchBranchen(query)
      setResults(r)
      setIsOpen(r.length > 0)
      setHighlightIdx(0)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [query])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (result: BranchenSearchResult) => {
    onChange(result.value)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[highlightIdx]) handleSelect(results[highlightIdx])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className || ''}`}>
      {/* Selected value chip or search input */}
      {value && !query && !isOpen ? (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-colors"
          onClick={() => { setQuery(''); inputRef.current?.focus(); setIsOpen(false) }}
        >
          <Building2 size={15} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-black flex-1">{selectedLabel}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleClear() }}
            className="p-0.5 rounded hover:bg-gray-100 transition-colors"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (query.length >= 1) setIsOpen(results.length > 0) }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Branche suchen — z.B. "CNC", "Bau", "Pflege"...'}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none transition-colors"
            autoComplete="off"
          />
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
        >
          {results.map((r, idx) => (
            <button
              key={r.value}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                idx === highlightIdx ? 'bg-gray-50' : 'hover:bg-gray-50'
              } ${idx > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                r.value === value ? 'bg-black' : 'bg-gray-100'
              }`}>
                {r.value === value
                  ? <Check size={14} className="text-white" />
                  : <Building2 size={14} className="text-gray-400" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-black">{r.label}</p>
                {r.matchedKeyword !== r.label && (
                  <p className="text-xs text-gray-400 truncate">
                    Treffer: {r.matchedKeyword}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* "Not found" hint when query has no results */}
      {query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">Keine passende Branche gefunden.</p>
          <p className="text-xs text-gray-400 mt-1">Es werden allgemeine Vorlagen verwendet.</p>
        </div>
      )}
    </div>
  )
}
