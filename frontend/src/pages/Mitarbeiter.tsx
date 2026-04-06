/**
 * Mitarbeiter (Employee) Management — Google Sheets-style
 * Features: inline editing, expandable rows, compliance tracking, documents & trainings
 */
import React, { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, FileText, Search, Check, X, Building2, Send, UserPlus, Users, Calendar, Clock, GraduationCap, AlertTriangle, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { getBranchenConfig } from '@/config/branchen'

interface Abteilung {
  id: string
  name: string
}

interface Dokument {
  id: string
  typ: 'staplerschein' | 'kranschein' | 'ersthelfer' | 'schweisserschein' | 'sonstiges'
  name: string
  gueltig_bis?: string
  status: 'aktuell' | 'abgelaufen' | 'warnung'
}

interface UnterweisungsStatus {
  vorlage_id: string
  vorlage_name: string
  status: 'gruen' | 'gelb' | 'rot' | 'offen'
  unterschrieben_am?: string
  faellig_am?: string
}

interface Mitarbeiter {
  id: string
  vorname: string
  nachname: string
  email?: string
  telefon?: string
  beruf: string
  abteilung_id?: string
  abteilung_name?: string
  personalnummer: string
  ist_aktiv: boolean
  compliance_prozent: number
  eintrittsdatum?: string
  typ?: 'intern' | 'extern'
  unternehmen?: string
  dokumente?: Dokument[]
  unterweisungs_status?: UnterweisungsStatus[]
}

// ---- Onboarding types ----
interface PflichtVorlage {
  id: string
  name: string
  kategorie: string
  intervall_monate: number
  naechste_gruppe?: string // ISO date string of next scheduled group session
  naechste_gruppe_id?: string
}

type OnboardingChoice = 'gruppe' | 'separat' | 'skip'

// ---- Onboarding Modal ----
function OnboardingModal({
  mitarbeiter,
  vorlagen,
  onClose,
  onDone,
}: {
  mitarbeiter: Mitarbeiter
  vorlagen: PflichtVorlage[]
  onClose: () => void
  onDone: () => void
}) {
  const [choices, setChoices] = useState<Record<string, OnboardingChoice>>(() => {
    const init: Record<string, OnboardingChoice> = {}
    vorlagen.forEach(v => { init[v.id] = 'gruppe' })
    return init
  })
  const [dates, setDates] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 7)
    const ds = defaultDate.toISOString().slice(0, 10)
    vorlagen.forEach(v => { init[v.id] = ds })
    return init
  })
  const [saving, setSaving] = useState(false)

  const eintrittsDatum = mitarbeiter.eintrittsdatum
    ? new Date(mitarbeiter.eintrittsdatum)
    : new Date()

  const getNextAnnualDate = (vorlage: PflichtVorlage): string => {
    if (vorlage.naechste_gruppe) return vorlage.naechste_gruppe
    // Calculate next cycle: add intervall_monate from now
    const d = new Date(eintrittsDatum)
    d.setMonth(d.getMonth() + vorlage.intervall_monate)
    return d.toISOString().slice(0, 10)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const assignments = vorlagen
        .filter(v => choices[v.id] !== 'skip')
        .map(v => ({
          vorlage_id: v.id,
          mitarbeiter_id: mitarbeiter.id,
          typ: choices[v.id],
          faellig_am: choices[v.id] === 'gruppe'
            ? getNextAnnualDate(v)
            : dates[v.id],
          gruppe_id: choices[v.id] === 'gruppe' ? v.naechste_gruppe_id : undefined,
        }))

      if (assignments.length > 0) {
        await Promise.all(
          assignments.map(a =>
            api.post('/unterweisungen/zuweisungen', {
              vorlage_id: a.vorlage_id,
              mitarbeiter_id: a.mitarbeiter_id,
              faellig_am: a.faellig_am,
              gruppe_id: a.gruppe_id,
            }).catch(() => null)
          )
        )
        toast.success(`${assignments.length} Unterweisung(en) eingeplant`)
      }
      onDone()
    } catch {
      toast.error('Fehler beim Einplanen')
    } finally {
      setSaving(false)
    }
  }

  const allSkipped = vorlagen.every(v => choices[v.id] === 'skip')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                  <GraduationCap size={16} className="text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-black">Pflicht-Unterweisungen einplanen</h2>
              </div>
              <p className="text-sm text-gray-500 ml-10">
                Für <span className="font-semibold text-black">{mitarbeiter.vorname} {mitarbeiter.nachname}</span> — wähle wie jede Unterweisung eingeplant werden soll.
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-300 hover:text-gray-500 rounded-lg">
              <X size={18} />
            </button>
          </div>
          {/* Info hint about cycle */}
          <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Tipp: Wenn der Mitarbeiter mitten im Jahr eintritt, kannst du eine separate Erstunterweisung planen und ihn danach dem regulären Gruppenzyklus hinzufügen — so bleibt der Rhythmus konsistent.
            </p>
          </div>
        </div>

        {/* Vorlage list — clean table style */}
        <div className="flex-1 overflow-y-auto">
          {vorlagen.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              Keine Pflicht-Unterweisungen gefunden.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-6 py-3">Unterweisung</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3 w-44">Einplanung</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3 w-36">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vorlagen.map(v => (
                  <tr key={v.id} className={clsx('transition-colors', choices[v.id] === 'skip' && 'opacity-40')}>
                    <td className="px-6 py-3.5">
                      <div className="text-sm font-medium text-black">{v.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{v.kategorie}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">alle {v.intervall_monate} Monate</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <select
                        value={choices[v.id]}
                        onChange={e => setChoices(c => ({ ...c, [v.id]: e.target.value as OnboardingChoice }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:ring-1 focus:ring-black focus:border-black outline-none appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '24px' }}
                      >
                        <option value="gruppe">Zur nächsten Gruppe</option>
                        <option value="separat">Separat einplanen</option>
                        <option value="skip">Überspringen</option>
                      </select>
                    </td>
                    <td className="px-3 py-3.5">
                      {choices[v.id] === 'separat' && (
                        <input
                          type="date"
                          value={dates[v.id] || ''}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={e => setDates(d => ({ ...d, [v.id]: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                        />
                      )}
                      {choices[v.id] === 'gruppe' && (
                        <span className="text-xs text-gray-400">
                          {new Date(getNextAnnualDate(v)).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                      )}
                      {choices[v.id] === 'skip' && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
          <span className="text-xs text-gray-400">
            {vorlagen.filter(v => choices[v.id] !== 'skip').length} von {vorlagen.length} werden eingeplant
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Später
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Speichere…' : allSkipped ? 'Schließen' : 'Einplanen'}
              {!saving && !allSkipped && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const DOCUMENT_TYPES = [
  { value: 'staplerschein', label: 'Staplerschein' },
  { value: 'kranschein', label: 'Kranschein' },
  { value: 'ersthelfer', label: 'Ersthelfer' },
  { value: 'schweisserschein', label: 'Schweißerschein' },
  { value: 'sonstiges', label: 'Sonstiges' },
] as const

const DEFAULT_BERUFE = ['Schlosser', 'Elektriker', 'Lagerist', 'Staplerfahrer', 'Schweißer', 'Mechaniker', 'Bürokaufmann/-frau', 'Produktionsmitarbeiter', 'Teamleiter', 'Meister']

interface EditingCell {
  rowId: string
  field: keyof Mitarbeiter
}

interface NewRowData {
  vorname: string
  nachname: string
  email: string
  beruf: string
  abteilung_id: string
  personalnummer: string
  unternehmen: string
  telefon: string
}

interface ExpandedRowState {
  mitarbeiterId: string
  showNewDocForm: boolean
  newDocData: {
    typ: string
    name: string
    gueltig_bis: string
  }
}

export function MitarbeiterPage() {
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([])
  const [abteilungen, setAbteilungen] = useState<Abteilung[]>([])
  const [branche, setBranche] = useState<string>('')
  const [berufe, setBerufe] = useState<string[]>(DEFAULT_BERUFE)
  const [loading, setLoading] = useState(true)
  const [suche, setSuche] = useState('')
  const [abteilungFilter, setAbteilungFilter] = useState<string>('')
  const [nurAktive, setNurAktive] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showNewRow, setShowNewRow] = useState(false)
  const [newRowData, setNewRowData] = useState<NewRowData>({
    vorname: '',
    nachname: '',
    email: '',
    beruf: '',
    abteilung_id: '',
    personalnummer: '',
    unternehmen: '',
    telefon: '',
  })
  const [expandedStates, setExpandedStates] = useState<Record<string, ExpandedRowState>>({})
  const [newAbteilungInput, setNewAbteilungInput] = useState('')
  const [showNewAbteilungInput, setShowNewAbteilungInput] = useState(false)
  const [newBerufInput, setNewBerufInput] = useState('')
  const [showNewBerufInput, setShowNewBerufInput] = useState(false)
  const [editingNewBerufInput, setEditingNewBerufInput] = useState('')
  const [showEditingNewBeruf, setShowEditingNewBeruf] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'intern' | 'extern'>('intern')
  const [saving, setSaving] = useState(false)
  // Onboarding flow
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingMitarbeiter, setOnboardingMitarbeiter] = useState<Mitarbeiter | null>(null)
  const [onboardingVorlagen, setOnboardingVorlagen] = useState<PflichtVorlage[]>([])

  // NOTE: Berufe are loaded from the API in fetchData below.
  // The branche-based fallback was removed to prevent overwriting API berufe.

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [mitarbeiterRes, abteilungenRes, orgRes, berufeRes] = await Promise.all([
          api.get('/mitarbeiter'),
          api.get('/mitarbeiter/abteilungen'),
          api.get('/organisation'),
          api.get('/organisation/berufe').catch(() => ({ data: [] })),
        ])
        setMitarbeiter(mitarbeiterRes.data || [])
        setAbteilungen(abteilungenRes.data || [])
        const brancheValue = orgRes.data?.branche || ''
        setBranche(brancheValue)
        const apiBerufe: string[] = berufeRes.data || []
        if (apiBerufe.length > 0) {
          setBerufe(apiBerufe)
        } else if (brancheValue) {
          // Fallback: use branchenConfig if no berufe configured in org settings
          const branchenConfig = getBranchenConfig(brancheValue)
          setBerufe(branchenConfig.berufe.length > 0 ? branchenConfig.berufe : DEFAULT_BERUFE)
        } else {
          // Last fallback: localStorage or hardcoded defaults
          const saved = localStorage.getItem('pruefpilot_berufe')
          if (saved) {
            try { setBerufe(JSON.parse(saved)) } catch { setBerufe(DEFAULT_BERUFE) }
          }
        }
      } catch (error) {
        toast.error('Fehler beim Laden der Daten')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Add new Beruf
  const addNewBeruf = (value: string) => {
    if (!value.trim()) return
    const updated = Array.from(new Set([...berufe, value.trim()]))
    setBerufe(updated)
    localStorage.setItem('pruefpilot_berufe', JSON.stringify(updated))
    setNewBerufInput('')
    setShowNewBerufInput(false)
  }

  // Add new Beruf (for inline editing)
  const addNewBerufInlineEdit = (value: string) => {
    if (!value.trim()) return
    const updated = Array.from(new Set([...berufe, value.trim()]))
    setBerufe(updated)
    localStorage.setItem('pruefpilot_berufe', JSON.stringify(updated))
    setEditValue(value.trim())
    setEditingNewBerufInput('')
    setShowEditingNewBeruf(false)
  }

  // Add new Abteilung
  const addNewAbteilung = async (value: string) => {
    if (!value.trim()) return
    try {
      const res = await api.post('/mitarbeiter/abteilungen', { name: value.trim() })
      const newAbteilung = res.data
      setAbteilungen([...abteilungen, newAbteilung])
      toast.success('Abteilung hinzugefügt')
      setNewAbteilungInput('')
      setShowNewAbteilungInput(false)
    } catch (error) {
      toast.error('Fehler beim Hinzufügen der Abteilung')
      console.error(error)
    }
  }

  // Save new employee
  const saveNewMitarbeiter = async () => {
    if (saving) return
    if (!newRowData.vorname.trim() || !newRowData.nachname.trim()) {
      toast.error('Vorname und Nachname erforderlich')
      return
    }

    setSaving(true)
    try {
      const payload = {
        vorname: newRowData.vorname,
        nachname: newRowData.nachname,
        email: newRowData.email || undefined,
        telefon: newRowData.telefon || undefined,
        beruf: newRowData.beruf || undefined,
        abteilung_id: newRowData.abteilung_id || undefined,
        personalnummer: newRowData.personalnummer || undefined,
        typ: activeTab,
        unternehmen: activeTab === 'extern' ? (newRowData.unternehmen || undefined) : undefined,
      }

      const res = await api.post('/mitarbeiter', payload)
      const newMitarbeiter: Mitarbeiter = res.data
      setMitarbeiter([newMitarbeiter, ...mitarbeiter])
      toast.success(activeTab === 'extern' ? 'Externe Person hinzugefügt' : 'Mitarbeiter hinzugefügt')
      setShowNewRow(false)
      setNewRowData({
        vorname: '',
        nachname: '',
        email: '',
        beruf: '',
        abteilung_id: '',
        personalnummer: '',
        unternehmen: '',
        telefon: '',
      })

      // For intern employees: load Pflicht-Vorlagen and show onboarding modal
      if (activeTab === 'intern') {
        try {
          const vorlageRes = await api.get('/unterweisungen/vorlagen', {
            params: { pflicht: true, beruf: newRowData.beruf || undefined }
          }).catch(() => ({ data: [] }))
          const pflichtVorlagen: PflichtVorlage[] = (vorlageRes.data || [])
            .filter((v: PflichtVorlage & { ist_pflicht_fuer_alle?: boolean }) =>
              v.ist_pflicht_fuer_alle !== false
            )
          if (pflichtVorlagen.length > 0) {
            setOnboardingMitarbeiter(newMitarbeiter)
            setOnboardingVorlagen(pflichtVorlagen)
            setOnboardingOpen(true)
          }
        } catch {
          // Onboarding is optional — don't block if API fails
        }
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      toast.error(detail ? `Fehler: ${detail}` : 'Fehler beim Speichern')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  // Save cell edit
  const saveCellEdit = async () => {
    if (!editingCell) return

    try {
      const payload = { [editingCell.field]: editValue }
      const res = await api.patch(`/mitarbeiter/${editingCell.rowId}`, payload)
      setMitarbeiter(mitarbeiter.map((m) => (m.id === editingCell.rowId ? res.data : m)))
      toast.success('Gespeichert')
      setEditingCell(null)
      setEditValue('')
    } catch (error) {
      toast.error('Fehler beim Speichern')
      console.error(error)
    }
  }

  // Toggle active status
  const toggleAktiv = async (id: string, current: boolean) => {
    try {
      const res = await api.patch(`/mitarbeiter/${id}`, { ist_aktiv: !current })
      setMitarbeiter(mitarbeiter.map((m) => (m.id === id ? res.data : m)))
      toast.success('Status aktualisiert')
    } catch (error) {
      toast.error('Fehler beim Aktualisieren')
      console.error(error)
    }
  }

  // Delete employee
  const deleteMitarbeiter = async (id: string) => {
    if (!confirm('Mitarbeiter wirklich löschen?')) return
    try {
      await api.delete(`/mitarbeiter/${id}`)
      setMitarbeiter(mitarbeiter.filter((m) => m.id !== id))
      toast.success('Mitarbeiter gelöscht')
    } catch (error) {
      toast.error('Fehler beim Löschen')
      console.error(error)
    }
  }

  // Filter data
  const filtered = mitarbeiter.filter((m) => {
    const matchesTab = activeTab === 'extern' ? m.typ === 'extern' : (m.typ === 'intern' || !m.typ)
    const matchesSearch =
      m.vorname.toLowerCase().includes(suche.toLowerCase()) ||
      m.nachname.toLowerCase().includes(suche.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(suche.toLowerCase())) ||
      (m.personalnummer && m.personalnummer.toLowerCase().includes(suche.toLowerCase())) ||
      (m.unternehmen && m.unternehmen.toLowerCase().includes(suche.toLowerCase()))

    const matchesAbteilung = !abteilungFilter || m.abteilung_id === abteilungFilter
    const matchesAktiv = !nurAktive || m.ist_aktiv

    return matchesTab && matchesSearch && matchesAbteilung && matchesAktiv
  })

  const internCount = mitarbeiter.filter(m => m.typ === 'intern' || !m.typ).length
  const externCount = mitarbeiter.filter(m => m.typ === 'extern').length

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Lädt...</div>
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Mitarbeiter</h1>
        <p className="text-sm text-gray-400 mt-1">{internCount} intern · {externCount} extern</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => { setActiveTab('intern'); setShowNewRow(false) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'intern' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={15} />
          Intern
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'intern' ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'}`}>{internCount}</span>
        </button>
        <button
          onClick={() => { setActiveTab('extern'); setShowNewRow(false) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'extern' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Building2 size={15} />
          Extern
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'extern' ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'}`}>{externCount}</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-300" />
          <input
            type="text"
            placeholder="Nach Name, E-Mail oder Personalnummer suchen..."
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
          />
        </div>

        <select
          value={abteilungFilter}
          onChange={(e) => setAbteilungFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
        >
          <option value="">Alle Abteilungen</option>
          {abteilungen.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={nurAktive}
            onChange={(e) => setNurAktive(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-gray-700">Nur aktive</span>
        </label>

        <button
          onClick={() => setShowNewRow(!showNewRow)}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
          data-tour-page="ma-neu"
        >
          <UserPlus className="w-4 h-4" />
          {activeTab === 'extern' ? 'Externe Person' : 'Neuer Mitarbeiter'}
        </button>
      </div>

      {/* New Row Form */}
      {showNewRow && activeTab === 'extern' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Externe Person anlegen</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">z.B. Dienstleister, Wartungsfirma, Leiharbeiter</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vorname *</label>
              <input type="text" value={newRowData.vorname} onChange={e => setNewRowData({ ...newRowData, vorname: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none" placeholder="Max" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nachname *</label>
              <input type="text" value={newRowData.nachname} onChange={e => setNewRowData({ ...newRowData, nachname: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none" placeholder="Müller" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-Mail *</label>
              <input type="email" value={newRowData.email} onChange={e => setNewRowData({ ...newRowData, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none" placeholder="max@firma.de" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unternehmen / Firma</label>
              <input type="text" value={newRowData.unternehmen} onChange={e => setNewRowData({ ...newRowData, unternehmen: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none" placeholder="Musterfirma GmbH" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
              <input type="tel" value={newRowData.telefon} onChange={e => setNewRowData({ ...newRowData, telefon: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none" placeholder="+49 ..." />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={saveNewMitarbeiter} disabled={saving}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
                {saving ? 'Speichere...' : 'Anlegen'}
              </button>
              <button onClick={() => setShowNewRow(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {showNewRow && activeTab === 'intern' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Vorname *
              </label>
              <input
                type="text"
                value={newRowData.vorname}
                onChange={(e) =>
                  setNewRowData({ ...newRowData, vorname: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                placeholder="Max"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Nachname *
              </label>
              <input
                type="text"
                value={newRowData.nachname}
                onChange={(e) =>
                  setNewRowData({ ...newRowData, nachname: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                placeholder="Müller"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                E-Mail
              </label>
              <input
                type="email"
                value={newRowData.email}
                onChange={(e) =>
                  setNewRowData({ ...newRowData, email: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                placeholder="max@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Beruf
              </label>
              <div className="relative">
                <select
                  value={showNewBerufInput ? '__new__' : newRowData.beruf}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewBerufInput(true)
                    } else {
                      setNewRowData({ ...newRowData, beruf: e.target.value })
                      setShowNewBerufInput(false)
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
                >
                  <option value="">Beruf wählen</option>
                  {berufe.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="__new__">+ Neuen Beruf hinzufügen</option>
                </select>
                {showNewBerufInput && (
                  <div className="flex gap-1 mt-2">
                    <input
                      type="text"
                      value={newBerufInput}
                      onChange={(e) => setNewBerufInput(e.target.value)}
                      placeholder="Neuer Beruf..."
                      className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      onClick={() => addNewBeruf(newBerufInput)}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Abteilung
              </label>
              <div className="relative">
                <select
                  value={showNewAbteilungInput ? '__new__' : newRowData.abteilung_id}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewAbteilungInput(true)
                    } else {
                      setNewRowData({ ...newRowData, abteilung_id: e.target.value })
                      setShowNewAbteilungInput(false)
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
                >
                  <option value="">Keine Abteilung</option>
                  {abteilungen.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                  <option value="__new__">+ Neue Abteilung hinzufügen</option>
                </select>
                {showNewAbteilungInput && (
                  <div className="flex gap-1 mt-2">
                    <input
                      type="text"
                      value={newAbteilungInput}
                      onChange={(e) => setNewAbteilungInput(e.target.value)}
                      placeholder="Neue Abteilung..."
                      className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      onClick={() => addNewAbteilung(newAbteilungInput)}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Personalnummer
              </label>
              <input
                type="text"
                value={newRowData.personalnummer}
                onChange={(e) =>
                  setNewRowData({ ...newRowData, personalnummer: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                placeholder="P123456"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex gap-2">
              <button
                onClick={saveNewMitarbeiter}
                disabled={saving}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Speichere...' : 'Speichern'}
              </button>
              <button
                onClick={() => {
                  setShowNewRow(false)
                  setNewRowData({
                    vorname: '',
                    nachname: '',
                    email: '',
                    beruf: '',
                    abteilung_id: '',
                    personalnummer: '',
                    unternehmen: '',
                    telefon: '',
                  })
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extern Tab — simple card grid */}
      {activeTab === 'extern' && (
        <div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Building2 size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">Noch keine externen Personen</p>
              <p className="text-xs text-gray-300 mt-1">Dienstleister, Wartungsfirmen oder Leiharbeiter die Schulungen erhalten sollen</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(m => (
                <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-600">
                          {m.vorname[0]}{m.nachname[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-black">{m.vorname} {m.nachname}</p>
                        {m.unternehmen && <p className="text-xs text-gray-400">{m.unternehmen}</p>}
                      </div>
                    </div>
                    <button onClick={() => deleteMitarbeiter(m.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {m.email && (
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                      <span className="text-gray-300">@</span>{m.email}
                    </p>
                  )}
                  {m.telefon && (
                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                      <span className="text-gray-300">☎</span>{m.telefon}
                    </p>
                  )}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {(m.unterweisungs_status || []).length} Schulung(en)
                    </span>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-black hover:text-gray-600 transition-colors">
                      <Send size={12} />
                      Schulung senden
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Intern Tab — Table / Mobile Cards */}
      {activeTab === 'intern' && (isMobile ? (
        // Mobile Card View
        <div className="space-y-4">
          {filtered.map((m) => (
            <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div
                className="cursor-pointer"
                onClick={() =>
                  setExpandedRowId(expandedRowId === m.id ? null : m.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-black">
                      {m.vorname} {m.nachname}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {m.beruf && <span>{m.beruf} • </span>}
                      {m.personalnummer}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded text-xs font-medium',
                        m.ist_aktiv
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {m.ist_aktiv ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    {expandedRowId === m.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {expandedRowId === m.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  {m.email && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700">
                        E-Mail
                      </div>
                      <div className="text-sm text-gray-600">{m.email}</div>
                    </div>
                  )}
                  {m.abteilung_name && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700">
                        Abteilung
                      </div>
                      <div className="text-sm text-gray-600">{m.abteilung_name}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      Compliance
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div
                        className="bg-black h-2 rounded"
                        style={{ width: `${m.compliance_prozent}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {m.compliance_prozent}%
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMitarbeiter(m.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Desktop Table View
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-tour-page="ma-liste">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">
                    Beruf
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">
                    Abteilung
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">
                    Personalnummer
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">
                    E-Mail
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">
                    Compliance
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 px-5 py-3">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => (
                  <React.Fragment key={m.id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedRowId(expandedRowId === m.id ? null : m.id)
                      }
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">
                            {m.vorname} {m.nachname}
                          </div>
                          {expandedRowId === m.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        {editingCell?.rowId === m.id &&
                        editingCell?.field === 'beruf' ? (
                          <div className="relative">
                            <select
                              value={
                                showEditingNewBeruf ? '__new__' : editValue
                              }
                              onChange={(e) => {
                                if (e.target.value === '__new__') {
                                  setShowEditingNewBeruf(true)
                                } else {
                                  setEditValue(e.target.value)
                                  setShowEditingNewBeruf(false)
                                }
                              }}
                              onBlur={saveCellEdit}
                              autoFocus
                              className="w-full px-3.5 py-2 border border-black rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black appearance-none cursor-pointer"
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
                            >
                              <option value="">Beruf wählen</option>
                              {berufe.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                              <option value="__new__">+ Neuen Beruf</option>
                            </select>
                            {showEditingNewBeruf && (
                              <div className="flex gap-1 mt-1">
                                <input
                                  type="text"
                                  value={editingNewBerufInput}
                                  onChange={(e) =>
                                    setEditingNewBerufInput(e.target.value)
                                  }
                                  placeholder="Neuer Beruf..."
                                  className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                />
                                <button
                                  onClick={() =>
                                    addNewBerufInlineEdit(editingNewBerufInput)
                                  }
                                  className="px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCell({ rowId: m.id, field: 'beruf' })
                              setEditValue(m.beruf)
                              setShowEditingNewBeruf(false)
                            }}
                            className="px-2 py-1 text-gray-700"
                          >
                            {m.beruf || '—'}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        {editingCell?.rowId === m.id &&
                        editingCell?.field === 'abteilung_id' ? (
                          <div className="relative">
                            <select
                              value={editValue}
                              onChange={(e) => {
                                if (e.target.value === '__new__') {
                                  setShowNewAbteilungInput(true)
                                } else {
                                  setEditValue(e.target.value)
                                }
                              }}
                              onBlur={saveCellEdit}
                              autoFocus
                              className="w-full px-3.5 py-2 border border-black rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black appearance-none cursor-pointer"
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
                            >
                              <option value="">Keine Abteilung</option>
                              {abteilungen.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                              <option value="__new__">+ Neue Abteilung</option>
                            </select>
                            {showNewAbteilungInput && (
                              <div className="flex gap-1 mt-1">
                                <input
                                  type="text"
                                  value={newAbteilungInput}
                                  onChange={(e) =>
                                    setNewAbteilungInput(e.target.value)
                                  }
                                  placeholder="Neue Abteilung..."
                                  className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                />
                                <button
                                  onClick={() => {
                                    addNewAbteilung(newAbteilungInput)
                                    setEditValue(newAbteilungInput)
                                    setShowNewAbteilungInput(false)
                                  }}
                                  className="px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCell({
                                rowId: m.id,
                                field: 'abteilung_id',
                              })
                              setEditValue(m.abteilung_id || '')
                              setShowNewAbteilungInput(false)
                            }}
                            className="px-2 py-1 text-gray-700"
                          >
                            {m.abteilung_name || '—'}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        {editingCell?.rowId === m.id &&
                        editingCell?.field === 'personalnummer' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit()
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                            autoFocus
                            className="w-full px-3.5 py-2 border border-black rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                          />
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCell({
                                rowId: m.id,
                                field: 'personalnummer',
                              })
                              setEditValue(m.personalnummer)
                            }}
                            className="px-2 py-1 text-gray-700"
                          >
                            {m.personalnummer || '—'}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        {editingCell?.rowId === m.id &&
                        editingCell?.field === 'email' ? (
                          <input
                            type="email"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit()
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                            autoFocus
                            className="w-full px-3.5 py-2 border border-black rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                          />
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCell({ rowId: m.id, field: 'email' })
                              setEditValue(m.email || '')
                            }}
                            className="px-2 py-1 text-gray-700"
                          >
                            {m.email ? (
                              <a
                                href={`mailto:${m.email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {m.email}
                              </a>
                            ) : (
                              '—'
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleAktiv(m.id, m.ist_aktiv)
                          }}
                          className={clsx(
                            'px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors',
                            m.ist_aktiv
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {m.ist_aktiv ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div
                                className="h-2 bg-black rounded-full"
                                style={{ width: `${m.compliance_prozent}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {m.compliance_prozent}%
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMitarbeiter(m.id)
                          }}
                          className="p-1 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Row: Dokumente & Unterweisungen */}
                    {expandedRowId === m.id && (
                      <tr className="bg-gray-50 border-t border-gray-100">
                        <td colSpan={8} className="px-5 py-6">
                          <div className="space-y-6">
                            {/* Unterweisungs-Status */}
                            {m.unterweisungs_status &&
                              m.unterweisungs_status.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-black mb-3">
                                    Unterweisungs-Status
                                  </h4>
                                  <div className="space-y-2">
                                    {m.unterweisungs_status.map((u) => (
                                      <div
                                        key={u.vorlage_id}
                                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100"
                                      >
                                        <div
                                          className={clsx(
                                            'w-3 h-3 rounded-full',
                                            u.status === 'gruen' &&
                                              'bg-green-500',
                                            u.status === 'gelb' &&
                                              'bg-yellow-500',
                                            u.status === 'rot' && 'bg-red-500',
                                            u.status === 'offen' &&
                                              'bg-gray-300'
                                          )}
                                        />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-900">
                                            {u.vorlage_name}
                                          </div>
                                          {u.faellig_am && (
                                            <div className="text-xs text-gray-500">
                                              Fällig am:{' '}
                                              {new Date(
                                                u.faellig_am
                                              ).toLocaleDateString('de-DE')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* Dokumente */}
                            {m.dokumente && m.dokumente.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-black mb-3">
                                  Dokumente
                                </h4>
                                <div className="space-y-2">
                                  {m.dokumente.map((d) => (
                                    <div
                                      key={d.id}
                                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100"
                                    >
                                      <FileText className="w-4 h-4 text-gray-400" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {d.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {d.typ}
                                          {d.gueltig_bis &&
                                            ` • Gültig bis ${new Date(
                                              d.gueltig_bis
                                            ).toLocaleDateString('de-DE')}`}
                                        </div>
                                      </div>
                                      <span
                                        className={clsx(
                                          'px-2 py-1 rounded text-xs font-medium',
                                          d.status === 'aktuell' &&
                                            'bg-green-50 text-green-700',
                                          d.status === 'warnung' &&
                                            'bg-yellow-50 text-yellow-700',
                                          d.status === 'abgelaufen' &&
                                            'bg-red-50 text-red-700'
                                        )}
                                      >
                                        {d.status === 'aktuell'
                                          ? 'Aktuell'
                                          : d.status === 'warnung'
                                          ? 'Warnung'
                                          : 'Abgelaufen'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) )}

      {activeTab === 'intern' && filtered.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          Keine Mitarbeiter gefunden
        </div>
      )}

      {/* Onboarding Modal */}
      {onboardingOpen && onboardingMitarbeiter && (
        <OnboardingModal
          mitarbeiter={onboardingMitarbeiter}
          vorlagen={onboardingVorlagen}
          onClose={() => setOnboardingOpen(false)}
          onDone={() => {
            setOnboardingOpen(false)
            setOnboardingMitarbeiter(null)
            setOnboardingVorlagen([])
          }}
        />
      )}
    </div>
  )
}
