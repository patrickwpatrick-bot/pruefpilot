/**
 * Mängelverfolgung (Defects Tracking) — Comprehensive list with filtering, sorting, and status management
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

interface Foto {
  url: string
  beschreibung?: string
}

interface Mangel {
  id: string
  beschreibung: string
  schweregrad: 'gruen' | 'orange' | 'rot'
  status: 'offen' | 'in_bearbeitung' | 'erledigt'
  frist: string | null
  erledigt_am: string | null
  erledigt_kommentar: string | null
  fotos: Foto[]
}

interface Pruefung {
  id: string
  name: string
  maengel: Mangel[]
}

type SortField = 'date' | 'severity' | 'status'
type SortOrder = 'asc' | 'desc'

const schweregradConfig: Record<string, { label: string; dot: string; bg: string; text: string; priority: number }> = {
  rot: { label: 'Kritisch', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', priority: 3 },
  orange: { label: 'Mittel', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', priority: 2 },
  gruen: { label: 'Gering', dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', priority: 1 },
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  offen: { label: 'Offen', bg: 'bg-gray-50', text: 'text-gray-700' },
  in_bearbeitung: { label: 'In Bearbeitung', bg: 'bg-blue-50', text: 'text-blue-700' },
  erledigt: { label: 'Erledigt', bg: 'bg-green-50', text: 'text-green-700' },
}

interface FlattenedMangel extends Mangel {
  pruefung_id: string
  pruefung_name: string
  created_at: string
}

export function MaengelPage() {
  const { token } = useAuth()
  const [allMaengel, setAllMaengel] = useState<FlattenedMangel[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingMangel, setEditingMangel] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string>('')
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Load all defects from inspections
  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/pruefungen', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch')

      const pruefungen: Pruefung[] = await response.json()
      const flattened: FlattenedMangel[] = []

      pruefungen.forEach(p => {
        p.maengel?.forEach(m => {
          flattened.push({
            ...m,
            pruefung_id: p.id,
            pruefung_name: p.name,
            created_at: new Date().toISOString(), // Backend should provide this
          })
        })
      })

      setAllMaengel(flattened)
    } catch (error) {
      console.error('Error loading maengel:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  // Handle status change with comment
  const handleStatusChange = async (mangel: FlattenedMangel, newStatus: string, comment?: string) => {
    setSubmittingId(mangel.id)
    try {
      const response = await fetch(`/api/v1/pruefungen/${mangel.pruefung_id}/maengel/${mangel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'erledigt' && comment && { erledigt_kommentar: comment }),
        }),
      })

      if (!response.ok) throw new Error('Failed to update')

      // Update local state
      setAllMaengel(prev =>
        prev.map(m =>
          m.id === mangel.id
            ? {
                ...m,
                status: newStatus as any,
                erledigt_kommentar: newStatus === 'erledigt' && comment ? comment : m.erledigt_kommentar,
                erledigt_am: newStatus === 'erledigt' ? new Date().toISOString() : m.erledigt_am,
              }
            : m
        )
      )

      setEditingMangel(null)
      setEditingComment('')
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setSubmittingId(null)
    }
  }

  // Filter maengel
  const filteredMaengel = allMaengel.filter(m => {
    if (selectedSeverity.length > 0 && !selectedSeverity.includes(m.schweregrad)) return false
    if (selectedStatus.length > 0 && !selectedStatus.includes(m.status)) return false

    if (dateRangeStart) {
      const start = new Date(dateRangeStart)
      const created = new Date(m.created_at)
      if (created < start) return false
    }

    if (dateRangeEnd) {
      const end = new Date(dateRangeEnd)
      end.setHours(23, 59, 59)
      const created = new Date(m.created_at)
      if (created > end) return false
    }

    return true
  })

  // Sort maengel
  const sortedMaengel = [...filteredMaengel].sort((a, b) => {
    let compareValue = 0

    if (sortField === 'date') {
      compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    } else if (sortField === 'severity') {
      compareValue = schweregradConfig[a.schweregrad].priority - schweregradConfig[b.schweregrad].priority
    } else if (sortField === 'status') {
      const statusOrder = { offen: 0, in_bearbeitung: 1, erledigt: 2 }
      compareValue = (statusOrder[a.status as keyof typeof statusOrder] ?? 0) - (statusOrder[b.status as keyof typeof statusOrder] ?? 0)
    }

    return sortOrder === 'asc' ? compareValue : -compareValue
  })

  // Calculate statistics
  const totalOpen = allMaengel.filter(m => m.status !== 'erledigt').length
  const totalCritical = allMaengel.filter(m => m.schweregrad === 'rot').length
  const criticalOpen = allMaengel.filter(m => m.schweregrad === 'rot' && m.status !== 'erledigt').length
  const overdue = allMaengel.filter(m => {
    if (!m.frist || m.status === 'erledigt') return false
    return new Date(m.frist) < new Date()
  }).length

  if (loading) {
    return <div className="p-6 md:p-8"><LoadingState text="Mängel werden geladen..." /></div>
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">Mängelverfolgung</h1>
        <p className="text-sm text-gray-500 mt-1">Übersicht aller erfassten Mängel aus Prüfungen</p>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" data-tour-page="ma-stats">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase">Offene Mängel</p>
          <p className="text-2xl font-bold text-black mt-2">{totalOpen}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase">Kritische (Rot)</p>
          <p className={`text-2xl font-bold mt-2 ${criticalOpen > 0 ? 'text-red-600' : 'text-gray-700'}`}>
            {criticalOpen}/{totalCritical}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase">Überfällig</p>
          <p className={`text-2xl font-bold mt-2 ${overdue > 0 ? 'text-red-600' : 'text-gray-700'}`}>
            {overdue}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase">Gesamt</p>
          <p className="text-2xl font-bold text-black mt-2">{allMaengel.length}</p>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="mb-6 space-y-4" data-tour-page="ma-filter">
        {/* Filter Row 1: Severity and Status */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Severity Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Schweregrad</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(schweregradConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedSeverity(prev =>
                      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
                    )
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    selectedSeverity.includes(key)
                      ? `${config.bg} ${config.text} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedStatus(prev =>
                      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
                    )
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    selectedStatus.includes(key)
                      ? `${config.bg} ${config.text} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Row 2: Date Range */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Von Datum</label>
            <input
              type="date"
              value={dateRangeStart}
              onChange={e => setDateRangeStart(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Bis Datum</label>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={e => setDateRangeEnd(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Sortierung</label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="date">Datum</option>
                <option value="severity">Schweregrad</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                title={sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedSeverity.length > 0 || selectedStatus.length > 0 || dateRangeStart || dateRangeEnd) && (
          <div className="flex flex-wrap gap-2">
            {selectedSeverity.map(s => (
              <span key={`sev-${s}`} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                {schweregradConfig[s].label}
                <button onClick={() => setSelectedSeverity(prev => prev.filter(x => x !== s))} className="hover:text-gray-900">
                  <X size={14} />
                </button>
              </span>
            ))}
            {selectedStatus.map(s => (
              <span key={`stat-${s}`} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                {statusConfig[s].label}
                <button onClick={() => setSelectedStatus(prev => prev.filter(x => x !== s))} className="hover:text-gray-900">
                  <X size={14} />
                </button>
              </span>
            ))}
            {dateRangeStart && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                Ab {new Date(dateRangeStart).toLocaleDateString('de-DE')}
                <button onClick={() => setDateRangeStart('')} className="hover:text-gray-900">
                  <X size={14} />
                </button>
              </span>
            )}
            {dateRangeEnd && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                Bis {new Date(dateRangeEnd).toLocaleDateString('de-DE')}
                <button onClick={() => setDateRangeEnd('')} className="hover:text-gray-900">
                  <X size={14} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Maengel List */}
      {sortedMaengel.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-gray-400" size={24} />
          </div>
          <p className="text-black font-semibold mb-1">Keine Mängel gefunden</p>
          <p className="text-sm text-gray-500">
            {allMaengel.length === 0
              ? 'Es wurden noch keine Mängel erfasst.'
              : 'Keine Mängel entsprechen den aktuellen Filtern.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-tour-page="ma-liste">
          {sortedMaengel.map(mangel => {
            const sev = schweregradConfig[mangel.schweregrad]
            const stat = statusConfig[mangel.status]
            const isExpanded = expandedId === mangel.id
            const isOverdue = mangel.frist && mangel.status !== 'erledigt' && new Date(mangel.frist) < new Date()

            return (
              <div
                key={mangel.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Main Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : mangel.id)}
                  className="p-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Severity Badge and Description */}
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 ${sev.bg} ${sev.text}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
                          {sev.label}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 flex-shrink-0">
                            ⚠ Überfällig
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-black mb-2">{mangel.beschreibung}</p>

                      {/* Meta Information */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>Prüfung: {mangel.pruefung_name}</span>
                        <span>Erstellt: {new Date(mangel.created_at).toLocaleDateString('de-DE')}</span>
                        {mangel.frist && (
                          <span>
                            Frist:{' '}
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {new Date(mangel.frist).toLocaleDateString('de-DE')}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status and Expand Icon */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${stat.bg} ${stat.text}`}
                      >
                        {stat.label}
                      </span>
                      <ChevronDown
                        size={20}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-5 space-y-5">
                    {/* Fotos */}
                    {mangel.fotos && mangel.fotos.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Fotos</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {mangel.fotos.map((foto, idx) => (
                            <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <img
                                src={foto.url}
                                alt={foto.beschreibung || `Foto ${idx + 1}`}
                                className="w-full h-32 object-cover"
                              />
                              {foto.beschreibung && (
                                <p className="text-xs text-gray-600 p-2">{foto.beschreibung}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status History */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Status & Kommentar</h4>
                      <div className="space-y-3">
                        {editingMangel === mangel.id ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <select
                                value={mangel.status}
                                onChange={e => {
                                  // Update local state to reflect selection
                                }}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                              >
                                <option value="offen">Offen</option>
                                <option value="in_bearbeitung">In Bearbeitung</option>
                                <option value="erledigt">Erledigt</option>
                              </select>
                            </div>
                            {mangel.status === 'erledigt' || (
                              <textarea
                                value={editingComment}
                                onChange={e => setEditingComment(e.target.value)}
                                placeholder="Kommentar hinzufügen..."
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                                rows={3}
                              />
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStatusChange(mangel, 'erledigt', editingComment)}
                                disabled={submittingId === mangel.id}
                                className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
                              >
                                {submittingId === mangel.id ? 'Speichern...' : 'Speichern'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMangel(null)
                                  setEditingComment('')
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-700">Aktueller Status:</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${stat.bg} ${stat.text}`}>
                                {stat.label}
                              </span>
                            </div>
                            {mangel.erledigt_am && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Erledigt am:</span> {new Date(mangel.erledigt_am).toLocaleDateString('de-DE')}
                              </div>
                            )}
                            {mangel.erledigt_kommentar && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Kommentar:</span>
                                <p className="text-gray-600 mt-1 p-2 bg-white rounded border border-gray-200">
                                  {mangel.erledigt_kommentar}
                                </p>
                              </div>
                            )}
                            {mangel.status !== 'erledigt' && (
                              <button
                                onClick={() => {
                                  setEditingMangel(mangel.id)
                                  setEditingComment('')
                                }}
                                className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Bearbeiten
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Mängel-ID</p>
                        <p className="text-sm text-gray-700 mt-1 font-mono">{mangel.id.slice(0, 8)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Schweregrad</p>
                        <p className="text-sm text-gray-700 mt-1">{sev.label}</p>
                      </div>
                      {mangel.frist && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase">Frist</p>
                          <p className={`text-sm mt-1 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                            {new Date(mangel.frist).toLocaleDateString('de-DE')}
                          </p>
                        </div>
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
