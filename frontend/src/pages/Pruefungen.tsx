/**
 * Prüfungen (Inspections) — List view with search, filter, PDF download
 */
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, CheckCircle2, AlertTriangle, Search, FileDown } from 'lucide-react'
import api from '@/lib/api'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

interface PruefungListItem {
  id: string
  arbeitsmittel_id: string
  arbeitsmittel_name: string | null
  status: string
  ergebnis: string | null
  ist_abgeschlossen: boolean
  gestartet_am: string
  abgeschlossen_am: string | null
  anzahl_punkte: number
  anzahl_maengel: number
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  entwurf: { label: 'Entwurf', bg: 'bg-gray-50', text: 'text-gray-500' },
  in_bearbeitung: { label: 'In Bearbeitung', bg: 'bg-blue-50', text: 'text-blue-600' },
  abgeschlossen: { label: 'Abgeschlossen', bg: 'bg-green-50', text: 'text-green-600' },
}

const ergebnisConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  bestanden: { label: 'Bestanden', icon: CheckCircle2, color: 'text-green-500' },
  maengel: { label: 'Mängel', icon: AlertTriangle, color: 'text-amber-500' },
  gesperrt: { label: 'Gesperrt', icon: AlertTriangle, color: 'text-red-500' },
}

export function PruefungenPage() {
  const navigate = useNavigate()
  const [pruefungen, setPruefungen] = useState<PruefungListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('alle')
  const [filterErgebnis, setFilterErgebnis] = useState('alle')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(false)
    api.get('/pruefungen')
      .then(res => setPruefungen(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return pruefungen.filter(p => {
      const matchSearch = !search || (p.arbeitsmittel_name || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'alle' || p.status === filterStatus
      const matchErgebnis = filterErgebnis === 'alle' || p.ergebnis === filterErgebnis
      return matchSearch && matchStatus && matchErgebnis
    })
  }, [pruefungen, search, filterStatus, filterErgebnis])

  const handlePdfDownload = async (e: React.MouseEvent, pruefungId: string) => {
    e.stopPropagation()
    setDownloadingId(pruefungId)
    try {
      const res = await api.get(`/pruefungen/${pruefungId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `pruefprotokoll-${pruefungId.slice(0, 8)}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('PDF konnte nicht heruntergeladen werden.')
    } finally {
      setDownloadingId(null)
    }
  }

  const selectClass = "px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"

  if (loading) return <div className="p-6 md:p-8"><LoadingState text="Prüfungen werden geladen..." /></div>
  if (error) return <div className="p-6 md:p-8"><ErrorState onRetry={load} /></div>

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Prüfungen</h1>
        <p className="text-sm text-gray-400 mt-1">
          {filtered.length} von {pruefungen.length} Prüfungen
        </p>
      </div>

      {/* Search + Filter Bar */}
      {pruefungen.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
            <input
              type="text"
              placeholder="Arbeitsmittel suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectClass}>
            <option value="alle">Alle Status</option>
            <option value="entwurf">Entwurf</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>
          <select value={filterErgebnis} onChange={e => setFilterErgebnis(e.target.value)} className={selectClass}>
            <option value="alle">Alle Ergebnisse</option>
            <option value="bestanden">Bestanden</option>
            <option value="maengel">Mängel</option>
            <option value="gesperrt">Gesperrt</option>
          </select>
        </div>
      )}

      {pruefungen.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={20} className="text-gray-400" />}
          title="Noch keine Prüfungen"
          description="Prüfungen werden erstellt, wenn du ein Arbeitsmittel prüfst."
          action={{ label: 'Zu den Arbeitsmitteln', onClick: () => navigate('/arbeitsmittel') }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={20} className="text-gray-400" />}
          title="Keine Ergebnisse"
          description="Keine Prüfungen entsprechen deinen Filterkriterien."
          action={{ label: 'Filter zurücksetzen', onClick: () => { setSearch(''); setFilterStatus('alle'); setFilterErgebnis('alle') } }}
        />
      ) : (
        <LeitfadenTooltip
          section="pruefungen.uebersicht"
          title={LEITFADEN_TEXTE['pruefungen.uebersicht'].title}
          description={LEITFADEN_TEXTE['pruefungen.uebersicht'].description}
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-tour-page="prue-liste">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Arbeitsmittel</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3 hidden md:table-cell">Datum</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3 hidden md:table-cell">Ergebnis</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3 hidden md:table-cell">Mängel</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3 hidden md:table-cell">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const st = statusConfig[p.status] || statusConfig.entwurf
                const erg = p.ergebnis ? ergebnisConfig[p.ergebnis] : null
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/pruefungen/${p.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-black">{p.arbeitsmittel_name || '—'}</p>
                      <p className="text-xs text-gray-400 md:hidden">
                        {new Date(p.gestartet_am).toLocaleDateString('de-DE')}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">
                      {new Date(p.gestartet_am).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {erg ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${erg.color}`}>
                          <erg.icon size={12} />
                          {erg.label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      {p.anzahl_maengel > 0 ? (
                        <span className="text-xs font-medium text-red-500">{p.anzahl_maengel}</span>
                      ) : (
                        <span className="text-xs text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      {p.ist_abgeschlossen ? (
                        <button
                          onClick={e => handlePdfDownload(e, p.id)}
                          disabled={downloadingId === p.id}
                          title="PDF herunterladen"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-black transition-colors disabled:opacity-40"
                        >
                          {downloadingId === p.id ? (
                            <span className="w-3.5 h-3.5 border border-gray-300 border-t-black rounded-full animate-spin inline-block" />
                          ) : (
                            <FileDown size={15} />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-200">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        </LeitfadenTooltip>
      )}
    </div>
  )
}
