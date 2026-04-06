/**
 * useArbeitsmittel — Custom hook for Arbeitsmittel data management
 * Extracted from Arbeitsmittel.tsx (2289 LOC → modular split)
 */
import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { Arbeitsmittel, Standort } from '@/types'

interface UseArbeitsmittelReturn {
  items: Arbeitsmittel[]
  standorte: Standort[]
  loading: boolean
  reload: () => void
  deleteItem: (id: string) => Promise<void>
}

export function useArbeitsmittel(): UseArbeitsmittelReturn {
  const [items, setItems] = useState<Arbeitsmittel[]>([])
  const [standorte, setStandorte] = useState<Standort[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/arbeitsmittel?limit=200'),
      api.get('/standorte'),
    ])
      .then(([amRes, stRes]) => {
        setItems(amRes.data.items)
        setStandorte(stRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const deleteItem = useCallback(async (id: string) => {
    if (!confirm('Arbeitsmittel wirklich löschen?')) return
    await api.delete(`/arbeitsmittel/${id}`)
    loadData()
  }, [loadData])

  return { items, standorte, loading, reload: loadData, deleteItem }
}
