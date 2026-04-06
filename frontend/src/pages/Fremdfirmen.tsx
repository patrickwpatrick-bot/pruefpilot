/**
 * Fremdfirmen (Contractors) — Manage external contractors and their documentation
 */
import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Building2 } from 'lucide-react'
import api from '@/lib/api'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

interface Dokument {
  id: string
  fremdfirma_id: string
  typ: 'haftpflicht' | 'unterweisung' | 'qualifikation' | 'gefaehrdungsbeurteilung' | 'sonstiges'
  name: string
  gueltig_bis: string
  status: 'aktuell' | 'abgelaufen' | 'fehlend'
  created_at: string
}

interface Fremdfirma {
  id: string
  name: string
  ansprechpartner: string
  email?: string
  telefon?: string
  taetigkeit: string
  status: 'aktiv' | 'gesperrt' | 'archiviert'
  dokumente: Dokument[]
  created_at: string
}

const dokumentTypen = [
  { value: 'haftpflicht', label: 'Haftpflichtversicherung' },
  { value: 'unterweisung', label: 'Unterweisung' },
  { value: 'qualifikation', label: 'Qualifikation' },
  { value: 'gefaehrdungsbeurteilung', label: 'Gefährdungsbeurteilung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'aktiv':
      return 'bg-green-100 text-green-700'
    case 'gesperrt':
      return 'bg-red-100 text-red-700'
    case 'archiviert':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getAmpelStatus(dokumente: Dokument[]): 'gruen' | 'gelb' | 'rot' {
  if (dokumente.length === 0) return 'rot'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let hasAbgelaufen = false
  let hasFehlend = false

  for (const doc of dokumente) {
    if (doc.status === 'fehlend') {
      hasFehlend = true
    } else if (doc.status === 'abgelaufen') {
      hasAbgelaufen = true
    } else {
      const gueltigBis = new Date(doc.gueltig_bis)
      gueltigBis.setHours(0, 0, 0, 0)
      if (gueltigBis < today) {
        hasAbgelaufen = true
      }
    }
  }

  if (hasFehlend) return 'rot'
  if (hasAbgelaufen) return 'rot'
  return 'gruen'
}

export function FremdfirmenPage() {
  const [fremdfirmen, setFremdfirmen] = useState<Fremdfirma[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedFirma, setExpandedFirma] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDokumentForm, setShowDokumentForm] = useState<string | null>(null)

  const [newFremdfirma, setNewFremdfirma] = useState({
    name: '',
    ansprechpartner: '',
    email: '',
    telefon: '',
    taetigkeit: '',
  })

  const [newDokument, setNewDokument] = useState({
    typ: 'haftpflicht' as const,
    name: '',
    gueltig_bis: '',
  })

  const loadData = async () => {
    try {
      const res = await api.get('/fremdfirmen')
      setFremdfirmen(res.data)
    } catch (err) {
      console.error('Error loading fremdfirmen:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const createFremdfirma = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFremdfirma.name || !newFremdfirma.ansprechpartner || !newFremdfirma.taetigkeit) return

    try {
      await api.post('/fremdfirmen', newFremdfirma)
      setNewFremdfirma({
        name: '',
        ansprechpartner: '',
        email: '',
        telefon: '',
        taetigkeit: '',
      })
      setShowCreateModal(false)
      loadData()
    } catch (err) {
      console.error('Error creating fremdfirma:', err)
    }
  }

  const deleteFremdfirma = async (id: string) => {
    if (!confirm('Fremdfirma wirklich löschen?')) return
    try {
      await api.delete(`/fremdfirmen/${id}`)
      loadData()
    } catch (err) {
      console.error('Error deleting fremdfirma:', err)
    }
  }

  const addDokument = async (firmaId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!newDokument.name || !newDokument.gueltig_bis) return

    try {
      await api.post(`/fremdfirmen/${firmaId}/dokumente`, newDokument)
      setNewDokument({
        typ: 'haftpflicht',
        name: '',
        gueltig_bis: '',
      })
      setShowDokumentForm(null)
      loadData()
    } catch (err) {
      console.error('Error adding dokument:', err)
    }
  }

  const updateDokumentStatus = async (firmaId: string, dokId: string, status: string) => {
    try {
      await api.patch(`/fremdfirmen/${firmaId}/dokumente/${dokId}`, { status })
      loadData()
    } catch (err) {
      console.error('Error updating dokument status:', err)
    }
  }

  const deleteDokument = async (firmaId: string, dokId: string) => {
    if (!confirm('Dokument wirklich löschen?')) return
    try {
      await api.delete(`/fremdfirmen/${firmaId}/dokumente/${dokId}`)
      loadData()
    } catch (err) {
      console.error('Error deleting dokument:', err)
    }
  }

  if (loading) {
    return <div className="p-6 md:p-8"><LoadingState text="Fremdfirmen werden geladen..." /></div>
  }

  const getAmpelColor = (status: string) => {
    switch (status) {
      case 'gruen':
        return 'bg-green-600'
      case 'gelb':
        return 'bg-yellow-500'
      case 'rot':
        return 'bg-red-600'
      default:
        return 'bg-gray-400'
    }
  }

  const getTypLabel = (typ: string) => dokumentTypen.find(t => t.value === typ)?.label || typ

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Fremdfirmen</h1>
        <p className="text-sm text-gray-400 mt-1">Fremdfirmen und deren Dokumentation verwalten</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-black">Alle Fremdfirmen</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fremdfirmen.length} Einträge</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          Neue Fremdfirma
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-6">
            <h3 className="font-semibold text-black mb-4">Neue Fremdfirma</h3>
            <form onSubmit={createFremdfirma} className="space-y-4">
              <input
                type="text"
                placeholder="Name *"
                value={newFremdfirma.name}
                onChange={e => setNewFremdfirma({ ...newFremdfirma, name: e.target.value })}
                required
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />

              <input
                type="text"
                placeholder="Ansprechpartner *"
                value={newFremdfirma.ansprechpartner}
                onChange={e => setNewFremdfirma({ ...newFremdfirma, ansprechpartner: e.target.value })}
                required
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />

              <input
                type="email"
                placeholder="E-Mail"
                value={newFremdfirma.email}
                onChange={e => setNewFremdfirma({ ...newFremdfirma, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />

              <input
                type="tel"
                placeholder="Telefon"
                value={newFremdfirma.telefon}
                onChange={e => setNewFremdfirma({ ...newFremdfirma, telefon: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />

              <input
                type="text"
                placeholder="Tätigkeit *"
                value={newFremdfirma.taetigkeit}
                onChange={e => setNewFremdfirma({ ...newFremdfirma, taetigkeit: e.target.value })}
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

      {/* Fremdfirmen List */}
      {fremdfirmen.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Plus size={20} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-400">Noch keine Fremdfirmen angelegt.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800"
          >
            Erste Fremdfirma erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {fremdfirmen.map(firma => {
            const ampelStatus = getAmpelStatus(firma.dokumente || [])
            return (
              <div
                key={firma.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedFirma(expandedFirma === firma.id ? null : firma.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-medium text-black text-sm">{firma.name}</h3>
                        <div className="flex gap-2 mt-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(firma.status)}`}>
                            {firma.status === 'aktiv' ? 'Aktiv' : firma.status === 'gesperrt' ? 'Gesperrt' : 'Archiviert'}
                          </span>
                          <span className="text-xs text-gray-400">{firma.taetigkeit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getAmpelColor(ampelStatus)}`} />
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteFremdfirma(firma.id)
                      }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expandedFirma === firma.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedFirma === firma.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    {/* Kontaktdaten */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ansprechpartner:</span>
                        <span className="text-black font-medium">{firma.ansprechpartner}</span>
                      </div>
                      {firma.email && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">E-Mail:</span>
                          <span className="text-black">{firma.email}</span>
                        </div>
                      )}
                      {firma.telefon && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Telefon:</span>
                          <span className="text-black">{firma.telefon}</span>
                        </div>
                      )}
                    </div>

                    {/* Dokumente */}
                    <div>
                      <h4 className="text-xs font-semibold text-black mb-3">Dokumentation</h4>

                      {firma.dokumente && firma.dokumente.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-3 py-2 text-left text-xs font-semibold text-black">Typ</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-black">Name</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-black">Gültig bis</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-black">Status</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-black">Aktion</th>
                              </tr>
                            </thead>
                            <tbody>
                              {firma.dokumente.map((dok, idx) => (
                                <tr key={dok.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-3 py-2 text-xs text-gray-600">{getTypLabel(dok.typ)}</td>
                                  <td className="px-3 py-2 text-xs text-gray-600">{dok.name}</td>
                                  <td className="px-3 py-2 text-xs text-gray-600">{formatDate(dok.gueltig_bis)}</td>
                                  <td className="px-3 py-2">
                                    <select
                                      value={dok.status}
                                      onChange={e => updateDokumentStatus(firma.id, dok.id, e.target.value)}
                                      className="px-2 py-1 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                                    >
                                      <option value="aktuell">Aktuell</option>
                                      <option value="abgelaufen">Abgelaufen</option>
                                      <option value="fehlend">Fehlend</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => deleteDokument(firma.id, dok.id)}
                                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add Dokument Form */}
                      {showDokumentForm === firma.id ? (
                        <form onSubmit={(e) => addDokument(firma.id, e)} className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
                          <select
                            value={newDokument.typ}
                            onChange={e => setNewDokument({ ...newDokument, typ: e.target.value as any })}
                            className="w-full px-3 py-2 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                          >
                            {dokumentTypen.map(t => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            placeholder="Dokumentname *"
                            value={newDokument.name}
                            onChange={e => setNewDokument({ ...newDokument, name: e.target.value })}
                            required
                            className="w-full px-3 py-2 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none"
                          />

                          <input
                            type="date"
                            value={newDokument.gueltig_bis}
                            onChange={e => setNewDokument({ ...newDokument, gueltig_bis: e.target.value })}
                            min="2020-01-01"
                            required
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
                              onClick={() => setShowDokumentForm(null)}
                              className="flex-1 px-3 py-2 border border-gray-200 text-black text-xs font-medium rounded hover:bg-gray-50"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowDokumentForm(firma.id)}
                          className="w-full px-3 py-2 text-xs font-medium text-black border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Plus size={12} />
                          Dokument hinzufügen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
