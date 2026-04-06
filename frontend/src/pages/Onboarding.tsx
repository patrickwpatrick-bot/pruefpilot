/**
 * Onboarding Wizard — 5-Schritt Fragebogen (Shopify-Style)
 * Route: /onboarding (öffentlich, vor der Registrierung)
 *
 * Flow: /preise → /onboarding → /login?register=1
 * Die Antworten werden als URL-Params an /login übergeben
 * und beim Register mitgeschickt (oder in localStorage gespeichert).
 */
import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Check, ChevronLeft, ChevronRight, Shield,
  Factory, Hammer, HardHat, Truck, ShoppingBag,
  Utensils, Heart, Briefcase, GraduationCap, Landmark,
  Building2, ClipboardCheck, Users, AlertTriangle,
  FlaskConical, FileSpreadsheet, FolderOpen, Monitor, Zap,
} from 'lucide-react'

/* ── Types ──────────────────────────────────────────────── */

interface OnboardingOption {
  id: string
  label: string
  description?: string
  icon?: React.ElementType
}

interface OnboardingStep {
  id: string
  title: string
  subtitle: string
  type: 'single' | 'multi'
  options: OnboardingOption[]
}

/* ── Step Data ──────────────────────────────────────────── */

const steps: OnboardingStep[] = [
  {
    id: 'employees',
    title: 'Wie viele Mitarbeiter hat Ihr Unternehmen?',
    subtitle: 'So finden wir den passenden Plan für Sie.',
    type: 'single',
    options: [
      { id: '1-10', label: '1–10', description: 'Kleinstunternehmen' },
      { id: '11-25', label: '11–25', description: 'Kleines Unternehmen' },
      { id: '26-75', label: '26–75', description: 'Wachsendes Unternehmen' },
      { id: '76-150', label: '76–150', description: 'Mittelstand' },
      { id: '151-250', label: '151–250', description: 'Gehobener Mittelstand' },
      { id: '250+', label: '250+', description: 'Großunternehmen' },
    ],
  },
  {
    id: 'industry',
    title: 'In welcher Branche ist Ihr Unternehmen tätig?',
    subtitle: 'Das hilft uns, Ihnen die relevantesten Funktionen zu zeigen.',
    type: 'single',
    options: [
      { id: 'produktion', label: 'Produktion & Fertigung', icon: Factory },
      { id: 'handwerk', label: 'Handwerk', icon: Hammer },
      { id: 'bau', label: 'Bauwesen', icon: HardHat },
      { id: 'logistik', label: 'Logistik & Transport', icon: Truck },
      { id: 'handel', label: 'Handel & Einzelhandel', icon: ShoppingBag },
      { id: 'gastronomie', label: 'Gastronomie & Hotel', icon: Utensils },
      { id: 'gesundheit', label: 'Gesundheitswesen', icon: Heart },
      { id: 'dienstleistung', label: 'Dienstleistung & Büro', icon: Briefcase },
      { id: 'bildung', label: 'Bildung & Forschung', icon: GraduationCap },
      { id: 'oeffentlich', label: 'Öffentlicher Dienst', icon: Landmark },
      { id: 'sonstige', label: 'Sonstige Branche', icon: Building2 },
    ],
  },
  {
    id: 'modules',
    title: 'Welche Bereiche interessieren Sie?',
    subtitle: 'Wählen Sie mehrere — wir empfehlen dann den richtigen Plan.',
    type: 'multi',
    options: [
      { id: 'pruefmanager', label: 'Prüf-Manager', description: 'Prüftermine, Protokolle & Erinnerungen', icon: ClipboardCheck },
      { id: 'unterweisungen', label: 'Unterweisungen', description: 'Schulungen planen & dokumentieren', icon: Users },
      { id: 'gbu', label: 'Gefährdungsbeurteilungen', description: 'Risiken bewerten & Maßnahmen tracken', icon: AlertTriangle },
      { id: 'gefahrstoffe', label: 'Gefahrstoffe + KI', description: 'Gefahrstoffkataster mit KI-Analyse', icon: FlaskConical },
      { id: 'fremdfirmen', label: 'Fremdfirmenmanagement', description: 'Externe Firmen & Kontraktoren verwalten', icon: Building2 },
    ],
  },
  {
    id: 'current',
    title: 'Wie managen Sie Arbeitsschutz aktuell?',
    subtitle: 'Damit verstehen wir, wie wir Sie am besten unterstützen.',
    type: 'single',
    options: [
      { id: 'excel', label: 'Excel / Tabellen', description: 'Listen und Tabellen in Excel oder Google Sheets', icon: FileSpreadsheet },
      { id: 'papier', label: 'Papier / Ordner', description: 'Ausdrucke, Aktenordner, Aushänge', icon: FolderOpen },
      { id: 'software', label: 'Andere Software', description: 'Ein anderes Tool oder System', icon: Monitor },
      { id: 'nichts', label: 'Noch gar nicht', description: 'Wir fangen gerade erst an', icon: Zap },
    ],
  },
  {
    id: 'role',
    title: 'Welche Rolle haben Sie im Unternehmen?',
    subtitle: 'So können wir Ihre Erfahrung personalisieren.',
    type: 'single',
    options: [
      { id: 'geschaeftsfuehrung', label: 'Geschäftsführung', description: 'CEO, Inhaber, Managing Director' },
      { id: 'sifa', label: 'Sicherheitsfachkraft (SiFa)', description: 'Fachkraft für Arbeitssicherheit' },
      { id: 'sibe', label: 'Sicherheitsbeauftragter (SiBe)', description: 'Ehrenamtlicher Sicherheitsbeauftragter' },
      { id: 'hr', label: 'HR / Personal', description: 'Personalleitung, HR-Manager' },
      { id: 'betriebsleitung', label: 'Betriebsleitung', description: 'Standort- oder Abteilungsleiter' },
      { id: 'sonstige', label: 'Andere Rolle', description: 'QM, Facility Management, etc.' },
    ],
  },
]

/* ── Component ──────────────────────────────────────────── */

export function OnboardingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedPlan = (location.state as { selectedPlan?: string } | null)?.selectedPlan

  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})

  const step = steps[currentStep]
  const totalSteps = steps.length
  const progress = ((currentStep) / totalSteps) * 100

  const currentAnswer = answers[step.id]
  const hasAnswer = step.type === 'multi'
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : !!currentAnswer

  function selectOption(optionId: string) {
    if (step.type === 'multi') {
      const current = (answers[step.id] as string[]) || []
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
      setAnswers({ ...answers, [step.id]: updated })
    } else {
      setAnswers({ ...answers, [step.id]: optionId })
    }
  }

  function isSelected(optionId: string) {
    if (step.type === 'multi') {
      return ((answers[step.id] as string[]) || []).includes(optionId)
    }
    return answers[step.id] === optionId
  }

  function handleNext() {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      finishOnboarding()
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  function finishOnboarding() {
    // Onboarding-Daten in localStorage speichern für Register-Seite
    localStorage.setItem('pruefpilot_onboarding', JSON.stringify({
      ...answers,
      selectedPlan,
    }))
    // Weiter zur Registrierung
    navigate('/login?register=1')
  }

  function skipOnboarding() {
    navigate('/login?register=1')
  }

  // Grid layout basierend auf Optionen
  const optionCount = step.options.length
  const gridClass = optionCount <= 4
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top Bar ──────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/preise" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-950 rounded-lg flex items-center justify-center">
              <Shield className="text-white" size={13} />
            </div>
            <span className="text-base font-bold text-gray-950 tracking-tight">PrüfPilot</span>
          </Link>
          <button
            onClick={skipOnboarding}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Überspringen
          </button>
        </div>
        {/* Progress Bar */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-0.5 bg-gray-900 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Card Area ────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center pt-8 sm:pt-14 pb-8 px-4">
        <div className="w-full max-w-xl relative">
          {/* Stacked card effect (Shopify-Style) */}
          <div className="absolute inset-x-4 -top-2 h-4 bg-white rounded-t-2xl border border-gray-200 opacity-50" />
          <div className="absolute inset-x-2 -top-1 h-4 bg-white rounded-t-2xl border border-gray-200 opacity-75" />

          {/* Main Card */}
          <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            {/* Step dots */}
            <div className="flex items-center gap-1.5 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-8 bg-gray-900'
                      : i < currentStep
                      ? 'w-4 bg-gray-400'
                      : 'w-4 bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              {step.title}
            </h2>
            <p className="text-sm text-gray-400 mb-7">{step.subtitle}</p>

            {/* Options Grid */}
            <div className={`grid ${gridClass} gap-2.5`}>
              {step.options.map((option) => {
                const selected = isSelected(option.id)
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    onClick={() => selectOption(option.id)}
                    className={`relative flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-150 hover:border-gray-300'
                    }`}
                  >
                    {Icon && (
                      <div className={`flex-shrink-0 mt-0.5 ${selected ? 'text-gray-900' : 'text-gray-300'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`block text-sm font-medium ${selected ? 'text-gray-900' : 'text-gray-600'}`}>
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="block text-xs text-gray-400 mt-0.5">{option.description}</span>
                      )}
                    </div>
                    {selected && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 bg-gray-900 rounded-md flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    {!selected && step.type === 'multi' && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 border border-gray-200 rounded-md" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-50">
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zurück
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleNext}
                disabled={!hasAnswer}
                className={`flex items-center gap-1 text-sm font-semibold px-5 py-2 rounded-xl transition-all ${
                  hasAnswer
                    ? 'text-gray-900 hover:bg-gray-50'
                    : 'text-gray-200 cursor-not-allowed'
                }`}
              >
                {currentStep === totalSteps - 1 ? 'Weiter zur Registrierung' : 'Weiter'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
