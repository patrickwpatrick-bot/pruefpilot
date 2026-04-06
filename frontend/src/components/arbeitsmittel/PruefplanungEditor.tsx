import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, X, Calendar, RotateCcw, Check } from 'lucide-react'
import {
  PruefplanungState,
  WIEDERHOLUNG_OPTIONS,
  AM_TYPEN,
  EINHEIT_ITEMS,
  CUSTOM_UNITS,
  WOCHENTAGE_LANG,
  WOCHENTAGE_MIN,
  MONATE_KURZ,
  MONATE_LANG,
  MONATS_ORDINALE,
} from './constants'

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

export { PruefplanungCalendar }
