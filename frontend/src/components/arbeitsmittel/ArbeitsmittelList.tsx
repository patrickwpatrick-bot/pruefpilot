/**
 * ArbeitsmittelList — Table view with search + filter
 * Extracted from Arbeitsmittel.tsx (2289 LOC → modular split)
 */
import React, { useState } from 'react'
import { Plus, Search, Pencil, Trash2, ClipboardCheck, Wrench } from 'lucide-react'
import type { Arbeitsmittel } from '@/types'
import { AmpelBadge } from '@/components/ui/AmpelBadge'
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'
import { TYPEN } from './constants'

interface ArbeitsmittelListProps {
  items: Arbeitsmittel[]
  onAdd: () => void
  onEdit: (item: Arbeitsmittel) => void
  onDelete: (id: string) => void
  onStartPruefung: (item: Arbeitsmittel) => void
}

export function ArbeitsmittelList({
  items,
  onAdd,
  onEdit,
  onDelete,
  onStartPruefung,
}: ArbeitsmittelListProps) {
  const [suche, setSuche] = useState('')
  const [typFilter, setTypFilter] = useState('')

  const filtered = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(suche.toLowerCase()) ||
      i.typ.toLowerCase().includes(suche.toLowerCase())
    const matchesTyp = !typFilter || i.typ === typFilter
    return matchesSearch && matchesTyp
  })

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Arbeitsmittel</h1>
          <p className="text-sm text-gray-400 mt-1">{items.length} Einträge</p>
        </div>
        <LeitfadenTooltip
          section="arbeitsmittel.anlegen"
          title={LEITFADEN_TEXTE['arbeitsmittel.anlegen'].title}
          description={LEITFADEN_TEXTE['arbeitsmittel.anlegen'].description}
        >
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            data-tour-page="am-neu"
          >
            <Plus size={16} />
            Hinzufügen
          </button>
        </LeitfadenTooltip>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Suchen..."
            value={suche}
            onChange={e => setSuche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
          />
        </div>
        <select
          value={typFilter}
          onChange={e => setTypFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:ring-1 focus:ring-black focus:border-black outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
        >
          <option value="">Alle Typen</option>
          {TYPEN.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          {items.length === 0 ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Wrench size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Noch keine Arbeitsmittel angelegt</p>
              <p className="text-xs text-gray-400 mb-4">Erfasse Leitern, Regale, Maschinen und mehr</p>
              <button
                onClick={onAdd}
                className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Erstes Arbeitsmittel anlegen
              </button>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Keine Treffer für die aktuelle Suche.</p>
          )}
        </div>
      ) : (
        <LeitfadenTooltip
          section="arbeitsmittel.liste"
          title={LEITFADEN_TEXTE['arbeitsmittel.liste'].title}
          description={LEITFADEN_TEXTE['arbeitsmittel.liste'].description}
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-tour-page="am-liste">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3 hidden md:table-cell">Typ</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3 hidden md:table-cell">Nächste Prüfung</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {item.foto_url && (
                        <img src={item.foto_url} alt="" className="w-8 h-8 rounded object-cover border border-gray-100" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-black">{item.name}</p>
                        <p className="text-xs text-gray-400 md:hidden">{item.typ}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">{item.typ}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">
                    {item.naechste_pruefung_am || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <AmpelBadge status={item.ampel_status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onStartPruefung(item)} title="Prüfung starten" className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                        <ClipboardCheck size={14} />
                      </button>
                      <button onClick={() => onEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-black transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </LeitfadenTooltip>
      )}
    </>
  )
}
