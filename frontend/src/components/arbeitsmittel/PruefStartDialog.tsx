/**
 * PruefStartDialog — Modal to select checklist and start an inspection
 * Extracted from Arbeitsmittel.tsx (2289 LOC → modular split)
 */
import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '@/lib/api'
import type { Arbeitsmittel } from '@/types'
import type { ChecklisteOption } from './constants'

interface PruefStartDialogProps {
  arbeitsmittel: Arbeitsmittel
  onClose: () => void
  onStarted: (pruefungId: string) => void
}

export function PruefStartDialog({
  arbeitsmittel,
  onClose,
  onStarted,
}: PruefStartDialogProps) {
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
