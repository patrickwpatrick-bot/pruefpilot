/**
 * Unterweisungen (Training/Instruction) — Manage training templates, assignments, and compliance
 * Notion-style editor, custom dropdowns, AI import feature
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Send, Search, Users, Shield, X, CheckCircle2, Clock, AlertTriangle, Bold, Italic, Underline, List, ListOrdered, Heading2, Heading3, Save, ChevronDown, ChevronUp, Upload, Sparkles, Type, Minus, Quote, Code, Trash2, ChevronLeft, ChevronRight, Play, PenLine, FileUp, AlertCircle, Image as ImageIcon, Info, AlertOctagon } from 'lucide-react'
import { clsx } from 'clsx'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { getBranchenConfig, INTERVALL_OPTIONS } from '@/config/branchen'
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

// ============================================================================
// Types
// ============================================================================

interface Vorlage {
  id: string
  name: string
  kategorie: string
  norm_referenz?: string
  intervall_monate: number
  ist_pflicht_fuer_alle: boolean
  pflicht_berufsgruppen?: string[]
  inhalt: string
  betroffene_qualifikationen?: string[]
  zuweisungs_count: number
  compliance_prozent: number
  created_at: string
  verantwortlicher_id?: string
  verantwortlicher_name?: string
}

interface Zuweisung {
  id: string
  mitarbeiter_id: string
  mitarbeiter_name: string
  vorlage_id: string
  vorlage_name: string
  status: 'offen' | 'versendet' | 'unterschrieben' | 'abgelaufen'
  faellig_am: string
  unterschrieben_am?: string
  created_at: string
}

interface ComplianceRow {
  mitarbeiter_id: string
  mitarbeiter_name: string
  abteilung: string
  gesamt_prozent: number
  vorlagen: {
    vorlage_id: string
    status: 'offen' | 'versendet' | 'unterschrieben' | 'abgelaufen'
  }[]
}

interface Mitarbeiter {
  id: string
  name: string
  abteilung: string
  beruf?: string
  qualifikationen: string[]
}

// German workplace safety norms
const NORM_REFERENZEN = [
  { value: '§ 12 ArbSchG', label: '§ 12 ArbSchG', desc: 'Allgemeine Unterweisung der Beschäftigten' },
  { value: 'PSA-BV', label: 'PSA-BV', desc: 'PSA-Benutzungsverordnung' },
  { value: 'DGUV Regel 112-189', label: 'DGUV R. 112-189', desc: 'Benutzung von Schutzkleidung' },
  { value: 'ASR A2.2', label: 'ASR A2.2', desc: 'Maßnahmen gegen Brände' },
  { value: 'DGUV V68', label: 'DGUV V68', desc: 'Flurförderzeuge (Gabelstapler)' },
  { value: 'DGUV V52', label: 'DGUV V52', desc: 'Krane' },
  { value: 'DGUV V1 §26', label: 'DGUV V1 §26', desc: 'Erste Hilfe' },
  { value: 'GefStoffV §14', label: 'GefStoffV §14', desc: 'Unterrichtung und Unterweisung Gefahrstoffe' },
  { value: 'ArbStättV Anh.6', label: 'ArbStättV Anh.6', desc: 'Bildschirmarbeitsplatz' },
  { value: 'BetrSichV §12', label: 'BetrSichV §12', desc: 'Unterweisung und besondere Beauftragung' },
  { value: 'DGUV V3', label: 'DGUV V3', desc: 'Elektrische Anlagen und Betriebsmittel' },
  { value: 'LärmVibrationsArbSchV', label: 'LärmVibr.ArbSchV', desc: 'Lärm- und Vibrations-Arbeitsschutzverordnung' },
  { value: 'BioStoffV §14', label: 'BioStoffV §14', desc: 'Unterrichtung der Beschäftigten (Biostoffe)' },
  { value: 'DGUV R. 100-500', label: 'DGUV R. 100-500', desc: 'Betreiben von Arbeitsmitteln' },
  { value: 'TRGS 555', label: 'TRGS 555', desc: 'Betriebsanweisung und Information Gefahrstoffe' },
  { value: 'TRBS 1111', label: 'TRBS 1111', desc: 'Gefährdungsbeurteilung' },
  { value: 'ISO 45001', label: 'ISO 45001', desc: 'Arbeitsschutzmanagementsystem' },
]

const DEFAULT_KATEGORIE_OPTIONS = [
  'Allgemein', 'PSA', 'Brandschutz', 'Maschinen', 'Erste Hilfe', 'Gefahrstoffe', 'Ergonomie',
]

const STATUS_DOTS: Record<string, string> = {
  offen: 'bg-gray-400',
  versendet: 'bg-yellow-400',
  unterschrieben: 'bg-green-500',
  abgelaufen: 'bg-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  offen: 'Offen',
  versendet: 'Versendet',
  unterschrieben: 'Unterschrieben',
  abgelaufen: 'Abgelaufen',
}

// ============================================================================
// Reusable Custom Combobox (Google Sheets-style: type or pick from list)
// ============================================================================

function ComboBox({
  value,
  onChange,
  options,
  placeholder = 'Auswählen oder eingeben...',
  renderOption,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; desc?: string }[]
  placeholder?: string
  renderOption?: (opt: { value: string; label: string; desc?: string }, isSelected: boolean) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const displayLabel = options.find(o => o.value === value)?.label || value

  const filtered = options.filter(o =>
    !filter ||
    o.label.toLowerCase().includes(filter.toLowerCase()) ||
    o.value.toLowerCase().includes(filter.toLowerCase()) ||
    (o.desc && o.desc.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div ref={ref} className="relative">
      <div
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={clsx('text-sm truncate', value ? 'text-black' : 'text-gray-400')}>
          {value ? displayLabel : placeholder}
        </span>
        <ChevronDown size={12} className={clsx('text-gray-400 transition-transform flex-shrink-0 ml-1', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-56 overflow-hidden">
          <div className="p-1.5 border-b border-gray-100">
            <input
              type="text"
              placeholder="Suchen oder eingeben..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && filter.trim()) {
                  onChange(filter.trim())
                  setOpen(false)
                  setFilter('')
                }
              }}
              className="w-full px-2 py-1 text-xs rounded border border-gray-100 outline-none focus:border-gray-300"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-44">
            {filtered.map(opt => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); setFilter('') }}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-gray-50'
                  )}
                >
                  {renderOption ? renderOption(opt, isSelected) : (
                    <div className="flex items-center justify-between">
                      <span className={clsx('font-medium', isSelected && 'text-black')}>{opt.label}</span>
                      {isSelected && <CheckCircle2 size={12} className="text-black" />}
                    </div>
                  )}
                </button>
              )
            })}
            {filter.trim() && !filtered.some(o => o.label.toLowerCase() === filter.toLowerCase()) && (
              <button
                onClick={() => { onChange(filter.trim()); setOpen(false); setFilter('') }}
                className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 font-medium"
              >
                + "{filter.trim()}" hinzufügen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Multi-select for Pflicht-Berufsgruppen
// ============================================================================

function BerufsGroupSelect({
  selected,
  onChange,
  options,
}: {
  selected: string[]
  onChange: (v: string[]) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (v: string) => {
    if (v === '__alle__') {
      onChange(selected.length === options.length ? [] : [...options])
    } else if (selected.includes(v)) {
      onChange(selected.filter(s => s !== v))
    } else {
      onChange([...selected, v])
    }
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-gray-300 min-h-[34px] transition-colors"
      >
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selected.length === options.length ? (
              <span className="px-1.5 py-0.5 bg-black text-white rounded text-[10px] font-medium">Alle</span>
            ) : selected.slice(0, 3).map(s => (
              <span key={s} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">{s}</span>
            ))}
            {selected.length > 3 && <span className="text-[10px] text-gray-400">+{selected.length - 3}</span>}
          </div>
        ) : (
          <span className="text-sm text-gray-400">Berufsgruppen wählen...</span>
        )}
        <ChevronDown size={12} className={clsx('text-gray-400 transition-transform flex-shrink-0', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">
              Keine Berufe konfiguriert.<br />
              <span className="text-gray-300">Berufe in den Einstellungen anlegen.</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => toggle('__alle__')}
                className={clsx(
                  'w-full text-left px-3 py-2 text-xs hover:bg-gray-50 font-medium border-b border-gray-100',
                  selected.length === options.length && 'bg-gray-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center',
                    selected.length === options.length ? 'bg-black border-black' : 'border-gray-300'
                  )}>
                    {selected.length === options.length && <span className="text-white text-[8px]">✓</span>}
                  </div>
                  Alle Mitarbeiter
                </div>
              </button>
              {options.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={clsx('w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50', selected.includes(opt) && 'bg-gray-50')}
                >
                  <div className="flex items-center gap-2">
                    <div className={clsx(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center',
                      selected.includes(opt) ? 'bg-black border-black' : 'border-gray-300'
                    )}>
                      {selected.includes(opt) && <span className="text-white text-[8px]">✓</span>}
                    </div>
                    {opt}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Notion-style Block Editor
// ============================================================================

interface EditorBlock {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'divider' | 'quote' | 'callout' | 'callout_warning' | 'callout_info' | 'callout_danger' | 'image'
  content: string
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function parseHtmlToBlocks(html: string): EditorBlock[] {
  if (!html || html === '<p></p>') return [{ id: generateId(), type: 'paragraph', content: '' }]

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const blocks: EditorBlock[] = []

  doc.body.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) blocks.push({ id: generateId(), type: 'paragraph', content: text })
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()

      if (tag === 'h1') blocks.push({ id: generateId(), type: 'heading1', content: el.textContent || '' })
      else if (tag === 'h2') blocks.push({ id: generateId(), type: 'heading2', content: el.textContent || '' })
      else if (tag === 'h3') blocks.push({ id: generateId(), type: 'heading3', content: el.textContent || '' })
      else if (tag === 'ul') {
        el.querySelectorAll('li').forEach(li => {
          blocks.push({ id: generateId(), type: 'bullet', content: li.textContent || '' })
        })
      } else if (tag === 'ol') {
        el.querySelectorAll('li').forEach(li => {
          blocks.push({ id: generateId(), type: 'numbered', content: li.textContent || '' })
        })
      } else if (tag === 'hr') blocks.push({ id: generateId(), type: 'divider', content: '' })
      else if (tag === 'blockquote') blocks.push({ id: generateId(), type: 'quote', content: el.textContent || '' })
      else if (tag === 'div') {
        const cls = el.className || ''
        if (cls.includes('callout-warning')) blocks.push({ id: generateId(), type: 'callout_warning', content: el.textContent || '' })
        else if (cls.includes('callout-info')) blocks.push({ id: generateId(), type: 'callout_info', content: el.textContent || '' })
        else if (cls.includes('callout-danger')) blocks.push({ id: generateId(), type: 'callout_danger', content: el.textContent || '' })
        else if (cls.includes('callout')) blocks.push({ id: generateId(), type: 'callout_warning', content: el.textContent || '' })
        else blocks.push({ id: generateId(), type: 'paragraph', content: el.textContent || '' })
      }
      else if (tag === 'figure' && el.className?.includes('editor-image')) {
        const img = el.querySelector('img')
        if (img) blocks.push({ id: generateId(), type: 'image', content: img.getAttribute('src') || '' })
      }
      else blocks.push({ id: generateId(), type: 'paragraph', content: el.textContent || '' })
    }
  })

  return blocks.length > 0 ? blocks : [{ id: generateId(), type: 'paragraph', content: '' }]
}

function blocksToHtml(blocks: EditorBlock[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading1': return `<h1>${b.content}</h1>`
      case 'heading2': return `<h2>${b.content}</h2>`
      case 'heading3': return `<h3>${b.content}</h3>`
      case 'bullet': return `<ul><li>${b.content}</li></ul>`
      case 'numbered': return `<ol><li>${b.content}</li></ol>`
      case 'divider': return '<hr>'
      case 'quote': return `<blockquote>${b.content}</blockquote>`
      case 'callout': return `<div class="callout callout-warning">${b.content}</div>`
      case 'callout_warning': return `<div class="callout callout-warning">${b.content}</div>`
      case 'callout_info': return `<div class="callout callout-info">${b.content}</div>`
      case 'callout_danger': return `<div class="callout callout-danger">${b.content}</div>`
      case 'image': return b.content ? `<figure class="editor-image"><img src="${b.content}" alt="Bild"></figure>` : ''
      default: return b.content ? `<p>${b.content}</p>` : ''
    }
  }).filter(Boolean).join('\n')
}

// ============================================================================
// Document Block — Individual block renderer/editor for the A4 document
// ============================================================================

const CALLOUT_STYLES = {
  callout_warning: { bg: 'bg-yellow-50 border border-yellow-200', icon: '⚠️', text: 'text-yellow-900' },
  callout_info:    { bg: 'bg-blue-50 border border-blue-200',   icon: 'ℹ️', text: 'text-blue-900' },
  callout_danger:  { bg: 'bg-red-50 border border-red-200',     icon: '🚨', text: 'text-red-900' },
  callout:         { bg: 'bg-yellow-50 border border-yellow-200', icon: '⚠️', text: 'text-yellow-900' },
}

function DocumentBlock({
  block,
  blockRef,
  onUpdate,
  onKeyDown,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: EditorBlock
  blockRef: (el: HTMLDivElement | null) => void
  onUpdate: (updates: Partial<EditorBlock>) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const hoverActions = (
    <div className={clsx(
      'absolute top-1 right-1 flex gap-0.5 transition-opacity z-10',
      hovered ? 'opacity-100' : 'opacity-0'
    )}>
      {onMoveUp && (
        <button onClick={onMoveUp} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700" title="Nach oben">
          <ChevronUp size={11} />
        </button>
      )}
      {onMoveDown && (
        <button onClick={onMoveDown} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700" title="Nach unten">
          <ChevronDown size={11} />
        </button>
      )}
      <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600" title="Löschen">
        <Trash2 size={11} />
      </button>
    </div>
  )

  // Divider
  if (block.type === 'divider') {
    return (
      <div className="group relative py-3" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <hr className="border-gray-300" />
        {hoverActions}
      </div>
    )
  }

  // Image
  if (block.type === 'image') {
    return (
      <div className="relative group" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {block.content ? (
          <figure className="editor-image my-2">
            <img src={block.content} alt="Bild" className="max-w-full h-auto rounded-lg border border-gray-100 shadow-sm" />
          </figure>
        ) : (
          <div className="w-full h-36 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-300 gap-2">
            <ImageIcon size={24} />
            <span className="text-xs">Kein Bild gewählt</span>
          </div>
        )}
        {hoverActions}
      </div>
    )
  }

  // Callout blocks
  const calloutType = block.type as keyof typeof CALLOUT_STYLES
  if (calloutType in CALLOUT_STYLES) {
    const style = CALLOUT_STYLES[calloutType]
    return (
      <div className={clsx('relative group flex items-start gap-2.5 p-3 rounded-lg my-1', style.bg)}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <span className="text-base flex-shrink-0 mt-0.5 select-none">{style.icon}</span>
        <div
          ref={blockRef}
          contentEditable
          suppressContentEditableWarning
          className={clsx('flex-1 text-sm outline-none min-h-[20px]', style.text)}
          onBlur={e => onUpdate({ content: e.currentTarget.textContent || '' })}
          onKeyDown={onKeyDown}
          dangerouslySetInnerHTML={{ __html: block.content || '' }}
          data-placeholder="Hinweis eingeben..."
        />
        {hoverActions}
      </div>
    )
  }

  // Text-based blocks
  const getClassName = () => {
    switch (block.type) {
      case 'heading1': return 'text-2xl font-bold text-black leading-tight'
      case 'heading2': return 'text-xl font-bold text-black mt-2'
      case 'heading3': return 'text-base font-semibold text-gray-800 mt-1'
      case 'bullet':   return 'text-sm text-gray-700 pl-5 relative before:content-["•"] before:absolute before:left-1.5 before:top-0 before:text-gray-400'
      case 'numbered': return 'text-sm text-gray-700 pl-5'
      case 'quote':    return 'text-sm text-gray-500 italic pl-4 border-l-2 border-gray-300'
      default:         return 'text-sm text-gray-700'
    }
  }

  const getPlaceholder = () => {
    switch (block.type) {
      case 'heading1': return 'Hauptüberschrift...'
      case 'heading2': return 'Überschrift...'
      case 'heading3': return 'Unterüberschrift...'
      case 'quote':    return 'Zitat...'
      case 'bullet':   return 'Aufzählungspunkt...'
      case 'numbered': return 'Nummerierter Punkt...'
      default:         return 'Inhalt eingeben...'
    }
  }

  return (
    <div className="group relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div
        ref={blockRef}
        contentEditable
        suppressContentEditableWarning
        className={clsx(
          'relative outline-none min-h-[22px] rounded px-1 py-0.5 transition-colors',
          getClassName(),
          hovered && 'bg-gray-50/60',
        )}
        onBlur={e => onUpdate({ content: e.currentTarget.textContent || '' })}
        onKeyDown={onKeyDown}
        dangerouslySetInnerHTML={{ __html: block.content || '' }}
        data-placeholder={getPlaceholder()}
      />
      {hoverActions}
    </div>
  )
}

// ============================================================================
// Document Editor — A4-style document editor
// ============================================================================

type IconComponent = (props: { size?: number; className?: string }) => JSX.Element | null

const DOC_BLOCK_TYPES: { type: EditorBlock['type']; label: string; icon?: IconComponent }[] = [
  { type: 'paragraph',      label: 'Text',          icon: Type },
  { type: 'heading1',       label: 'H1',             icon: undefined },
  { type: 'heading2',       label: 'H2',             icon: undefined },
  { type: 'heading3',       label: 'H3',             icon: undefined },
  { type: 'bullet',         label: 'Aufzählung',     icon: List },
  { type: 'numbered',       label: 'Nummeriert',     icon: ListOrdered },
  { type: 'divider',        label: 'Trennlinie',     icon: Minus },
  { type: 'callout_warning', label: 'Hinweis',       icon: AlertTriangle },
  { type: 'callout_info',   label: 'Info',           icon: Info },
  { type: 'callout_danger', label: 'Achtung',        icon: AlertOctagon },
]

function DocumentEditor({
  blocks,
  onChange,
  form,
  logo,
  verantwortlicherName,
  currentUserName,
}: {
  blocks: EditorBlock[]
  onChange: (blocks: EditorBlock[]) => void
  form: Vorlage
  logo: string | null
  verantwortlicherName: string
  currentUserName: string
}) {
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const imageBlockInputRef = useRef<HTMLInputElement>(null)
  const [pendingImageBlockId, setPendingImageBlockId] = useState<string | null>(null)

  const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const addBlock = (type: EditorBlock['type'] = 'paragraph', afterId?: string) => {
    const newBlock: EditorBlock = { id: generateId(), type, content: '' }
    if (afterId) {
      const idx = blocks.findIndex(b => b.id === afterId)
      const newBlocks = [...blocks]
      newBlocks.splice(idx + 1, 0, newBlock)
      onChange(newBlocks)
    } else {
      onChange([...blocks, newBlock])
    }
    setTimeout(() => {
      if (type !== 'image' && type !== 'divider') {
        blockRefs.current[newBlock.id]?.focus()
      }
    }, 50)
    return newBlock.id
  }

  const addImageBlock = () => {
    const newId = addBlock('image')
    setPendingImageBlockId(newId)
    setTimeout(() => imageBlockInputRef.current?.click(), 80)
  }

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) {
      onChange([{ id: generateId(), type: 'paragraph', content: '' }])
      return
    }
    const idx = blocks.findIndex(b => b.id === id)
    const remaining = blocks.filter(b => b.id !== id)
    onChange(remaining)
    const focusId = remaining[Math.max(0, idx - 1)]?.id
    if (focusId) setTimeout(() => blockRefs.current[focusId]?.focus(), 50)
  }

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === blocks.length - 1) return
    const newBlocks = [...blocks]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    ;[newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]]
    onChange(newBlocks)
  }

  const handleKeyDown = (e: React.KeyboardEvent, block: EditorBlock) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addBlock('paragraph', block.id)
    }
    if (e.key === 'Backspace' && !block.content) {
      e.preventDefault()
      deleteBlock(block.id)
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pendingImageBlockId) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Bild darf maximal 2 MB groß sein')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      updateBlock(pendingImageBlockId, { content: dataUrl })
    }
    reader.readAsDataURL(file)
    setPendingImageBlockId(null)
    if (imageBlockInputRef.current) imageBlockInputRef.current.value = ''
  }

  const orgName = form.name || 'Ohne Titel'
  const createdDate = formatDate(form.created_at || new Date().toISOString())
  const responsible = verantwortlicherName || currentUserName

  return (
    <div className="bg-gray-100 min-h-full py-6 px-4">
      {/* Hidden image file input */}
      <input ref={imageBlockInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleImageFileChange} />

      {/* A4 Document */}
      <div className="bg-white shadow-lg mx-auto rounded-sm" style={{ maxWidth: 680 }}>

        {/* Document Header */}
        <div className="px-10 pt-8 pb-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Company logo */}
            <div className="flex-shrink-0 flex items-center justify-center w-28 h-16 rounded overflow-hidden">
              {logo ? (
                <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                  <ImageIcon size={18} className="text-gray-300" />
                </div>
              )}
            </div>
            {/* Right: Document type + title */}
            <div className="text-right flex-1">
              <p className="text-[10px] font-bold tracking-[3px] text-gray-400 uppercase">Unterweisung</p>
              <p className="text-xl font-bold text-black mt-0.5 leading-tight">{form.name || 'Ohne Titel'}</p>
              <p className="text-xs text-gray-400 mt-1">{createdDate}</p>
            </div>
          </div>

          {/* Metadata strip */}
          <div className="grid grid-cols-4 gap-0 mt-5 pt-3 border-t border-gray-100">
            {[
              { label: 'Kategorie', value: form.kategorie || '—' },
              { label: 'Intervall', value: formatIntervall(form.intervall_monate) },
              { label: 'Verantwortlich', value: responsible },
              { label: 'Norm', value: form.norm_referenz || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="pr-4">
                <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">{label}</p>
                <p className="text-xs text-gray-700 mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Block Toolbar */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-10 py-2 flex items-center gap-0.5 flex-wrap">
          {DOC_BLOCK_TYPES.map(bt => {
            const Icon = bt.icon
            return (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                title={bt.label}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 hover:text-black transition-colors font-medium"
              >
                {Icon ? <Icon size={12} /> : <span className="font-bold text-xs">{bt.label}</span>}
              </button>
            )
          })}
          <button
            onClick={addImageBlock}
            title="Bild einfügen"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 hover:text-black transition-colors font-medium"
          >
            <ImageIcon size={12} />
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-gray-300 hidden sm:block">↵ neuer Block</span>
        </div>

        {/* Content Area */}
        <div className="px-10 py-6 min-h-[320px] space-y-1">
          {blocks.map((block, idx) => (
            <DocumentBlock
              key={block.id}
              block={block}
              blockRef={el => { blockRefs.current[block.id] = el }}
              onUpdate={updates => updateBlock(block.id, updates)}
              onKeyDown={e => handleKeyDown(e, block)}
              onDelete={() => deleteBlock(block.id)}
              onMoveUp={idx > 0 ? () => moveBlock(block.id, 'up') : undefined}
              onMoveDown={idx < blocks.length - 1 ? () => moveBlock(block.id, 'down') : undefined}
            />
          ))}
          {/* Spacer / click to add */}
          <div
            className="h-12 cursor-text rounded"
            onClick={() => {
              const lastBlock = blocks[blocks.length - 1]
              if (lastBlock && lastBlock.type === 'paragraph' && !lastBlock.content) {
                blockRefs.current[lastBlock.id]?.focus()
              } else {
                addBlock('paragraph')
              }
            }}
          />
        </div>

        {/* Document Footer */}
        <div className="px-10 py-4 border-t border-gray-200 bg-gray-50 rounded-b-sm flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-black rounded-sm flex items-center justify-center">
              <span className="text-[6px] font-bold text-white">PP</span>
            </div>
            <span className="text-xs font-semibold text-gray-500">PrüfPilot</span>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{orgName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Erstellt {createdDate}</p>
            <p className="text-[10px] text-gray-400">Version 1.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatIntervall(months: number): string {
  const opt = INTERVALL_OPTIONS.find(o => o.value === months)
  return opt?.label || `${months}M`
}

// ============================================================================
// Send Modal
// ============================================================================

interface SendModalProps {
  open: boolean
  onClose: () => void
  preselectedVorlageId?: string
  vorlagen: Vorlage[]
}

function SendModal({ open, onClose, preselectedVorlageId, vorlagen }: SendModalProps) {
  const [vorlageId, setVorlageId] = useState(preselectedVorlageId || '')
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (preselectedVorlageId) setVorlageId(preselectedVorlageId)
  }, [preselectedVorlageId])

  useEffect(() => {
    if (open) {
      setLoading(true)
      api.get('/mitarbeiter')
        .then(res => setMitarbeiter(res.data || []))
        .catch(() => toast.error('Mitarbeiter konnten nicht geladen werden'))
        .finally(() => setLoading(false))
    }
  }, [open])

  const toggleEmployee = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const handleSend = async () => {
    if (!vorlageId || selected.size === 0) {
      toast.error('Bitte Vorlage und Mitarbeiter auswählen')
      return
    }
    setSending(true)
    try {
      await api.post('/unterweisungen/zuweisungen/versenden', {
        vorlage_id: vorlageId,
        mitarbeiter_ids: Array.from(selected),
      })
      toast.success(`Unterweisung an ${selected.size} Mitarbeiter versendet`)
      setSelected(new Set())
      onClose()
    } catch { toast.error('Fehler beim Versenden') }
    finally { setSending(false) }
  }

  if (!open) return null

  const grouped = mitarbeiter.reduce((acc, emp) => {
    const key = emp.abteilung || 'Ohne Abteilung'
    if (!acc[key]) acc[key] = []
    acc[key].push(emp)
    return acc
  }, {} as Record<string, Mitarbeiter[]>)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-black">Unterweisung versenden</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vorlage</label>
            <select
              value={vorlageId}
              onChange={e => setVorlageId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
            >
              <option value="">Vorlage wählen...</option>
              {vorlagen.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mitarbeiter ({selected.size} ausgewählt)</label>
            {loading ? (
              <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(grouped).map(([abt, emps]) => (
                  <div key={abt}>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-1">{abt}</div>
                    {emps.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <div className={clsx(
                          'w-4 h-4 rounded border flex items-center justify-center',
                          selected.has(emp.id) ? 'bg-black border-black' : 'border-gray-300'
                        )}>
                          {selected.has(emp.id) && <span className="text-white text-[8px]">✓</span>}
                        </div>
                        <span className="text-sm text-gray-700">{emp.name}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-black">Abbrechen</button>
          <button
            onClick={handleSend}
            disabled={!vorlageId || selected.size === 0 || sending}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-30"
          >
            <Send size={14} />
            {sending ? 'Versendet...' : 'Versenden'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Creation Mode Chooser
// ============================================================================

type CreationMode = 'pdf' | 'editor' | 'ai'

function CreationModeChooser({ open, onChoose, onClose }: {
  open: boolean
  onChoose: (mode: CreationMode) => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-black">Neue Unterweisung erstellen</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-400 mb-8">Wie möchtest du die Unterweisung erstellen?</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PDF Upload */}
          <button
            onClick={() => onChoose('pdf')}
            className="group flex flex-col items-start p-5 rounded-xl border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
              <Upload size={20} className="text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-black mb-1">PDF hochladen</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Bestehende Unterlagen als PDF importieren. Das Dokument wird direkt als Schulungsunterlage verwendet.</p>
          </button>

          {/* Editor */}
          <button
            onClick={() => onChoose('editor')}
            className="group flex flex-col items-start p-5 rounded-xl border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Type size={20} className="text-blue-500" />
            </div>
            <h3 className="text-sm font-semibold text-black mb-1">Selbst erstellen</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Unterweisung direkt im Editor schreiben. Text, Listen, Bilder und Checklisten — alles in einem.</p>
          </button>

          {/* AI */}
          <button
            onClick={() => onChoose('ai')}
            className="group flex flex-col items-start p-5 rounded-xl border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-all text-left relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Beta</div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
              <Sparkles size={20} className="text-purple-500" />
            </div>
            <h3 className="text-sm font-semibold text-black mb-1">KI-Unterstützung</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Claude erstellt einen Entwurf basierend auf Thema und eigenen Unterlagen. Muss durch einen Prüfer freigegeben werden.</p>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Presentation Modal — Folien-Ansicht
// ============================================================================

function PresentationModal({ open, blocks, title, onClose }: {
  open: boolean
  blocks: EditorBlock[]
  title: string
  onClose: () => void
}) {
  const [slideIdx, setSlideIdx] = useState(0)

  // Split blocks into slides at each H2
  const slides = useMemo(() => {
    if (!blocks.length) return [{ heading: title, content: [] as EditorBlock[] }]
    const result: { heading: string; content: EditorBlock[] }[] = []
    let current: { heading: string; content: EditorBlock[] } = { heading: title, content: [] }
    for (const block of blocks) {
      if (block.type === 'heading2') {
        if (current.content.length > 0 || result.length > 0) result.push(current)
        current = { heading: block.content, content: [] }
      } else {
        current.content.push(block)
      }
    }
    result.push(current)
    return result
  }, [blocks, title])

  useEffect(() => { if (open) setSlideIdx(0) }, [open])

  if (!open) return null

  const slide = slides[slideIdx]
  const progress = ((slideIdx + 1) / slides.length) * 100

  const renderBlock = (block: EditorBlock, i: number) => {
    switch (block.type) {
      case 'heading3': return <h3 key={i} className="text-lg font-semibold text-white/90 mt-4 mb-2">{block.content}</h3>
      case 'bullet':   return <li key={i} className="text-base text-white/80 ml-4 my-1">{block.content}</li>
      case 'numbered': return <li key={i} className="text-base text-white/80 ml-4 my-1 list-decimal">{block.content}</li>
      case 'quote':    return <blockquote key={i} className="border-l-4 border-white/30 pl-4 italic text-white/70 my-3">{block.content}</blockquote>
      case 'divider':  return <hr key={i} className="border-white/20 my-4" />
      default:         return block.content ? <p key={i} className="text-base text-white/80 my-2 leading-relaxed">{block.content}</p> : null
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gray-950 flex flex-col" onClick={e => e.stopPropagation()}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/40">
        <span className="text-sm font-medium text-white/70">{title}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/50">{slideIdx + 1} / {slides.length}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/10">
        <div className="h-full bg-white/60 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-white mb-8 text-center leading-tight">{slide.heading}</h2>
        <div className="w-full">
          <ul className="space-y-0.5">
            {slide.content.map((block, i) => renderBlock(block, i))}
          </ul>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 pb-8">
        <button
          onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
          disabled={slideIdx === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={16} /> Zurück
        </button>
        {slideIdx === slides.length - 1 ? (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            <CheckCircle2 size={16} /> Abschließen
          </button>
        ) : (
          <button
            onClick={() => setSlideIdx(i => Math.min(slides.length - 1, i + 1))}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            Weiter <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Vorlage Detail Modal — Notion-style
// ============================================================================

interface VorlageDetailModalProps {
  open: boolean
  vorlage: Vorlage | null
  onClose: () => void
  onSave: (vorlage: Vorlage) => Promise<void>
  onDelete: (id: string) => Promise<void>
  currentUserName: string
  zuweisungen: Zuweisung[]
  onOpenSendModal: (vorlageId?: string) => void
  kategorieOptions: string[]
  berufsgruppen: string[]
  verantwortlicherName: string
  creationMode?: CreationMode
  logo?: string | null
}

function VorlageDetailModal({
  open, vorlage, onClose, onSave, onDelete, currentUserName,
  zuweisungen, onOpenSendModal, kategorieOptions, berufsgruppen, verantwortlicherName,
  creationMode = 'editor', logo = null,
}: VorlageDetailModalProps) {
  const [form, setForm] = useState<Vorlage | null>(null)
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const [saving, setSaving] = useState(false)
  const [showAIUpload, setShowAIUpload] = useState(false)
  const [aiProcessing, setAIProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // AI generation state
  const [aiThema, setAiThema] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [aiGenerated, setAiGenerated] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiFiles, setAiFiles] = useState<File[]>([])
  const [aiFilesUploading, setAiFilesUploading] = useState(false)
  const aiFileInputRef = useRef<HTMLInputElement>(null)

  // Reviewer signature state (required for AI content)
  const [reviewerSigned, setReviewerSigned] = useState(false)
  const [reviewerName, setReviewerName] = useState('')

  // Presentation mode + suggestion banner
  const [presentationOpen, setPresentationOpen] = useState(false)
  const [presentationSuggested, setPresentationSuggested] = useState(false)

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUploading, setPdfUploading] = useState(false)

  useEffect(() => {
    if (open && vorlage) {
      setForm({ ...vorlage })
      setBlocks(parseHtmlToBlocks(vorlage.inhalt))
      setShowAIUpload(false)
      setAiGenerated(false)
      setReviewerSigned(false)
      setPdfFile(null)
    } else if (open && !vorlage) {
      setForm({
        id: '', name: '', kategorie: '', norm_referenz: '', intervall_monate: 12,
        ist_pflicht_fuer_alle: false, pflicht_berufsgruppen: [],
        inhalt: '', zuweisungs_count: 0, compliance_prozent: 0,
        created_at: new Date().toISOString(), verantwortlicher_name: currentUserName,
      })
      setBlocks([{ id: generateId(), type: 'paragraph', content: '' }])
      setShowAIUpload(false)
      setAiGenerated(false)
      setAiThema('')
      setAiContext('')
      setAiFiles([])
      setReviewerSigned(false)
      setReviewerName('')
      setPdfFile(null)
      setPresentationSuggested(false)
    }
  }, [open, vorlage, currentUserName])

  const handleSave = async () => {
    if (!form) return
    if (!form.name.trim()) { toast.error('Name ist erforderlich'); return }
    setSaving(true)
    try {
      await onSave({ ...form, inhalt: blocksToHtml(blocks) })
      toast.success(vorlage ? 'Vorlage aktualisiert' : 'Vorlage erstellt')
      onClose()
    } catch { toast.error('Fehler beim Speichern') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!form?.id || !confirm('Vorlage wirklich löschen?')) return
    try { await onDelete(form.id); toast.success('Gelöscht'); onClose() }
    catch { toast.error('Fehler beim Löschen') }
  }

  const handleAIUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAIProcessing(true)
    try {
      // Read the file as text
      const text = await file.text()

      // Parse the text content into blocks
      const lines = text.split('\n').filter(l => l.trim())
      const newBlocks: EditorBlock[] = []

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Detect headings (uppercase or short lines with special chars)
        if (trimmed === trimmed.toUpperCase() && trimmed.length < 80 && trimmed.length > 2) {
          newBlocks.push({ id: generateId(), type: 'heading2', content: trimmed })
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          newBlocks.push({ id: generateId(), type: 'bullet', content: trimmed.substring(2) })
        } else if (/^\d+[\.\)]\s/.test(trimmed)) {
          newBlocks.push({ id: generateId(), type: 'numbered', content: trimmed.replace(/^\d+[\.\)]\s*/, '') })
        } else {
          newBlocks.push({ id: generateId(), type: 'paragraph', content: trimmed })
        }
      }

      if (newBlocks.length > 0) {
        setBlocks(newBlocks)
        toast.success(`${newBlocks.length} Blöcke aus Datei importiert`)
      }

      // Try to extract metadata from content
      if (!form?.name && file.name) {
        const fileName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
        setForm(f => f ? { ...f, name: fileName } : f)
      }
    } catch {
      toast.error('Datei konnte nicht gelesen werden')
    } finally {
      setAIProcessing(false)
      setShowAIUpload(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Upload context files for AI and extract text
  const handleAiFileAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setAiFilesUploading(true)
    try {
      let extractedText = aiContext
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await api.post('/unterweisungen/extract-text', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(() => ({ data: { text: '' } }))
        if (res.data.text) {
          extractedText += (extractedText ? '\n\n' : '') + `--- ${file.name} ---\n${res.data.text}`
        }
      }
      setAiContext(extractedText)
      setAiFiles(f => [...f, ...files])
      toast.success(`${files.length} Datei(en) als Kontext hinzugefügt`)
    } catch {
      toast.error('Fehler beim Verarbeiten der Datei')
    } finally {
      setAiFilesUploading(false)
      if (aiFileInputRef.current) aiFileInputRef.current.value = ''
    }
  }

  // AI generate content
  const handleAIGenerate = async () => {
    if (!aiThema.trim()) { toast.error('Bitte ein Thema eingeben'); return }
    setAiGenerating(true)
    try {
      const res = await api.post('/unterweisungen/ai-generate', { thema: aiThema, context: aiContext })
      const generated: EditorBlock[] = res.data.blocks || []
      setBlocks(generated)
      if (form && !form.name) setForm(f => f ? { ...f, name: aiThema } : f)
      setAiGenerated(true)
      toast.success('Entwurf generiert — bitte prüfen und freigeben')
    } catch {
      toast.error('KI-Generierung fehlgeschlagen — API-Schlüssel korrekt konfiguriert?')
    } finally {
      setAiGenerating(false)
    }
  }

  // PDF upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    setPdfUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/unterweisungen/pdf-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data.blocks) {
        setBlocks(res.data.blocks)
        toast.success('PDF importiert')
      }
      if (form && !form.name) {
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
        setForm(f => f ? { ...f, name } : f)
      }
    } catch {
      // Fallback: just note the file
      toast.success('PDF gespeichert')
    } finally {
      setPdfUploading(false)
    }
  }

  if (!open || !form) return null

  const relatedZuweisungen = zuweisungen.filter(z => z.vorlage_id === form.id)

  const katOptions = kategorieOptions.map(k => ({ value: k, label: k }))
  const intervallOpts = INTERVALL_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))
  const normOpts = NORM_REFERENZEN.map(n => ({ value: n.value, label: n.label, desc: n.desc }))

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex justify-between items-start mb-4">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Vorlage Name"
              className="text-xl font-bold text-black bg-transparent border-none outline-none flex-1 placeholder:text-gray-300"
            />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Kategorie */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Kategorie</label>
              <ComboBox
                value={form.kategorie}
                onChange={v => setForm({ ...form, kategorie: v })}
                options={katOptions}
                placeholder="Kategorie..."
              />
            </div>

            {/* Intervall */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Intervall</label>
              <ComboBox
                value={String(form.intervall_monate)}
                onChange={v => setForm({ ...form, intervall_monate: Number(v) })}
                options={intervallOpts}
                placeholder="Intervall..."
              />
            </div>

            {/* Norm-Referenz */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Norm-Referenz</label>
              <ComboBox
                value={form.norm_referenz || ''}
                onChange={v => setForm({ ...form, norm_referenz: v })}
                options={normOpts}
                placeholder="Norm..."
                renderOption={(opt, isSelected) => (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={clsx('font-medium', isSelected && 'text-black')}>{opt.label}</span>
                      {isSelected && <CheckCircle2 size={10} className="text-black" />}
                    </div>
                    {opt.desc && <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>}
                  </div>
                )}
              />
            </div>

            {/* Erstellt */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Erstellt</label>
              <div className="px-3 py-1.5 text-sm text-gray-500">{formatDate(form.created_at)}</div>
            </div>

            {/* Verantwortlicher */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Verantwortlich</label>
              <div className="px-3 py-1.5 text-sm text-gray-700 truncate" title={verantwortlicherName || currentUserName}>
                {verantwortlicherName || currentUserName}
              </div>
            </div>
          </div>

          {/* Pflichtgruppen */}
          <div className="mt-3">
            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Pflicht für</label>
            <BerufsGroupSelect
              selected={form.pflicht_berufsgruppen || []}
              onChange={v => setForm({ ...form, pflicht_berufsgruppen: v, ist_pflicht_fuer_alle: v.length === berufsgruppen.length })}
              options={berufsgruppen}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">

          {/* Top sections: PDF/AI mode — shown with padding above the document editor */}
          {(creationMode === 'pdf' || creationMode === 'ai') && (
            <div className="px-6 pt-4 space-y-3">

          {/* ── PDF Upload Mode ── */}
          {creationMode === 'pdf' && !vorlage && (
            <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <FileUp size={18} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">PDF hochladen</p>
                  <p className="text-xs text-gray-400">Das Dokument wird als Schulungsunterlage gespeichert</p>
                </div>
                {pdfUploading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                ) : pdfFile ? (
                  <span className="text-xs text-green-600 font-medium">{pdfFile.name}</span>
                ) : (
                  <label className="cursor-pointer px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
                    Datei wählen
                    <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ── AI Generation Mode ── */}
          {creationMode === 'ai' && !vorlage && !aiGenerated && (
            <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Sparkles size={16} className="text-purple-500" />
                <h3 className="text-sm font-semibold text-purple-900">KI-Unterweisung generieren</h3>
              </div>
              <div className="px-5 pb-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">Thema *</label>
                  <input
                    type="text"
                    value={aiThema}
                    onChange={e => setAiThema(e.target.value)}
                    placeholder="z.B. Arbeitssicherheit beim Umgang mit Chemikalien"
                    className="w-full px-3 py-2 rounded-lg border border-purple-200 text-sm bg-white focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none"
                  />
                </div>

                {/* File upload for AI context */}
                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1.5">
                    Eigene Unterlagen hochladen (optional)
                    <span className="ml-1 font-normal text-purple-400">PDF, Word, TXT — werden als Kontext verwendet</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {aiFiles.map((f, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg">
                        <FileUp size={11} />
                        {f.name}
                        <button onClick={() => setAiFiles(fs => fs.filter((_, j) => j !== i))} className="hover:text-purple-900">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <label className={clsx(
                      'flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-purple-300 text-purple-600 text-xs rounded-lg cursor-pointer hover:bg-purple-100 transition-colors',
                      aiFilesUploading && 'opacity-50 pointer-events-none'
                    )}>
                      {aiFilesUploading
                        ? <div className="w-3 h-3 border-2 border-purple-400/40 border-t-purple-600 rounded-full animate-spin" />
                        : <Upload size={11} />}
                      Datei hinzufügen
                      <input
                        ref={aiFileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md"
                        multiple
                        className="hidden"
                        onChange={handleAiFileAdd}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">
                    Zusätzlicher Kontext
                    <span className="ml-1 font-normal text-purple-400">(optional, wird aus Dateien befüllt)</span>
                  </label>
                  <textarea
                    value={aiContext}
                    onChange={e => setAiContext(e.target.value)}
                    placeholder="Zusätzliche Hinweise, spezifische Anforderungen für euren Betrieb..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-purple-200 text-sm bg-white focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none resize-none"
                  />
                </div>
                <button
                  onClick={handleAIGenerate}
                  disabled={aiGenerating || !aiThema.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors"
                >
                  {aiGenerating ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />}
                  {aiGenerating ? 'Wird generiert…' : 'Entwurf erstellen'}
                </button>
              </div>
            </div>
          )}

          {/* ── AI Reviewer Disclaimer (after generation) ── */}
          {(creationMode === 'ai' || aiGenerated) && aiGenerated && !reviewerSigned && (
            <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 mb-1">KI-generierter Inhalt — Prüfung erforderlich</p>
                  <p className="text-xs text-amber-700 mb-3">Dieser Inhalt wurde von einer KI erstellt und muss vor der Verwendung von einer verantwortlichen Person geprüft und freigegeben werden. Mit der Unterschrift bestätigst du, dass du den Inhalt gelesen, geprüft und für korrekt befunden hast.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={e => setReviewerName(e.target.value)}
                      placeholder="Vor- und Nachname des Prüfers"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-amber-200 text-sm bg-white focus:ring-1 focus:ring-amber-400 outline-none"
                    />
                    <button
                      disabled={!reviewerName.trim()}
                      onClick={() => setReviewerSigned(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors"
                    >
                      <PenLine size={12} />
                      Freigeben
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {aiGenerated && reviewerSigned && (
            <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-100 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600" />
              <span className="text-xs text-green-700">Freigegeben von <strong>{reviewerName}</strong></span>
            </div>
          )}

            </div>
          )}

          {/* ── Document Editor (for editor/ai after generation/existing vorlage) ── */}
          {(creationMode !== 'ai' || aiGenerated || vorlage) && (
            <DocumentEditor
              blocks={blocks}
              onChange={newBlocks => {
                setBlocks(newBlocks)
                if (!presentationSuggested && newBlocks.filter(b => b.type === 'heading2').length >= 1 && newBlocks.length >= 4) {
                  setPresentationSuggested(true)
                }
              }}
              form={form}
              logo={logo}
              verantwortlicherName={verantwortlicherName}
              currentUserName={currentUserName}
            />
          )}

          {/* Presentation suggestion banner + Zuweisungen — padded below the document */}
          {(presentationSuggested || vorlage) && (
            <div className="px-6 pb-4">

          {presentationSuggested && !presentationOpen && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Play size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">Präsentation erstellen?</p>
                <p className="text-[11px] text-white/60">Der Inhalt lässt sich als Folienansicht präsentieren.</p>
              </div>
              <button
                onClick={() => setPresentationOpen(true)}
                className="flex-shrink-0 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Vorschau
              </button>
              <button
                onClick={() => setPresentationSuggested(false)}
                className="flex-shrink-0 p-1 text-white/40 hover:text-white/70 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Zuweisungen */}
          {vorlage && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Zuweisungen ({relatedZuweisungen.length})</h3>
                <button
                  onClick={() => onOpenSendModal(form.id)}
                  className="text-xs text-black hover:underline"
                >
                  + Versenden
                </button>
              </div>
              {relatedZuweisungen.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {relatedZuweisungen.map(z => (
                    <div key={z.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-xs">
                      <div className={clsx('w-2 h-2 rounded-full', STATUS_DOTS[z.status])} />
                      <span className="font-medium text-gray-700">{z.mitarbeiter_name}</span>
                      <span className="text-gray-400">{STATUS_LABELS[z.status]}</span>
                      {z.unterschrieben_am && <span className="text-gray-400 ml-auto">{formatDate(z.unterschrieben_am)}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Noch keine Zuweisungen</p>
              )}
            </div>
          )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 flex justify-between items-center">
          <div className="flex gap-2">
            {vorlage && (
              <>
                <button
                  onClick={() => onOpenSendModal(form.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800"
                >
                  <Send size={12} />
                  Versenden
                </button>
                <button onClick={handleDelete} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg">
                  Löschen
                </button>
              </>
            )}
            <button
              onClick={() => setPresentationOpen(true)}
              disabled={blocks.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <Play size={12} />
              Präsentation
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-500 hover:text-black">Abbrechen</button>
            <button
              onClick={handleSave}
              disabled={saving || (aiGenerated && !reviewerSigned)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-30"
              title={aiGenerated && !reviewerSigned ? 'KI-Inhalt muss zuerst freigegeben werden' : ''}
            >
              <Save size={12} />
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>

      {/* Presentation Modal */}
      <PresentationModal
        open={presentationOpen}
        blocks={blocks}
        title={form.name || 'Unterweisung'}
        onClose={() => setPresentationOpen(false)}
      />
    </div>
  )
}

// ============================================================================
// Vorlage Card Grid
// ============================================================================

function VorlagenTab({ vorlagen, loading, onCardClick, onNewClick, kategorieOptions }: {
  vorlagen: Vorlage[]
  loading: boolean
  onCardClick: (v: Vorlage) => void
  onNewClick: () => void
  kategorieOptions: string[]
}) {
  if (loading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <LeitfadenTooltip
        section="unterweisungen.uebersicht"
        title={LEITFADEN_TEXTE['unterweisungen.uebersicht'].title}
        description={LEITFADEN_TEXTE['unterweisungen.uebersicht'].description}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-black">Vorlagen</h2>
          <button
            onClick={onNewClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800"
          >
            <Plus size={14} />
            Neue Vorlage
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {vorlagen.map(v => (
          <button
            key={v.id}
            onClick={() => onCardClick(v)}
            className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-black text-sm">{v.name}</h3>
              {v.ist_pflicht_fuer_alle && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Pflicht</span>
              )}
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {v.kategorie && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">{v.kategorie}</span>
              )}
              {v.norm_referenz && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">{v.norm_referenz}</span>
              )}
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div>Intervall: {formatIntervall(v.intervall_monate)}</div>
              <div>Zugewiesen: <span className="font-medium text-black">{v.zuweisungs_count}</span></div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-black h-full transition-all" style={{ width: `${v.compliance_prozent}%` }} />
                </div>
                <span className="font-medium text-black w-8 text-right">{v.compliance_prozent}%</span>
              </div>
            </div>
          </button>
        ))}
        </div>

        {vorlagen.length === 0 && (
          <div className="text-center py-12">
            <Shield size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">Noch keine Vorlagen erstellt</p>
          </div>
        )}
      </LeitfadenTooltip>
    </div>
  )
}

// ============================================================================
// Zuweisungen Tab
// ============================================================================

function ZuweisungenTab({ zuweisungen, loading, onSendClick }: {
  zuweisungen: Zuweisung[]; loading: boolean; onSendClick: () => void
}) {
  const [filter, setFilter] = useState('')
  if (loading) return <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" /></div>

  const filtered = zuweisungen.filter(z =>
    z.mitarbeiter_name.toLowerCase().includes(filter.toLowerCase()) ||
    z.vorlage_name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black">Zuweisungen</h2>
        <button onClick={onSendClick} className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800">
          <Send size={14} />
          Versenden
        </button>
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" placeholder="Suchen..." value={filter} onChange={e => setFilter(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mitarbeiter</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vorlage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fällig am</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Unterschrieben</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(z => (
              <tr key={z.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">{z.mitarbeiter_name}</td>
                <td className="px-4 py-3 text-gray-800">{z.vorlage_name}</td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    z.status === 'offen' && 'bg-gray-100 text-gray-600',
                    z.status === 'versendet' && 'bg-yellow-50 text-yellow-700',
                    z.status === 'unterschrieben' && 'bg-green-50 text-green-700',
                    z.status === 'abgelaufen' && 'bg-red-50 text-red-700',
                  )}>
                    {STATUS_LABELS[z.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(z.faellig_am)}</td>
                <td className="px-4 py-3 text-gray-500">{z.unterschrieben_am ? formatDate(z.unterschrieben_am) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12"><Users size={48} className="mx-auto mb-3 text-gray-300" /><p className="text-sm text-gray-400">Keine Zuweisungen gefunden</p></div>
      )}
    </div>
  )
}

// ============================================================================
// Compliance-Matrix Tab
// ============================================================================

function ComplianceMatrixTab({ data, loading }: { data: ComplianceRow[]; loading: boolean }) {
  if (loading) return <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" /></div>

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-black">Compliance-Matrix</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mitarbeiter</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Abteilung</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Compliance</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.mitarbeiter_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{row.mitarbeiter_name}</td>
                <td className="px-4 py-3 text-gray-500">{row.abteilung}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-32 overflow-hidden">
                      <div className="bg-black h-full transition-all" style={{ width: `${row.gesamt_prozent}%` }} />
                    </div>
                    <span className="text-xs font-medium text-black w-8 text-right">{row.gesamt_prozent}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="text-center py-12"><Shield size={48} className="mx-auto mb-3 text-gray-300" /><p className="text-sm text-gray-400">Keine Daten verfügbar</p></div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function UnterweisungenPage() {
  const [activeTab, setActiveTab] = useState<'vorlagen' | 'zuweisungen' | 'compliance'>('vorlagen')
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([])
  const [zuweisungen, setZuweisungen] = useState<Zuweisung[]>([])
  const [complianceData, setComplianceData] = useState<ComplianceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserName, setCurrentUserName] = useState('Benutzer')
  const [kategorieOptions, setKategorieOptions] = useState<string[]>(DEFAULT_KATEGORIE_OPTIONS)
  const [berufsgruppen, setBerufsgruppen] = useState<string[]>([])
  const [verantwortlicherName, setVerantwortlicherName] = useState('')
  const [orgLogo, setOrgLogo] = useState<string | null>(null)

  // Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedVorlage, setSelectedVorlage] = useState<Vorlage | null>(null)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [preselectedVorlageId, setPreselectedVorlageId] = useState<string>()
  const [creationChooserOpen, setCreationChooserOpen] = useState(false)
  const [activeCreationMode, setActiveCreationMode] = useState<CreationMode>('editor')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [authRes, vorlagenRes, zuweisungenRes, complianceRes, orgRes, berufeRes] = await Promise.all([
        api.get('/auth/me').catch(() => ({ data: { name: 'Benutzer' } })),
        api.get('/unterweisungen/vorlagen').catch(() => ({ data: [] })),
        api.get('/unterweisungen/zuweisungen').catch(() => ({ data: [] })),
        api.get('/unterweisungen/compliance-matrix').catch(() => ({ data: [] })),
        api.get('/organisation').catch(() => ({ data: {} })),
        api.get('/organisation/berufe').catch(() => ({ data: [] })),
      ])

      setCurrentUserName(authRes.data?.name || authRes.data?.vorname + ' ' + authRes.data?.nachname || 'Benutzer')
      setVorlagen(vorlagenRes.data || [])
      setZuweisungen(zuweisungenRes.data || [])
      setComplianceData(complianceRes.data || [])

      // Branche config
      const brancheValue = orgRes.data?.branche || ''
      const branchenConfig = getBranchenConfig(brancheValue)
      const kats = branchenConfig.unterweisungsKategorien
      setKategorieOptions(kats.length > 0 ? kats : DEFAULT_KATEGORIE_OPTIONS)
      setVerantwortlicherName(orgRes.data?.verantwortlicher_name || '')
      setOrgLogo(orgRes.data?.logo_url || null)

      // Load Berufe from organisation config
      const berufe: string[] = Array.isArray(berufeRes.data) ? berufeRes.data : []
      setBerufsgruppen(berufe)
    } catch (err) {
      toast.error('Fehler beim Laden')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveVorlage = async (vorlage: Vorlage) => {
    if (vorlage.id) {
      await api.put(`/unterweisungen/vorlagen/${vorlage.id}`, vorlage)
      setVorlagen(vorlagen.map(v => v.id === vorlage.id ? vorlage : v))
    } else {
      const res = await api.post('/unterweisungen/vorlagen', vorlage)
      setVorlagen([...vorlagen, res.data])
    }
  }

  const handleDeleteVorlage = async (id: string) => {
    await api.delete(`/unterweisungen/vorlagen/${id}`)
    setVorlagen(vorlagen.filter(v => v.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex">
            {[
              { id: 'vorlagen', label: 'Vorlagen' },
              { id: 'zuweisungen', label: 'Zuweisungen' },
              { id: 'compliance', label: 'Compliance-Matrix' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={clsx(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-400 hover:text-black'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'vorlagen' && (
          <VorlagenTab
            vorlagen={vorlagen} loading={loading}
            onCardClick={v => { setSelectedVorlage(v); setActiveCreationMode('editor'); setDetailModalOpen(true) }}
            onNewClick={() => setCreationChooserOpen(true)}
            kategorieOptions={kategorieOptions}
          />
        )}
        {activeTab === 'zuweisungen' && (
          <ZuweisungenTab zuweisungen={zuweisungen} loading={loading} onSendClick={() => setSendModalOpen(true)} />
        )}
        {activeTab === 'compliance' && (
          <ComplianceMatrixTab data={complianceData} loading={loading} />
        )}
      </div>

      <CreationModeChooser
        open={creationChooserOpen}
        onChoose={mode => {
          setCreationChooserOpen(false)
          setActiveCreationMode(mode)
          setSelectedVorlage(null)
          setDetailModalOpen(true)
        }}
        onClose={() => setCreationChooserOpen(false)}
      />

      <VorlageDetailModal
        open={detailModalOpen}
        vorlage={selectedVorlage}
        onClose={() => { setDetailModalOpen(false); setSelectedVorlage(null); loadData() }}
        onSave={handleSaveVorlage}
        onDelete={handleDeleteVorlage}
        currentUserName={currentUserName}
        zuweisungen={zuweisungen}
        onOpenSendModal={(id) => { setPreselectedVorlageId(id); setSendModalOpen(true) }}
        kategorieOptions={kategorieOptions}
        berufsgruppen={berufsgruppen}
        verantwortlicherName={verantwortlicherName}
        creationMode={activeCreationMode}
        logo={orgLogo}
      />

      <SendModal
        open={sendModalOpen}
        onClose={() => { setSendModalOpen(false); setPreselectedVorlageId(undefined); loadData() }}
        preselectedVorlageId={preselectedVorlageId}
        vorlagen={vorlagen}
      />
    </div>
  )
}
