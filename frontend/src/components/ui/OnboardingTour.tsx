/**
 * OnboardingTour — Guided product tour with spotlight, arrows, and step-by-step explanations.
 * Supports a global navigation tour AND page-specific contextual tours.
 *
 * ARCHITECTURE:
 * - OnboardingTour: UI component (modal, spotlight, navigation)
 * - LeitfadenContext: State management (active/inactive toggle, currentSection tracking)
 * - These are kept SEPARATE because:
 *   1) OnboardingTour is a visual tour helper with spotlight/arrows
 *   2) LeitfadenContext manages broader guidance mode state
 *   3) Each has a distinct responsibility and lifecycle
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

export interface TourStep {
  target: string
  title: string
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

// ─── Global Navigation Tour (first visit) ─────────────────────────
const GLOBAL_STEPS: TourStep[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Willkommen bei PrüfPilot!',
    text: 'Dein Dashboard zeigt dir auf einen Blick, wie es um deinen Arbeitsschutz steht. Der BG-Ready-Score verrät dir sofort, wo Handlungsbedarf ist.',
    position: 'bottom',
  },
  {
    target: '[data-tour="arbeitsmittel"]',
    title: '1. Arbeitsmittel anlegen',
    text: 'Starte hier: Erfasse alle prüfpflichtigen Geräte und Maschinen — einzeln oder per CSV-Import.',
    position: 'right',
  },
  {
    target: '[data-tour="checklisten"]',
    title: '2. Checklisten vorbereiten',
    text: 'Erstelle Prüfchecklisten mit Normverweisen (z.B. DGUV V3) oder nutze unsere fertigen Vorlagen.',
    position: 'right',
  },
  {
    target: '[data-tour="pruefungen"]',
    title: '3. Prüfungen durchführen',
    text: 'Wähle ein Arbeitsmittel, arbeite die Checkliste ab und dokumentiere Mängel direkt mit Foto und Unterschrift.',
    position: 'right',
  },
  {
    target: '[data-tour="maengel"]',
    title: '4. Mängel verfolgen',
    text: 'Alle Mängel landen hier mit Ampelfarben und Fristen. Verfolge den Status bis zur Erledigung.',
    position: 'right',
  },
  {
    target: '[data-tour="unterweisungen"]',
    title: '5. Unterweisungen',
    text: 'Erstelle Schulungsunterlagen, versende sie an Mitarbeiter und dokumentiere die Teilnahme digital.',
    position: 'right',
  },
  {
    target: '[data-tour="mitarbeiter"]',
    title: '6. Mitarbeiter verwalten',
    text: 'Erfasse dein Team mit Berufsgruppen und Qualifikationen — wichtig für Unterweisungspflichten.',
    position: 'right',
  },
  {
    target: '[data-tour="gbu"]',
    title: '7. Gefährdungsbeurteilungen',
    text: 'Dokumentiere Gefährdungen und Schutzmaßnahmen — die Basis für jeden Arbeitsschutz.',
    position: 'right',
  },
  {
    target: '[data-tour="scan-button"]',
    title: 'QR-Scanner',
    text: 'Scanne QR-Codes auf Arbeitsmitteln, um direkt zur Prüfung zu springen — perfekt fürs Tablet.',
    position: 'top',
  },
  {
    target: '[data-tour="einstellungen"]',
    title: 'Einstellungen',
    text: 'Firmendaten, Standorte, Module verwalten — und diese Tour jederzeit neu starten.',
    position: 'right',
  },
]

// ─── Page-specific Contextual Tours ──────────────────────────────
const PAGE_TOURS: Record<string, TourStep[]> = {
  '/dashboard': [
    {
      target: '[data-tour-page="score"]',
      title: 'BG-Ready-Score',
      text: 'Dein Compliance-Score von 0–100. Grün = alles top, Gelb = Handlungsbedarf, Rot = dringend.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="massnahmen"]',
      title: 'Top-Maßnahmen',
      text: 'Die drei wichtigsten Schritte, um deinen Score zu verbessern. Klicke auf eine Maßnahme, um direkt loszulegen.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="faellig"]',
      title: 'Fällige Prüfungen',
      text: 'Hier siehst du welche Prüfungen bald fällig oder bereits überfällig sind.',
      position: 'top',
    },
  ],
  '/arbeitsmittel': [
    {
      target: '[data-tour-page="am-liste"]',
      title: 'Deine Arbeitsmittel',
      text: 'Alle erfassten Geräte und Maschinen. Die Ampelfarbe zeigt den Prüfstatus: Grün = OK, Gelb = bald fällig, Rot = überfällig.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="am-neu"]',
      title: 'Neues Arbeitsmittel',
      text: 'Klicke hier, um ein neues Gerät anzulegen. Du brauchst mindestens Name und Typ.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="am-import"]',
      title: 'CSV-Import',
      text: 'Du hast viele Geräte? Importiere sie alle auf einmal per CSV-Datei aus Excel.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="am-qr"]',
      title: 'QR-Codes',
      text: 'Generiere QR-Etiketten für deine Arbeitsmittel. Einfach ausdrucken und aufkleben.',
      position: 'left',
    },
  ],
  '/pruefungen': [
    {
      target: '[data-tour-page="prue-liste"]',
      title: 'Prüfungsübersicht',
      text: 'Alle durchgeführten und offenen Prüfungen. Klicke auf eine Prüfung für Details und das PDF-Protokoll.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="prue-neu"]',
      title: 'Neue Prüfung starten',
      text: 'Wähle ein Arbeitsmittel und eine Checkliste — dann arbeitest du die Prüfpunkte Schritt für Schritt ab.',
      position: 'bottom',
    },
  ],
  '/checklisten': [
    {
      target: '[data-tour-page="cl-liste"]',
      title: 'Checklisten-Vorlagen',
      text: 'Hier verwaltest du deine Prüfchecklisten. Jede Checkliste enthält die Punkte, die bei einer Prüfung abgearbeitet werden.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="cl-neu"]',
      title: 'Neue Checkliste erstellen',
      text: 'Erstelle eigene Checklisten mit Normverweisen (z.B. DGUV V3 §5). Du kannst auch bestehende duplizieren.',
      position: 'bottom',
    },
  ],
  '/maengel': [
    {
      target: '[data-tour-page="ma-stats"]',
      title: 'Mängel-Übersicht',
      text: 'Auf einen Blick: Wie viele offene, kritische und überfällige Mängel gibt es?',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="ma-filter"]',
      title: 'Filtern & Sortieren',
      text: 'Filtere nach Schweregrad (Ampel), Status oder Zeitraum. So findest du schnell die dringendsten Mängel.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="ma-liste"]',
      title: 'Mängel-Liste',
      text: 'Klicke auf einen Mangel, um Details, Fotos und den Verlauf zu sehen. Status direkt hier ändern.',
      position: 'top',
    },
  ],
  '/unterweisungen': [
    {
      target: '[data-tour-page="uw-liste"]',
      title: 'Unterweisungs-Vorlagen',
      text: 'Erstelle Schulungsunterlagen als Text-Editor oder lade ein PDF hoch. KI-Generierung ist auch möglich.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="uw-neu"]',
      title: 'Neue Unterweisung',
      text: 'Wähle: Selbst schreiben, PDF hochladen oder per KI generieren lassen.',
      position: 'bottom',
    },
  ],
  '/mitarbeiter': [
    {
      target: '[data-tour-page="ma-liste"]',
      title: 'Mitarbeiter-Übersicht',
      text: 'Alle Mitarbeiter mit Berufsgruppe und Unterweisungsstatus. Wichtig für die Nachweispflicht.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="ma-neu"]',
      title: 'Mitarbeiter hinzufügen',
      text: 'Erfasse neue Teammitglieder mit Name, E-Mail und Berufsgruppe.',
      position: 'bottom',
    },
  ],
  '/einstellungen': [
    {
      target: '[data-tour-page="firma"]',
      title: 'Firmendaten',
      text: 'Deine Betriebsdaten erscheinen auf Prüfprotokollen und Dokumenten. Logo nicht vergessen!',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="standorte"]',
      title: 'Standorte',
      text: 'Lege verschiedene Betriebsstandorte an — Arbeitsmittel können dann einem Standort zugeordnet werden.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="module"]',
      title: 'Module verwalten',
      text: 'Blende Module ein oder aus, die du nicht brauchst. Die Navigation passt sich automatisch an.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="tour-restart"]',
      title: 'Tour neu starten',
      text: 'Hier kannst du diese Einführungstour jederzeit von vorne starten lassen.',
      position: 'bottom',
    },
    {
      target: '[data-tour-page="demo-daten"]',
      title: 'Demo-Daten',
      text: 'Lade realistische Beispieldaten, um PrüfPilot auszuprobieren — mit Arbeitsmitteln, Prüfungen und Mängeln.',
      position: 'bottom',
    },
  ],
  '/gefahrstoffe': [
    {
      target: '[data-tour-page="gs-liste"]',
      title: 'Gefahrstoff-Verzeichnis',
      text: 'Erfasse alle Gefahrstoffe im Betrieb mit Sicherheitsdatenblättern und Schutzmaßnahmen.',
      position: 'bottom',
    },
  ],
  '/gbu': [
    {
      target: '[data-tour-page="gbu-liste"]',
      title: 'Gefährdungsbeurteilungen',
      text: 'Die GBU ist Pflicht für jeden Arbeitgeber. Dokumentiere Gefährdungen, Risiken und Schutzmaßnahmen.',
      position: 'bottom',
    },
  ],
  '/fremdfirmen': [
    {
      target: '[data-tour-page="ff-liste"]',
      title: 'Fremdfirmen-Verwaltung',
      text: 'Dokumentiere die Zusammenarbeit mit Fremdfirmen und deren Sicherheitsnachweise.',
      position: 'bottom',
    },
  ],
}

// ─── Storage Keys ─────────────────────────────────────────────────
const GLOBAL_STORAGE_KEY = 'pruefpilot_tour_completed'
const PAGE_STORAGE_PREFIX = 'pruefpilot_page_tour_'

export function shouldShowTour(): boolean {
  try { return localStorage.getItem(GLOBAL_STORAGE_KEY) !== 'true' } catch { return false }
}

function isPageTourCompleted(path: string): boolean {
  try { return localStorage.getItem(PAGE_STORAGE_PREFIX + path) === 'true' } catch { return true }
}

function completePageTour(path: string) {
  localStorage.setItem(PAGE_STORAGE_PREFIX + path, 'true')
}

export function resetTour() {
  localStorage.removeItem(GLOBAL_STORAGE_KEY)
  // Also reset all page tours
  Object.keys(PAGE_TOURS).forEach(path => {
    localStorage.removeItem(PAGE_STORAGE_PREFIX + path)
  })
  window.dispatchEvent(new CustomEvent('tour-restart'))
}

export function isTourEnabled(): boolean {
  try { return localStorage.getItem('pruefpilot_tour_disabled') !== 'true' } catch { return true }
}

export function setTourEnabled(enabled: boolean) {
  if (enabled) {
    localStorage.removeItem('pruefpilot_tour_disabled')
  } else {
    localStorage.setItem('pruefpilot_tour_disabled', 'true')
  }
  window.dispatchEvent(new CustomEvent('tour-toggle'))
}

function completeTour() {
  localStorage.setItem(GLOBAL_STORAGE_KEY, 'true')
}

// ─── Tooltip positioning ──────────────────────────────────────────
interface TooltipPos {
  top: number
  left: number
  arrowDir: 'top' | 'bottom' | 'left' | 'right'
}

function getTooltipPosition(rect: DOMRect, position: string, tw: number, th: number): TooltipPos {
  const gap = 16
  const vw = window.innerWidth
  const vh = window.innerHeight
  switch (position) {
    case 'bottom':
      return { top: Math.min(rect.bottom + gap, vh - th - 20), left: Math.max(16, Math.min(rect.left + rect.width / 2 - tw / 2, vw - tw - 16)), arrowDir: 'top' }
    case 'top':
      return { top: Math.max(16, rect.top - gap - th), left: Math.max(16, Math.min(rect.left + rect.width / 2 - tw / 2, vw - tw - 16)), arrowDir: 'bottom' }
    case 'left':
      return { top: Math.max(16, Math.min(rect.top + rect.height / 2 - th / 2, vh - th - 16)), left: Math.max(16, rect.left - gap - tw), arrowDir: 'right' }
    case 'right': default:
      return { top: Math.max(16, Math.min(rect.top + rect.height / 2 - th / 2, vh - th - 16)), left: Math.min(rect.right + gap, vw - tw - 16), arrowDir: 'left' }
  }
}

// ─── Tour Component ───────────────────────────────────────────────
export function OnboardingTour() {
  const location = useLocation()
  const [mode, setMode] = useState<'global' | 'page' | null>(null)
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ top: 0, left: 0, arrowDir: 'top' })

  const steps = mode === 'global' ? GLOBAL_STEPS : (mode === 'page' ? (PAGE_TOURS[location.pathname] || []) : [])
  const currentStep = steps[step]

  // Start global tour on mount if not completed and tour is enabled
  useEffect(() => {
    if (isTourEnabled() && shouldShowTour()) {
      const t = setTimeout(() => { setMode('global'); setStep(0) }, 800)
      return () => clearTimeout(t)
    }
  }, [])

  // Start page tour on navigation (only if global tour is done and tour is enabled)
  useEffect(() => {
    if (!isTourEnabled()) return
    if (mode === 'global') return // Don't interrupt global tour
    if (!shouldShowTour() && PAGE_TOURS[location.pathname] && !isPageTourCompleted(location.pathname)) {
      const t = setTimeout(() => { setMode('page'); setStep(0) }, 600)
      return () => clearTimeout(t)
    }
  }, [location.pathname, mode])

  // Listen for restart event
  useEffect(() => {
    const handler = () => { setStep(0); setMode('global') }
    window.addEventListener('tour-restart', handler)
    return () => window.removeEventListener('tour-restart', handler)
  }, [])

  // Listen for toggle event (stop tour if disabled)
  useEffect(() => {
    const handler = () => { if (!isTourEnabled()) { setMode(null); setStep(0) } }
    window.addEventListener('tour-toggle', handler)
    return () => window.removeEventListener('tour-toggle', handler)
  }, [])

  // Find and highlight target
  useEffect(() => {
    if (!mode || !currentStep) return
    const findTarget = () => {
      const el = document.querySelector(currentStep.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else {
        // If element not found, skip to next or end
        setTargetRect(null)
      }
    }
    // Small delay for page rendering
    const t = setTimeout(findTarget, 150)
    window.addEventListener('resize', findTarget)
    return () => { clearTimeout(t); window.removeEventListener('resize', findTarget) }
  }, [mode, step, currentStep])

  // Position tooltip
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return
    const tw = tooltipRef.current.offsetWidth || 340
    const th = tooltipRef.current.offsetHeight || 180
    setTooltipPos(getTooltipPosition(targetRect, currentStep?.position || 'right', tw, th))
  }, [targetRect, currentStep])

  const handleNext = useCallback(() => {
    if (step < steps.length - 1) {
      setStep(s => s + 1)
    } else {
      if (mode === 'global') {
        completeTour()
      } else if (mode === 'page') {
        completePageTour(location.pathname)
      }
      setMode(null)
      setStep(0)
    }
  }, [step, steps.length, mode, location.pathname])

  const handlePrev = useCallback(() => {
    if (step > 0) setStep(s => s - 1)
  }, [step])

  const handleSkip = useCallback(() => {
    if (mode === 'global') completeTour()
    if (mode === 'page') completePageTour(location.pathname)
    setMode(null)
    setStep(0)
  }, [mode, location.pathname])

  if (!mode || !currentStep) return null

  const padding = 8
  const isGlobal = mode === 'global'

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding} y={targetRect.top - padding}
                width={targetRect.width + padding * 2} height={targetRect.height + padding * 2}
                rx="12" fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill={isGlobal ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'} mask="url(#tour-mask)" />
      </svg>

      {/* Highlight ring */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-white/80 shadow-lg shadow-white/20 transition-all duration-300"
          style={{
            top: targetRect.top - padding, left: targetRect.left - padding,
            width: targetRect.width + padding * 2, height: targetRect.height + padding * 2,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Click catcher */}
      <div className="absolute inset-0" onClick={handleSkip} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        onClick={e => e.stopPropagation()}
        className="absolute bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 transition-all duration-300"
        style={{
          top: tooltipPos.top, left: tooltipPos.left,
          width: 340, maxWidth: 'calc(100vw - 32px)',
          zIndex: 10000, pointerEvents: 'auto',
        }}
      >
        {/* Arrow */}
        <div
          className="absolute w-3 h-3 bg-white border border-gray-200 rotate-45"
          style={{
            ...(tooltipPos.arrowDir === 'top' && { top: -7, left: '50%', marginLeft: -6, borderBottom: 'none', borderRight: 'none' }),
            ...(tooltipPos.arrowDir === 'bottom' && { bottom: -7, left: '50%', marginLeft: -6, borderTop: 'none', borderLeft: 'none' }),
            ...(tooltipPos.arrowDir === 'left' && { left: -7, top: '50%', marginTop: -6, borderTop: 'none', borderRight: 'none' }),
            ...(tooltipPos.arrowDir === 'right' && { right: -7, top: '50%', marginTop: -6, borderBottom: 'none', borderLeft: 'none' }),
          }}
        />

        {/* Close */}
        <button onClick={handleSkip} className="absolute top-3 right-3 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
          <X size={14} />
        </button>

        {/* Mode badge */}
        {!isGlobal && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-medium mb-2">
            Seiten-Hilfe
          </div>
        )}

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-200 ${i === step ? 'w-5 bg-black' : i < step ? 'w-2 bg-gray-300' : 'w-2 bg-gray-200'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="flex items-start gap-2.5 mb-3">
          {isGlobal && step === 0 && <Sparkles size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />}
          <div>
            <h3 className="text-sm font-bold text-black leading-tight">{currentStep.title}</h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{currentStep.text}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Überspringen
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={handlePrev} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft size={12} /> Zurück
              </button>
            )}
            <button onClick={handleNext} className="flex items-center gap-1 px-4 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
              {step === steps.length - 1 ? (isGlobal ? 'Los geht\'s!' : 'Verstanden') : 'Weiter'}
              {step < steps.length - 1 && <ArrowRight size={12} />}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-2">{step + 1} von {steps.length}</p>
      </div>
    </div>
  )
}
