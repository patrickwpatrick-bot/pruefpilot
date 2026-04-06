/**
 * LeitfadenTooltip — Interaktiver Tooltip für den Leitfaden-Modus
 * - Rendert children normal
 * - Wenn Leitfaden aktiv: zeigt pulsierendes Info-Icon
 * - Klick: öffnet Erklärungs-Popover
 * - Blauer Rahmen um erklärt Element
 * - "Verstanden" Button markiert Tooltip als completed
 */

import { useState, useRef, useEffect } from 'react'
import { Info, Check, X } from 'lucide-react'
import { useLeitfaden } from '@/contexts/LeitfadenContext'

interface LeitfadenTooltipProps {
  section: string // z.B. "dashboard.ampel"
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
}

export function LeitfadenTooltip({
  section,
  title,
  description,
  position = 'right',
  children,
}: LeitfadenTooltipProps) {
  const { state, markCompleted } = useLeitfaden()
  const [showPopover, setShowPopover] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const isCompleted = state.completedSections.includes(section)
  const isActive = state.isActive

  // Popover schließen bei Click außerhalb
  useEffect(() => {
    if (!showPopover) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        containerRef.current && !containerRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPopover])

  const handleMarkCompleted = () => {
    markCompleted(section)
    setShowPopover(false)
  }

  // Nicht aktiv = nur children rendern
  if (!isActive) {
    return <>{children}</>
  }

  // Styling für den Container
  const containerClasses = `relative ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`

  // Popover Position Classes
  const popoverPositionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* Children mit Info-Icon */}
      <div className="relative">
        {children}

        {/* Info-Icon (nur wenn Leitfaden aktiv) */}
        {isActive && (
          <button
            onClick={() => setShowPopover(!showPopover)}
            className={`absolute -top-2 -right-2 p-1.5 rounded-full bg-white border-2 border-blue-500 hover:bg-blue-50 transition-colors ${
              isCompleted
                ? 'opacity-60'
                : 'animate-pulse'
            } shadow-lg`}
            title={isCompleted ? 'Verstanden' : 'Info anschauen'}
          >
            <Info size={16} className={isCompleted ? 'text-gray-400' : 'text-blue-600'} />
          </button>
        )}
      </div>

      {/* Erklär-Popover */}
      {showPopover && isActive && (
        <div
          ref={popoverRef}
          className={`absolute z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 ${popoverPositionClasses[position]}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <button
              onClick={() => setShowPopover(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Beschreibung */}
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {description}
          </p>

          {/* Verstanden-Button */}
          <button
            onClick={handleMarkCompleted}
            className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={14} />
            Verstanden
          </button>
        </div>
      )}
    </div>
  )
}
