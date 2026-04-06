/**
 * LeitfadenContext — Steuert den Leitfaden-Modus (Guided Tour)
 * - toggleLeitfaden: Ein/Aus
 * - currentSection: Welche Seite/Bereich gerade erklärt wird
 * - completedSections: Abschnitte die der Nutzer bereits verstanden hat
 * - State wird in localStorage gespeichert
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface LeitfadenState {
  isActive: boolean
  currentSection: string | null
  completedSections: string[]
}

interface LeitfadenContextType {
  state: LeitfadenState
  toggleLeitfaden: () => void
  setCurrentSection: (section: string | null) => void
  markCompleted: (section: string) => void
  reset: () => void
}

const LeitfadenContext = createContext<LeitfadenContextType | undefined>(undefined)

const STORAGE_KEY = 'pruefpilot_leitfaden'
const DEFAULT_STATE: LeitfadenState = {
  isActive: false,
  currentSection: null,
  completedSections: [],
}

function loadState(): LeitfadenState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_STATE
}

function saveState(state: LeitfadenState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

interface LeitfadenProviderProps {
  children: ReactNode
}

export function LeitfadenProvider({ children }: LeitfadenProviderProps) {
  const [state, setstate] = useState<LeitfadenState>(loadState)

  // Speichern wenn sich State ändert
  useEffect(() => {
    saveState(state)
  }, [state])

  const toggleLeitfaden = () => {
    setstate(prev => ({
      ...prev,
      isActive: !prev.isActive,
    }))
  }

  const setCurrentSection = (section: string | null) => {
    setstate(prev => ({
      ...prev,
      currentSection: section,
    }))
  }

  const markCompleted = (section: string) => {
    setstate(prev => ({
      ...prev,
      completedSections: prev.completedSections.includes(section)
        ? prev.completedSections
        : [...prev.completedSections, section],
    }))
  }

  const reset = () => {
    setstate(DEFAULT_STATE)
  }

  const value: LeitfadenContextType = {
    state,
    toggleLeitfaden,
    setCurrentSection,
    markCompleted,
    reset,
  }

  return (
    <LeitfadenContext.Provider value={value}>
      {children}
    </LeitfadenContext.Provider>
  )
}

export function useLeitfaden(): LeitfadenContextType {
  const context = useContext(LeitfadenContext)
  if (!context) {
    throw new Error('useLeitfaden muss innerhalb von <LeitfadenProvider> verwendet werden')
  }
  return context
}
