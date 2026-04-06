/**
 * Checklisten — Manage inspection checklist templates
 */
import { useEffect, useState } from 'react'
import { Plus, Trash2, ListChecks, ChevronDown, ChevronRight, X, Copy, Edit2, GripVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { LoadingState } from '@/components/ui/LoadingState'

interface CheckPunkt {
  id: string
  text: string
  normverweis?: string | null
  typ: 'sichtpruefung' | 'funktionspruefung' | 'messung' | 'dokumentation'
  reihenfolge: number
}

interface Checkliste {
  id: string
  name: string
  beschreibung?: string | null
  kategorie: string
  ist_system_template: boolean
  created_at?: string
  last_used?: string | null
  punkte: CheckPunkt[]
}

const kategorien = [
  { key: 'leiter', label: 'Leiter' },
  { key: 'regal', label: 'Regal' },
  { key: 'elektro', label: 'Elektro' },
  { key: 'brandschutz', label: 'Brandschutz' },
  { key: 'allgemein', label: 'Allgemein' },
]

const typLabels: Record<string, string> = {
  sichtpruefung: 'Sichtprüfung',
  funktionspruefung: 'Funktionsprüfung',
  messung: 'Messung',
  dokumentation: 'Dokumentation',
}

const typOptions = [
  { key: 'sichtpruefung', label: 'Sichtprüfung' },
  { key: 'funktionspruefung', label: 'Funktionsprüfung' },
  { key: 'messung', label: 'Messung' },
  { key: 'dokumentation', label: 'Dokumentation' },
]

export function ChecklistenPage() {
  const { user } = useAuth()
  const [checklisten, setChecklisten] = useState<Checkliste[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [form, setForm] = useState({
    name: '',
    kategorie: 'allgemein',
    beschreibung: '',
    punkte: [{ text: '', normverweis: '', typ: 'sichtpruefung' as const }],
  })

  const [editForm, setEditForm] = useState<Checkliste | null>(null)
  const [draggedPunktIndex, setDraggedPunktIndex] = useState<number | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await api.get('/v1/checklisten')
      setChecklisten(res.data || [])
    } catch (err) {
      console.error('Error loading checklisten:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nie verwendet'
    try {
      return `vor ${formatDistanceToNow(new Date(dateString), { locale: de, addSuffix: false })}`
    } catch {
      return 'Nie verwendet'
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const punkte = form.punkte
      .filter(p => p.text.trim())
      .map((p, i) => ({
        text: p.text.trim(),
        normverweis: p.normverweis?.trim() || null,
        typ: p.typ,
        reihenfolge: i,
      }))

    if (!form.name.trim() || punkte.length === 0) {
      alert('Bitte gib einen Namen und mindestens einen Prüfpunkt an.')
      return
    }

    try {
      await api.post('/v1/checklisten', {
        name: form.name.trim(),
        kategorie: form.kategorie,
        beschreibung: form.beschreibung?.trim() || null,
        punkte,
      })
      setForm({
        name: '',
        kategorie: 'allgemein',
        beschreibung: '',
        punkte: [{ text: '', normverweis: '', typ: 'sichtpruefung' }],
      })
      setShowCreate(false)
      load()
    } catch (err) {
      console.error('Error creating checklist:', err)
      alert('Fehler beim Erstellen der Checkliste.')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm) return

    const punkte = editForm.punkte
      .filter(p => p.text.trim())
      .map((p, i) => ({
        ...p,
        text: p.text.trim(),
        normverweis: p.normverweis?.trim() || null,
        reihenfolge: i,
      }))

    if (!editForm.name.trim() || punkte.length === 0) {
      alert('Bitte gib einen Namen und mindestens einen Prüfpunkt an.')
      return
    }

    try {
      await api.put(`/v1/checklisten/${editForm.id}`, {
        name: editForm.name.trim(),
        kategorie: editForm.kategorie,
        beschreibung: editForm.beschreibung?.trim() || null,
      })

      // Update punkte
      const existingIds = new Set(editForm.punkte.map(p => p.id))
      const updatedIds = new Set<string>()

      for (const punkt of punkte) {
        if (punkt.id && existingIds.has(punkt.id)) {
          // Update existing
          await api.put(`/v1/checklisten/${editForm.id}/punkte/${punkt.id}`, {
            text: punkt.text,
            normverweis: punkt.normverweis,
            typ: punkt.typ,
            reihenfolge: punkt.reihenfolge,
          })
          updatedIds.add(punkt.id)
        } else {
          // Create new
          await api.post(`/v1/checklisten/${editForm.id}/punkte`, {
            text: punkt.text,
            normverweis: punkt.normverweis,
            typ: punkt.typ,
            reihenfolge: punkt.reihenfolge,
          })
        }
      }

      // Delete removed punkte
      for (const id of existingIds) {
        if (!updatedIds.has(id)) {
          await api.delete(`/v1/checklisten/${editForm.id}/punkte/${id}`)
        }
      }

      setEditingId(null)
      setEditForm(null)
      load()
    } catch (err) {
      console.error('Error updating checklist:', err)
      alert('Fehler beim Aktualisieren der Checkliste.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Diese Checkliste und alle ihre Prüfpunkte werden gelöscht. Fortfahren?')) return

    try {
      await api.delete(`/v1/checklisten/${id}`)
      load()
    } catch (err) {
      console.error('Error deleting checklist:', err)
      alert('Fehler beim Löschen der Checkliste.')
    }
  }

  const handleDuplicate = async (checklist: Checkliste) => {
    try {
      const newChecklist = {
        name: `${checklist.name} (Kopie)`,
        kategorie: checklist.kategorie,
        beschreibung: checklist.beschreibung,
        punkte: checklist.punkte.map((p, i) => ({
          text: p.text,
          normverweis: p.normverweis,
          typ: p.typ,
          reihenfolge: i,
        })),
      }
      await api.post('/v1/checklisten', newChecklist)
      load()
    } catch (err) {
      console.error('Error duplicating checklist:', err)
      alert('Fehler beim Duplizieren der Checkliste.')
    }
  }

  const addPunktField = () => {
    setForm({
      ...form,
      punkte: [...form.punkte, { text: '', normverweis: '', typ: 'sichtpruefung' }],
    })
  }

  const removePunktField = (idx: number) => {
    const punkte = form.punkte.filter((_, i) => i !== idx)
    setForm({ ...form, punkte: punkte.length ? punkte : [{ text: '', normverweis: '', typ: 'sichtpruefung' }] })
  }

  const updatePunkt = (idx: number, field: string, value: string) => {
    const punkte = [...form.punkte]
    punkte[idx] = { ...punkte[idx], [field]: value }
    setForm({ ...form, punkte })
  }

  const addEditPunktField = () => {
    if (!editForm) return
    const maxReihenfolge = Math.max(...editForm.punkte.map(p => p.reihenfolge), -1)
    setEditForm({
      ...editForm,
      punkte: [
        ...editForm.punkte,
        {
          id: `new-${Date.now()}`,
          text: '',
          normverweis: '',
          typ: 'sichtpruefung',
          reihenfolge: maxReihenfolge + 1,
        },
      ],
    })
  }

  const removeEditPunktField = (idx: number) => {
    if (!editForm) return
    const punkte = editForm.punkte.filter((_, i) => i !== idx)
    setEditForm({
      ...editForm,
      punkte: punkte.length ? punkte : [{ id: `new-${Date.now()}`, text: '', normverweis: '', typ: 'sichtpruefung', reihenfolge: 0 }],
    })
  }

  const updateEditPunkt = (idx: number, field: string, value: string) => {
    if (!editForm) return
    const punkte = [...editForm.punkte]
    punkte[idx] = { ...punkte[idx], [field]: value }
    setEditForm({ ...editForm, punkte })
  }

  const movePunkt = (fromIdx: number, toIdx: number) => {
    if (!editForm) return
    const punkte = [...editForm.punkte]
    const [moved] = punkte.splice(fromIdx, 1)
    punkte.splice(toIdx, 0, moved)
    setEditForm({ ...editForm, punkte })
  }

  if (loading) {
    return <div className="p-6 md:p-8"><LoadingState text="Checklisten werden geladen..." /></div>
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Checklisten</h1>
          <p className="text-sm text-gray-400 mt-1">Vorlagen für Prüfungen verwalten</p>
        </div>
        <button
          onClick={() => {
            setShowCreate(!showCreate)
            setEditingId(null)
            setEditForm(null)
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          data-tour-page="cl-neu"
        >
          <Plus size={16} />
          Neue Checkliste
        </button>
      </div>

      {/* Create Form */}
      {showCreate && !editingId && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-black mb-4">Neue Checkliste erstellen</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Name *</label>
              <input
                type="text"
                placeholder="z.B. Leiterprüfung Standardprüfung"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Kategorie *</label>
              <select
                value={form.kategorie}
                onChange={e => setForm({ ...form, kategorie: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
              >
                {kategorien.map(k => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Beschreibung</label>
              <input
                type="text"
                placeholder="Optionale Beschreibung"
                value={form.beschreibung}
                onChange={e => setForm({ ...form, beschreibung: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
          </div>

          <label className="block text-xs font-medium text-gray-600 mb-3">Prüfpunkte *</label>
          <div className="space-y-3 mb-4 bg-gray-50 rounded-lg p-4">
            {form.punkte.map((punkt, i) => (
              <div key={i} className="flex gap-2">
                <span className="flex items-center text-xs text-gray-400 w-5 flex-shrink-0 pt-2">{i + 1}.</span>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    placeholder={`Prüfpunkt ${i + 1}`}
                    value={punkt.text}
                    onChange={e => updatePunkt(i, 'text', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Normverweis (z.B. DGUV V3 §5)"
                      value={punkt.normverweis}
                      onChange={e => updatePunkt(i, 'normverweis', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                    />
                    <select
                      value={punkt.typ}
                      onChange={e => updatePunkt(i, 'typ', e.target.value)}
                      className="px-3 py-1.5 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                    >
                      {typOptions.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    {form.punkte.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePunktField(i)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addPunktField}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1 mt-2"
            >
              <Plus size={14} /> Prüfpunkt hinzufügen
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setForm({
                  name: '',
                  kategorie: 'allgemein',
                  beschreibung: '',
                  punkte: [{ text: '', normverweis: '', typ: 'sichtpruefung' }],
                })
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Erstellen
            </button>
          </div>
        </form>
      )}

      {/* Edit Form */}
      {editingId && editForm && (
        <form onSubmit={handleUpdate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-black mb-4">Checkliste bearbeiten</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Name *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                required
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Kategorie *</label>
              <select
                value={editForm.kategorie}
                onChange={e => setEditForm({ ...editForm, kategorie: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
              >
                {kategorien.map(k => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Beschreibung</label>
              <input
                type="text"
                value={editForm.beschreibung || ''}
                onChange={e => setEditForm({ ...editForm, beschreibung: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
              />
            </div>
          </div>

          <label className="block text-xs font-medium text-gray-600 mb-3">Prüfpunkte *</label>
          <div className="space-y-3 mb-4 bg-gray-50 rounded-lg p-4">
            {editForm.punkte.map((punkt, i) => (
              <div key={punkt.id} className="flex gap-2 group">
                <div className="flex flex-col gap-1 justify-center">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => movePunkt(i, i - 1)}
                      className="p-0.5 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                    >
                      <ChevronUp size={14} />
                    </button>
                  )}
                  {i < editForm.punkte.length - 1 && (
                    <button
                      type="button"
                      onClick={() => movePunkt(i, i + 1)}
                      className="p-0.5 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                    >
                      <ChevronDown size={14} />
                    </button>
                  )}
                </div>
                <GripVertical size={14} className="text-gray-300 mt-2 flex-shrink-0" />
                <span className="flex items-center text-xs text-gray-400 w-5 flex-shrink-0 pt-2">{i + 1}.</span>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    placeholder={`Prüfpunkt ${i + 1}`}
                    value={punkt.text}
                    onChange={e => updateEditPunkt(i, 'text', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-200 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Normverweis (z.B. DGUV V3 §5)"
                      value={punkt.normverweis || ''}
                      onChange={e => updateEditPunkt(i, 'normverweis', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                    />
                    <select
                      value={punkt.typ}
                      onChange={e => updateEditPunkt(i, 'typ', e.target.value)}
                      className="px-3 py-1.5 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
                    >
                      {typOptions.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    {editForm.punkte.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEditPunktField(i)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addEditPunktField}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1 mt-2"
            >
              <Plus size={14} /> Prüfpunkt hinzufügen
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setEditForm(null)
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Speichern
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {checklisten.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ListChecks className="text-gray-400" size={20} />
          </div>
          <p className="text-black font-medium mb-1">Keine Checklisten</p>
          <p className="text-sm text-gray-400">Erstelle deine erste Checklisten-Vorlage.</p>
        </div>
      ) : (
        <div className="space-y-3" data-tour-page="cl-liste">
          {checklisten.map(cl => {
            const isExpanded = expandedId === cl.id
            const isEditing = editingId === cl.id
            return (
              <div key={cl.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => !isEditing && setExpandedId(isExpanded ? null : cl.id)}>
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">{cl.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">{kategorien.find(k => k.key === cl.kategorie)?.label}</span>
                        <span className="text-xs text-gray-500">{cl.punkte.length} Prüfpunkte</span>
                        {cl.last_used && (
                          <span className="text-xs text-gray-400">Zuletzt: {formatDate(cl.last_used)}</span>
                        )}
                        {cl.ist_system_template && (
                          <span className="text-xs bg-blue-50 text-blue-600 rounded px-2 py-0.5">System</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!cl.ist_system_template && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setEditingId(cl.id)
                          setEditForm(cl)
                          setShowCreate(false)
                        }}
                        className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleDuplicate(cl)
                        }}
                        className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Duplizieren"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete(cl.id)
                        }}
                        className="p-2 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && !isEditing && (
                  <div className="px-5 pb-4 border-t border-gray-50">
                    {cl.beschreibung && (
                      <div className="pt-3 pb-3 mb-3 border-b border-gray-100">
                        <p className="text-xs text-gray-600">{cl.beschreibung}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {cl.punkte
                        .sort((a, b) => a.reihenfolge - b.reihenfolge)
                        .map((p, i) => (
                        <div key={p.id} className="py-2 border-b border-gray-50 last:border-b-0">
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-gray-400 w-5 flex-shrink-0 pt-0.5">{i + 1}.</span>
                            <div className="flex-1">
                              <p className="text-sm text-black">{p.text}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">{typLabels[p.typ]}</span>
                                {p.normverweis && (
                                  <span className="text-xs text-gray-500">Norm: {p.normverweis}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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

// Helper component for move buttons in edit mode
function ChevronUp({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  )
}

