/**
 * PrüfScreen — Step-by-step inspection execution
 * The core feature of PrüfPilot
 */
import { useEffect, useReducer, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle, ArrowLeft, Lock, FileDown, Camera } from 'lucide-react'
import api from '@/lib/api'
import type { Pruefung } from '@/types'
import { SignaturPad } from '@/components/ui/SignaturPad'
import { KameraCapture } from '@/components/ui/KameraCapture'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'

type Ergebnis = 'ok' | 'mangel' | 'nicht_anwendbar' | 'offen'

interface ChecklistenPunktInfo {
  id: string
  text: string
  kategorie: string | null
  hinweis: string | null
  ist_pflicht: boolean
}

interface PruefScreenState {
  pruefung: Pruefung | null
  checkPunkte: ChecklistenPunktInfo[]
  currentIdx: number
  loading: boolean
  saving: boolean
  showAbschluss: boolean
  mangelForm: { beschreibung: string; schweregrad: string }
  showMangelForm: boolean
  showKamera: boolean
  mangelFotos: Record<string, string[]>
}

type PruefScreenAction =
  | { type: 'SET_PRUEFUNG'; payload: Pruefung }
  | { type: 'SET_CHECK_PUNKTE'; payload: ChecklistenPunktInfo[] }
  | { type: 'SET_CURRENT_IDX'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_SHOW_ABSCHLUSS'; payload: boolean }
  | { type: 'SET_MANGEL_FORM'; payload: { beschreibung: string; schweregrad: string } }
  | { type: 'SET_SHOW_MANGEL_FORM'; payload: boolean }
  | { type: 'SET_SHOW_KAMERA'; payload: boolean }
  | { type: 'ADD_MANGEL_FOTO'; payload: { punktId: string; fotoUrl: string } }
  | { type: 'LOAD_COMPLETE'; payload: { pruefung: Pruefung; checkPunkte: ChecklistenPunktInfo[] } }
  | { type: 'UPDATE_PRUEFUNG'; payload: Pruefung }

const initialState: PruefScreenState = {
  pruefung: null,
  checkPunkte: [],
  currentIdx: 0,
  loading: true,
  saving: false,
  showAbschluss: false,
  mangelForm: { beschreibung: '', schweregrad: 'orange' },
  showMangelForm: false,
  showKamera: false,
  mangelFotos: {},
}

function pruefScreenReducer(state: PruefScreenState, action: PruefScreenAction): PruefScreenState {
  switch (action.type) {
    case 'SET_PRUEFUNG':
      return { ...state, pruefung: action.payload }
    case 'SET_CHECK_PUNKTE':
      return { ...state, checkPunkte: action.payload }
    case 'SET_CURRENT_IDX':
      return { ...state, currentIdx: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_SAVING':
      return { ...state, saving: action.payload }
    case 'SET_SHOW_ABSCHLUSS':
      return { ...state, showAbschluss: action.payload }
    case 'SET_MANGEL_FORM':
      return { ...state, mangelForm: action.payload }
    case 'SET_SHOW_MANGEL_FORM':
      return { ...state, showMangelForm: action.payload }
    case 'SET_SHOW_KAMERA':
      return { ...state, showKamera: action.payload }
    case 'ADD_MANGEL_FOTO':
      return {
        ...state,
        mangelFotos: {
          ...state.mangelFotos,
          [action.payload.punktId]: [...(state.mangelFotos[action.payload.punktId] || []), action.payload.fotoUrl],
        },
      }
    case 'LOAD_COMPLETE':
      return { ...state, pruefung: action.payload.pruefung, checkPunkte: action.payload.checkPunkte, loading: false }
    case 'UPDATE_PRUEFUNG':
      return { ...state, pruefung: action.payload }
    default:
      return state
  }
}

export function PruefScreen() {
  const { pruefungId } = useParams<{ pruefungId: string }>()
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(pruefScreenReducer, initialState)

  const loadPruefung = async () => {
    try {
      const res = await api.get(`/pruefungen/${pruefungId}`)

      // Load checklist items
      const clRes = await api.get('/checklisten')
      const cl = clRes.data.find((c: any) => c.id === res.data.checkliste_id)
      const checkPunkte = cl ? cl.punkte : []

      dispatch({ type: 'LOAD_COMPLETE', payload: { pruefung: res.data, checkPunkte } })
    } catch {
      navigate('/pruefungen')
    }
  }

  useEffect(() => { loadPruefung() }, [pruefungId])

  const currentPunkt = state.pruefung?.pruef_punkte[state.currentIdx]
  const checkInfo = currentPunkt
    ? state.checkPunkte.find(cp => cp.id === currentPunkt.checklisten_punkt_id)
    : null

  const handleBewertung = async (ergebnis: Ergebnis) => {
    if (!currentPunkt || !state.pruefung) return
    dispatch({ type: 'SET_SAVING', payload: true })
    try {
      await api.put(`/pruefungen/${state.pruefung.id}/punkte/${currentPunkt.id}`, {
        ergebnis,
        bemerkung: null,
      })

      // Update local state
      const updated = { ...state.pruefung }
      updated.pruef_punkte = updated.pruef_punkte.map(p =>
        p.id === currentPunkt.id ? { ...p, ergebnis } : p
      )
      dispatch({ type: 'UPDATE_PRUEFUNG', payload: updated })

      // If mangel, show mangel form
      if (ergebnis === 'mangel') {
        dispatch({ type: 'SET_SHOW_MANGEL_FORM', payload: true })
      } else {
        if (state.currentIdx < state.pruefung.pruef_punkte.length - 1) {
          dispatch({ type: 'SET_CURRENT_IDX', payload: state.currentIdx + 1 })
        }
      }
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }

  const handleMangelSubmit = async () => {
    if (!state.pruefung || !currentPunkt) return
    dispatch({ type: 'SET_SAVING', payload: true })
    try {
      await api.post(`/pruefungen/${state.pruefung.id}/maengel`, {
        pruef_punkt_id: currentPunkt.id,
        beschreibung: state.mangelForm.beschreibung,
        schweregrad: state.mangelForm.schweregrad,
      })
      dispatch({ type: 'SET_SHOW_MANGEL_FORM', payload: false })
      dispatch({ type: 'SET_MANGEL_FORM', payload: { beschreibung: '', schweregrad: 'orange' } })
      // Reload and advance
      await loadPruefung()
      if (state.currentIdx < state.pruefung.pruef_punkte.length - 1) {
        dispatch({ type: 'SET_CURRENT_IDX', payload: state.currentIdx + 1 })
      }
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }

  const handleAbschliessen = async (name: string, bemerkung: string, signaturDataUrl?: string | null) => {
    if (!state.pruefung) return
    dispatch({ type: 'SET_SAVING', payload: true })
    try {
      await api.put(`/pruefungen/${state.pruefung.id}/abschliessen`, {
        unterschrift_name: name,
        unterschrift_url: signaturDataUrl || null,
        bemerkung: bemerkung || null,
      })
      navigate('/pruefungen')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Fehler beim Abschließen')
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }

  if (state.loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!state.pruefung) return null

  const totalPunkte = state.pruefung.pruef_punkte.length
  const bewertete = state.pruefung.pruef_punkte.filter(p => p.ergebnis !== 'offen').length
  const progress = totalPunkte > 0 ? (bewertete / totalPunkte) * 100 : 0
  const alleBewertet = bewertete === totalPunkte

  if (state.pruefung.ist_abgeschlossen) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <Lock className="mx-auto text-gray-300 mb-4" size={40} />
          <h2 className="text-lg font-bold text-black mb-2">Prüfung abgeschlossen</h2>
          <p className="text-sm text-gray-400 mb-6">Diese Prüfung ist gesperrt und kann nicht mehr bearbeitet werden.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-600">
            <CheckCircle2 size={16} />
            {state.pruefung.ergebnis === 'bestanden' ? 'Bestanden' :
             state.pruefung.ergebnis === 'maengel' ? 'Mit Mängeln' : 'Gesperrt'}
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="primary" onClick={() => navigate('/pruefungen')}>
              Zurück zu Prüfungen
            </Button>
            <Button
              variant="secondary"
              icon={<FileDown size={16} />}
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
            >
              PDF-Protokoll
            </Button>
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
          {state.pruefung.pruef_punkte.map((p, i) => (
            <button
              key={p.id}
              onClick={() => dispatch({ type: 'SET_CURRENT_IDX', payload: i })}
              className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                i === state.currentIdx ? 'ring-2 ring-black ring-offset-1' : ''
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
              <span className="text-xs font-medium text-gray-400">Punkt {state.currentIdx + 1} von {totalPunkte}</span>
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
              <div
                onClick={() => handleBewertung('ok')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  currentPunkt.ergebnis === 'ok'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 hover:border-green-300 hover:bg-green-50/50'
                } ${state.saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CheckCircle2 size={28} className="text-green-500" />
                <span className="text-xs font-medium text-green-700">OK</span>
              </div>

              <div
                onClick={() => handleBewertung('mangel')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  currentPunkt.ergebnis === 'mangel'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-100 hover:border-red-300 hover:bg-red-50/50'
                } ${state.saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <XCircle size={28} className="text-red-500" />
                <span className="text-xs font-medium text-red-700">Mangel</span>
              </div>

              <div
                onClick={() => handleBewertung('nicht_anwendbar')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  currentPunkt.ergebnis === 'nicht_anwendbar'
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                } ${state.saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <MinusCircle size={28} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">N/A</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mb-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => dispatch({ type: 'SET_CURRENT_IDX', payload: Math.max(0, state.currentIdx - 1) })}
            disabled={state.currentIdx === 0}
          >
            Zurück
          </Button>
          {state.currentIdx < totalPunkte - 1 ? (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => dispatch({ type: 'SET_CURRENT_IDX', payload: state.currentIdx + 1 })}
            >
              Weiter
            </Button>
          ) : alleBewertet ? (
            <Button
              variant="primary"
              className="flex-1 bg-green-600 hover:bg-green-700"
              icon={<Lock size={14} />}
              onClick={() => dispatch({ type: 'SET_SHOW_ABSCHLUSS', payload: true })}
            >
              Abschließen
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled
              className="flex-1"
            >
              Noch {totalPunkte - bewertete} offen
            </Button>
          )}
        </div>

        {/* Mängel list */}
        {state.pruefung.maengel.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
              Erfasste Mängel ({state.pruefung.maengel.length})
            </h3>
            <div className="space-y-2">
              {state.pruefung.maengel.map(m => (
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
      <Modal
        open={state.showMangelForm}
        onClose={() => {
          dispatch({ type: 'SET_SHOW_MANGEL_FORM', payload: false })
          dispatch({ type: 'SET_MANGEL_FORM', payload: { beschreibung: '', schweregrad: 'orange' } })
        }}
        title="Mangel erfassen"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                dispatch({ type: 'SET_SHOW_MANGEL_FORM', payload: false })
                dispatch({ type: 'SET_MANGEL_FORM', payload: { beschreibung: '', schweregrad: 'orange' } })
              }}
            >
              Überspringen
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleMangelSubmit}
              disabled={!state.mangelForm.beschreibung || state.saving}
              loading={state.saving}
            >
              Mangel speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Beschreibung *</label>
            <textarea
              value={state.mangelForm.beschreibung}
              onChange={e => dispatch({ type: 'SET_MANGEL_FORM', payload: { ...state.mangelForm, beschreibung: e.target.value } })}
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
                <Button
                  key={s.key}
                  variant={state.mangelForm.schweregrad === s.key ? 'primary' : 'secondary'}
                  onClick={() => dispatch({ type: 'SET_MANGEL_FORM', payload: { ...state.mangelForm, schweregrad: s.key } })}
                  className="w-full"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
          <Button
            variant="secondary"
            icon={<Camera className="w-4 h-4" />}
            className="w-full"
            onClick={() => dispatch({ type: 'SET_SHOW_KAMERA', payload: true })}
          >
            Foto aufnehmen
          </Button>
          {state.mangelFotos[state.checkPunkte[state.currentIdx]?.id]?.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {state.mangelFotos[state.checkPunkte[state.currentIdx]?.id].map((foto, i) => (
                <img key={i} src={foto} alt={`Foto ${i+1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* KameraCapture Modal */}
      <Modal
        open={state.showKamera}
        onClose={() => dispatch({ type: 'SET_SHOW_KAMERA', payload: false })}
        title="Foto aufnehmen"
        size="lg"
      >
        <KameraCapture
          onCapture={(imageUrl) => {
            const punktId = state.checkPunkte[state.currentIdx]?.id
            if (punktId) {
              dispatch({ type: 'ADD_MANGEL_FOTO', payload: { punktId, fotoUrl: imageUrl } })
            }
            dispatch({ type: 'SET_SHOW_KAMERA', payload: false })
          }}
          onCancel={() => dispatch({ type: 'SET_SHOW_KAMERA', payload: false })}
        />
      </Modal>

      {/* Abschluss Modal */}
      {state.showAbschluss && (
        <AbschlussModal
          onClose={() => dispatch({ type: 'SET_SHOW_ABSCHLUSS', payload: false })}

          onSubmit={handleAbschliessen}
          saving={state.saving}
          maengelCount={state.pruefung.maengel.length}
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
    <Modal
      open={true}
      onClose={onClose}
      title="Prüfung abschließen"
      size="md"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            icon={<Lock size={14} />}
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => onSubmit(name, bemerkung, signaturDataUrl)}
            disabled={!name || saving}
            loading={saving}
          >
            Abschließen
          </Button>
        </div>
      }
    >
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
          <Input
            label="Prüfer (Name) *"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ihr vollständiger Name"
            required
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
      </div>
    </Modal>
  )
}
