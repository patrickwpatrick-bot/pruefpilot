/**
 * PrüfScreen — Step-by-step inspection execution
 * The core feature of PrüfPilot
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle, ArrowLeft, Lock, ChevronRight, FileDown, Camera } from 'lucide-react'
import api from '@/lib/api'
import type { Pruefung, PruefPunkt } from '@/types'
import { SignaturPad } from '@/components/ui/SignaturPad'
import { KameraCapture } from '@/components/ui/KameraCapture'

type Ergebnis = 'ok' | 'mangel' | 'nicht_anwendbar' | 'offen'

interface ChecklistenPunktInfo {
  id: string
  text: string
  kategorie: string | null
  hinweis: string | null
  ist_pflicht: boolean
}

export function PruefScreen() {
  const { pruefungId } = useParams<{ pruefungId: string }>()
  const navigate = useNavigate()
  const [pruefung, setPruefung] = useState<Pruefung | null>(null)
  const [checkPunkte, setCheckPunkte] = useState<ChecklistenPunktInfo[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAbschluss, setShowAbschluss] = useState(false)
  const [mangelForm, setMangelForm] = useState({ beschreibung: '', schweregrad: 'orange' })
  const [showMangelForm, setShowMangelForm] = useState(false)
  const [showKamera, setShowKamera] = useState(false)
  const [mangelFotos, setMangelFotos] = useState<Record<string, string[]>>({})

  const loadPruefung = async () => {
    try {
      const res = await api.get(`/pruefungen/${pruefungId}`)
      setPruefung(res.data)

      // Load checklist items
      const clRes = await api.get('/checklisten')
      const cl = clRes.data.find((c: any) => c.id === res.data.checkliste_id)
      if (cl) {
        setCheckPunkte(cl.punkte)
      }
    } catch {
      navigate('/pruefungen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPruefung() }, [pruefungId])

  const currentPunkt = pruefung?.pruef_punkte[currentIdx]
  const checkInfo = currentPunkt
    ? checkPunkte.find(cp => cp.id === currentPunkt.checklisten_punkt_id)
    : null

  const handleBewertung = async (ergebnis: Ergebnis) => {
    if (!currentPunkt || !pruefung) return
    setSaving(true)
    try {
      await api.put(`/pruefungen/${pruefung.id}/punkte/${currentPunkt.id}`, {
        ergebnis,
        bemerkung: null,
      })

      // If mangel, show mangel form
      if (ergebnis === 'mangel') {
        setShowMangelForm(true)
        // Update local state
        const updated = { ...pruefung }
        updated.pruef_punkte = updated.pruef_punkte.map(p =>
          p.id === currentPunkt.id ? { ...p, ergebnis } : p
        )
        setPruefung(updated)
      } else {
        // Update local state and advance
        const updated = { ...pruefung }
        updated.pruef_punkte = updated.pruef_punkte.map(p =>
          p.id === currentPunkt.id ? { ...p, ergebnis } : p
        )
        setPruefung(updated)
        if (currentIdx < pruefung.pruef_punkte.length - 1) {
          setCurrentIdx(currentIdx + 1)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleMangelSubmit = async () => {
    if (!pruefung || !currentPunkt) return
    setSaving(true)
    try {
      await api.post(`/pruefungen/${pruefung.id}/maengel`, {
        pruef_punkt_id: currentPunkt.id,
        beschreibung: mangelForm.beschreibung,
        schweregrad: mangelForm.schweregrad,
      })
      setShowMangelForm(false)
      setMangelForm({ beschreibung: '', schweregrad: 'orange' })
      // Reload and advance
      await loadPruefung()
      if (currentIdx < pruefung.pruef_punkte.length - 1) {
        setCurrentIdx(currentIdx + 1)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAbschliessen = async (name: string, bemerkung: string, signaturDataUrl?: string | null) => {
    if (!pruefung) return
    setSaving(true)
    try {
      await api.put(`/pruefungen/${pruefung.id}/abschliessen`, {
        unterschrift_name: name,
        unterschrift_url: signaturDataUrl || null,
        bemerkung: bemerkung || null,
      })
      navigate('/pruefungen')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Fehler beim Abschließen')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (!pruefung) return null

  const totalPunkte = pruefung.pruef_punkte.length
  const bewertete = pruefung.pruef_punkte.filter(p => p.ergebnis !== 'offen').length
  const progress = totalPunkte > 0 ? (bewertete / totalPunkte) * 100 : 0
  const alleBewertet = bewertete === totalPunkte

  if (pruefung.ist_abgeschlossen) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <Lock className="mx-auto text-gray-300 mb-4" size={40} />
          <h2 className="text-lg font-bold text-black mb-2">Prüfung abgeschlossen</h2>
          <p className="text-sm text-gray-400 mb-6">Diese Prüfung ist gesperrt und kann nicht mehr bearbeitet werden.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-600">
            <CheckCircle2 size={16} />
            {pruefung.ergebnis === 'bestanden' ? 'Bestanden' :
             pruefung.ergebnis === 'maengel' ? 'Mit Mängeln' : 'Gesperrt'}
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={() => navigate('/pruefungen')}
              className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
              Zurück zu Prüfungen
            </button>
            <button
              onClick={() => {
                const token = localStorage.getItem('access_token')
                fetch(`/api/v1/pruefungen/${pruefungId}/pdf`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then(r => r.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `Pruefprotokoll_${pruefungId}.pdf`
                    a.click()
                    URL.revokeObjectURL(url)
                  })
              }}
              className="px-5 py-2.5 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FileDown size={16} />
              PDF-Protokoll
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={() => navigate('/pruefungen')} className="p-1 text-gray-400 hover:text-black">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-black">Prüfung</p>
            <p className="text-xs text-gray-400">{bewertete} / {totalPunkte} Punkte</p>
          </div>
          <div className="w-8" />
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-black rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        {/* Point indicator dots */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {pruefung.pruef_punkte.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrentIdx(i)}
              className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                i === currentIdx ? 'ring-2 ring-black ring-offset-1' : ''
              } ${
                p.ergebnis === 'ok' ? 'bg-green-100 text-green-600' :
                p.ergebnis === 'mangel' ? 'bg-red-100 text-red-600' :
                p.ergebnis === 'nicht_anwendbar' ? 'bg-gray-100 text-gray-400' :
                'bg-gray-50 text-gray-400'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current check item card */}
        {checkInfo && currentPunkt && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-400">Punkt {currentIdx + 1} von {totalPunkte}</span>
              {checkInfo.kategorie && (
                <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">{checkInfo.kategorie}</span>
              )}
            </div>
            <p className="text-base font-medium text-black mt-3 mb-2">{checkInfo.text}</p>
            {checkInfo.hinweis && (
              <p className="text-xs text-gray-400 mb-4">{checkInfo.hinweis}</p>
            )}

            {/* Current result indicator */}
            {currentPunkt.ergebnis !== 'offen' && (
              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mb-4 ${
                currentPunkt.ergebnis === 'ok' ? 'bg-green-50 text-green-600' :
                currentPunkt.ergebnis === 'mangel' ? 'bg-red-50 text-red-600' :
                'bg-gray-50 text-gray-500'
              }`}>
                {currentPunkt.ergebnis === 'ok' ? 'OK' :
                 currentPunkt.ergebnis === 'mangel' ? 'Mangel' : 'N/A'}
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <button
                onClick={() => handleBewertung('ok')}
                disabled={saving}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  currentPunkt.ergebnis === 'ok'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <CheckCircle2 size={28} className="text-green-500" />
                <span className="text-xs font-medium text-green-700">OK</span>
              </button>

              <button
                onClick={() => handleBewertung('mangel')}
                disabled={saving}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  currentPunkt.ergebnis === 'mangel'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-100 hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <XCircle size={28} className="text-red-500" />
                <span className="text-xs font-medium text-red-700">Mangel</span>
              </button>

              <button
                onClick={() => handleBewertung('nicht_anwendbar')}
                disabled={saving}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  currentPunkt.ergebnis === 'nicht_anwendbar'
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <MinusCircle size={28} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">N/A</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30"
          >
            Zurück
          </button>
          {currentIdx < totalPunkte - 1 ? (
            <button
              onClick={() => setCurrentIdx(currentIdx + 1)}
              className="flex-1 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
            >
              Weiter <ChevronRight size={14} />
            </button>
          ) : alleBewertet ? (
            <button
              onClick={() => setShowAbschluss(true)}
              className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
            >
              <Lock size={14} /> Abschließen
            </button>
          ) : (
            <button disabled
              className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
            >
              Noch {totalPunkte - bewertete} offen
            </button>
          )}
        </div>

        {/* Mängel list */}
        {pruefung.maengel.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
              Erfasste Mängel ({pruefung.maengel.length})
            </h3>
            <div className="space-y-2">
              {pruefung.maengel.map(m => (
                <div key={m.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                  <AlertTriangle size={14} className={
                    m.schweregrad === 'rot' ? 'text-red-500 mt-0.5' :
                    m.schweregrad === 'orange' ? 'text-amber-500 mt-0.5' :
                    'text-green-500 mt-0.5'
                  } />
                  <p className="text-sm text-black">{m.beschreibung}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mangel Form Modal */}
      {showMangelForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Mangel erfassen</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Beschreibung *</label>
                <textarea
                  value={mangelForm.beschreibung}
                  onChange={e => setMangelForm({ ...mangelForm, beschreibung: e.target.value })}
                  rows={3}
                  placeholder="Was ist der Mangel?"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Schweregrad</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'gruen', label: 'Gering', color: 'green' },
                    { key: 'orange', label: 'Mittel', color: 'amber' },
                    { key: 'rot', label: 'Kritisch', color: 'red' },
                  ].map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setMangelForm({ ...mangelForm, schweregrad: s.key })}
                      className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                        mangelForm.schweregrad === s.key
                          ? s.color === 'green' ? 'border-green-500 bg-green-50 text-green-700' :
                            s.color === 'amber' ? 'border-amber-500 bg-amber-50 text-amber-700' :
                            'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-100 text-gray-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowKamera(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Foto aufnehmen
              </button>
              {mangelFotos[checkPunkte[currentIdx]?.id]?.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {mangelFotos[checkPunkte[currentIdx]?.id].map((foto, i) => (
                    <img key={i} src={foto} alt={`Foto ${i+1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  ))}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowMangelForm(false); setMangelForm({ beschreibung: '', schweregrad: 'orange' }) }}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500"
                >
                  Überspringen
                </button>
                <button
                  onClick={handleMangelSubmit}
                  disabled={!mangelForm.beschreibung || saving}
                  className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
                >
                  Mangel speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KameraCapture Modal */}
      {showKamera && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-4">
            <KameraCapture
              onCapture={(imageUrl) => {
                const punktId = checkPunkte[currentIdx]?.id
                if (punktId) {
                  setMangelFotos(prev => ({
                    ...prev,
                    [punktId]: [...(prev[punktId] || []), imageUrl]
                  }))
                }
                setShowKamera(false)
              }}
              onCancel={() => setShowKamera(false)}
            />
          </div>
        </div>
      )}

      {/* Abschluss Modal */}
      {showAbschluss && (
        <AbschlussModal
          onClose={() => setShowAbschluss(false)}

          onSubmit={handleAbschliessen}
          saving={saving}
          maengelCount={pruefung.maengel.length}
        />
      )}
    </div>
  )
}

function AbschlussModal({
  onClose, onSubmit, saving, maengelCount,
}: {
  onClose: () => void
  onSubmit: (name: string, bemerkung: string, signaturDataUrl?: string | null) => void
  saving: boolean
  maengelCount: number
}) {
  const [name, setName] = useState('')
  const [bemerkung, setBemerkung] = useState('')
  const [signaturDataUrl, setSignaturDataUrl] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-black mb-1">Prüfung abschließen</h3>
        <p className="text-xs text-gray-400 mb-4">
          Nach dem Abschluss kann die Prüfung nicht mehr geändert werden (Revisionssicherheit).
        </p>

        {maengelCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium mb-4">
            <AlertTriangle size={14} />
            {maengelCount} Mangel/Mängel erfasst
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Prüfer (Name) *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ihr vollständiger Name"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Digitale Unterschrift</label>
            <SignaturPad onSignature={setSignaturDataUrl} width={360} height={120} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bemerkung (optional)</label>
            <textarea
              value={bemerkung}
              onChange={e => setBemerkung(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500">
              Abbrechen
            </button>
            <button
              onClick={() => onSubmit(name, bemerkung, signaturDataUrl)}
              disabled={!name || saving}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-1"
            >
              <Lock size={14} /> Abschließen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
