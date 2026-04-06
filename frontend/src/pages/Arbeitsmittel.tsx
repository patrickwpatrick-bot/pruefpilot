/**
 * Arbeitsmittel (Equipment) — Page Component
 *
 * Refactored 2026-04-06: Split from 2289 LOC monolith into modular components:
 *   - components/arbeitsmittel/constants.ts       — Types, constants, helpers
 *   - components/arbeitsmittel/ArbeitsmittelList.tsx — Table + search + filter
 *   - components/arbeitsmittel/ArbeitsmittelForm.tsx — Create/Edit modal + sub-components
 *   - components/arbeitsmittel/PruefplanungEditor.tsx — Recurrence calendar (iOS-style)
 *   - components/arbeitsmittel/PruefStartDialog.tsx  — Inspection start dialog
 *   - hooks/useArbeitsmittel.ts                      — Data fetching hook
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Arbeitsmittel } from '@/types'
import { useArbeitsmittel } from '@/hooks/useArbeitsmittel'
import { ArbeitsmittelList } from '@/components/arbeitsmittel/ArbeitsmittelList'
import { ArbeitsmittelForm } from '@/components/arbeitsmittel/ArbeitsmittelForm'
import { PruefStartDialog } from '@/components/arbeitsmittel/PruefStartDialog'

export function ArbeitsmittelPage() {
  const navigate = useNavigate()
  const { items, standorte, loading, reload, deleteItem } = useArbeitsmittel()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Arbeitsmittel | null>(null)
  const [pruefTarget, setPruefTarget] = useState<Arbeitsmittel | null>(null)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <ArbeitsmittelList
        items={items}
        onAdd={() => { setEditItem(null); setShowForm(true) }}
        onEdit={(item) => { setEditItem(item); setShowForm(true) }}
        onDelete={deleteItem}
        onStartPruefung={setPruefTarget}
      />

      {showForm && (
        <ArbeitsmittelForm
          item={editItem}
          standorte={standorte}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload() }}
        />
      )}

      {pruefTarget && (
        <PruefStartDialog
          arbeitsmittel={pruefTarget}
          onClose={() => setPruefTarget(null)}
          onStarted={(pruefungId) => navigate(`/pruefungen/${pruefungId}`)}
        />
      )}
    </div>
  )
}
