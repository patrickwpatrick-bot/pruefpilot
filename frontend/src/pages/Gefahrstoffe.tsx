/**
 * Gefahrstoffe — Gefahrstoffverzeichnis nach GefStoffV / CLP-VO
 */
import React, { useEffect, useState, useRef } from 'react'
import {
  Plus, Trash2, FileText, CheckCircle2, ChevronDown, X, Search,
  AlertTriangle, Shield, Package, MapPin, FlaskConical,
  Flame, Skull, Wind, Droplets, Leaf, Zap, Activity, Sun, Check,
  Camera,
} from 'lucide-react'
import api from '@/lib/api'
import type { Standort } from '@/types'
import { getBranchenConfig } from '@/config/branchen'

// ─── GHS Piktogramme als SVG-Diamant-Icons ─────────────────────────────────

type GhsKategorie = {
  value: string
  label: string
  ghs: string
  Icon: React.ElementType
  description: string
  examples: string[]
}

const GHS_KATEGORIEN: GhsKategorie[] = [
  {
    value: 'Entzündbar',
    label: 'Entzündbar',
    ghs: 'GHS02',
    Icon: Flame,
    description: 'Entzündbare Flüssigkeiten (Kat. 1–3), Gase, Aerosole und Feststoffe nach CLP-VO (EG) Nr. 1272/2008',
    examples: ['Aceton', 'Ethanol 70%', 'Benzin', 'Propangas'],
  },
  {
    value: 'Oxidierend',
    label: 'Oxidierend',
    ghs: 'GHS03',
    Icon: Sun,
    description: 'Oxidierende Flüssigkeiten, Feststoffe und Gase – können Brand oder Explosion verursachen (CLP-VO)',
    examples: ['Wasserstoffperoxid >8%', 'Natriumhypochlorit', 'Chlor'],
  },
  {
    value: 'Gasdruckgefährdung',
    label: 'Unter Druck',
    ghs: 'GHS04',
    Icon: Wind,
    description: 'Gase unter Druck, verdichtete, verflüssigte oder gelöste Gase – Berstgefahr bei Erwärmung',
    examples: ['Druckluftflasche', 'CO₂-Kartusche', 'Acetylen', 'Stickstoff flüssig'],
  },
  {
    value: 'Ätzend',
    label: 'Ätzend',
    ghs: 'GHS05',
    Icon: Droplets,
    description: 'Hautätzung (Kat. 1A–1C) und schwere Augenschäden (Kat. 1) nach CLP-VO – erfordert PSA',
    examples: ['Salzsäure', 'Natronlauge', 'Schwefelsäure', 'Natriumhydroxid'],
  },
  {
    value: 'Giftig',
    label: 'Giftig / Lebensgefahr',
    ghs: 'GHS06',
    Icon: Skull,
    description: 'Akute Toxizität Kategorie 1–3 (tödlich oder giftig) über orale, dermale oder inhalative Exposition',
    examples: ['Methanol', 'Blausäure', 'Quecksilber', 'Arsen'],
  },
  {
    value: 'Gesundheitsschädlich',
    label: 'Gesundheitsschädlich',
    ghs: 'GHS07',
    Icon: AlertTriangle,
    description: 'Akute Toxizität Kat. 4, Hautreizung, Augenreizung, Atemwegsreizung, Sensibilisierung der Haut',
    examples: ['Isopropanol', 'Ammoniak <25%', 'Xylol', 'Reinigungsmittel'],
  },
  {
    value: 'Gesundheitsgefährdend',
    label: 'Gesundheitsgefährdend',
    ghs: 'GHS08',
    Icon: Activity,
    description: 'CMR-Stoffe (karzinogen, mutagen, reproduktionstoxisch), Organschäden, Atemwegssensibilisierung (Kat. 1)',
    examples: ['Benzol', 'Formaldehyd', 'Asbest', 'Dichlormethan'],
  },
  {
    value: 'Umweltgefährdend',
    label: 'Umweltgefährdend',
    ghs: 'GHS09',
    Icon: Leaf,
    description: 'Gewässergefährdend akut (Kat. 1) oder chronisch (Kat. 1–4) – Lagerung und Entsorgung nach AwSV',
    examples: ['Motoröl', 'Kraftstoff', 'Lacke', 'Pflanzenschutzmittel'],
  },
  {
    value: 'Explosiv',
    label: 'Explosiv',
    ghs: 'GHS01',
    Icon: Zap,
    description: 'Explosive Stoffe, Gemische und Erzeugnisse sowie selbstzersetzliche Stoffe und organische Peroxide',
    examples: ['Sprengstoff', 'Knallquecksilber', 'Nitrocellulose', 'Azide'],
  },
]

/* ─── GHS Diamond Icon ─────────────────────────────────────────────────────── */
function GhsDiamond({
  kategorie,
  size = 32,
  selected = false,
}: {
  kategorie: GhsKategorie
  size?: number
  selected?: boolean
}) {
  const Icon = kategorie.Icon
  const diamondSize = size
  const iconSize = Math.round(size * 0.45)
  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center"
      style={{ width: diamondSize, height: diamondSize }}
    >
      {/* Diamond border */}
      <div
        className={`absolute inset-0 border-2 transition-colors ${
          selected ? 'border-black bg-black/5' : 'border-gray-700'
        }`}
        style={{ transform: 'rotate(45deg)', borderRadius: 2 }}
      />
      {/* Icon */}
      <Icon
        size={iconSize}
        className={`relative z-10 ${selected ? 'text-black' : 'text-gray-800'}`}
        strokeWidth={1.5}
      />
    </div>
  )
}

/* ─── GefahrenklasseSelect ─────────────────────────────────────────────────── */
function GefahrenklasseSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = GHS_KATEGORIEN.find(k => k.value === value) ?? null
  const activeDesc = hovered
    ? GHS_KATEGORIEN.find(k => k.value === hovered)
    : selected

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Gefahrenklasse (GHS / CLP)
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm text-left transition-colors ${
          open ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'
        } bg-white`}
      >
        {selected ? (
          <>
            <GhsDiamond kategorie={selected} size={28} selected />
            <span className="font-medium text-black">{selected.label}</span>
            <span className="text-xs text-gray-400 ml-0.5">{selected.ghs}</span>
          </>
        ) : (
          <span className="text-gray-400">Gefahrenklasse auswählen...</span>
        )}
        <ChevronDown
          size={14}
          className={`ml-auto text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          {/* Description preview */}
          {activeDesc && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-start gap-3">
              <GhsDiamond kategorie={activeDesc} size={36} selected={activeDesc.value === value} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-black mb-0.5">{activeDesc.label}</div>
                <div className="text-[10px] text-gray-500 leading-relaxed">{activeDesc.description}</div>
              </div>
            </div>
          )}
          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {GHS_KATEGORIEN.map(kat => (
              <button
                key={kat.value}
                type="button"
                onClick={() => { onChange(kat.value); setOpen(false) }}
                onMouseEnter={() => setHovered(kat.value)}
                onMouseLeave={() => setHovered(null)}
                className={`w-full flex items-center gap-3 px-3.5 py-2 transition-colors text-left ${
                  value === kat.value
                    ? 'bg-gray-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <GhsDiamond kategorie={kat} size={26} selected={value === kat.value} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${value === kat.value ? 'font-medium text-black' : 'text-gray-800'}`}>
                    {kat.label}
                  </div>
                  <div className="text-[10px] text-gray-400">{kat.ghs}</div>
                </div>
                {value === kat.value && (
                  <Check size={14} className="text-black flex-shrink-0" />
                )}
              </button>
            ))}
            {/* Clear option */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100 mt-1"
              >
                <X size={12} />
                Auswahl aufheben
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Image Upload ──────────────────────────────────────────────────────────── */
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

      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.url)
    } catch {
      const reader = new FileReader()
      reader.onload = () => { const d = reader.result as string; onChange(d) }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  const containerClass = square ? 'w-full aspect-square' : 'w-full h-36'

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Foto</label>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      {preview ? (
        <div className="relative group">
          <div className={`${containerClass} rounded-lg border border-gray-200 overflow-hidden bg-gray-50`}>
            <img
              src={preview}
              alt="Gefahrstoff"
              className={`w-full h-full ${objectFit} ${objectPos} transition-all`}
            />
          </div>
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
          {showTools && (
            <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <div>
                <p className="text-[10px] font-medium text-gray-500 mb-1">Zuschnitt</p>
                <div className="flex gap-1">
                  {(['object-cover', 'object-contain'] as const).map((fit) => (
                    <button key={fit} type="button" onClick={() => setObjectFit(fit)}
                      className={`px-2.5 py-1 text-[10px] rounded-md border ${objectFit === fit ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                      {fit === 'object-cover' ? 'Füllen' : 'Einpassen'}
                    </button>
                  ))}
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
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`w-full ${square ? 'aspect-square' : 'h-36'} rounded-lg border border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400`}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <Camera size={20} strokeWidth={1.5} />
              <span className="text-xs">Foto hinzufügen</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

/* ─── H/P-Sätze Multi-Select ────────────────────────────────────────────────── */
function HSaetzeSelector({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const selected = value ? value.split(', ').filter(Boolean) : []

  const toggleSatz = (satz: string) => {
    const code = satz.split(' - ')[0]
    if (selected.includes(code)) {
      onChange(selected.filter(s => s !== code).join(', '))
    } else {
      onChange([...selected, code].join(', '))
    }
  }

  const filteredOptions = options.filter(o =>
    !filter || o.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm cursor-pointer flex items-center justify-between min-h-[38px]"
      >
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selected.map(s => (
              <span key={s} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">{s}</span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">Auswählen...</span>
        )}
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Filtern..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-gray-200 outline-none focus:border-black"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-36">
            {filteredOptions.map(satz => {
              const code = satz.split(' - ')[0]
              const isSelected = selected.includes(code)
              return (
                <button
                  key={satz}
                  onClick={() => toggleSatz(satz)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${isSelected ? 'bg-gray-50 font-medium' : ''}`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-black border-black' : 'border-gray-300'}`}>
                    {isSelected && <Check size={8} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="truncate">{satz}</span>
                </button>
              )
            })}
          </div>
          <div className="p-2 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] text-gray-400">{selected.length} ausgewählt</span>
            <button onClick={() => setOpen(false)} className="text-xs text-black font-medium hover:underline">Fertig</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Lagerort ComboBox ─────────────────────────────────────────────────────── */
function LagerortComboBox({
  value,
  onChange,
  standorte,
  existingLagerorte,
}: {
  value: string
  onChange: (v: string) => void
  standorte: Standort[]
  existingLagerorte: string[]
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

  const allOptions = [...standorte.map(s => s.name), ...existingLagerorte]
  const uniqueOptions = [...new Set(allOptions)].sort()
  const filterText = open ? search : ''
  const filtered = uniqueOptions.filter(o => o.toLowerCase().includes(filterText.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">Lagerort</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="z.B. Gefahrstofflager Halle 3"
          value={open ? search : value}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => { setSearch(value); setOpen(true) }}
          className="w-full px-3.5 py-2 pr-9 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
        />
        <button
          type="button"
          onClick={() => { setOpen(!open); if (!open) inputRef.current?.focus() }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (filtered.length > 0 || search) && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setSearch(''); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 transition-colors ${o === value ? 'bg-gray-50 font-medium text-black' : 'text-gray-700'}`}
            >
              <MapPin size={12} className="inline mr-1.5 text-gray-400" />
              {o}
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

/* ─── Common H/P-Sätze ──────────────────────────────────────────────────────── */
const COMMON_H_SAETZE = [
  'H200 - Instabil, explosiv',
  'H220 - Extrem entzündbares Gas',
  'H225 - Flüssigkeit und Dampf leicht entzündbar',
  'H226 - Flüssigkeit und Dampf entzündbar',
  'H228 - Entzündbarer Feststoff',
  'H290 - Kann gegenüber Metallen korrosiv sein',
  'H300 - Lebensgefahr bei Verschlucken',
  'H301 - Giftig bei Verschlucken',
  'H302 - Gesundheitsschädlich bei Verschlucken',
  'H304 - Kann bei Verschlucken und Eindringen in die Atemwege tödlich sein',
  'H310 - Lebensgefahr bei Hautkontakt',
  'H311 - Giftig bei Hautkontakt',
  'H312 - Gesundheitsschädlich bei Hautkontakt',
  'H314 - Verursacht schwere Verätzungen der Haut und schwere Augenschäden',
  'H315 - Verursacht Hautreizungen',
  'H317 - Kann allergische Hautreaktionen verursachen',
  'H318 - Verursacht schwere Augenschäden',
  'H319 - Verursacht schwere Augenreizung',
  'H330 - Lebensgefahr bei Einatmen',
  'H331 - Giftig bei Einatmen',
  'H332 - Gesundheitsschädlich bei Einatmen',
  'H334 - Kann bei Einatmen Allergie, asthmaartige Symptome oder Atembeschwerden verursachen',
  'H335 - Kann die Atemwege reizen',
  'H336 - Kann Schläfrigkeit und Benommenheit verursachen',
  'H340 - Kann genetische Defekte verursachen',
  'H341 - Kann vermutlich genetische Defekte verursachen',
  'H350 - Kann Krebs erzeugen',
  'H351 - Kann vermutlich Krebs erzeugen',
  'H360 - Kann die Fruchtbarkeit beeinträchtigen oder das Kind im Mutterleib schädigen',
  'H370 - Schädigt die Organe',
  'H372 - Schädigt die Organe bei längerer oder wiederholter Exposition',
  'H400 - Sehr giftig für Wasserorganismen',
  'H410 - Sehr giftig für Wasserorganismen mit langfristiger Wirkung',
  'H411 - Giftig für Wasserorganismen mit langfristiger Wirkung',
  'H412 - Schädlich für Wasserorganismen mit langfristiger Wirkung',
]

const COMMON_P_SAETZE = [
  'P210 - Von Hitze, heißen Oberflächen, Funken, offenen Flammen fernhalten',
  'P220 - Von Kleidung und brennbaren Materialien fernhalten',
  'P233 - Behälter dicht verschlossen halten',
  'P240 - Behälter und Anlage erden',
  'P241 - Explosionsgeschützte Geräte verwenden',
  'P260 - Staub/Rauch/Gas/Nebel/Dampf/Aerosol nicht einatmen',
  'P264 - Nach Gebrauch Haut gründlich waschen',
  'P270 - Bei Gebrauch nicht essen, trinken oder rauchen',
  'P271 - Nur im Freien oder in gut belüfteten Räumen verwenden',
  'P280 - Schutzhandschuhe/Schutzkleidung/Augenschutz/Gesichtsschutz tragen',
  'P301+P310 - Bei Verschlucken: Sofort GIFTINFORMATIONSZENTRUM anrufen',
  'P302+P352 - Bei Berührung mit der Haut: Mit viel Wasser waschen',
  'P303+P361+P353 - Bei Berührung mit der Haut (oder dem Haar): Kontaminierte Kleidung ausziehen',
  'P304+P340 - Bei Einatmen: An die frische Luft bringen',
  'P305+P351+P338 - Bei Kontakt mit den Augen: Einige Minuten lang behutsam mit Wasser spülen',
  'P308+P313 - Bei Exposition: Ärztlichen Rat einholen',
  'P332+P313 - Bei Hautreizung: Ärztlichen Rat einholen',
  'P337+P313 - Bei anhaltender Augenreizung: Ärztlichen Rat einholen',
  'P370+P378 - Bei Brand: Löschpulver/Sand/CO2 verwenden',
  'P403+P235 - An einem gut belüfteten Ort aufbewahren. Kühl halten',
  'P501 - Inhalt/Behälter der Entsorgung zuführen',
]

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface Gefahrstoff {
  id: string
  name: string
  hersteller: string
  cas_nummer?: string
  gefahrenklasse: string
  h_saetze: string
  p_saetze: string
  signalwort: 'Gefahr' | 'Achtung'
  lagerort: string
  menge?: string
  foto_url?: string
  sicherheitsdatenblatt_url?: string
  betriebsanweisung_text?: string
  letzte_aktualisierung?: string
  created_at: string
}

/* ─── InfoBlock ─────────────────────────────────────────────────────────────── */
function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-sm text-black">{value || '–'}</div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export function GefahrstoffePage() {
  const [gefahrstoffe, setGefahrstoffe] = useState<Gefahrstoff[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<Gefahrstoff | null>(null)
  const [showSOPModal, setShowSOPModal] = useState<string | null>(null)
  const [sopText, setSopText] = useState('')
  const [generatingSOPId, setGeneratingSOPId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [gefahrstoffSuggestions, setGefahrstoffSuggestions] = useState<string[]>([])
  const [standorte, setStandorte] = useState<Standort[]>([])

  const [formData, setFormData] = useState({
    name: '',
    hersteller: '',
    cas_nummer: '',
    gefahrenklasse: '',
    h_saetze: '',
    p_saetze: '',
    signalwort: 'Achtung' as 'Achtung' | 'Gefahr',
    lagerort: '',
    menge: '',
    foto_url: '',
  })
  const [formStep, setFormStep] = useState(0) // 0=basic, 1=safety, 2=storage

  const loadData = async () => {
    try {
      const [gefahrstoffeRes, orgRes, standorteRes] = await Promise.all([
        api.get('/gefahrstoffe'),
        api.get('/organisation'),
        api.get('/standorte'),
      ])
      setGefahrstoffe(gefahrstoffeRes.data)
      setStandorte(standorteRes.data || [])
      const brancheValue = orgRes.data?.branche || ''
      const branchenConfig = getBranchenConfig(brancheValue)
      setGefahrstoffSuggestions(branchenConfig.gefahrstoffe)
    } catch (err) {
      console.error('Error loading gefahrstoffe:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const createGefahrstoff = async () => {
    if (!formData.name) return
    try {
      await api.post('/gefahrstoffe', {
        ...formData,
        foto_url: formData.foto_url || null,
      })
      setFormData({
        name: '', hersteller: '', cas_nummer: '', gefahrenklasse: '',
        h_saetze: '', p_saetze: '', signalwort: 'Achtung', lagerort: '',
        menge: '', foto_url: '',
      })
      setFormStep(0)
      setShowCreateModal(false)
      loadData()
    } catch (err) {
      console.error('Error creating gefahrstoff:', err)
    }
  }

  const deleteGefahrstoff = async (id: string) => {
    if (!confirm('Gefahrstoff wirklich löschen?')) return
    try {
      await api.delete(`/gefahrstoffe/${id}`)
      loadData()
    } catch (err) {
      console.error('Error deleting gefahrstoff:', err)
    }
  }

  const generateBetriebsanweisung = async (id: string) => {
    setGeneratingSOPId(id)
    try {
      const res = await api.post(`/gefahrstoffe/${id}/betriebsanweisung`)
      setSopText(res.data.betriebsanweisung_text || res.data.text || '')
      setShowSOPModal(id)
      loadData()
    } catch (err) {
      console.error('Error generating betriebsanweisung:', err)
      setSopText('Fehler beim Generieren der Betriebsanweisung')
      setShowSOPModal(id)
    } finally {
      setGeneratingSOPId(null)
    }
  }

  const filteredGefahrstoffe = gefahrstoffe.filter(g =>
    !searchQuery ||
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.hersteller?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.gefahrenklasse?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.lagerort?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getGHSKat = (klasse: string) => GHS_KATEGORIEN.find(k => k.value === klasse) ?? null

  const getSignalwortColor = (sw: string) => {
    if (sw === 'Gefahr') return 'bg-red-50 text-red-700 border-red-200'
    return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Gefahrstoffe</h1>
        <p className="text-sm text-gray-400 mt-1">Gefahrstoffverzeichnis und Betriebsanweisungen nach GefStoffV</p>
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Suche nach Name, Hersteller, Gefahrenklasse..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          <Plus size={14} />
          Neuer Gefahrstoff
        </button>
      </div>

      {/* Quick Info Bar */}
      {gefahrstoffe.length > 0 && (
        <div className="flex items-center gap-4 mb-6 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <FlaskConical size={12} className="text-gray-400" />
            <span><span className="font-semibold text-black">{gefahrstoffe.length}</span> Gefahrstoffe erfasst</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-red-400" />
            <span>
              <span className="font-semibold text-red-600">{gefahrstoffe.filter(g => g.signalwort === 'Gefahr').length}</span>
              {' '}mit Signalwort "Gefahr"
            </span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-green-500" />
            <span>
              <span className="font-semibold text-green-600">{gefahrstoffe.filter(g => g.betriebsanweisung_text).length}</span>
              /{gefahrstoffe.length} mit Betriebsanweisung
            </span>
          </div>
        </div>
      )}

      {/* ── Create Modal ────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50"
          onClick={() => { setShowCreateModal(false); setFormStep(0) }}
        >
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-black">Neuer Gefahrstoff</h3>
              <button onClick={() => { setShowCreateModal(false); setFormStep(0) }} className="p-1 rounded hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Step Tabs */}
            <div className="flex items-center gap-1 px-6 pt-4">
              {['Grunddaten', 'Gefahren & Schutz', 'Lagerung'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setFormStep(i)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    formStep === i ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="px-6 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
              {/* Step 0: Basic Data */}
              {formStep === 0 && (
                <div className="flex gap-4">
                  {/* Foto — quadratisch links, wie Arbeitsmittel */}
                  <div className="w-36 flex-shrink-0">
                    <ImageUpload
                      value={formData.foto_url}
                      onChange={url => setFormData({ ...formData, foto_url: url })}
                      square
                    />
                  </div>
                  {/* Felder rechts */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name des Gefahrstoffs *</label>
                      <input
                        type="text"
                        placeholder="z.B. Aceton, Kühlschmierstoff..."
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        list="gefahrstoff-suggestions"
                        className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                      />
                      {gefahrstoffSuggestions.length > 0 && (
                        <datalist id="gefahrstoff-suggestions">
                          {gefahrstoffSuggestions.map((g, idx) => <option key={idx} value={g} />)}
                        </datalist>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hersteller</label>
                        <input
                          type="text"
                          placeholder="Hersteller"
                          value={formData.hersteller}
                          onChange={e => setFormData({ ...formData, hersteller: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">CAS-Nummer</label>
                        <input
                          type="text"
                          placeholder="z.B. 67-64-1"
                          value={formData.cas_nummer}
                          onChange={e => setFormData({ ...formData, cas_nummer: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Safety Classification */}
              {formStep === 1 && (
                <>
                  <GefahrenklasseSelect
                    value={formData.gefahrenklasse}
                    onChange={v => setFormData({ ...formData, gefahrenklasse: v })}
                  />

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Signalwort</label>
                    <div className="flex gap-2">
                      {(['Achtung', 'Gefahr'] as const).map(sw => (
                        <button
                          key={sw}
                          type="button"
                          onClick={() => setFormData({ ...formData, signalwort: sw })}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            formData.signalwort === sw
                              ? sw === 'Gefahr'
                                ? 'border-red-300 bg-red-50 text-red-700'
                                : 'border-yellow-300 bg-yellow-50 text-yellow-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {sw}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">H-Sätze (Gefahrenhinweise)</label>
                    <HSaetzeSelector
                      value={formData.h_saetze}
                      onChange={v => setFormData({ ...formData, h_saetze: v })}
                      options={COMMON_H_SAETZE}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">P-Sätze (Sicherheitshinweise)</label>
                    <HSaetzeSelector
                      value={formData.p_saetze}
                      onChange={v => setFormData({ ...formData, p_saetze: v })}
                      options={COMMON_P_SAETZE}
                    />
                  </div>
                </>
              )}

              {/* Step 2: Storage */}
              {formStep === 2 && (
                <>
                  <LagerortComboBox
                    value={formData.lagerort}
                    onChange={v => setFormData({ ...formData, lagerort: v })}
                    standorte={standorte}
                    existingLagerorte={[...new Set(gefahrstoffe.map(g => g.lagerort).filter(Boolean))]}
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Menge / Bestand</label>
                    <input
                      type="text"
                      placeholder="z.B. 25 Liter, 5 kg"
                      value={formData.menge}
                      onChange={e => setFormData({ ...formData, menge: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 mt-1">
                    <div className="text-xs font-medium text-gray-600 mb-2">Zusammenfassung</div>
                    <div className="space-y-1 text-xs text-gray-700">
                      <div className="flex items-center gap-1.5">
                        {formData.foto_url && (
                          <img src={formData.foto_url} alt="" className="w-6 h-6 rounded object-cover border border-gray-200" />
                        )}
                        <span><span className="font-medium">Name:</span> {formData.name || '–'}</span>
                      </div>
                      <div><span className="font-medium">Hersteller:</span> {formData.hersteller || '–'}</div>
                      {formData.gefahrenklasse && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Gefahrenklasse:</span>
                          {(() => {
                            const kat = getGHSKat(formData.gefahrenklasse)
                            return kat ? (
                              <span className="flex items-center gap-1.5">
                                <GhsDiamond kategorie={kat} size={18} />
                                {kat.label}
                              </span>
                            ) : formData.gefahrenklasse
                          })()}
                        </div>
                      )}
                      <div><span className="font-medium">Signalwort:</span> {formData.signalwort}</div>
                      <div><span className="font-medium">Lagerort:</span> {formData.lagerort || '–'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => formStep > 0 ? setFormStep(formStep - 1) : setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-black transition-colors"
              >
                {formStep === 0 ? 'Abbrechen' : 'Zurück'}
              </button>
              {formStep < 2 ? (
                <button
                  onClick={() => setFormStep(formStep + 1)}
                  disabled={formStep === 0 && !formData.name}
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30"
                >
                  Weiter
                </button>
              ) : (
                <button
                  onClick={createGefahrstoff}
                  disabled={!formData.name}
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30"
                >
                  Gefahrstoff erstellen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(null)}>
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center gap-3">
                {showDetailModal.foto_url ? (
                  <img
                    src={showDetailModal.foto_url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (() => {
                  const kat = getGHSKat(showDetailModal.gefahrenklasse)
                  return kat ? <GhsDiamond kategorie={kat} size={36} selected /> : null
                })()}
                <div>
                  <h3 className="font-semibold text-black">{showDetailModal.name}</h3>
                  {showDetailModal.hersteller && (
                    <p className="text-xs text-gray-400">{showDetailModal.hersteller}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="p-1 rounded hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Foto */}
              {showDetailModal.foto_url && (
                <img
                  src={showDetailModal.foto_url}
                  alt={showDetailModal.name}
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {showDetailModal.signalwort && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getSignalwortColor(showDetailModal.signalwort)}`}>
                    {showDetailModal.signalwort}
                  </span>
                )}
                {showDetailModal.gefahrenklasse && (() => {
                  const kat = getGHSKat(showDetailModal.gefahrenklasse)
                  return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-700">
                      {kat && <GhsDiamond kategorie={kat} size={16} />}
                      {showDetailModal.gefahrenklasse}
                    </span>
                  )
                })()}
                {showDetailModal.cas_nummer && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700">
                    CAS: {showDetailModal.cas_nummer}
                  </span>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <InfoBlock icon={<AlertTriangle size={14} />} label="H-Sätze" value={showDetailModal.h_saetze} />
                <InfoBlock icon={<Shield size={14} />} label="P-Sätze" value={showDetailModal.p_saetze} />
                <InfoBlock icon={<MapPin size={14} />} label="Lagerort" value={showDetailModal.lagerort} />
                <InfoBlock icon={<Package size={14} />} label="Menge" value={showDetailModal.menge} />
              </div>

              {/* Betriebsanweisung */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-black">Betriebsanweisung</span>
                  </div>
                  {showDetailModal.betriebsanweisung_text ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 size={12} /> Vorhanden
                      </span>
                      <button
                        onClick={() => { setSopText(showDetailModal.betriebsanweisung_text!); setShowSOPModal(showDetailModal.id) }}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        Anzeigen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowDetailModal(null); generateBetriebsanweisung(showDetailModal.id) }}
                      className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800"
                    >
                      Generieren
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SOP Modal ────────────────────────────────────────────────────── */}
      {showSOPModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50" onClick={() => { setShowSOPModal(null); setSopText('') }}>
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
              <h3 className="font-semibold text-black">Betriebsanweisung</h3>
              <button onClick={() => { setShowSOPModal(null); setSopText('') }} className="p-1 rounded hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs whitespace-pre-wrap font-mono overflow-auto max-h-[60vh]">
                {sopText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Card Grid ────────────────────────────────────────────────────── */}
      {filteredGefahrstoffe.length === 0 && gefahrstoffe.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <FlaskConical size={24} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Noch keine Gefahrstoffe angelegt</p>
          <p className="text-xs text-gray-400 mb-4">Erstelle dein Gefahrstoffverzeichnis nach GefStoffV</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800"
          >
            Ersten Gefahrstoff erstellen
          </button>
        </div>
      ) : filteredGefahrstoffe.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-gray-400">Keine Ergebnisse für „{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredGefahrstoffe.map(gef => {
            const kat = getGHSKat(gef.gefahrenklasse)
            return (
              <div
                key={gef.id}
                onClick={() => setShowDetailModal(gef)}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                {/* Foto strip */}
                {gef.foto_url && (
                  <div className="h-28 overflow-hidden bg-gray-100">
                    <img
                      src={gef.foto_url}
                      alt={gef.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      {kat ? (
                        <GhsDiamond kategorie={kat} size={28} />
                      ) : (
                        <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center">
                          <FlaskConical size={14} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-black">{gef.name}</div>
                        {gef.hersteller && <div className="text-xs text-gray-400">{gef.hersteller}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); generateBetriebsanweisung(gef.id) }}
                        disabled={generatingSOPId === gef.id}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Betriebsanweisung generieren"
                      >
                        {generatingSOPId === gef.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                        ) : (
                          <FileText size={14} />
                        )}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteGefahrstoff(gef.id) }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {gef.signalwort && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getSignalwortColor(gef.signalwort)}`}>
                        {gef.signalwort}
                      </span>
                    )}
                    {gef.gefahrenklasse && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-gray-200 bg-gray-50 text-gray-600">
                        {gef.gefahrenklasse}
                      </span>
                    )}
                  </div>

                  {/* Bottom */}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      {gef.lagerort ? (
                        <><MapPin size={10} /> {gef.lagerort}</>
                      ) : (
                        <span>Kein Lagerort</span>
                      )}
                    </div>
                    {gef.betriebsanweisung_text ? (
                      <span className="flex items-center gap-0.5 text-green-600">
                        <CheckCircle2 size={10} /> BA
                      </span>
                    ) : (
                      <span className="text-gray-300">Keine BA</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
