/**
 * Dashboard — calendar with event bars + day detail panel
 */
import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Wrench, GraduationCap, AlertTriangle, Clock, CheckCircle2, Plus, FileText, ArrowRight, Shield, TrendingUp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import type { Arbeitsmittel } from '@/types'
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

interface ComplianceScore {
  score: number
  ampel: string
  details: {
    pruefungen_aktuell_prozent: number
    maengel_offen: number
    maengel_rot: number
    maengel_orange: number
    arbeitsmittel_gesamt: number
    arbeitsmittel_gruen: number
    arbeitsmittel_gelb: number
    arbeitsmittel_rot: number
  }
  top_massnahmen: {
    typ: string
    text: string
    impact: number
    link: string
  }[]
}

interface DashboardStats {
  arbeitsmittel: Arbeitsmittel[]
  pruefungen: {
    id: string
    arbeitsmittel_name: string | null
    status: string
    ergebnis: string | null
    gestartet_am: string
    anzahl_maengel: number
  }[]
  zuweisungen: {
    id: string
    mitarbeiter_name: string
    vorlage_name: string
    status: string
    faellig_am: string
  }[]
  maengelOffen: number
}

interface CalendarTask {
  type: 'pruefung' | 'unterweisung'
  id: string
  name: string
  date: string
  status?: string
  ampel?: string
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

const getFirstDayOfWeek = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/** Color config per task type / ampel */
function taskColor(task: CalendarTask): { bar: string; icon: string; badge: string; label: string } {
  if (task.type === 'pruefung') {
    if (task.ampel === 'rot')  return { bar: 'bg-red-500',   icon: 'text-red-600',   badge: 'bg-red-50 text-red-600',    label: 'Überfällig' }
    if (task.ampel === 'gelb') return { bar: 'bg-amber-400', icon: 'text-amber-600', badge: 'bg-amber-50 text-amber-600', label: 'Bald fällig' }
    return                            { bar: 'bg-blue-500',  icon: 'text-blue-600',  badge: 'bg-blue-50 text-blue-600',   label: 'Prüfung' }
  }
  return { bar: 'bg-purple-500', icon: 'text-purple-600', badge: 'bg-purple-50 text-purple-600', label: 'Unterweisung' }
}

export function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    arbeitsmittel: [], pruefungen: [], zuweisungen: [], maengelOffen: 0,
  })
  const [complianceScore, setComplianceScore] = useState<ComplianceScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [yearPickerOpen, setYearPickerOpen] = useState(false)

  const currentMonth = currentDate.getMonth()
  const currentYear  = currentDate.getFullYear()
  const today        = new Date()
  const todayStr     = today.toISOString().split('T')[0]

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get('/arbeitsmittel?limit=200'),
      api.get('/pruefungen'),
      api.get('/unterweisungen/zuweisungen'),
      api.get('/maengel?status_filter=offen'),
      api.get('/compliance/score'),
    ])
      .then(([amRes, prRes, zwRes, maRes, csRes]) => {
        setStats({
          arbeitsmittel: amRes.data.items || [],
          pruefungen:    prRes.data || [],
          zuweisungen:   zwRes.data || [],
          maengelOffen:  (maRes.data || []).length,
        })
        setComplianceScore(csRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // ── Build task map ──────────────────────────────────────────────────────
  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    stats.arbeitsmittel.forEach(item => {
      if (!item.naechste_pruefung_am) return
      const d = item.naechste_pruefung_am.split('T')[0]
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push({ type: 'pruefung', id: item.id, name: item.name, date: d, ampel: item.ampel_status })
    })
    stats.zuweisungen.forEach(z => {
      if (!z.faellig_am || z.status === 'abgeschlossen') return
      const d = z.faellig_am.split('T')[0]
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push({ type: 'unterweisung', id: z.id, name: z.vorlage_name, date: d, status: z.status })
    })
    return map
  }, [stats.arbeitsmittel, stats.zuweisungen])

  const tasksForMonth = useMemo(() => {
    const result = new Map<number, CalendarTask[]>()
    tasksByDate.forEach((tasks, dateStr) => {
      const d = new Date(dateStr)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate()
        if (!result.has(day)) result.set(day, [])
        result.get(day)!.push(...tasks)
      }
    })
    return result
  }, [tasksByDate, currentMonth, currentYear])

  const selectedDateTasks = useMemo(() => tasksByDate.get(selectedDate) || [], [selectedDate, tasksByDate])

  const { arbeitsmittel, zuweisungen, maengelOffen } = stats
  const ueberfaellig = arbeitsmittel.filter(a => a.ampel_status === 'rot')
  const baldFaellig  = arbeitsmittel.filter(a => a.ampel_status === 'gelb')
  const aktuell      = arbeitsmittel.filter(a => a.ampel_status === 'gruen')

  const nextPruefungen = useMemo(() =>
    arbeitsmittel
      .filter(a => a.naechste_pruefung_am)
      .sort((a, b) => new Date(a.naechste_pruefung_am!).getTime() - new Date(b.naechste_pruefung_am!).getTime())
      .slice(0, 5),
  [arbeitsmittel])

  const overduePruefungen = useMemo(() =>
    zuweisungen
      .filter(z => z.status !== 'abgeschlossen' && new Date(z.faellig_am) < today)
      .sort((a, b) => new Date(a.faellig_am).getTime() - new Date(b.faellig_am).getTime()),
  [zuweisungen])

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  const daysInMonth    = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth)
  const calendarDays: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Formatted header for detail panel
  const selectedDateLabel = selectedDate === todayStr
    ? 'Heute'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Übersicht deiner Arbeitsmittel, Prüfungen und Aufgaben</p>
      </div>

      {/* BG-Ready-Score Hero */}
      {complianceScore && arbeitsmittel.length > 0 && (
        <LeitfadenTooltip
          section="dashboard.bg_score"
          title={LEITFADEN_TEXTE['dashboard.bg_score'].title}
          description={LEITFADEN_TEXTE['dashboard.bg_score'].description}
        >
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-6 md:p-8" data-tour-page="score">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Score Circle */}
              <div className="flex-shrink-0 relative">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${
                complianceScore.ampel === 'gruen' ? 'border-green-500 bg-green-50' :
                complianceScore.ampel === 'gelb' ? 'border-amber-500 bg-amber-50' :
                'border-red-500 bg-red-50'
              }`}>
                <div className="text-center">
                  <p className={`text-4xl font-bold ${
                    complianceScore.ampel === 'gruen' ? 'text-green-600' :
                    complianceScore.ampel === 'gelb' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>{complianceScore.score}%</p>
                  <p className="text-xs text-gray-400 font-medium">BG-Ready</p>
                </div>
              </div>
            </div>

            {/* Top Maßnahmen */}
            <div className="flex-1 w-full" data-tour-page="massnahmen">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-gray-600" />
                <h2 className="text-sm font-semibold text-black">BG-Ready-Score</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  complianceScore.ampel === 'gruen' ? 'bg-green-50 text-green-600' :
                  complianceScore.ampel === 'gelb' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {complianceScore.ampel === 'gruen' ? 'Gut aufgestellt' :
                   complianceScore.ampel === 'gelb' ? 'Handlungsbedarf' :
                   'Dringender Handlungsbedarf'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                So schnell verbesserst du deinen Score:
              </p>
              <div className="space-y-2">
                {complianceScore.top_massnahmen.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(m.link)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      m.typ === 'mangel' ? 'bg-red-50' : m.typ === 'pruefung' ? 'bg-amber-50' : 'bg-green-50'
                    }`}>
                      <TrendingUp size={14} className={
                        m.typ === 'mangel' ? 'text-red-600' : m.typ === 'pruefung' ? 'text-amber-600' : 'text-green-600'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black">{m.text}</p>
                      {m.impact > 0 && (
                        <p className="text-xs text-green-600 font-medium">+{m.impact} Punkte möglich</p>
                      )}
                    </div>
                    <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          </div>
        </LeitfadenTooltip>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Arbeitsmittel</p>
            <div className="p-1.5 bg-gray-50 rounded-lg"><Wrench className="text-gray-400" size={16} /></div>
          </div>
          <p className="text-3xl font-bold text-black">{arbeitsmittel.length}</p>
        </div>

        <Link to="/arbeitsmittel" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Fällige Prüfungen</p>
            <div className="p-1.5 bg-amber-50 rounded-lg"><Clock className="text-amber-500" size={16} /></div>
          </div>
          <p className={`text-3xl font-bold ${(baldFaellig.length + ueberfaellig.length) > 0 ? 'text-amber-500' : 'text-black'}`}>{baldFaellig.length + ueberfaellig.length}</p>
          {ueberfaellig.length > 0 && (
            <p className="text-xs text-red-500 mt-1 font-medium">davon {ueberfaellig.length} überfällig</p>
          )}
        </Link>

        <Link to="/maengel" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Mängel offen</p>
            <div className={`p-1.5 rounded-lg ${maengelOffen > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <AlertTriangle className={maengelOffen > 0 ? 'text-red-500' : 'text-gray-400'} size={16} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${maengelOffen > 0 ? 'text-red-500' : 'text-black'}`}>{maengelOffen}</p>
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Geprüft</p>
            <div className="p-1.5 bg-green-50 rounded-lg"><CheckCircle2 className="text-green-500" size={16} /></div>
          </div>
          <p className="text-3xl font-bold text-black">
            {aktuell.length > 0 && arbeitsmittel.length > 0 ? Math.round((aktuell.length / arbeitsmittel.length) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{aktuell.length} von {arbeitsmittel.length} aktuell</p>
        </div>
      </div>

      {arbeitsmittel.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="text-gray-400" size={20} />
          </div>
          <p className="text-black font-medium mb-1">Noch keine Arbeitsmittel</p>
          <p className="text-sm text-gray-400 mb-5">Erfasse dein erstes Arbeitsmittel, um loszulegen.</p>
          <Link to="/arbeitsmittel" className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
            Arbeitsmittel anlegen <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          {/* Calendar + Detail Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* ── Calendar ─────────────────────────────────────────────── */}
            <LeitfadenTooltip
              section="dashboard.kalender"
              title={LEITFADEN_TEXTE['dashboard.kalender'].title}
              description={LEITFADEN_TEXTE['dashboard.kalender'].description}
            >
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setYearPickerOpen(o => !o)}
                    className="flex items-center gap-1.5 text-base font-semibold text-black hover:text-gray-600 transition-colors"
                  >
                    {MONTHS[currentMonth]} {currentYear}
                    <ChevronDown size={13} className={`text-gray-400 transition-transform ${yearPickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {yearPickerOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-20 p-2 min-w-[200px]">
                      <div className="grid grid-cols-3 gap-1">
                        {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(year => (
                          <button key={year}
                            onClick={() => { setCurrentDate(new Date(year, currentMonth, 1)); setYearPickerOpen(false) }}
                            className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${year === currentYear ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                          >{year}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1.5">{d}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} className="min-h-[72px]" />

                  const dateStr   = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayTasks  = tasksForMonth.get(day) || []
                  const isToday   = dateStr === todayStr
                  const isSelected = dateStr === selectedDate
                  const visible   = dayTasks.slice(0, 3)
                  const extra     = dayTasks.length - 3

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => handleDayClick(day)}
                      className={`min-h-[72px] rounded-xl flex flex-col items-stretch p-1.5 text-left transition-colors ${
                        isSelected ? 'ring-2 ring-black ring-offset-1' : ''
                      } ${isToday ? 'bg-black' : 'hover:bg-gray-50'}`}
                    >
                      {/* Day number */}
                      <span className={`text-xs font-semibold mb-1 text-center block ${
                        isToday ? 'text-white' : isSelected ? 'text-black' : 'text-gray-700'
                      }`}>{day}</span>

                      {/* Event bars */}
                      <div className="flex flex-col gap-0.5">
                        {visible.map((task, i) => {
                          const c = taskColor(task)
                          return (
                            <div key={i} className={`${c.bar} rounded-sm px-1 py-px flex items-center`}>
                              <span className="text-white text-[9px] font-medium leading-tight truncate w-full">{task.name}</span>
                            </div>
                          )
                        })}
                        {extra > 0 && (
                          <div className="text-[9px] text-gray-400 font-medium pl-0.5">
                            +{extra} weitere
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2 rounded-sm bg-red-500" /><span>Überfällig</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2 rounded-sm bg-amber-400" /><span>Bald fällig</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2 rounded-sm bg-blue-500" /><span>Prüfung</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2 rounded-sm bg-purple-500" /><span>Unterweisung</span></div>
              </div>
            </div>
            </LeitfadenTooltip>

            {/* ── Day Detail Panel ─────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <p className="text-xs text-gray-400 mb-0.5">Tagesübersicht</p>
                <h3 className="text-base font-semibold text-black capitalize">{selectedDateLabel}</h3>
                {selectedDate !== todayStr && (
                  <button onClick={() => setSelectedDate(todayStr)} className="text-xs text-gray-400 hover:text-black mt-1 transition-colors">
                    ← Heute
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {selectedDateTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle2 size={18} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">Keine Aufgaben</p>
                    <p className="text-xs text-gray-300 mt-1">
                      {selectedDate === todayStr ? 'Heute ist nichts fällig.' : 'An diesem Tag nichts fällig.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDateTasks.map(task => {
                      const c = taskColor(task)
                      return (
                        <div key={`${task.type}-${task.id}`} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg ${task.type === 'pruefung' ? 'bg-blue-50' : 'bg-purple-50'} flex-shrink-0`}>
                              {task.type === 'pruefung'
                                ? <Wrench size={13} className={c.icon} />
                                : <GraduationCap size={13} className={c.icon} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-black leading-snug truncate">{task.name}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                                  {c.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom: Nächste Prüfungen + Überfällige Unterweisungen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeitfadenTooltip
              section="dashboard.ampel"
              title={LEITFADEN_TEXTE['dashboard.ampel'].title}
              description={LEITFADEN_TEXTE['dashboard.ampel'].description}
            >
              <div className="bg-white rounded-xl border border-gray-200" data-tour-page="faellig">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-black">Nächste Prüfungen</h2>
                <Link to="/arbeitsmittel" className="text-xs text-gray-400 hover:text-black transition-colors">Alle anzeigen</Link>
              </div>
              {nextPruefungen.length === 0 ? (
                <p className="text-sm text-gray-400 p-6 text-center">Keine anstehenden Prüfungen.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {nextPruefungen.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.naechste_pruefung_am ? new Date(item.naechste_pruefung_am).toLocaleDateString('de-DE') : '—'}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ml-3 flex-shrink-0 ${
                        item.ampel_status === 'rot' ? 'bg-red-50 text-red-600' :
                        item.ampel_status === 'gelb' ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {item.ampel_status === 'rot' ? 'Überfällig' : item.ampel_status === 'gelb' ? 'Bald' : 'OK'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </LeitfadenTooltip>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-black">Überfällige Unterweisungen</h2>
                <Link to="/unterweisungen" className="text-xs text-gray-400 hover:text-black transition-colors">Alle anzeigen</Link>
              </div>
              {overduePruefungen.length === 0 ? (
                <p className="text-sm text-gray-400 p-6 text-center">Keine überfälligen Unterweisungen.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {overduePruefungen.slice(0, 5).map(z => (
                    <div key={z.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">{z.vorlage_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{z.mitarbeiter_name}</p>
                      </div>
                      <AlertTriangle size={15} className="text-red-500 flex-shrink-0 ml-3" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
            <Link to="/pruefungen"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
              <Plus size={16} /> Prüfung starten
            </Link>
            <Link to="/unterweisungen"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 text-black text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <FileText size={16} /> Unterweisung versenden
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
