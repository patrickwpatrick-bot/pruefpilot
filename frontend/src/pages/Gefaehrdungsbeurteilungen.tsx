/**
 * Gefährdungsbeurteilungen (Risk Assessments) — GBU management
 */
import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/lib/api'
import { LoadingState } from '@/components/ui/LoadingState'

interface Gefaehrdung {
  id: string
  gbu_id: string
  gefaehrdung: string
  risikoklasse: 'gering' | 'mittel' | 'hoch' | 'sehr_hoch'
  bestehende_massnahmen?: string
  weitere_massnahmen: string
  verantwortlich?: string
  frist?: string
  status: 'offen' | 'in_umsetzung' | 'erledigt'
  created_at: string
}

interface GBU {
  id: string
  titel: string
  arbeitsbereich: string
  status: 'entwurf' | 'aktiv' | 'archiviert'
  datum: string
  gefaehrdungen: Gefaehrdung[]
  created_at: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

function getRisikoColor(klasse: string): string {
  switch (klasse) {
    case 'gering':
      return 'bg-green-100 text-green-700'
    case 'mittel':
      return 'bg-yellow-100 text-yellow-700'
    case 'hoch':
      return 'bg-orange-100 text-orange-700'
    case 'sehr_hoch':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'entwurf':
      return 'bg-gray-100 text-gray-700'
    case 'aktiv':
      return 'bg-green-100 text-green-700'
    case 'archiviert':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function GBUPage() {
  const [gbus, setGbus] = useState<GBU[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGbu, setExpandedGbu] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showGefaehrdungForm, setShowGefaehrdungForm] = useState<string | null>(null)

  const [newGBU, setNewGBU] = useState({
    titel: '',
    arbeitsbereich: '',
    datum: '',
  })

  const [newGefaehrdung, setNewGefaehrdung] = useState({
    gefaehrdung: '',
    risikoklasse: 'mittel' as const,
    bestehende_massnahmen: '',
    weitere_massnahmen: '',
    verantwortlich: '',
    frist: '',
  })

  const loadData = async () => {
    try {
      const res = await api.get('/gbus')
      setGbus(res.data)
    } catch (err) {
      console.error('Error loading GBUs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const createGBU = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGBU.titel || !newGBU.arbeitsbereich || !newGBU.datum) return
    try {
      await api.post('/gbus', newGBU)
      setNewGBU({
        titel: '',
        arbeitsbereich: '',
        datum: '',
      })
      setShowCreateModal(false)
      loadData()
    } catch (err) {
      console.error('Error creating GBU:', err)
    }
  }

  const deleteGBU = async (id: string) => {
    if (!confirm('GBU wirklich löschen?')) return
    try {
      await api.delete(`/gbus/${id}`)
      loadData()
    } catch (err) {
      console.error('Error deleting GBU:', err)
    }
  }

  const addGefaehrdung = async (gbuId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!newGefaehrdung.gefaehrdung || !newGefaehrdung.weitere_massnahmen) return
    try {
      await api.post(`/gbus/${gbuId}/gefaehrdungen`, newGefaehrdung)
      setNewGefaehrdung({
        gefaehrdung: '',
        risikoklasse: 'mittel',
        bestehende_massnahmen: '',
        weitere_massnahmen: '',
        verantwortlich: '',
        frist: '',
      })
      setShowGefaehrdungForm(null)
      loadData()
    } catch (err) {
      console.error('Error adding gefaehrdung:', err)
    }
  }

  const updateGefaehrdungStatus = async (gbuId: string, gefId: string, status: string) => {
    try {
      await api.patch(`/gbus/${gbuId}/gefaehrdungen/${gefId}`, { status })
      loadData()
    } catch (err) {
      console.error('Error updating gefaehrdung status:', err)
    }
  }

  const deleteGefaehrdung = async (gbuId: string, gefId: string) => {
    if (!confirm('Gefährdung wirklich löschen?')) return
    try {
      await api.delete(`/gbus/${gbuId}/gefaehrdungen/${gefId}`)
      loadData()
    } catch (err) {
      console.error('Error deleting gefaehrdung:', err)
    }
  }

  const activateGBU = async (id: string) => {
    try {
      await api.patch(`/gbus/${id}`, { status: 'aktiv' })
      loadData()
    } catch (err) {
      console.error('Error activating GBU:', err)
    }
  }

  if (loading) {
    return <div className="p-6 md:p-8"><LoadingState text="Gefährdungsbeurteilungen werden geladen..." /></div>
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Gefährdungsbeurteilungen</h1>
        <p className="text-sm text-gray-400 mt-1">GBU und Gefährdungen verwalten</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-black">Alle GBUs</h2>
          <p className="text-xs text-gray-400 mt-0.5">{gbus.length} GBUs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          Neue GBU
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-6">
            <h3 className="font-semibold text-black mb-4">Neue Gefährdungsbeurteilung</h3>
            <form onSubmit={createGBU} className="space-y-4">
              <input
                type="text"
                placeholder="Titel *"
                value={newGBU.titel}
                onChange={e => setNewGBU({ ...newGBU, titel: e.target.value })}
                required
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />

              <input
                type="text"
                placeholder="Arbeitsbereich *"
                value={newGBU.arbeitsbereich}
                onChange={e => setNewGBU({ ...newGBU, arbeitsbereich: e.target.value })}
                required
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />

              <input
                type="date"
                value={newGBU.datum}
                onChange={e => setNewGBU({ ...newGBU, datum: e.target.value })}
                min="2020-01-01"
                required
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Erstellen
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-black text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GBUs List */}
      {gbus.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Plus size={20} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-400">Noch keine Gefährdungsbeurteilungen angelegt.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800"
          >
            Erste GBU erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {gbus.map(gbu => (
            <div
              key={gbu.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div
                onClick={() => setExpandedGbu(expandedGbu === gbu.id ? null : gbu.id)}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-black text-sm">{gbu.titel}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(gbu.status)}`}>
                      {gbu.status === 'entwurf' ? 'Entwurf' : gbu.status === 'aktiv' ? 'Aktiv' : 'Archiviert'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs text-gray-400">{gbu.arbeitsbereich}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">{formatDate(gbu.datum)}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">{gbu.gefaehrdungen?.length || 0} Gefährdungen</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      deleteGBU(gbu.id)
                    }}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedGbu === gbu.id ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedGbu === gbu.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                  {/* Gefährdungen List */}
                  {gbu.gefaehrdungen && gbu.gefaehrdungen.length > 0 && (
                    <div className="space-y-3">
                      {gbu.gefaehrdungen.map(gef => (
                        <div key={gef.id} className="bg-white rounded-lg border border-gray-200 p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-black">{gef.gefaehrdung}</p>
                              <div className="flex gap-2 mt-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRisikoColor(gef.risikoklasse)}`}>
                                  {gef.risikoklasse === 'gering' ? 'Gering' : gef.risikoklasse === 'mittel' ? 'Mittel' : gef.risikoklasse === 'hoch' ? 'Hoch' : 'Sehr hoch'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteGefaehrdung(gbu.id, gef.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {gef.bestehende_massnahmen && (
                            <p className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">Bestehend:</span> {gef.bestehende_massnahmen}
                            </p>
                          )}

                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">Maßnahmen:</span> {gef.weitere_massnahmen}
                          </p>

                          {gef.verantwortlich && (
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Verantwortlich:</span> {gef.verantwortlich}
                            </p>
                          )}

                          {gef.frist && (
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Frist:</span> {formatDate(gef.frist)}
                            </p>
                          )}

                          <div className="mt-2">
                            <select
                              value={gef.status}
                              onChange={e => updateGefaehrdungStatus(gbu.id, gef.id, e.target.value)}
                              className="px-2 py-1 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                            >
                              <option value="offen">Offen</option>
                              <option value="in_umsetzung">In Umsetzung</option>
                              <option value="erledigt">Erledigt</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Gefährdung Form */}
                  {showGefaehrdungForm === gbu.id ? (
                    <form onSubmit={(e) => addGefaehrdung(gbu.id, e)} className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
                      <input
                        type="text"
                        placeholder="Gefährdung *"
                        value={newGefaehrdung.gefaehrdung}
                        onChange={e => setNewGefaehrdung({ ...newGefaehrdung, gefaehrdung: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                      />

                      <select
                        value={newGefaehrdung.risikoklasse}
                        onChange={e => setNewGefaehrdung({ ...newGefaehrdung, risikoklasse: e.target.value as any })}
                        className="w-full px-3 py-2 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                      >
                        <option value="gering">Gering</option>
                        <option value="mittel">Mittel</option>
                        <option value="hoch">Hoch</option>
                        <option value="sehr_hoch">Sehr hoch</option>
                      </select>

                      <textarea
                        placeholder="Bestehende Maßnahmen"
                        value={newGefaehrdung.bestehende_massnahmen}
                        onChange={e => setNewGefaehrdung({ ...newGefaehrdung, bestehende_massnahmen: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                      />

                      <textarea
                        placeholder="Weitere Maßnahmen *"
                        value={newGefaehrdung.weitere_massnahmen}
                        onChange={e => setNewGefaehrdung({ ...newGefaehrdung, weitere_massnahmen: e.target.value })}
                        required
                        rows={2}
                        className="w-full px-3 py-2 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                      />

                      <input
                        type="text"
                        placeholder="Verantwortlich"
                        value={newGefaehrdung.verantwortlich}
                        onChange={e => setNewGefaehrdung({ ...newGefaehrdung, verantwortlich: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                      />

                      <input
                        type="date"
                        placeholder="Frist"
                        value={newGefaehrdung.frist}
                        onChange={e => setNewGefaehrdung({ ...newGefaehrdung, frist: e.target.value })}
                        min="2020-01-01"
                        className="w-full px-3 py-2 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                      />

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 px-3 py-2 bg-black text-white text-xs font-medium rounded hover:bg-gray-800"
                        >
                          Hinzufügen
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowGefaehrdungForm(null)}
                          className="flex-1 px-3 py-2 border border-gray-200 text-black text-xs font-medium rounded hover:bg-gray-50"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowGefaehrdungForm(gbu.id)}
                      className="w-full px-3 py-2 text-xs font-medium text-black border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus size={12} />
                      Gefährdung hinzufügen
                    </button>
                  )}

                  {/* Activate Button */}
                  {gbu.status === 'entwurf' && (
                    <button
                      onClick={() => activateGBU(gbu.id)}
                      className="w-full px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      GBU aktivieren
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
