/**
 * Arbeitsmittel (Equipment) — List + Create/Edit
 * Redesigned with ComboBox for Standort, styled dropdowns, date picker, image upload
 */
import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, X, ClipboardCheck, ChevronDown, ChevronRight, Upload, Calendar, Wrench, RotateCcw, Check } from 'lucide-react'
import api from '@/lib/api'
import type { Arbeitsmittel, Standort } from '@/types'
import { AmpelBadge } from '@/components/ui/AmpelBadge'
import { EQUIPMENT_TYPES, suggestTypFromName } from '@/data/equipment-types'
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

const TYPEN = EQUIPMENT_TYPES.map(t => t.value)

/* ─── Wiederholung / Recurrence constants ─── */
type WiederholungTyp = 'einmalig' | 'taeglich' | 'woechentlich' | 'alle2wochen' | 'monatlich' | 'jaehrlich' | 'benutzerdefiniert'

const WIEDERHOLUNG_OPTIONS: { value: WiederholungTyp; label: string; separator?: boolean }[] = [
  { value: 'einmalig',        label: 'Nie' },
  { value: 'taeglich',        label: 'Täglich' },
  { value: 'woechentlich',    label: 'Wöchentlich' },
  { value: 'alle2wochen',     label: 'Alle 2 Wochen' },
  { value: 'monatlich',       label: 'Monatlich' },
  { value: 'jaehrlich',       label: 'Jährlich' },
  { value: 'benutzerdefiniert', label: 'Eigene...', separator: true },
]

/** Extended day/weekday types for ordinal picker ("Am…" mode) */
const AM_TYPEN = [
  { value: 'mo',          label: 'Montag' },
  { value: 'di',          label: 'Dienstag' },
  { value: 'mi',          label: 'Mittwoch' },
  { value: 'do',          label: 'Donnerstag' },
  { value: 'fr',          label: 'Freitag' },
  { value: 'sa',          label: 'Samstag' },
  { value: 'so',          label: 'Sonntag' },
  { value: 'tag',         label: 'Tag' },
  { value: 'wochentag',   label: 'Wochentag' },
  { value: 'wochenendtag',label: 'Wochenendtag' },
]

/** Unit items for the "Alle" two-column drum roll */
const EINHEIT_ITEMS = [
  { value: 'tag',   label: 'Tage' },
  { value: 'woche', label: 'Wochen' },
  { value: 'monat', label: 'Monate' },
  { value: 'jahr',  label: 'Jahre' },
]

const CUSTOM_UNITS = [
  { value: 'tag',   label: 'Tag',   labelPlural: 'Tage',   jede: 'Jeden' },
  { value: 'woche', label: 'Woche', labelPlural: 'Wochen', jede: 'Jede'  },
  { value: 'monat', label: 'Monat', labelPlural: 'Monate', jede: 'Jeden' },
  { value: 'jahr',  label: 'Jahr',  labelPlural: 'Jahre',  jede: 'Jedes' },
]

const WOCHENTAGE_LANG  = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const WOCHENTAGE_MIN   = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONATE_KURZ      = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MONATE_LANG      = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MONATS_ORDINALE  = ['1.', '2.', '3.', '4.', '5.', 'vorletzten', 'letzten']

interface PruefplanungState {
  startDatum: string
  wiederholung: WiederholungTyp
  // Eigene — Intervall
  customAnzahl: number
  customEinheit: string     // tag | woche | monat | jahr
  wochentage: number[]      // 0=Mo..6=So (wöchentlich)
  // Monatlich
  monatlichModus: 'jeden' | 'am'
  monatlichTage: number[]
  monatlichOrdinal: string
  monatlichWochentagTyp: string  // mo|di|mi|do|fr|sa|so|tag|wochentag|wochenendtag
  // Jährlich
  jaehrlichMonate: number[]
  jaehrlichWochentageAktiv: boolean   // Wochentage-Toggle on/off
  jaehrlichOrdinal: string            // 1.|2.|...|letzten
  jaehrlichWochentagTyp: string       // mo|di|...|wochenendtag
  // Ende
  endetTyp: 'nie' | 'datum' | 'anzahl'
  endetDatum: string
  endetNach: number
}

/** Convert Prüfplanung state → pruef_intervall_monate */
function computeIntervallMonate(state: PruefplanungState): number {
  switch (state.wiederholung) {
    case 'einmalig': return 0
    case 'taeglich': return 1 / 30
    case 'woechentlich': return 0.25
    case 'alle2wochen': return 0.5
    case 'monatlich': return 1
    case 'jaehrlich': return 12
    case 'benutzerdefiniert': {
      const n = state.customAnzahl || 1
      switch (state.customEinheit) {
        case 'tag': return n / 30
        case 'woche': return n * 0.25
        case 'monat': return n
        case 'jahr': return n * 12
        default: return n
      }
    }
    default: return 12
  }
}

// Common German equipment norms
const NORMEN = [
  { value: 'DIN EN 131', label: 'DIN EN 131', desc: 'Leitern — Anforderungen, Prüfung, Kennzeichnung' },
  { value: 'DGUV V3', label: 'DGUV V3', desc: 'Elektrische Anlagen und Betriebsmittel' },
  { value: 'DIN EN 15635', label: 'DIN EN 15635', desc: 'Ortsfeste Regalsysteme — Anwendung und Wartung' },
  { value: 'BetrSichV', label: 'BetrSichV', desc: 'Betriebssicherheitsverordnung' },
  { value: 'DGUV V68', label: 'DGUV V68', desc: 'Flurförderzeuge (Gabelstapler)' },
  { value: 'DIN 4102', label: 'DIN 4102', desc: 'Brandverhalten von Baustoffen und Bauteilen' },
  { value: 'DIN EN 1004', label: 'DIN EN 1004', desc: 'Fahrbare Arbeitsbühnen' },
  { value: 'DGUV R. 112-198', label: 'DGUV R. 112-198', desc: 'Benutzung von PSA gegen Absturz' },
  { value: 'DIN EN 362', label: 'DIN EN 362', desc: 'PSA gegen Absturz — Verbindungselemente' },
  { value: 'TRBS 1201', label: 'TRBS 1201', desc: 'Prüfung und Kontrolle von Arbeitsmitteln' },
  { value: 'DIN EN 13501', label: 'DIN EN 13501', desc: 'Klassifizierung Brandverhalten Bauprodukte' },
  { value: 'DGUV V52', label: 'DGUV V52', desc: 'Krane' },
]

/** Norm suggestion: maps equipment type → recommended norms + interval (derived from EQUIPMENT_TYPES) */
const NORM_AI_MAP: Record<string, { norms: string[]; intervallMonate: number; intervallLabel: string }> = Object.fromEntries(
  EQUIPMENT_TYPES.map(t => [t.value, { norms: [t.norm], intervallMonate: t.intervallMonate, intervallLabel: t.intervallLabel }])
)

interface ChecklisteOption {
  id: string
  name: string
  norm: string | null
  kategorie: string
}

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

/* ─── Typ-Select with descriptions, examples, and Vorschlag ─── */
function TypSelect({
  value,
  onChange,
  nameSuggestion,
}: {
  value: string
  onChange: (v: string) => void
  nameSuggestion?: string   // current name field value for auto-suggest
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

/* ─── ComboBox (Text + Dropdown) ─── */
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


/* ─── Scroll Picker (iOS drum roll) ─── */
const SP_ITEM_H = 36
const SP_VISIBLE = 3

function ScrollPicker({
  items,
  value,
  onChange,
}: {
  items: { value: string | number; label: string }[]
  value: string | number
  onChange: (v: string | number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeIdx = Math.max(0, items.findIndex(i => String(i.value) === String(value)))
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUserScrolling = useRef(false)

  useEffect(() => {
    if (scrollRef.current && !isUserScrolling.current) {
      scrollRef.current.scrollTop = activeIdx * SP_ITEM_H
    }
  }, [activeIdx])

  const handleScroll = () => {
    isUserScrolling.current = true
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return
      const idx = Math.round(scrollRef.current.scrollTop / SP_ITEM_H)
      const clamped = Math.max(0, Math.min(items.length - 1, idx))
      isUserScrolling.current = false
      scrollRef.current.scrollTop = clamped * SP_ITEM_H
      if (String(items[clamped].value) !== String(value)) {
        onChange(items[clamped].value)
      }
    }, 80)
  }

  const pad = ((SP_VISIBLE - 1) / 2) * SP_ITEM_H // 2 items padding top/bottom

  return (
    <div className="relative" style={{ height: SP_VISIBLE * SP_ITEM_H }}>
      {/* Selection highlight */}
      <div
        className="absolute inset-x-0 bg-gray-100 rounded-lg pointer-events-none z-10"
        style={{ top: pad, height: SP_ITEM_H }}
      />
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' as never }}
      >
        <div style={{ height: pad }} />
        {items.map((item, i) => (
          <div
            key={String(item.value)}
            style={{ height: SP_ITEM_H, scrollSnapAlign: 'center' }}
            className={`flex items-center justify-center text-sm select-none ${
              i === activeIdx ? 'font-semibold text-black' : 'text-gray-400'
            }`}
          >
            {item.label}
          </div>
        ))}
        <div style={{ height: pad }} />
      </div>
      {/* Gradient fade top/bottom — klein halten damit Mittelzeile sichtbar bleibt */}
      <div className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-white/80 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-white/80 to-transparent pointer-events-none z-20" />
    </div>
  )
}

/* ─── Prüfplanung — iOS Calendar "Eigene" Style ─── */
type CalendarView = 'main' | 'eigene' | 'endet'


function PruefplanungCalendar({
  state,
  onChange,
}: {
  state: PruefplanungState
  onChange: (s: PruefplanungState) => void
}) {
  const [view, setView] = useState<CalendarView>('main')
  const [wiederholungOpen, setWiederholungOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [activeRow, setActiveRow] = useState<null | 'haeufigkeit' | 'alle'>(null)

  // Calendar state — init from startDatum or today
  const initDate = state.startDatum ? new Date(state.startDatum + 'T00:00:00') : new Date()
  const [calYear, setCalYear] = useState(initDate.getFullYear())
  const [calMonth, setCalMonth] = useState(initDate.getMonth())

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const calFirstDay = (() => { const d = new Date(calYear, calMonth, 1).getDay(); return d === 0 ? 6 : d - 1 })()
  const todayStr = new Date().toISOString().slice(0, 10)

  // ── Helpers ────────────────────────────────────────────────
  const formatList = (items: string[]): string => {
    if (items.length === 0) return ''
    if (items.length === 1) return items[0]
    return items.slice(0, -1).join(', ') + ' und ' + items[items.length - 1]
  }

  const formatOrdinalList = (days: number[]): string => {
    if (days.length === 0) return ''
    if (days.length === 1) return `${days[0]}.`
    if (days.length === 2) return `${days[0]}. und ${days[1]}.`
    return days.slice(0, -1).map(d => `${d}.`).join(', ') + ` und ${days[days.length - 1]}.`
  }

  const getEigeneSummary = (): string => {
    const n = state.customAnzahl || 1
    const unit = CUSTOM_UNITS.find(u => u.value === state.customEinheit)
    return n === 1
      ? `${unit?.jede} ${unit?.label}`
      : `Alle ${n} ${unit?.labelPlural}`
  }

  const getTagTypLabel = (typ: string): string =>
    AM_TYPEN.find(t => t.value === typ)?.label ?? typ

  const getDetailSummary = (): string => {
    const n = state.customAnzahl || 1
    const unit = CUSTOM_UNITS.find(u => u.value === state.customEinheit)
    const base = n === 1
      ? `${(unit?.jede ?? '').toLowerCase()} ${(unit?.label ?? '').toLowerCase()}`
      : `alle ${n} ${(unit?.labelPlural ?? '').toLowerCase()}`
    if (state.customEinheit === 'woche' && state.wochentage.length > 0) {
      const sorted = [...state.wochentage].sort((a, b) => a - b)
      return `Prüfung findet ${base} ${formatList(sorted.map(i => WOCHENTAGE_LANG[i]))} statt.`
    }
    if (state.customEinheit === 'monat') {
      if (state.monatlichModus === 'jeden' && state.monatlichTage.length > 0) {
        const sorted = [...state.monatlichTage].sort((a, b) => a - b)
        return `Prüfung findet ${base} am ${formatOrdinalList(sorted)} statt.`
      }
      if (state.monatlichModus === 'am') {
        return `Prüfung findet ${base} am ${state.monatlichOrdinal} ${getTagTypLabel(state.monatlichWochentagTyp)} statt.`
      }
    }
    if (state.customEinheit === 'jahr') {
      const sorted = [...state.jaehrlichMonate].sort((a, b) => a - b)
      const monthStr = sorted.length > 0 ? ` im ${formatList(sorted.map(i => MONATE_KURZ[i]))}` : ''
      if (state.jaehrlichWochentageAktiv) {
        return `Prüfung findet ${base} am ${state.jaehrlichOrdinal} ${getTagTypLabel(state.jaehrlichWochentagTyp)}${monthStr} statt.`
      }
      if (sorted.length > 0) {
        return `Prüfung findet ${base}${monthStr} statt.`
      }
    }
    return `Prüfung findet ${base} statt.`
  }

  const getWiederholungSummary = (): string => {
    if (state.wiederholung !== 'benutzerdefiniert') {
      return WIEDERHOLUNG_OPTIONS.find(o => o.value === state.wiederholung)?.label || 'Nie'
    }
    return getEigeneSummary()
  }

  const getEndeSummary = (): string => {
    if (state.endetTyp === 'nie') return 'Ohne Enddatum'
    if (state.endetTyp === 'datum' && state.endetDatum) {
      return `Bis ${new Date(state.endetDatum + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`
    }
    if (state.endetTyp === 'anzahl') return `Nach ${state.endetNach} Terminen`
    return 'Ohne Enddatum'
  }

  const toggleWochentag = (i: number) => {
    const next = state.wochentage.includes(i)
      ? state.wochentage.filter(x => x !== i)
      : [...state.wochentage, i]
    onChange({ ...state, wochentage: next })
  }

  const toggleMonatlichTag = (d: number) => {
    const next = state.monatlichTage.includes(d)
      ? state.monatlichTage.filter(x => x !== d)
      : [...state.monatlichTage, d]
    onChange({ ...state, monatlichTage: next })
  }

  const toggleJaehrlichMonat = (i: number) => {
    const next = state.jaehrlichMonate.includes(i)
      ? state.jaehrlichMonate.filter(x => x !== i)
      : [...state.jaehrlichMonate, i]
    onChange({ ...state, jaehrlichMonate: next })
  }


  // ── MAIN VIEW — kompakt, eine Zeile pro Option ───────────
  if (view === 'main') {
    return (
      <div className="divide-y divide-gray-100">
        {/* Startdatum — collapsed by default, click to show calendar */}
        <div>
          <button
            type="button"
            onClick={() => setCalendarOpen(o => !o)}
            className="w-full flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-2.5">
              <Calendar size={15} className="text-gray-400" />
              <span className="text-sm text-gray-700">Startdatum</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-500">
                {state.startDatum
                  ? new Date(state.startDatum + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Kein Datum'}
              </span>
              <ChevronDown size={14} className={`text-gray-300 transition-transform ${calendarOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {calendarOpen && (
            <div className="pb-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-2 px-1">
                <button type="button" onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <ChevronDown size={13} style={{ transform: 'rotate(90deg)' }} />
                </button>
                <span className="text-sm font-medium text-gray-800">
                  {MONATE_LANG[calMonth]} {calYear}
                </span>
                <button type="button" onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-0.5">
                {WOCHENTAGE_MIN.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>
              {/* Date grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: calFirstDay }, (_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: calDaysInMonth }, (_, i) => {
                  const d = i + 1
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const isSelected = state.startDatum === dateStr
                  const isToday = dateStr === todayStr
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { onChange({ ...state, startDatum: dateStr }); setCalendarOpen(false) }}
                      className={`mx-auto h-8 w-8 rounded-full text-xs flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-black text-white font-semibold'
                          : isToday
                          ? 'text-black font-semibold ring-1 ring-gray-300'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Wiederholung — ein Klapp-Block */}
        <div>
          <button
            type="button"
            onClick={() => setWiederholungOpen(o => !o)}
            className="w-full flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-2.5">
              <RotateCcw size={15} className="text-gray-400" />
              <span className="text-sm text-gray-700">Wiederholung</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-500">{getWiederholungSummary()}</span>
              <ChevronDown
                size={14}
                className={`text-gray-300 transition-transform ${wiederholungOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {wiederholungOpen && (
            <div className="pb-2">
              {WIEDERHOLUNG_OPTIONS.map(opt => (
                <div key={opt.value}>
                  {opt.separator && <div className="border-t border-gray-100 my-1" />}
                  <button
                    type="button"
                    onClick={() => {
                      if (opt.value === 'benutzerdefiniert') {
                        onChange({ ...state, wiederholung: 'benutzerdefiniert' })
                        setWiederholungOpen(false)
                        setView('eigene')
                      } else {
                        onChange({ ...state, wiederholung: opt.value })
                        setWiederholungOpen(false)
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      state.wiederholung === opt.value && opt.value !== 'benutzerdefiniert'
                        ? 'bg-gray-100 text-black font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {state.wiederholung === opt.value && opt.value !== 'benutzerdefiniert' && (
                      <Check size={15} className="text-black" />
                    )}
                    {opt.value === 'benutzerdefiniert' && (
                      <ChevronRight size={15} className="text-gray-300" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Benutzerdefiniert-Zusammenfassung wenn aktiv */}
          {state.wiederholung === 'benutzerdefiniert' && !wiederholungOpen && (
            <button
              type="button"
              onClick={() => setView('eigene')}
              className="w-full flex items-center justify-between px-3 py-2 mb-1 rounded-lg bg-gray-50 text-sm"
            >
              <span className="text-gray-500 text-xs">{getEigeneSummary()}</span>
              <ChevronRight size={13} className="text-gray-300" />
            </button>
          )}
        </div>

        {/* Endet — nur wenn sinnvoll */}
        {state.wiederholung !== 'einmalig' && state.wiederholung !== 'nie' && (
          <button
            type="button"
            onClick={() => setView('endet')}
            className="w-full flex items-center justify-between py-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <X size={15} className="text-gray-400" />
              <span className="text-sm text-gray-700">Endet</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">{getEndeSummary()}</span>
              <ChevronRight size={14} className="text-gray-300" />
            </div>
          </button>
        )}
      </div>
    )
  }

  // ── EIGENE VIEW — iOS Calendar logic ──────────────────────
  if (view === 'eigene') {
    const n = state.customAnzahl || 1
    const curUnit = CUSTOM_UNITS.find(u => u.value === state.customEinheit)

    const ANZAHL_ITEMS = Array.from({ length: 999 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
    const ORDINAL_ITEMS = MONATS_ORDINALE.map(o => ({ value: o, label: o }))
    const AM_TYP_ITEMS  = AM_TYPEN.map(t => ({ value: t.value, label: t.label }))

    return (
      <div className="space-y-3">
        {/* Zurück */}
        <button
          type="button"
          onClick={() => setView('main')}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors -mt-1"
        >
          <ChevronDown size={12} className="rotate-90" />
          Wiederholung
        </button>

        {/* Card 1: Häufigkeit + Alle */}
        <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">

          {/* Häufigkeit row → inline checkmark list */}
          <div>
            <button
              type="button"
              onClick={() => setActiveRow(activeRow === 'haeufigkeit' ? null : 'haeufigkeit')}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-600">Häufigkeit</span>
              <span className="flex items-center gap-1">
                <span className="text-sm font-medium text-black">{curUnit?.label}</span>
                <div className="flex flex-col leading-none">
                  <ChevronDown size={9} className="text-gray-300 -mb-0.5" style={{ transform: 'rotate(180deg)' }} />
                  <ChevronDown size={9} className="text-gray-300" />
                </div>
              </span>
            </button>
            {activeRow === 'haeufigkeit' && (
              <div className="bg-white border-t border-gray-100">
                {CUSTOM_UNITS.map(u => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => {
                      onChange({ ...state, customEinheit: u.value })
                      setActiveRow(null)
                    }}
                    className="w-full flex items-center justify-between px-6 py-3 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{u.label}</span>
                    {state.customEinheit === u.value && <Check size={15} className="text-black" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alle row → two-column drum roll (number × unit) */}
          <div>
            <button
              type="button"
              onClick={() => setActiveRow(activeRow === 'alle' ? null : 'alle')}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-600">Alle</span>
              <span className="text-sm font-medium text-black">
                {n} {n === 1 ? curUnit?.label : curUnit?.labelPlural}
              </span>
            </button>
            {activeRow === 'alle' && (
              <div className="flex bg-white border-t border-gray-100">
                <div className="flex-1 border-r border-gray-100">
                  <ScrollPicker
                    items={ANZAHL_ITEMS}
                    value={n}
                    onChange={v => onChange({ ...state, customAnzahl: Number(v) })}
                  />
                </div>
                <div className="flex-1">
                  <ScrollPicker
                    items={EINHEIT_ITEMS}
                    value={state.customEinheit}
                    onChange={v => onChange({ ...state, customEinheit: String(v) })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary sentence — outside card */}
        <p className="text-xs text-gray-500 text-center px-2">{getDetailSummary()}</p>

        {/* Card 2: Wöchentlich — full weekday names with checkmarks */}
        {state.customEinheit === 'woche' && (
          <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {WOCHENTAGE_LANG.map((tag, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleWochentag(i)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-700">{tag}</span>
                {state.wochentage.includes(i) && <Check size={16} className="text-black" />}
              </button>
            ))}
          </div>
        )}

        {/* Card 2: Monatlich — Jeden | Am... + sub-pickers */}
        {state.customEinheit === 'monat' && (
          <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">

            {/* Jeden → day grid */}
            <div>
              <button
                type="button"
                onClick={() => onChange({ ...state, monatlichModus: 'jeden' })}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-white"
              >
                <span className="text-sm text-gray-700">Jeden</span>
                {state.monatlichModus === 'jeden' && <Check size={16} className="text-black" />}
              </button>
              {state.monatlichModus === 'jeden' && (
                <div className="px-3 pb-4 pt-1 bg-white">
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleMonatlichTag(d)}
                        className={`h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                          state.monatlichTage.includes(d)
                            ? 'bg-black text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Am... → two-column drum roll: ordinal × AM_TYPEN */}
            <div>
              <button
                type="button"
                onClick={() => onChange({ ...state, monatlichModus: 'am' })}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-white"
              >
                <span className="text-sm text-gray-700">Am …</span>
                {state.monatlichModus === 'am' && <Check size={16} className="text-black" />}
              </button>
              {state.monatlichModus === 'am' && (
                <div className="flex bg-white border-t border-gray-100">
                  <div className="flex-1 border-r border-gray-100">
                    <ScrollPicker
                      items={ORDINAL_ITEMS}
                      value={state.monatlichOrdinal}
                      onChange={v => onChange({ ...state, monatlichOrdinal: String(v) })}
                    />
                  </div>
                  <div className="flex-1">
                    <ScrollPicker
                      items={AM_TYP_ITEMS}
                      value={state.monatlichWochentagTyp}
                      onChange={v => onChange({ ...state, monatlichWochentagTyp: String(v) })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card 2: Jährlich — month grid + optional Wochentage ordinal */}
        {state.customEinheit === 'jahr' && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">

            {/* Month 3×4 grid */}
            <div className="p-3 bg-white">
              <div className="grid grid-cols-3 gap-1.5">
                {MONATE_KURZ.map((m, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleJaehrlichMonat(i)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      state.jaehrlichMonate.includes(i)
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Wochentage toggle row */}
            <div className="border-t border-gray-100">
              <button
                type="button"
                onClick={() => onChange({ ...state, jaehrlichWochentageAktiv: !state.jaehrlichWochentageAktiv })}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-white"
              >
                <span className="text-sm text-gray-700">Wochentage</span>
                {/* Toggle pill */}
                <div className={`w-11 h-6 rounded-full transition-colors relative ${state.jaehrlichWochentageAktiv ? 'bg-black' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${state.jaehrlichWochentageAktiv ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {/* Ordinal × weekday type drum roll when toggle ON */}
              {state.jaehrlichWochentageAktiv && (
                <div className="flex bg-white border-t border-gray-100">
                  <div className="flex-1 border-r border-gray-100">
                    <ScrollPicker
                      items={ORDINAL_ITEMS}
                      value={state.jaehrlichOrdinal}
                      onChange={v => onChange({ ...state, jaehrlichOrdinal: String(v) })}
                    />
                  </div>
                  <div className="flex-1">
                    <ScrollPicker
                      items={AM_TYP_ITEMS}
                      value={state.jaehrlichWochentagTyp}
                      onChange={v => onChange({ ...state, jaehrlichWochentagTyp: String(v) })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Endet-Zeile */}
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => setView('endet')}
            className="w-full flex items-center justify-between py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <X size={13} className="text-gray-400" />
              <span className="text-gray-600">{getEndeSummary()}</span>
            </div>
            <ChevronRight size={14} className="text-gray-300" />
          </button>
        </div>
      </div>
    )
  }

  // ── ENDET VIEW ─────────────────────────────────────────────
  if (view === 'endet') {
    const backView: CalendarView = state.wiederholung === 'benutzerdefiniert' ? 'eigene' : 'main'
    return (
      <div>
        <button
          type="button"
          onClick={() => setView(backView)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-3"
        >
          <ChevronDown size={12} className="rotate-90" />
          {backView === 'eigene' ? 'Benutzerdefiniert' : 'Wiederholung'}
        </button>
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...state, endetTyp: 'nie' })}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors ${
              state.endetTyp === 'nie' ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <X size={14} className="text-gray-400" />
              <span className={state.endetTyp === 'nie' ? 'font-medium text-black' : 'text-gray-600'}>Ohne Enddatum</span>
            </div>
            {state.endetTyp === 'nie' && <Check size={16} className="text-black" />}
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...state, endetTyp: 'datum' })}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors ${
              state.endetTyp === 'datum' ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <span className={state.endetTyp === 'datum' ? 'font-medium text-black' : 'text-gray-600'}>
              An einem bestimmten Datum
            </span>
            {state.endetTyp === 'datum' && <Check size={16} className="text-black" />}
          </button>
          {state.endetTyp === 'datum' && (
            <div className="px-3 pb-2">
              <input
                type="date"
                value={state.endetDatum}
                onChange={e => onChange({ ...state, endetDatum: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none mt-1"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => onChange({ ...state, endetTyp: 'anzahl' })}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors ${
              state.endetTyp === 'anzahl' ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <span className={state.endetTyp === 'anzahl' ? 'font-medium text-black' : 'text-gray-600'}>
              Nach einer bestimmten Anzahl von Terminen
            </span>
            {state.endetTyp === 'anzahl' && <Check size={16} className="text-black" />}
          </button>
          {state.endetTyp === 'anzahl' && (
            <div className="px-3 pb-2 flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Nach</span>
              <input
                type="number"
                min="1"
                value={state.endetNach}
                onChange={e => onChange({ ...state, endetNach: Number(e.target.value) || 1 })}
                className="w-16 px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-center focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
              <span className="text-xs text-gray-500">Terminen</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}


/* ═══════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════ */
export function ArbeitsmittelPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Arbeitsmittel[]>([])
  const [standorte, setStandorte] = useState<Standort[]>([])
  const [loading, setLoading] = useState(true)
  const [suche, setSuche] = useState('')
  const [typFilter, setTypFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Arbeitsmittel | null>(null)
  const [pruefTarget, setPruefTarget] = useState<Arbeitsmittel | null>(null)

  const loadData = () => {
    Promise.all([
      api.get('/arbeitsmittel?limit=200'),
      api.get('/standorte'),
    ])
      .then(([amRes, stRes]) => {
        setItems(amRes.data.items)
        setStandorte(stRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const filtered = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(suche.toLowerCase()) ||
      i.typ.toLowerCase().includes(suche.toLowerCase())
    const matchesTyp = !typFilter || i.typ === typFilter
    return matchesSearch && matchesTyp
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Arbeitsmittel wirklich löschen?')) return
    await api.delete(`/arbeitsmittel/${id}`)
    loadData()
  }

  const handleEdit = (item: Arbeitsmittel) => {
    setEditItem(item)
    setShowForm(true)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Arbeitsmittel</h1>
          <p className="text-sm text-gray-400 mt-1">{items.length} Einträge</p>
        </div>
        <LeitfadenTooltip
          section="arbeitsmittel.anlegen"
          title={LEITFADEN_TEXTE['arbeitsmittel.anlegen'].title}
          description={LEITFADEN_TEXTE['arbeitsmittel.anlegen'].description}
        >
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            data-tour-page="am-neu"
          >
            <Plus size={16} />
            Hinzufügen
          </button>
        </LeitfadenTooltip>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Suchen..."
            value={suche}
            onChange={e => setSuche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
          />
        </div>
        <select
          value={typFilter}
          onChange={e => setTypFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
        >
          <option value="">Alle Typen</option>
          {TYPEN.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          {items.length === 0 ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Wrench size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Noch keine Arbeitsmittel angelegt</p>
              <p className="text-xs text-gray-400 mb-4">Erfasse Leitern, Regale, Maschinen und mehr</p>
              <button
                onClick={() => { setEditItem(null); setShowForm(true) }}
                className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Erstes Arbeitsmittel anlegen
              </button>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Keine Treffer für die aktuelle Suche.</p>
          )}
        </div>
      ) : (
        <LeitfadenTooltip
          section="arbeitsmittel.liste"
          title={LEITFADEN_TEXTE['arbeitsmittel.liste'].title}
          description={LEITFADEN_TEXTE['arbeitsmittel.liste'].description}
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-tour-page="am-liste">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3 hidden md:table-cell">Typ</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3 hidden md:table-cell">Nächste Prüfung</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {item.foto_url && (
                        <img src={item.foto_url} alt="" className="w-8 h-8 rounded object-cover border border-gray-100" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-black">{item.name}</p>
                        <p className="text-xs text-gray-400 md:hidden">{item.typ}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">{item.typ}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">
                    {item.naechste_pruefung_am || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <AmpelBadge status={item.ampel_status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPruefTarget(item)} title="Prüfung starten" className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                        <ClipboardCheck size={14} />
                      </button>
                      <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-black transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </LeitfadenTooltip>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <ArbeitsmittelForm
          item={editItem}
          standorte={standorte}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData() }}
        />
      )}

      {/* Prüfung starten Modal */}
      {pruefTarget && (
        <PruefStartDialog
          arbeitsmittel={pruefTarget}
          onClose={() => setPruefTarget(null)}
          onStarted={(pruefungId) => navigate(`/pruefungen/${pruefungId}`)}
        />
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════════
   Create / Edit Form
   ═══════════════════════════════════════════════════════ */
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

  // Build standort labels with full address
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
      {/* Modal: breit querformat, Prüfplanung öffnet als Overlay */}
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

        {/* Body: left column + overlay panel */}
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

            {/* Prüfplanung-Karte — beide Zeilen öffnen das Overlay */}
            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">

              {/* Datum-Zeile */}
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

              {/* Wiederholung-Zeile */}
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

          {/* Prüfplanung Overlay — legt sich von rechts über den Inhalt */}
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
    // Simulate brief AI "thinking" delay
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


/* ═══════════════════════════════════════════════════════
   Prüfung Start Dialog
   ═══════════════════════════════════════════════════════ */
function PruefStartDialog({
  arbeitsmittel,
  onClose,
  onStarted,
}: {
  arbeitsmittel: Arbeitsmittel
  onClose: () => void
  onStarted: (pruefungId: string) => void
}) {
  const [checklisten, setChecklisten] = useState<ChecklisteOption[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/checklisten')
      .then(res => {
        setChecklisten(res.data)
        if (res.data.length > 0) setSelected(res.data[0].id)
      })
      .catch(() => setError('Checklisten konnten nicht geladen werden'))
      .finally(() => setLoading(false))
  }, [])

  const handleStart = async () => {
    if (!selected) return
    setStarting(true)
    setError('')
    try {
      const res = await api.post('/pruefungen', {
        arbeitsmittel_id: arbeitsmittel.id,
        checkliste_id: selected,
      })
      onStarted(res.data.id)
    } catch {
      setError('Prüfung konnte nicht gestartet werden')
      setStarting(false)
    }
  }

  const handleSeed = async () => {
    setError('')
    try {
      await api.post('/seed/default-checklisten')
      const res = await api.get('/checklisten')
      setChecklisten(res.data)
      if (res.data.length > 0) setSelected(res.data[0].id)
    } catch {
      setError('Checklisten konnten nicht erstellt werden')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-black">Prüfung starten</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-5 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400">Arbeitsmittel</p>
            <p className="text-sm font-medium text-black mt-0.5">{arbeitsmittel.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{arbeitsmittel.typ}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          ) : checklisten.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">Keine Checklisten vorhanden.</p>
              <button onClick={handleSeed}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                Standard-Checklisten erstellen
              </button>
            </div>
          ) : (
            <>
              <label className="block text-xs font-medium text-gray-500 mb-2">Checkliste auswählen</label>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {checklisten.map(cl => (
                  <label
                    key={cl.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected === cl.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="checkliste"
                      value={cl.id}
                      checked={selected === cl.id}
                      onChange={() => setSelected(cl.id)}
                      className="accent-black"
                    />
                    <div>
                      <p className="text-sm font-medium text-black">{cl.name}</p>
                      {cl.norm && <p className="text-xs text-gray-400">{cl.norm}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

          {checklisten.length > 0 && (
            <div className="flex gap-3 mt-5">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                Abbrechen
              </button>
              <button onClick={handleStart} disabled={starting || !selected}
                className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40">
                {starting ? 'Wird gestartet...' : 'Prüfung starten'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
