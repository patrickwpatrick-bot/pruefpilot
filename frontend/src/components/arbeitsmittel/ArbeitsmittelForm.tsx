/**
 * Arbeitsmittel Form — Create/Edit Modal
 * Extracted components: StyledSelect, TypSelect, ComboBox, ScrollColumn,
 * BaujahrScrollPicker, ImageUpload, NormComboBox, ArbeitsmittelForm
 */
import React, { useState, useEffect, useRef } from 'react'
import { Plus, X, ChevronDown, ChevronRight, Upload, Calendar, Check, ClipboardCheck } from 'lucide-react'
import api from '@/lib/api'
import type { Arbeitsmittel, Standort } from '@/types'
import {
  WiederholungTyp,
  WIEDERHOLUNG_OPTIONS,
  PruefplanungState,
  computeIntervallMonate,
  NORMEN,
  NORM_AI_MAP,
  AM_TYPEN,
  CUSTOM_UNITS,
  WOCHENTAGE_LANG,
  WOCHENTAGE_MIN,
  MONATE_KURZ,
  MONATE_LANG,
  DEFAULT_PRUEFPLANUNG,
} from './constants'
import { EQUIPMENT_TYPES, suggestTypFromName } from '@/data/equipment-types'
import { PruefplanungCalendar } from './PruefplanungEditor'

/* ─── Reusable Styled Dropdown ─── */
function StyledSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
  required,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  label?: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder || 'Auswählen...'

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && ' *'}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none transition-colors text-left"
      >
        <span className={value ? 'text-black' : 'text-gray-400'}>{selectedLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full text-left px-3.5 py-2 text-sm text-gray-400 hover:bg-gray-50"
            >
              {placeholder}
            </button>
          )}
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 transition-colors ${
                o.value === value ? 'bg-gray-50 font-medium text-black' : 'text-gray-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TypSelect({
  value,
  onChange,
  nameSuggestion,
}: {
  value: string
  onChange: (v: string) => void
  nameSuggestion?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const suggestion = suggestTypFromName(nameSuggestion || '')
  const showSuggestion = suggestion && suggestion.value !== value

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = EQUIPMENT_TYPES.find(t => t.value === value)

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-500">Typ *</label>
        {showSuggestion && (
          <button
            type="button"
            onClick={() => onChange(suggestion!.value)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-all"
          >
            <span>✦</span>
            Vorschlag: {suggestion!.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected && (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-[10px] font-bold text-gray-600 flex-shrink-0 leading-none">
              {selected.kuerzel}
            </span>
          )}
          <div className="min-w-0">
            <span className={value ? 'text-black font-medium' : 'text-gray-400'}>
              {selected?.label || 'Typ auswählen...'}
            </span>
            {selected && (
              <span className="ml-1.5 text-[11px] text-gray-400 hidden sm:inline truncate">
                {selected.desc}
              </span>
            )}
          </div>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {EQUIPMENT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { onChange(t.value); setOpen(false) }}
                className={`w-full text-left px-3.5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                  t.value === value ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600 flex-shrink-0">
                    {t.kuerzel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${t.value === value ? 'text-black' : 'text-gray-800'}`}>
                        {t.label}
                      </span>
                      {t.value === suggestion?.value && value !== t.value && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">✦ Vorschlag</span>
                      )}
                      {t.value === value && (
                        <Check size={12} className="text-black flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5 leading-tight truncate">
                      z.B. {t.examples.slice(0, 4).join(', ')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ComboBox({
  value,
  onChange,
  options,
  label,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  label?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayValue = options.find(o => o.value === value)?.label || value
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes((search || displayValue).toLowerCase())
  )

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || 'Eingabe oder auswählen...'}
          value={open ? search : displayValue}
          onChange={e => {
            setSearch(e.target.value)
            onChange(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => { setSearch(displayValue); setOpen(true) }}
          className="w-full px-3.5 py-2.5 pr-9 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
        />
        <button
          type="button"
          onClick={() => { setOpen(!open); if (!open) inputRef.current?.focus() }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setSearch(''); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 transition-colors ${
                o.value === value ? 'bg-gray-50 font-medium text-black' : 'text-gray-700'
              }`}
            >
              {o.label}
            </button>
          ))}
          {filteredOptions.length === 0 && search && (
            <button
              type="button"
              onClick={() => { onChange(search); setOpen(false) }}
              className="w-full text-left px-3.5 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              <Plus size={12} className="inline mr-1" />
              „{search}" verwenden
            </button>
          )}
          {filteredOptions.length === 0 && !search && (
            <div className="px-3.5 py-2 text-xs text-gray-400">Keine Optionen verfügbar</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Baujahr Scroll Picker (iOS-Stil, zwei Spalten: Monat + Jahr) ─── */
const MONTHS_SCROLL = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const CURRENT_YEAR_PICKER = new Date().getFullYear()
const YEARS_SCROLL = Array.from({ length: CURRENT_YEAR_PICKER - 1899 }, (_, i) => String(CURRENT_YEAR_PICKER - i))
const PICKER_ITEM_H = 36

function ScrollColumn({
  items,
  initialIndex,
  onChange,
}: {
  items: string[]
  initialIndex: number
  onChange: (i: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [currIdx, setCurrIdx] = useState(initialIndex)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = initialIndex * PICKER_ITEM_H
      setCurrIdx(initialIndex)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = () => {
    if (!ref.current) return
    const idx = Math.round(ref.current.scrollTop / PICKER_ITEM_H)
    const clamped = Math.max(0, Math.min(items.length - 1, idx))
    if (clamped !== currIdx) {
      setCurrIdx(clamped)
      onChange(clamped)
    }
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="flex-1 overflow-y-scroll relative z-10"
      style={{
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        height: PICKER_ITEM_H * 5,
      } as React.CSSProperties}
    >
      {/* top padding — 2 items */}
      <div style={{ height: PICKER_ITEM_H * 2 }} />
      {items.map((item, i) => (
        <div
          key={item}
          style={{ scrollSnapAlign: 'center', height: PICKER_ITEM_H }}
          className={`flex items-center justify-center text-sm select-none transition-all ${
            i === currIdx ? 'font-semibold text-black' : 'text-gray-400'
          }`}
        >
          {item}
        </div>
      ))}
      {/* bottom padding — 2 items */}
      <div style={{ height: PICKER_ITEM_H * 2 }} />
    </div>
  )
}

function BaujahrScrollPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (year: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [monthIdx, setMonthIdx] = useState(0)
  const [yearIdx, setYearIdx] = useState(() => {
    if (value) {
      const idx = YEARS_SCROLL.indexOf(value)
      return idx >= 0 ? idx : 0
    }
    return 0
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleConfirm = () => {
    onChange(YEARS_SCROLL[yearIdx])
    setOpen(false)
  }

  const displayText = value
    ? `${MONTHS_SCROLL[monthIdx]} ${YEARS_SCROLL[yearIdx]}`
    : 'Baujahr wählen...'

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">Baujahr</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-left flex items-center justify-between bg-white hover:border-gray-300 outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
      >
        <span className={value ? 'text-black' : 'text-gray-400'}>{displayText}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden min-w-[160px]">
          {/* iOS-style header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <span className="text-xs font-medium text-gray-600">Baujahr</span>
            <button
              type="button"
              onClick={handleConfirm}
              className="text-xs font-semibold text-black hover:text-gray-600 transition-colors"
            >
              Fertig
            </button>
          </div>

          {/* Two-column picker */}
          <div
            className="flex relative"
            style={{ height: PICKER_ITEM_H * 5 }}
          >
            {/* Center highlight band */}
            <div
              className="absolute left-0 right-0 pointer-events-none z-0 bg-gray-100 rounded"
              style={{
                top: PICKER_ITEM_H * 2,
                height: PICKER_ITEM_H,
                marginLeft: 8,
                marginRight: 8,
              }}
            />

            {/* Month column */}
            <ScrollColumn
              items={MONTHS_SCROLL}
              initialIndex={monthIdx}
              onChange={setMonthIdx}
            />

            {/* Divider */}
            <div className="w-px bg-gray-200 my-2" />

            {/* Year column */}
            <ScrollColumn
              items={YEARS_SCROLL}
              initialIndex={yearIdx}
              onChange={setYearIdx}
            />
          </div>

          {/* Clear button */}
          {value && (
            <div className="border-t border-gray-100 px-4 py-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors text-center"
              >
                Baujahr entfernen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Image Upload with square mode, crop & alignment ─── */
const OBJECT_POSITIONS = [
  { value: 'object-center', label: 'Mitte' },
  { value: 'object-top', label: 'Oben' },
  { value: 'object-bottom', label: 'Unten' },
  { value: 'object-left', label: 'Links' },
  { value: 'object-right', label: 'Rechts' },
]

function ImageUpload({
  value,
  onChange,
  square,
}: {
  value: string
  onChange: (url: string) => void
  square?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(value)
  const [objectFit, setObjectFit] = useState<'object-cover' | 'object-contain'>('object-cover')
  const [objectPos, setObjectPos] = useState('object-center')
  const [showTools, setShowTools] = useState(false)

  useEffect(() => { setPreview(value) }, [value])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)

      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.url)
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        onChange(dataUrl)
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  const containerClass = square
    ? 'w-full aspect-square'
    : 'w-full h-32'

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Foto</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      {preview ? (
        <div className="relative group">
          <div className={`${containerClass} rounded-lg border border-gray-200 overflow-hidden bg-gray-50`}>
            <img
              src={preview}
              alt="Arbeitsmittel"
              className={`w-full h-full ${objectFit} ${objectPos} transition-all`}
            />
          </div>
          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex flex-col items-center justify-center gap-2 transition-opacity">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-gray-100"
              >
                Ändern
              </button>
              <button
                type="button"
                onClick={() => setShowTools(!showTools)}
                className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-gray-100"
              >
                Anpassen
              </button>
            </div>
            <button
              type="button"
              onClick={() => { onChange(''); setPreview('') }}
              className="px-3 py-1.5 bg-white/80 text-red-500 text-[10px] font-medium rounded-lg hover:bg-red-50"
            >
              Entfernen
            </button>
          </div>
          {/* Crop / alignment tools */}
          {showTools && (
            <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <div>
                <p className="text-[10px] font-medium text-gray-500 mb-1">Zuschnitt</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setObjectFit('object-cover')}
                    className={`px-2.5 py-1 text-[10px] rounded-md border ${objectFit === 'object-cover' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                    Füllen
                  </button>
                  <button type="button" onClick={() => setObjectFit('object-contain')}
                    className={`px-2.5 py-1 text-[10px] rounded-md border ${objectFit === 'object-contain' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                    Einpassen
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 mb-1">Ausrichtung</p>
                <div className="flex gap-1 flex-wrap">
                  {OBJECT_POSITIONS.map(p => (
                    <button key={p.value} type="button" onClick={() => setObjectPos(p.value)}
                      className={`px-2.5 py-1 text-[10px] rounded-md border ${objectPos === p.value ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => setShowTools(false)}
                className="text-[10px] text-gray-400 hover:text-gray-600">
                Schließen
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`w-full ${square ? 'aspect-square' : 'h-24'} rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-gray-500 transition-colors`}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <Upload size={18} />
              <span className="text-xs">Bild hochladen</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

/* ─── Norm ComboBox with AI suggestion sparkle ─── */
function NormComboBox({
  value,
  onChange,
  typ,
  onAiSuggest,
}: {
  value: string
  onChange: (v: string) => void
  typ?: string
  onAiSuggest?: (norm: string, intervallMonate: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [aiAnimating, setAiAnimating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = NORMEN.filter(n =>
    n.label.toLowerCase().includes((open ? search : '').toLowerCase()) ||
    n.desc.toLowerCase().includes((open ? search : '').toLowerCase())
  )

  const handleAiSuggest = () => {
    if (!typ) return
    const suggestion = NORM_AI_MAP[typ]
    if (!suggestion) return
    setAiAnimating(true)
    setTimeout(() => {
      onChange(suggestion.norms[0])
      if (onAiSuggest) onAiSuggest(suggestion.norms[0], suggestion.intervallMonate)
      setAiAnimating(false)
    }, 400)
  }

  const aiSuggestion = typ ? NORM_AI_MAP[typ] : null

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-500">
          Norm / Vorschrift
          <span className="text-gray-400 font-normal ml-1">— nach welcher Norm wird geprüft?</span>
        </label>
        {aiSuggestion && !value && (
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={aiAnimating}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 text-[10px] font-medium text-violet-600 hover:from-violet-100 hover:to-blue-100 transition-all"
          >
            {aiAnimating ? (
              <div className="w-3 h-3 border-[1.5px] border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-violet-500">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor" />
              </svg>
            )}
            AI-Vorschlag
          </button>
        )}
        {aiSuggestion && value && (
          <button
            type="button"
            onClick={handleAiSuggest}
            className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-600"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor" />
            </svg>
            Neu vorschlagen
          </button>
        )}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="z.B. DIN EN 131, DGUV V3..."
          value={open ? search : value}
          onChange={e => {
            setSearch(e.target.value)
            onChange(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => { setSearch(value); setOpen(true) }}
          className="w-full px-3.5 py-2.5 pr-9 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
        />
        <button
          type="button"
          onClick={() => { setOpen(!open); if (!open) inputRef.current?.focus() }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {/* AI suggestion banner */}
      {aiSuggestion && !value && !open && (
        <button
          type="button"
          onClick={handleAiSuggest}
          className="mt-1.5 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100 text-left hover:from-violet-100 hover:to-blue-100 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-violet-500 flex-shrink-0">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor" />
          </svg>
          <div>
            <p className="text-[11px] font-medium text-violet-700">
              Vorschlag für {typ}: {aiSuggestion.norms[0]}
            </p>
            <p className="text-[10px] text-violet-400">
              {NORMEN.find(n => n.value === aiSuggestion.norms[0])?.desc} — {aiSuggestion.intervallLabel}
            </p>
          </div>
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
          {/* AI suggested norms first */}
          {aiSuggestion && (
            <div className="border-b border-gray-100">
              <div className="px-3.5 py-1.5 bg-violet-50/50">
                <span className="text-[10px] font-medium text-violet-500 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor" /></svg>
                  Empfohlen für {typ}
                </span>
              </div>
              {aiSuggestion.norms.map(normVal => {
                const norm = NORMEN.find(n => n.value === normVal)
                if (!norm) return null
                return (
                  <button
                    key={norm.value}
                    type="button"
                    onClick={() => { onChange(norm.value); setSearch(''); setOpen(false) }}
                    className={`w-full text-left px-3.5 py-2.5 hover:bg-violet-50 transition-colors ${
                      norm.value === value ? 'bg-violet-50' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-black flex items-center gap-1.5">
                      {norm.label}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-violet-400"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor" /></svg>
                    </div>
                    <div className="text-[11px] text-gray-400">{norm.desc}</div>
                  </button>
                )
              })}
            </div>
          )}
          {filtered.map(n => (
            <button
              key={n.value}
              type="button"
              onClick={() => { onChange(n.value); setSearch(''); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                n.value === value ? 'bg-gray-50' : ''
              }`}
            >
              <div className="text-sm font-medium text-black">{n.label}</div>
              <div className="text-[11px] text-gray-400">{n.desc}</div>
            </button>
          ))}
          {filtered.length === 0 && search && (
            <button
              type="button"
              onClick={() => { onChange(search); setOpen(false) }}
              className="w-full text-left px-3.5 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              <Plus size={12} className="inline mr-1" />
              „{search}" verwenden
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ArbeitsmittelForm({
  item,
  standorte,
  onClose,
  onSaved,
}: {
  item: Arbeitsmittel | null
  standorte: Standort[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: item?.name || '',
    typ: item?.typ || 'Leiter',
    standort_id: item?.standort_id || '',
    hersteller: item?.hersteller || '',
    modell: item?.modell || '',
    seriennummer: item?.seriennummer || '',
    baujahr: item?.baujahr?.toString() || '',
    norm: item?.norm || '',
    foto_url: item?.foto_url || '',
    beschreibung: item?.beschreibung || '',
  })
  const [pruefplanung, setPruefplanung] = useState<PruefplanungState>({
    startDatum: item?.naechste_pruefung_am || '',
    wiederholung: item?.pruef_intervall_monate === 0 ? 'einmalig'
      : item?.pruef_intervall_monate === 12 ? 'jaehrlich'
      : item?.pruef_intervall_monate === 1 ? 'monatlich'
      : item?.pruef_intervall_monate === 0.25 ? 'woechentlich'
      : (item?.pruef_intervall_monate != null && item.pruef_intervall_monate <= 1/30) ? 'taeglich'
      : item ? 'benutzerdefiniert' : 'jaehrlich',
    customAnzahl: item?.pruef_intervall_monate ? Math.round(item.pruef_intervall_monate) : 1,
    customEinheit: 'monat',
    wochentage: [],
    monatlichModus: 'jeden',
    monatlichTage: [],
    monatlichOrdinal: '1.',
    monatlichWochentagTyp: 'mo',
    jaehrlichMonate: [],
    jaehrlichWochentageAktiv: false,
    jaehrlichOrdinal: '1.',
    jaehrlichWochentagTyp: 'mo',
    endetTyp: 'nie',
    endetDatum: '',
    endetNach: 10,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pruefplanungOpen, setPruefplanungOpen] = useState(false)

  const standortOptions = standorte.map(s => {
    const parts = [s.name]
    if (s.gebaeude) parts.push(s.gebaeude)
    if (s.abteilung) parts.push(s.abteilung)
    const adresse = [s.strasse, s.hausnummer].filter(Boolean).join(' ')
    const ortTeil = [s.plz, s.ort].filter(Boolean).join(' ')
    if (adresse || ortTeil) parts.push([adresse, ortTeil].filter(Boolean).join(', '))
    return { value: s.id, label: parts.join(' — ') }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        baujahr: form.baujahr ? Number(form.baujahr) : null,
        standort_id: form.standort_id || null,
        naechste_pruefung_am: pruefplanung.startDatum || null,
        foto_url: form.foto_url || null,
        pruef_intervall_monate: computeIntervallMonate(pruefplanung),
      }
      if (item) {
        await api.put(`/arbeitsmittel/${item.id}`, payload)
      } else {
        await api.post('/arbeitsmittel', payload)
      }
      onSaved()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'object' && detail?.code?.startsWith('LIMIT_')) {
        setError(detail.message)
      } else {
        setError(detail ? `Fehler: ${typeof detail === 'string' ? detail : detail?.message || 'Unbekannter Fehler'}` : 'Fehler beim Speichern')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-[92vw] max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-black">
            {item ? 'Bearbeiten' : 'Neues Arbeitsmittel'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="relative flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Left column — scrollbar */}
          <div className="flex-1 min-h-0 p-5 overflow-y-auto space-y-3">

            {/* Photo + Name + Typ */}
            <div className="flex gap-4">
              <div className="w-[90px] flex-shrink-0">
                <ImageUpload
                  value={form.foto_url}
                  onChange={url => setForm({ ...form, foto_url: url })}
                  square
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <TypSelect
                  value={form.typ}
                  onChange={v => setForm({ ...form, typ: v })}
                  nameSuggestion={form.name}
                />
              </div>
            </div>

            {/* Baujahr */}
            <BaujahrScrollPicker
              value={form.baujahr}
              onChange={year => setForm({ ...form, baujahr: year })}
            />

            {/* Standort */}
            <div>
              <ComboBox
                label="Standort (Gebäude / Bereich)"
                value={form.standort_id}
                onChange={v => setForm({ ...form, standort_id: v })}
                options={standortOptions}
                placeholder="Standort auswählen oder eingeben..."
              />
              <p className="text-[10px] text-gray-400 mt-1">Standorte mit Adresse verwaltest du unter Einstellungen → Standorte</p>
            </div>

            {/* Hersteller + Modell + Seriennr */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hersteller</label>
                <input type="text" value={form.hersteller} onChange={e => setForm({ ...form, hersteller: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none min-w-0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Modell</label>
                <input type="text" value={form.modell} onChange={e => setForm({ ...form, modell: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none min-w-0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Seriennr.</label>
                <input type="text" value={form.seriennummer} onChange={e => setForm({ ...form, seriennummer: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none min-w-0" />
              </div>
            </div>

            {/* Prüfplanung card */}
            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">

              {/* Datum row */}
              <button
                type="button"
                onClick={() => setPruefplanungOpen(o => !o)}
                className="w-full flex items-center justify-between px-3.5 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar size={15} className="text-gray-400" />
                  <span className="text-sm text-gray-700">Erste / nächste Prüfung</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500">
                    {pruefplanung.startDatum
                      ? new Date(pruefplanung.startDatum + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Kein Datum'}
                  </span>
                  <ChevronRight size={14} className={`text-gray-300 transition-transform ${pruefplanungOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Wiederholung row */}
              <button
                type="button"
                onClick={() => setPruefplanungOpen(o => !o)}
                className="w-full flex items-center justify-between px-3.5 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck size={15} className="text-gray-400" />
                  <span className="text-sm text-gray-700">Wiederholung</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500">
                    {WIEDERHOLUNG_OPTIONS.find(o => o.value === pruefplanung.wiederholung)?.label ?? 'Nie'}
                  </span>
                  <ChevronRight size={14} className={`text-gray-300 transition-transform ${pruefplanungOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>

            </div>

            {/* Norm */}
            <NormComboBox
              value={form.norm}
              onChange={v => setForm({ ...form, norm: v })}
              typ={form.typ}
              onAiSuggest={(norm, intervallMonate) => {
                setForm(f => ({ ...f, norm }))
                const wh: WiederholungTyp = intervallMonate === 12 ? 'jaehrlich'
                  : intervallMonate === 1 ? 'monatlich'
                  : intervallMonate === 0.25 ? 'woechentlich'
                  : 'benutzerdefiniert'
                setPruefplanung(p => ({
                  ...p,
                  wiederholung: wh,
                  customAnzahl: intervallMonate,
                  customEinheit: 'monat',
                }))
              }}
            />

            {/* Beschreibung */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Beschreibung / Notizen</label>
              <textarea value={form.beschreibung} onChange={e => setForm({ ...form, beschreibung: e.target.value })} rows={2}
                placeholder="Besonderheiten, Wartungshinweise, etc."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none resize-none" />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                Abbrechen
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40">
                {saving ? 'Speichern...' : item ? 'Aktualisieren' : 'Anlegen'}
              </button>
            </div>

          </div>

          {/* Prüfplanung Overlay */}
          {pruefplanungOpen && (
            <div className="absolute right-0 top-0 bottom-0 w-[320px] border-l border-gray-200 bg-white shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.08)] p-4 overflow-y-auto z-30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prüfplanung</h3>
                <button
                  type="button"
                  onClick={() => setPruefplanungOpen(false)}
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <PruefplanungCalendar
                state={pruefplanung}
                onChange={setPruefplanung}
              />
            </div>
          )}

        </form>
      </div>
    </div>
  )
}

export { ArbeitsmittelForm }
