/**
 * Schnellstart — Redesigned 4-step onboarding
 * Flow: Firmendaten → Standort anlegen → Branche wählen → Fertig
 * Makes workflow sense: users set up their company FIRST before anything else.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, ChevronRight, Building2, MapPin, Search, Rocket,
  ArrowRight, Plus, Trash2,
} from 'lucide-react'
import api from '@/lib/api'
import { BranchenAutocomplete } from '@/components/ui/BranchenAutocomplete'
import { BRANCHEN } from '@/config/branchen'
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

export function SchnellstartPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)

  // Step 1: Firmendaten
  const [firmenname, setFirmenname] = useState('')
  const [strasse, setStrasse] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [telefon, setTelefon] = useState('')
  const [verantwortlicher, setVerantwortlicher] = useState('')

  // Step 2: Standorte
  const [standorte, setStandorte] = useState<{ name: string; ort: string; gebaeude: string }[]>([
    { name: '', ort: '', gebaeude: '' },
  ])

  // Step 3: Branche
  const [branche, setBranche] = useState('')

  // Step 4: Summary
  const [saving, setSaving] = useState(false)
  const [savedStandorte, setSavedStandorte] = useState(0)

  useEffect(() => {
    loadExistingData()
  }, [])

  const loadExistingData = async () => {
    try {
      const res = await api.get('/organisation')
      const org = res.data
      setFirmenname(org.name || '')
      setStrasse(org.strasse || '')
      setPlz(org.plz || '')
      setOrt(org.ort || '')
      setTelefon(org.telefon || '')
      setVerantwortlicher(org.verantwortlicher_name || '')
      if (org.branche) setBranche(org.branche)
    } catch { /* new org, ignore */ }
    setLoading(false)
  }

  const handleSaveFirmendaten = async () => {
    setSaving(true)
    try {
      await api.patch('/organisation', {
        name: firmenname.trim(),
        strasse: strasse.trim() || undefined,
        plz: plz.trim() || undefined,
        ort: ort.trim() || undefined,
        telefon: telefon.trim() || undefined,
        verantwortlicher_name: verantwortlicher.trim() || undefined,
      })
    } catch {
      // API-Fehler ignorieren — Daten können später in Einstellungen nachgetragen werden
    }
    // Immer zum nächsten Schritt weiter, auch bei API-Fehler
    setStep(2)
    setSaving(false)
  }

  const handleSaveStandorte = async () => {
    setSaving(true)
    let count = 0
    try {
      for (const s of standorte) {
        if (!s.name.trim()) continue
        try {
          await api.post('/standorte', {
            name: s.name.trim(),
            ort: s.ort.trim() || undefined,
            gebaeude: s.gebaeude.trim() || undefined,
          })
          count++
        } catch { /* einzelnen Standort-Fehler ignorieren */ }
      }
    } catch { /* ignore */ }
    setSavedStandorte(count)
    setStep(3)
    setSaving(false)
  }

  const handleSaveBranche = async () => {
    setSaving(true)
    try {
      await api.patch('/organisation', { branche: branche || null })
      if (branche) {
        try { await api.post('/seed/branchen-checklisten') } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    setStep(4)
    setSaving(false)
  }

  const addStandort = () => {
    setStandorte(prev => [...prev, { name: '', ort: '', gebaeude: '' }])
  }

  const removeStandort = (idx: number) => {
    setStandorte(prev => prev.filter((_, i) => i !== idx))
  }

  const updateStandort = (idx: number, field: string, value: string) => {
    setStandorte(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const handleSkip = () => navigate('/dashboard')

  const steps = [
    { num: 1, label: 'Firmendaten' },
    { num: 2, label: 'Standorte' },
    { num: 3, label: 'Branche' },
    { num: 4, label: 'Fertig' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Rocket className="text-white" size={22} />
          </div>
          <h1 className="text-2xl font-bold text-black">Willkommen bei PrüfPilot</h1>
          <p className="text-sm text-gray-400 mt-1">Richte dein Unternehmen ein — in wenigen Schritten</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step > s.num ? 'bg-green-500 text-white' :
                step === s.num ? 'bg-black text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {step > s.num ? <Check size={12} /> : s.num}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step === s.num ? 'text-black' : 'text-gray-400'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <ChevronRight size={12} className="text-gray-300 mx-0.5" />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <LeitfadenTooltip
          section="schnellstart.setup"
          title={LEITFADEN_TEXTE['schnellstart.setup'].title}
          description={LEITFADEN_TEXTE['schnellstart.setup'].description}
          position="top"
        >
          <div className="bg-white rounded-2xl border border-gray-200 p-8">

          {/* ───── Step 1: Firmendaten ───── */}
          {step === 1 && (
            <>
              <div className="text-center mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Building2 className="text-blue-600" size={20} />
                </div>
                <h2 className="text-lg font-semibold text-black">Firmendaten</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Grundlegende Informationen zu deinem Unternehmen.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Firmenname *"
                  value={firmenname}
                  onChange={e => setFirmenname(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
                <input
                  type="text"
                  placeholder="Straße + Hausnummer"
                  value={strasse}
                  onChange={e => setStrasse(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="PLZ"
                    value={plz}
                    onChange={e => setPlz(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Ort"
                    value={ort}
                    onChange={e => setOrt(e.target.value)}
                    className="col-span-2 w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Telefon"
                  value={telefon}
                  onChange={e => setTelefon(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
                <input
                  type="text"
                  placeholder="Verantwortliche Person (Arbeitsschutz)"
                  value={verantwortlicher}
                  onChange={e => setVerantwortlicher(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Überspringen
                </button>
                <button
                  onClick={handleSaveFirmendaten}
                  disabled={saving || !firmenname.trim()}
                  className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Weiter <ArrowRight size={14} /></>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ───── Step 2: Standorte ───── */}
          {step === 2 && (
            <>
              <div className="text-center mb-6">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MapPin className="text-green-600" size={20} />
                </div>
                <h2 className="text-lg font-semibold text-black">Standorte anlegen</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Wo befinden sich deine Betriebsstätten? Mindestens ein Standort wird benötigt.
                </p>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto">
                {standorte.map((s, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-400 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder="Standortname *  (z.B. Hauptwerk, Lager Süd)"
                        value={s.name}
                        onChange={e => updateStandort(idx, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                      />
                      {standorte.length > 1 && (
                        <button
                          onClick={() => removeStandort(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-7">
                      <input
                        type="text"
                        placeholder="Ort/Stadt"
                        value={s.ort}
                        onChange={e => updateStandort(idx, 'ort', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Gebäude/Halle"
                        value={s.gebaeude}
                        onChange={e => updateStandort(idx, 'gebaeude', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addStandort}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mt-3 px-1 transition-colors"
              >
                <Plus size={14} /> Weiteren Standort hinzufügen
              </button>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={handleSaveStandorte}
                  disabled={saving || !standorte.some(s => s.name.trim())}
                  className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Weiter <ArrowRight size={14} /></>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ───── Step 3: Branche wählen ───── */}
          {step === 3 && (
            <>
              <div className="text-center mb-6">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Search className="text-purple-600" size={20} />
                </div>
                <h2 className="text-lg font-semibold text-black">Branche wählen</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Tippe einen Begriff ein — wir schlagen passende Branchen vor.
                  <br />
                  <span className="text-gray-300">z.B. "CNC", "Pflege", "Bau", "Küche"</span>
                </p>
              </div>

              <BranchenAutocomplete
                value={branche}
                onChange={setBranche}
              />

              {branche && BRANCHEN[branche] && (
                <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Vorbereitete Vorlagen:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Checklisten', 'Arbeitsmittel', 'Unterweisungen', 'Gefahrstoffe'].map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-xs text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {BRANCHEN[branche].arbeitsmittelTypen.length} Arbeitsmittel-Typen,{' '}
                    {BRANCHEN[branche].checklistenKategorien.length} Checklisten-Kategorien,{' '}
                    {BRANCHEN[branche].gefahrstoffe.length} Gefahrstoffe voreingestellt.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={handleSaveBranche}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>{branche ? 'Weiter' : 'Ohne Branche fortfahren'} <ArrowRight size={14} /></>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ───── Step 4: Fertig ───── */}
          {step === 4 && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Check className="text-green-600" size={28} />
                </div>
                <h2 className="text-xl font-bold text-black">Alles eingerichtet!</h2>
                <p className="text-sm text-gray-400 mt-2">
                  Dein Unternehmen ist startklar.
                </p>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                    <Check size={13} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">{firmenname}</p>
                    <p className="text-xs text-gray-400">Firmendaten gespeichert</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                    <Check size={13} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">{savedStandorte} Standort{savedStandorte !== 1 ? 'e' : ''}</p>
                    <p className="text-xs text-gray-400">Betriebsstätten angelegt</p>
                  </div>
                </div>
                {branche && BRANCHEN[branche] && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                      <Check size={13} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">{BRANCHEN[branche].label}</p>
                      <p className="text-xs text-gray-400">Branchenvorlagen aktiviert</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  Zum Dashboard <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => navigate('/arbeitsmittel')}
                  className="w-full py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Gleich Arbeitsmittel erfassen
                </button>
              </div>
            </>
          )}
          </div>
        </LeitfadenTooltip>

        <p className="text-center text-xs text-gray-300 mt-6">
          Du kannst alles jederzeit in den Einstellungen ändern.
        </p>
      </div>
    </div>
  )
}
