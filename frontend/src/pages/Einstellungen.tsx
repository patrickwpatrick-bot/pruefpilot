/**
 * Einstellungen — Profile, Firmendaten, Standorte, Module Manager
 */
import React, { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, MapPin, User, Building, ChevronUp, ChevronDown, Eye, EyeOff, LayoutGrid, Save, History, RefreshCw, X, Edit3, Briefcase, Check, Upload, Image, CreditCard, Zap, Crown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import type { Standort, User as UserType } from '@/types'
import { ALL_MODULES, loadSidebarConfig, saveSidebarConfig } from '@/components/layout/AppLayout'
import type { SidebarConfig } from '@/components/layout/AppLayout'
import { BranchenAutocomplete } from '@/components/ui/BranchenAutocomplete'
import { resetTour, isTourEnabled, setTourEnabled } from '@/components/ui/OnboardingTour'
import clsx from 'clsx'

interface OrgData {
  id: string
  name: string
  strasse: string | null
  plz: string | null
  ort: string | null
  telefon: string | null
  email: string | null
  branche: string | null
  verantwortlicher_name: string | null
  verantwortlicher_email: string | null
  verantwortlicher_telefon: string | null
  logo_url: string | null
}

interface BillingPlan {
  id: string
  name: string
  trial_expires_at: string | null
  [key: string]: any
}

export function EinstellungenPage() {
  const [searchParams] = useSearchParams()
  const billingRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<UserType | null>(null)
  const [org, setOrg] = useState<OrgData | null>(null)
  const [standorte, setStandorte] = useState<Standort[]>([])
  const [loading, setLoading] = useState(true)
  const [billingPlan, setBillingPlan] = useState<BillingPlan | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [newStandort, setNewStandort] = useState({
    name: '',
    strasse: '',
    hausnummer: '',
    plz: '',
    ort: '',
    gebaeude: '',
    abteilung: '',
    etage: '',
    beschreibung: '',
  })
  const [showStandortForm, setShowStandortForm] = useState(false)
  const [editingStandort, setEditingStandort] = useState<Standort | null>(null)
  const [showStandortModal, setShowStandortModal] = useState(false)

  // Firmendaten form
  const [firmaForm, setFirmaForm] = useState({
    name: '', strasse: '', plz: '', ort: '', telefon: '', email: '', branche: '',
    verantwortlicher_name: '', verantwortlicher_email: '', verantwortlicher_telefon: '',
    logo_url: '' as string | null,
  })
  const [firmaSaving, setFirmaSaving] = useState(false)
  const [firmaSaved, setFirmaSaved] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Berufe config
  const [berufe, setBerufe] = useState<string[]>([])
  const [newBeruf, setNewBeruf] = useState('')
  const [berufeSaving, setBerufeSaving] = useState(false)

  // Abteilungen config
  const [abteilungenList, setAbteilungenList] = useState<{ id: string; name: string }[]>([])
  const [newAbteilung, setNewAbteilung] = useState('')

  // Sidebar config
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig>(loadSidebarConfig)

  // Tour toggle re-render trigger
  const [, setTourToggle] = useState(false)

  // Audit log
  interface AuditEntry {
    id: string
    user_name: string
    aktion: string
    entitaet: string
    entitaet_id: string
    entitaet_name: string | null
    aenderungen: Record<string, { alt: string; neu: string }> | null
    created_at: string
  }
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)

  const loadData = () => {
    Promise.all([
      api.get('/auth/me'),
      api.get('/standorte'),
      api.get('/organisation'),
      api.get('/organisation/berufe').catch(() => ({ data: [] })),
      api.get('/billing/plan').catch(() => ({ data: null })),
      api.get('/mitarbeiter/abteilungen').catch(() => ({ data: [] })),
    ])
      .then(([userRes, stRes, orgRes, berufeRes, billingRes, abtRes]) => {
        setUser(userRes.data)
        setStandorte(stRes.data)
        setOrg(orgRes.data)
        setBerufe(berufeRes.data || [])
        setBillingPlan(billingRes.data)
        setAbteilungenList(abtRes.data || [])
        setFirmaForm({
          name: orgRes.data.name || '',
          strasse: orgRes.data.strasse || '',
          plz: orgRes.data.plz || '',
          ort: orgRes.data.ort || '',
          telefon: orgRes.data.telefon || '',
          email: orgRes.data.email || '',
          branche: orgRes.data.branche || '',
          verantwortlicher_name: orgRes.data.verantwortlicher_name || '',
          verantwortlicher_email: orgRes.data.verantwortlicher_email || '',
          verantwortlicher_telefon: orgRes.data.verantwortlicher_telefon || '',
          logo_url: orgRes.data.logo_url || null,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const res = await api.get('/audit-log?limit=50')
      setAuditLogs(res.data)
    } catch (err) {
      console.error('Error loading audit log:', err)
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Auto-scroll zu Billing-Tab wenn URL-Parameter gesetzt
  useEffect(() => {
    if (searchParams.get('tab') === 'billing' && billingRef.current) {
      setTimeout(() => {
        billingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [searchParams])

  // --- Standorte ---
  const addStandort = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStandort.name) return
    if (editingStandort) {
      await api.put(`/standorte/${editingStandort.id}`, newStandort)
    } else {
      await api.post('/standorte', newStandort)
    }
    resetStandortForm()
    loadData()
  }

  const resetStandortForm = () => {
    setNewStandort({
      name: '',
      strasse: '',
      hausnummer: '',
      plz: '',
      ort: '',
      gebaeude: '',
      abteilung: '',
      etage: '',
      beschreibung: '',
    })
    setEditingStandort(null)
    setShowStandortForm(false)
    setShowStandortModal(false)
  }

  const openStandortModal = (standort?: Standort) => {
    if (standort) {
      setEditingStandort(standort)
      setNewStandort({
        name: standort.name || '',
        strasse: standort.strasse || '',
        hausnummer: standort.hausnummer || '',
        plz: standort.plz || '',
        ort: standort.ort || '',
        gebaeude: standort.gebaeude || '',
        abteilung: standort.abteilung || '',
        etage: standort.etage || '',
        beschreibung: standort.beschreibung || '',
      })
    } else {
      resetStandortForm()
    }
    setShowStandortModal(true)
  }

  const deleteStandort = async (id: string) => {
    if (!confirm('Standort wirklich löschen?')) return
    await api.delete(`/standorte/${id}`)
    loadData()
  }

  // --- Firmendaten ---
  const saveFirma = async (e: React.FormEvent) => {
    e.preventDefault()
    setFirmaSaving(true)
    setFirmaSaved(false)
    try {
      await api.put('/organisation', firmaForm)
      setFirmaSaved(true)
      setTimeout(() => setFirmaSaved(false), 2000)
    } catch {}
    setFirmaSaving(false)
  }

  // --- Logo upload ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 600 * 1024) {
      alert('Logo darf maximal 600 KB groß sein (PNG oder JPG)')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setFirmaForm(f => ({ ...f, logo_url: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  // --- Berufe ---
  const addBeruf = async () => {
    const trimmed = newBeruf.trim()
    if (!trimmed || berufe.includes(trimmed)) return
    const updated = [...berufe, trimmed]
    setBerufe(updated)
    setNewBeruf('')
    setBerufeSaving(true)
    try {
      await api.put('/organisation/berufe', { berufe: updated })
    } catch {
      setBerufe(berufe) // rollback
    } finally {
      setBerufeSaving(false)
    }
  }

  const removeBeruf = async (beruf: string) => {
    const updated = berufe.filter(b => b !== beruf)
    setBerufe(updated)
    try {
      await api.put('/organisation/berufe', { berufe: updated })
    } catch {
      setBerufe(berufe)
    }
  }

  // --- Abteilungen ---
  const addAbteilungSetting = async () => {
    const trimmed = newAbteilung.trim()
    if (!trimmed || abteilungenList.some(a => a.name === trimmed)) return
    try {
      const res = await api.post('/mitarbeiter/abteilungen', { name: trimmed })
      setAbteilungenList(prev => [...prev, res.data])
      setNewAbteilung('')
    } catch { /* ignore */ }
  }

  // --- Module Manager ---
  const isVisible = (id: string) => sidebarConfig.visibleIds.includes(id)

  const toggleModule = (id: string) => {
    const newConfig = { ...sidebarConfig }
    if (isVisible(id)) {
      newConfig.visibleIds = newConfig.visibleIds.filter(v => v !== id)
    } else {
      newConfig.visibleIds = [...newConfig.visibleIds, id]
    }
    setSidebarConfig(newConfig)
    saveSidebarConfig(newConfig)
    window.dispatchEvent(new Event('sidebar-config-changed'))
  }

  const moveModule = (id: string, direction: 'up' | 'down') => {
    const ids = [...sidebarConfig.visibleIds]
    const idx = ids.indexOf(id)
    if (idx === -1) return
    if (direction === 'up' && idx > 0) {
      [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    } else if (direction === 'down' && idx < ids.length - 1) {
      [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]]
    }
    const newConfig = { ...sidebarConfig, visibleIds: ids }
    setSidebarConfig(newConfig)
    saveSidebarConfig(newConfig)
    window.dispatchEvent(new Event('sidebar-config-changed'))
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Einstellungen</h1>
        <p className="text-sm text-gray-400 mt-1">Profil, Firma, Module und Standorte verwalten</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <User size={18} className="text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-black">Profil</h2>
            <p className="text-xs text-gray-400">Deine Kontoinformationen</p>
          </div>
        </div>
        {user && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">Name</span>
              <span className="text-sm text-black">{user.vorname} {user.nachname}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs text-gray-400">E-Mail</span>
              <span className="text-sm text-black">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-400">Rolle</span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                {user.rolle}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Firmendaten Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6" data-tour-page="firma">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Building size={18} className="text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-black">Firmendaten / Briefkopf</h2>
            <p className="text-xs text-gray-400">Werden auf Protokollen und Dokumenten angezeigt</p>
          </div>
        </div>
        <form onSubmit={saveFirma} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Firmenname *</label>
            <input
              type="text"
              value={firmaForm.name}
              onChange={e => setFirmaForm({ ...firmaForm, name: e.target.value })}
              required
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Straße + Hausnummer</label>
            <input
              type="text"
              value={firmaForm.strasse}
              onChange={e => setFirmaForm({ ...firmaForm, strasse: e.target.value })}
              placeholder="Musterstraße 123"
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">PLZ</label>
              <input
                type="text"
                value={firmaForm.plz}
                onChange={e => setFirmaForm({ ...firmaForm, plz: e.target.value })}
                placeholder="12345"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Ort</label>
              <input
                type="text"
                value={firmaForm.ort}
                onChange={e => setFirmaForm({ ...firmaForm, ort: e.target.value })}
                placeholder="Berlin"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
              <input
                type="text"
                value={firmaForm.telefon}
                onChange={e => setFirmaForm({ ...firmaForm, telefon: e.target.value })}
                placeholder="+49 30 123456"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-Mail</label>
              <input
                type="email"
                value={firmaForm.email}
                onChange={e => setFirmaForm({ ...firmaForm, email: e.target.value })}
                placeholder="info@firma.de"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Branche</label>
            <BranchenAutocomplete
              value={firmaForm.branche}
              onChange={(val) => setFirmaForm({ ...firmaForm, branche: val })}
              placeholder="Branche suchen..."
            />
            <p className="text-[10px] text-gray-400 mt-1">Die Branche beeinflusst Vorschläge in Dropdowns (Berufe, Kategorien, Dokumente)</p>
          </div>

          {/* Firmenlogo / Briefkopf */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Firmenlogo (Briefkopf)</h3>
            <p className="text-[10px] text-gray-400 mb-3">Das Logo erscheint automatisch im Briefkopf von Unterweisungsdokumenten. PNG oder JPG, max. 600 KB.</p>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-24 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {firmaForm.logo_url ? (
                  <img src={firmaForm.logo_url} alt="Firmenlogo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Image size={20} className="text-gray-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <Upload size={12} />
                  Logo hochladen
                </button>
                {firmaForm.logo_url && (
                  <button
                    type="button"
                    onClick={() => setFirmaForm(f => ({ ...f, logo_url: null }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-100 rounded-lg hover:bg-red-50 transition-colors text-red-500"
                  >
                    <X size={12} />
                    Entfernen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Verantwortlicher Ansprechpartner Section */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Verantwortlicher Ansprechpartner</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={firmaForm.verantwortlicher_name}
                onChange={e => setFirmaForm({ ...firmaForm, verantwortlicher_name: e.target.value })}
                placeholder="z.B. Max Mustermann"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={firmaForm.verantwortlicher_email}
                  onChange={e => setFirmaForm({ ...firmaForm, verantwortlicher_email: e.target.value })}
                  placeholder="kontakt@beispiel.de"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                <input
                  type="text"
                  value={firmaForm.verantwortlicher_telefon}
                  onChange={e => setFirmaForm({ ...firmaForm, verantwortlicher_telefon: e.target.value })}
                  placeholder="+49 30 123456"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={firmaSaving}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              <Save size={14} />
              {firmaSaving ? 'Speichern...' : 'Speichern'}
            </button>
            {firmaSaved && (
              <span className="text-xs text-green-600 font-medium">Gespeichert!</span>
            )}
          </div>
        </form>
      </div>

      {/* Berufe / Jobbezeichnungen Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Briefcase size={18} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-black">Berufe / Jobbezeichnungen</h2>
            <p className="text-xs text-gray-400">Diese Berufe stehen bei Mitarbeitern und Unterweisungen zur Auswahl</p>
          </div>
          {berufeSaving && <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />}
        </div>

        {/* Existing berufe chips */}
        <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
          {berufe.length === 0 && (
            <span className="text-xs text-gray-300 italic">Noch keine Berufe angelegt</span>
          )}
          {berufe.map(b => (
            <div key={b} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg group">
              <span>{b}</span>
              <button
                onClick={() => removeBeruf(b)}
                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new beruf */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newBeruf}
            onChange={e => setNewBeruf(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBeruf() } }}
            placeholder="Neuen Beruf eingeben, z.B. Schlosser..."
            className="flex-1 px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
          />
          <button
            onClick={addBeruf}
            disabled={!newBeruf.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Plus size={14} />
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Abteilungen Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Building size={18} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-black">Abteilungen</h2>
            <p className="text-xs text-gray-400">Diese Abteilungen stehen bei Mitarbeitern zur Auswahl</p>
          </div>
        </div>

        {/* Existing abteilungen chips */}
        <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
          {abteilungenList.length === 0 && (
            <span className="text-xs text-gray-300 italic">Noch keine Abteilungen angelegt</span>
          )}
          {abteilungenList.map(a => (
            <div key={a.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg group">
              <span>{a.name}</span>
              <button
                onClick={async () => {
                  try {
                    await api.delete(`/mitarbeiter/abteilungen/${a.id}`)
                    setAbteilungenList(prev => prev.filter(x => x.id !== a.id))
                  } catch { /* ignore */ }
                }}
                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new abteilung */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newAbteilung}
            onChange={e => setNewAbteilung(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAbteilungSetting() } }}
            placeholder="Neue Abteilung eingeben, z.B. Produktion..."
            className="flex-1 px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
          />
          <button
            onClick={addAbteilungSetting}
            disabled={!newAbteilung.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Plus size={14} />
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Module Manager Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6" data-tour-page="module">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <LayoutGrid size={18} className="text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-black">Module verwalten</h2>
            <p className="text-xs text-gray-400">Seitenleiste anpassen — Module ein-/ausblenden und sortieren</p>
          </div>
        </div>

        <div className="space-y-1">
          {ALL_MODULES.map((mod) => {
            const visible = isVisible(mod.id)
            const Icon = mod.icon
            const idx = sidebarConfig.visibleIds.indexOf(mod.id)
            const sectionLabel = mod.section === 'pruefungen' ? 'Prüfungen' : 'Arbeitsschutz'

            return (
              <div
                key={mod.id}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  visible ? 'bg-white' : 'bg-gray-50 opacity-60'
                )}
              >
                {/* Icon */}
                <Icon size={16} className="text-gray-400 shrink-0" />

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{mod.label}</p>
                  <p className="text-[10px] text-gray-400">{sectionLabel}</p>
                </div>

                {/* Move up/down (only if visible) */}
                {visible && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveModule(mod.id, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => moveModule(mod.id, 'down')}
                      disabled={idx === sidebarConfig.visibleIds.length - 1}
                      className="p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-black disabled:opacity-20 disabled:hover:bg-transparent"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                )}

                {/* Toggle visibility */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className={clsx(
                    'p-1.5 rounded-lg transition-colors',
                    visible
                      ? 'text-green-500 hover:bg-green-50'
                      : 'text-gray-300 hover:bg-gray-100 hover:text-black'
                  )}
                  title={visible ? 'Ausblenden' : 'Einblenden'}
                >
                  {visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-gray-300 mt-3 px-3">
          Dashboard und Einstellungen sind immer sichtbar.
        </p>
      </div>

      {/* Guided Tour Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6" data-tour-page="tour-restart">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
              <RefreshCw size={18} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-black">Einführungstour</h2>
              <p className="text-xs text-gray-400">Die geführte Tour erklärt dir Schritt für Schritt alle Funktionen</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              onClick={() => { setTourEnabled(!isTourEnabled()); setTourToggle(prev => !prev) }}
              className={`relative w-11 h-6 rounded-full transition-colors ${isTourEnabled() ? 'bg-black' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isTourEnabled() ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs text-gray-600">{isTourEnabled() ? 'Tour aktiv' : 'Tour deaktiviert'}</span>
          </label>
          <button
            onClick={() => { resetTour(); setTourToggle(prev => !prev) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={14} />
            Neu starten
          </button>
        </div>
      </div>

      {/* Demo-Daten Card — Toggle-Style wie Einführungstour */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6" data-tour-page="demo-daten">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
              <Briefcase size={18} className="text-purple-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-black">Demo-Daten</h2>
              <p className="text-xs text-gray-400">Realistische Beispieldaten zum Ausprobieren — Arbeitsmittel, Prüfungen, Mängel, Mitarbeiter</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              onClick={async () => {
                // Prüfen ob Demo-Daten vorhanden (Standorte als Proxy)
                const hasData = standorte.length > 0
                if (hasData) {
                  if (!confirm('Alle Demo-Daten dieser Organisation löschen? Dies kann nicht rückgängig gemacht werden!')) return
                  try {
                    await api.post('/seed/demo-daten/loeschen')
                    window.location.reload()
                  } catch (e: any) {
                    alert(e?.response?.data?.detail || 'Fehler beim Löschen')
                  }
                } else {
                  try {
                    await api.post('/seed/demo-daten')
                    window.location.reload()
                  } catch (e: any) {
                    alert(e?.response?.data?.detail || 'Fehler beim Laden der Demo-Daten')
                  }
                }
              }}
              className={`relative w-11 h-6 rounded-full transition-colors ${(standorte.length > 0) ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(standorte.length > 0) ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs text-gray-600">
              {(standorte.length > 0) ? 'Demo-Daten geladen' : 'Demo-Daten deaktiviert'}
            </span>
          </label>
        </div>
      </div>

      {/* Audit-Log Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <History size={18} className="text-gray-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-black">Änderungsprotokoll</h2>
              <p className="text-xs text-gray-400">Alle Änderungen im System nachverfolgen</p>
            </div>
          </div>
          <button
            onClick={() => { setShowAuditLog(!showAuditLog); if (!showAuditLog && auditLogs.length === 0) loadAuditLogs() }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-black text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <History size={14} />
            {showAuditLog ? 'Ausblenden' : 'Protokoll anzeigen'}
          </button>
        </div>

        {showAuditLog && (
          <div>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Noch keine Änderungen protokolliert.</p>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {(() => {
                  // Group by date (Google Docs style)
                  const groups: Record<string, typeof auditLogs> = {}
                  auditLogs.forEach(log => {
                    const d = new Date(log.created_at)
                    const today = new Date()
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)
                    let label: string
                    if (d.toDateString() === today.toDateString()) {
                      label = 'Heute'
                    } else if (d.toDateString() === yesterday.toDateString()) {
                      label = 'Gestern'
                    } else if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
                      label = 'Diesen Monat'
                    } else {
                      label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
                    }
                    if (!groups[label]) groups[label] = []
                    groups[label].push(log)
                  })

                  const aktionLabels: Record<string, string> = {
                    erstellt: 'erstellt',
                    geaendert: 'bearbeitet',
                    geloescht: 'gelöscht',
                  }

                  // User color palette
                  const colors = ['#34A853', '#4285F4', '#FBBC04', '#EA4335', '#8E24AA', '#00ACC1']
                  const userColorMap: Record<string, string> = {}
                  let ci = 0
                  auditLogs.forEach(l => {
                    if (!userColorMap[l.user_name]) {
                      userColorMap[l.user_name] = colors[ci % colors.length]
                      ci++
                    }
                  })

                  return Object.entries(groups).map(([groupLabel, logs]) => (
                    <div key={groupLabel}>
                      <div className="px-3 pt-4 pb-2">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{groupLabel}</span>
                      </div>
                      <div className="space-y-0.5">
                        {logs.map(log => {
                          const d = new Date(log.created_at)
                          const dateStr = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
                          const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                          const userInitials = log.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          const userColor = userColorMap[log.user_name] || '#999'
                          const hasDetails = log.aenderungen && Object.keys(log.aenderungen).length > 0

                          return (
                            <div key={log.id} className="group">
                              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50/50 cursor-pointer transition-colors">
                                {/* Timeline dot */}
                                <div className="flex-shrink-0">
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                    style={{ backgroundColor: userColor }}
                                  >
                                    {userInitials}
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-medium text-black">{dateStr}, {timeStr}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    <span className="font-medium text-gray-700">{log.user_name}</span>
                                    {' hat '}
                                    <span className="font-medium text-gray-700">{log.entitaet}</span>
                                    {log.entitaet_name && <> „{log.entitaet_name}"</>}
                                    {' ' + (aktionLabels[log.aktion] || log.aktion)}
                                  </div>

                                  {/* Field changes (collapsed by default, expand on click) */}
                                  {hasDetails && (
                                    <div className="mt-1.5 pl-0.5 space-y-0.5">
                                      {Object.entries(log.aenderungen!).map(([field, change]) => (
                                        <div key={field} className="flex items-center gap-1.5 text-[11px]">
                                          <span className="text-gray-400 font-medium">{field}:</span>
                                          {change.alt && (
                                            <span className="text-red-400 line-through">{String(change.alt).slice(0, 30)}</span>
                                          )}
                                          <span className="text-gray-300">&rarr;</span>
                                          <span className="text-green-600 font-medium">{String(change.neu).slice(0, 30)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
            {auditLogs.length > 0 && (
              <div className="flex justify-center pt-3 mt-2 border-t border-gray-100">
                <button
                  onClick={loadAuditLogs}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors"
                >
                  <RefreshCw size={12} />
                  Aktualisieren
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Abonnement / Billing Card */}
      <div ref={billingRef} className="bg-white rounded-xl border border-gray-200 p-6 mb-6" data-tour-page="abonnement">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <CreditCard size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-black">Abonnement</h2>
            <p className="text-xs text-gray-400">Dein aktueller Plan und verfügbare Upgrades</p>
          </div>
        </div>

        {/* Current Plan Banner */}
        {billingLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {billingPlan && (
              <div className="bg-gradient-to-r from-gray-950 to-gray-800 text-white rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                      <Crown size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{billingPlan.name}</h3>
                      <span className="text-xs text-gray-400">Dein aktueller Plan</span>
                    </div>
                  </div>
                  {billingPlan.trial_expires_at && (
                    <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full font-medium">
                      Testphase bis {new Date(billingPlan.trial_expires_at).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
                {billingPlan.limits && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-300">
                    {billingPlan.limits.arbeitsmittel && (
                      <span className="px-2.5 py-1 bg-white/5 rounded-lg">{billingPlan.limits.arbeitsmittel === 'unbegrenzt' ? 'Unbegrenzte' : billingPlan.limits.arbeitsmittel} Arbeitsmittel</span>
                    )}
                    {billingPlan.limits.benutzer && (
                      <span className="px-2.5 py-1 bg-white/5 rounded-lg">{billingPlan.limits.benutzer} Benutzer</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Plan Comparison */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Alle Pläne im Vergleich</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {(() => {
                // Preise konsistent mit /preise — Basic 29€, Standard 79€, Professional 149€, Enterprise 249€
                const plans = [
                  { name: 'Basic', preis: '29', subtitle: 'Für kleine Betriebe', icon: Zap, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', arbeitsmittel: '25 Mitarbeiter', pruefungen: 'Prüf-Manager', benutzer: '1', wasserzeichen: true, popular: false, upsaleHint: '' },
                  { name: 'Standard', preis: '79', subtitle: 'Für wachsende Teams', icon: Crown, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', arbeitsmittel: '75 Mitarbeiter', pruefungen: 'Prüf-Manager + Unterweisungen', benutzer: '5', wasserzeichen: true, popular: true, upsaleHint: 'Unterweisungen dokumentieren & nachweisen' },
                  { name: 'Professional', preis: '149', subtitle: 'Für mittlere Unternehmen', icon: Crown, iconBg: 'bg-green-100', iconColor: 'text-green-600', arbeitsmittel: '150 Mitarbeiter', pruefungen: '+ Gefährdungsbeurteilungen', benutzer: '15', wasserzeichen: false, popular: false, upsaleHint: 'Risikobewertung & Maßnahmen-Tracking' },
                  { name: 'Enterprise', preis: '249', subtitle: 'Für große Organisationen', icon: Crown, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', arbeitsmittel: '250+ Mitarbeiter', pruefungen: 'Alle Module + Gefahrstoffe-KI', benutzer: 'Unbegrenzt', wasserzeichen: false, popular: false, upsaleHint: 'KI-gestützte Gefahrstoff-Analyse & Fremdfirmen' },
                ]
                const currentPlanIndex = plans.findIndex(p => p.name === billingPlan?.name)

                return plans.map((plan, idx) => {
                  const isCurrent = billingPlan?.name === plan.name
                  const isUpgrade = idx > currentPlanIndex
                  const isDowngrade = idx < currentPlanIndex
                  const PlanIcon = plan.icon

                  return (
                    <div
                      key={plan.name}
                      className={clsx(
                        'relative rounded-xl border-2 p-5 transition-all flex flex-col',
                        isCurrent ? 'border-black ring-1 ring-black/5 bg-gray-50/50' : 'border-gray-200 hover:border-gray-300',
                        plan.popular && !isCurrent && 'border-purple-200 hover:border-purple-300'
                      )}
                    >
                      {/* Badge: Aktuell / Beliebt */}
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                          Dein Plan
                        </div>
                      )}
                      {plan.popular && !isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                          Beliebt
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1 mt-1">
                        <div className={`w-8 h-8 rounded-lg ${plan.iconBg} flex items-center justify-center`}>
                          <PlanIcon size={16} className={plan.iconColor} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-black">{plan.name}</h3>
                          <p className="text-[10px] text-gray-400">{plan.subtitle}</p>
                        </div>
                      </div>

                      {/* Preis */}
                      <div className="mb-3 mt-2">
                        <span className="text-2xl font-bold text-black">{plan.preis}€</span>
                        <span className="text-xs text-gray-400">/Monat</span>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-4 text-xs text-gray-600 flex-1">
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-green-500 flex-shrink-0" />
                          <span>{plan.arbeitsmittel}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-green-500 flex-shrink-0" />
                          <span>{plan.pruefungen}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-green-500 flex-shrink-0" />
                          <span>{plan.benutzer === 'Unbegrenzt' ? 'Unbegrenzt Benutzer' : plan.benutzer === '1' ? '1 Admin-Benutzer' : `bis ${plan.benutzer} Benutzer`}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          {plan.wasserzeichen ? (
                            <>
                              <X size={14} className="text-gray-300 flex-shrink-0" />
                              <span className="text-gray-400">PDF mit Wasserzeichen</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} className="text-green-500 flex-shrink-0" />
                              <span>PDF ohne Wasserzeichen</span>
                            </>
                          )}
                        </li>
                      </ul>

                      {/* Subtiler Upsale-Hint */}
                      {!isCurrent && isUpgrade && plan.upsaleHint && (
                        <p className="text-[10px] text-purple-500 mb-3 px-1 leading-relaxed">
                          {plan.upsaleHint}
                        </p>
                      )}

                      {/* Action Button */}
                      {isCurrent ? (
                        <button disabled className="w-full px-3 py-2.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg cursor-default">
                          Dein aktueller Plan
                        </button>
                      ) : isUpgrade ? (
                        <button
                          onClick={() => {
                            api.post('/billing/checkout', { plan: plan.name }).catch(err => alert(err?.response?.data?.detail || 'Fehler'))
                          }}
                          className={clsx(
                            'w-full px-3 py-2.5 text-xs font-medium rounded-lg transition-colors',
                            plan.popular
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-black text-white hover:bg-gray-800'
                          )}
                        >
                          Jetzt upgraden
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!confirm(`Möchtest du wirklich zum ${plan.name}-Plan wechseln? Du verlierst dabei ggf. Funktionen deines aktuellen Plans.`)) return
                            api.post('/billing/checkout', { plan: plan.name }).catch(err => alert(err?.response?.data?.detail || 'Fehler'))
                          }}
                          className="w-full px-3 py-2.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Wechseln
                        </button>
                      )}
                    </div>
                  )
                })
              })()}
            </div>

            {/* Manage Subscription */}
            {billingPlan && billingPlan.name !== 'Free' && (
              <div className="flex justify-center pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    api.post('/billing/portal').catch(err => alert(err?.response?.data?.detail || 'Fehler'))
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-black text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <CreditCard size={14} />
                  Rechnungen & Zahlungsmethode verwalten
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Standorte Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6" data-tour-page="standorte">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <MapPin size={18} className="text-gray-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-black">Standorte</h2>
              <p className="text-xs text-gray-400">{standorte.length} Standort{standorte.length !== 1 ? 'e' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => openStandortModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={14} />
            Hinzufügen
          </button>
        </div>

        {standorte.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Noch keine Standorte angelegt.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {standorte.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-black">{s.name}</p>
                  {s.strasse && <p className="text-xs text-gray-400">{s.strasse}{s.hausnummer ? ' ' + s.hausnummer : ''}</p>}
                  {(s.plz || s.ort) && <p className="text-xs text-gray-400">{s.plz} {s.ort}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openStandortModal(s)}
                    className="p-1.5 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => deleteStandort(s.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standort Modal */}
      {showStandortModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">
                {editingStandort ? 'Standort bearbeiten' : 'Neuer Standort'}
              </h3>
              <button
                onClick={() => resetStandortForm()}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addStandort} className="p-6 space-y-4">
              {/* Row 1: Name (full width) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="z.B. Hauptwerk Berlin"
                  value={newStandort.name}
                  onChange={e => setNewStandort({ ...newStandort, name: e.target.value })}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
              </div>

              {/* Row 2: Straße + Hausnummer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Straße</label>
                  <input
                    type="text"
                    placeholder="Musterstraße"
                    value={newStandort.strasse}
                    onChange={e => setNewStandort({ ...newStandort, strasse: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hausnummer</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={newStandort.hausnummer}
                    onChange={e => setNewStandort({ ...newStandort, hausnummer: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                </div>
              </div>

              {/* Row 3: PLZ + Ort */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">PLZ</label>
                  <input
                    type="text"
                    placeholder="10115"
                    value={newStandort.plz}
                    onChange={e => setNewStandort({ ...newStandort, plz: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ort</label>
                  <input
                    type="text"
                    placeholder="Berlin"
                    value={newStandort.ort}
                    onChange={e => setNewStandort({ ...newStandort, ort: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Gebäude + Abteilung */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Gebäude</label>
                  <input
                    type="text"
                    placeholder="z.B. Gebäude A"
                    value={newStandort.gebaeude}
                    onChange={e => setNewStandort({ ...newStandort, gebaeude: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Abteilung</label>
                  <input
                    type="text"
                    placeholder="z.B. Produktion"
                    value={newStandort.abteilung}
                    onChange={e => setNewStandort({ ...newStandort, abteilung: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Etage */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Etage</label>
                <input
                  type="text"
                  placeholder="z.B. 2. OG"
                  value={newStandort.etage}
                  onChange={e => setNewStandort({ ...newStandort, etage: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Beschreibung</label>
                <textarea
                  placeholder="Optionale Notizen zu diesem Standort..."
                  value={newStandort.beschreibung}
                  onChange={e => setNewStandort({ ...newStandort, beschreibung: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none resize-none h-20"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => resetStandortForm()}
                  className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Save size={14} />
                  {editingStandort ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
