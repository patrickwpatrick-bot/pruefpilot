/**
 * Pricing Page — Öffentliche Preisseite (Shopify-Style)
 * Route: /preise (Startseite für neue Besucher)
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Check, X, ChevronDown, ChevronUp, Shield, FileCheck,
  AlertTriangle, FlaskConical, Building2, Users, Zap,
  Headphones, ArrowRight,
} from 'lucide-react'

/* ── Plan data ─────────────────────────────────────────── */

const plans = [
  {
    name: 'Basic',
    subtitle: 'Für kleine Betriebe',
    monthlyPrice: 29,
    yearlyPrice: 24,
    popular: false,
    cta: 'Kostenlos testen',
    employees: 'Bis zu 25 Mitarbeiter',
    modules: ['Prüf-Manager'],
    features: [
      'Prüftermine verwalten',
      'Automatische Erinnerungen',
      'Prüfprotokolle erstellen',
      'Dashboard & Übersichten',
      '1 Admin-Benutzer',
      'E-Mail-Support',
    ],
  },
  {
    name: 'Standard',
    subtitle: 'Für wachsende Teams',
    monthlyPrice: 79,
    yearlyPrice: 66,
    popular: true,
    cta: 'Kostenlos testen',
    employees: 'Bis zu 75 Mitarbeiter',
    modules: ['Prüf-Manager', 'Unterweisungen'],
    features: [
      'Alles aus Basic',
      'Unterweisungen planen & dokumentieren',
      'Teilnehmer-Tracking',
      'Nachweisdokumente generieren',
      'Bis zu 5 Benutzer',
      'Prioritäts-Support',
    ],
  },
  {
    name: 'Professional',
    subtitle: 'Für mittlere Unternehmen',
    monthlyPrice: 149,
    yearlyPrice: 124,
    popular: false,
    cta: 'Kostenlos testen',
    employees: 'Bis zu 150 Mitarbeiter',
    modules: ['Prüf-Manager', 'Unterweisungen', 'Gefährdungsbeurteilungen'],
    features: [
      'Alles aus Standard',
      'Gefährdungsbeurteilungen erstellen',
      'Maßnahmen-Tracking',
      'Risikobewertung nach Nohl',
      'Bis zu 15 Benutzer',
      'Telefon-Support',
    ],
  },
  {
    name: 'Enterprise',
    subtitle: 'Für große Organisationen',
    monthlyPrice: 249,
    yearlyPrice: 209,
    popular: false,
    cta: 'Kontakt aufnehmen',
    employees: '250+ Mitarbeiter',
    modules: [
      'Prüf-Manager',
      'Unterweisungen',
      'Gefährdungsbeurteilungen',
      'Gefahrstoffe + KI',
      'Fremdfirmenmanagement',
    ],
    features: [
      'Alles aus Professional',
      'Gefahrstoffkataster mit KI',
      'Fremdfirmenmanagement',
      'Sicherheitsdatenblatt-Analyse (KI)',
      'Unbegrenzte Benutzer',
      'Persönlicher Ansprechpartner',
    ],
  },
]

const comparisonData = [
  {
    category: 'Module',
    features: [
      { name: 'Prüf-Manager', values: [true, true, true, true] },
      { name: 'Unterweisungen', values: [false, true, true, true] },
      { name: 'Gefährdungsbeurteilungen', values: [false, false, true, true] },
      { name: 'Gefahrstoffe + KI', values: [false, false, false, true] },
      { name: 'Fremdfirmenmanagement', values: [false, false, false, true] },
    ],
  },
  {
    category: 'Prüf-Manager',
    features: [
      { name: 'Prüftermine verwalten', values: [true, true, true, true] },
      { name: 'Automatische Erinnerungen', values: [true, true, true, true] },
      { name: 'Prüfprotokolle', values: [true, true, true, true] },
      { name: 'Dokumenten-Upload', values: ['10 GB', '50 GB', '200 GB', 'Unbegrenzt'] },
      { name: 'Benutzerdefinierte Prüfvorlagen', values: [false, true, true, true] },
      { name: 'API-Zugang', values: [false, false, true, true] },
    ],
  },
  {
    category: 'Unterweisungen',
    features: [
      { name: 'Unterweisungen planen', values: [false, true, true, true] },
      { name: 'Teilnehmer-Tracking', values: [false, true, true, true] },
      { name: 'Nachweisdokumente', values: [false, true, true, true] },
      { name: 'E-Learning Integration', values: [false, false, true, true] },
      { name: 'Automatische Wiedervorlage', values: [false, true, true, true] },
    ],
  },
  {
    category: 'Support & Verwaltung',
    features: [
      { name: 'Mitarbeiter', values: ['Bis zu 25', 'Bis zu 75', 'Bis zu 150', '250+'] },
      { name: 'Admin-Benutzer', values: ['1', '5', '15', 'Unbegrenzt'] },
      { name: 'Support', values: ['E-Mail', 'Priorität', 'Telefon', 'Persönlich'] },
      { name: 'Onboarding-Hilfe', values: [false, 'Webinar', '1:1 Setup', 'Dediziert'] },
      { name: 'SLA-Garantie', values: [false, false, '99,5%', '99,9%'] },
    ],
  },
]

const faqs = [
  {
    q: 'Was ist PrüfPilot und für wen ist es geeignet?',
    a: 'PrüfPilot ist eine All-in-One-Plattform für Arbeitsschutz und Compliance, speziell entwickelt für kleine und mittlere Unternehmen in Deutschland. Ob Prüftermine, Unterweisungen, Gefährdungsbeurteilungen oder Gefahrstoffe — PrüfPilot digitalisiert Ihre gesamte Arbeitsschutz-Dokumentation.',
  },
  {
    q: 'Kann ich jederzeit meinen Plan wechseln?',
    a: 'Ja, Sie können jederzeit upgraden oder downgraden. Bei einem Upgrade wird die Differenz anteilig berechnet. Bei einem Downgrade wird das Guthaben auf die nächste Rechnung angerechnet.',
  },
  {
    q: 'Gibt es eine kostenlose Testphase?',
    a: 'Ja! Sie können PrüfPilot 14 Tage lang kostenlos und unverbindlich testen — ohne Kreditkarte. Nach Ablauf der Testphase wählen Sie einfach den Plan, der zu Ihrem Unternehmen passt.',
  },
  {
    q: 'Sind meine Daten sicher?',
    a: 'Absolut. Alle Daten werden auf deutschen Servern (Hetzner) gehostet und sind nach DSGVO geschützt. Wir verwenden SSL-Verschlüsselung und regelmäßige Backups für maximale Sicherheit.',
  },
  {
    q: 'Kann ich jederzeit kündigen?',
    a: 'Ja, Sie können Ihr Abonnement jederzeit zum Monatsende kündigen. Bei Jahresabonnements gilt die Kündigung zum Ende der Laufzeit. Es gibt keine versteckten Kosten oder Mindestlaufzeiten bei Monatsplänen.',
  },
  {
    q: 'Wie funktioniert der Enterprise-Plan?',
    a: 'Der Enterprise-Plan ist unsere Komplettlösung mit allen Modulen inkl. KI-gestützter Gefahrstoff-Analyse und Fremdfirmenmanagement. Kontaktieren Sie uns für ein individuelles Angebot und persönliches Onboarding.',
  },
]

const moduleIcons: Record<string, React.ElementType> = {
  'Prüf-Manager': FileCheck,
  'Unterweisungen': Users,
  'Gefährdungsbeurteilungen': AlertTriangle,
  'Gefahrstoffe + KI': FlaskConical,
  'Fremdfirmenmanagement': Building2,
}

/* ── Sub-Components ─────────────────────────────────────── */

function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-medium text-gray-900">{faq.q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-4" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-4" />
        }
      </button>
      {open && (
        <div className="pb-5 pr-12">
          <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
        </div>
      )}
    </div>
  )
}

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-gray-900 mx-auto" />
  if (value === false) return <X className="h-4 w-4 text-gray-200 mx-auto" />
  return <span className="text-xs text-gray-600 font-medium">{value}</span>
}

/* ── Main Component ─────────────────────────────────────── */

export function PreisePage() {
  const navigate = useNavigate()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [showComparison, setShowComparison] = useState(false)

  const discount = 17

  // Onboarding starten mit gewähltem Plan
  function handleCTA(planName: string) {
    if (planName === 'Enterprise') {
      // Enterprise -> Kontaktseite (vorerst Login)
      navigate('/login')
    } else {
      // Normaler Plan -> Onboarding-Wizard -> Register
      navigate('/onboarding', { state: { selectedPlan: planName } })
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/preise" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-950 rounded-lg flex items-center justify-center">
                <Shield className="text-white" size={15} />
              </div>
              <span className="text-lg font-bold text-gray-950 tracking-tight">PrüfPilot</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm text-gray-500 hover:text-gray-900 font-medium px-3 py-2 transition-colors"
              >
                Anmelden
              </Link>
              <button
                onClick={() => navigate('/onboarding')}
                className="text-sm bg-gray-950 hover:bg-gray-800 text-white font-medium px-4 py-2 rounded-xl transition-colors"
              >
                Kostenlos testen
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="pt-16 pb-8 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight leading-tight">
            Pläne und Preise
          </h1>
          <p className="mt-4 text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            Starten Sie kostenlos und wählen Sie den Plan, der zu Ihrem Unternehmen passt.
            14 Tage kostenlos testen — ohne Kreditkarte.
          </p>
        </div>
      </section>

      {/* ── Billing Toggle ──────────────────────────────── */}
      <section className="pb-4 pt-4">
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>
            Monatlich
          </span>
          <button
            onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              billing === 'yearly' ? 'bg-gray-900' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                billing === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${billing === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
            Jährlich
          </span>
          {billing === 'yearly' && (
            <span className="ml-1 bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              Spare {discount}%
            </span>
          )}
        </div>
      </section>

      {/* ── Pricing Cards ───────────────────────────────── */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => {
              const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
              const isPopular = plan.popular
              const isEnterprise = plan.name === 'Enterprise'

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    isPopular
                      ? 'bg-white ring-2 ring-gray-900 shadow-lg'
                      : isEnterprise
                      ? 'bg-gray-950 text-white'
                      : 'bg-white border border-gray-150 hover:border-gray-300 transition-colors'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gray-900 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                        Beliebteste Wahl
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className={`text-base font-bold ${isEnterprise ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs mt-1 ${isEnterprise ? 'text-gray-400' : 'text-gray-400'}`}>
                      {plan.subtitle}
                    </p>
                  </div>

                  <div className="mb-1">
                    {billing === 'yearly' && !isEnterprise && (
                      <span className="text-sm text-gray-300 line-through mr-2">{plan.monthlyPrice} €</span>
                    )}
                    <span className={`text-3xl font-bold tracking-tight ${isEnterprise ? 'text-white' : 'text-gray-900'}`}>
                      {price} €
                    </span>
                    <span className={`text-sm ${isEnterprise ? 'text-gray-400' : 'text-gray-400'}`}>
                      /Monat
                    </span>
                  </div>

                  {billing === 'yearly' ? (
                    <p className={`text-xs mb-4 ${isEnterprise ? 'text-gray-500' : 'text-gray-300'}`}>
                      Jährliche Abrechnung
                    </p>
                  ) : <div className="mb-4" />}

                  <p className={`text-xs font-medium mb-4 ${isEnterprise ? 'text-gray-300' : 'text-gray-500'}`}>
                    {plan.employees}
                  </p>

                  {/* Module Tags */}
                  <div className="mb-5">
                    <div className="flex flex-wrap gap-1.5">
                      {plan.modules.map((mod) => {
                        const Icon = moduleIcons[mod] || Shield
                        return (
                          <span
                            key={mod}
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
                              isEnterprise
                                ? 'bg-white/10 text-gray-300'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {mod}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleCTA(plan.name)}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all mb-5 ${
                      isPopular
                        ? 'bg-gray-900 hover:bg-gray-800 text-white'
                        : isEnterprise
                        ? 'bg-white hover:bg-gray-100 text-gray-900'
                        : 'border border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  {/* Features */}
                  <div className="flex-1">
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check
                            className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              isEnterprise ? 'text-gray-400' : 'text-gray-900'
                            }`}
                          />
                          <span className={`text-xs ${isEnterprise ? 'text-gray-300' : 'text-gray-500'}`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-gray-300 mt-6">
            * Der jährliche Rabatt von {discount}% gilt für Basic, Standard und Professional.
          </p>
        </div>
      </section>

      {/* ── Comparison Toggle ───────────────────────────── */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            Alle Funktionen vergleichen
            {showComparison ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showComparison && (
          <div className="max-w-7xl mx-auto mt-8 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-4 px-4 w-1/3" />
                  {plans.map((plan) => (
                    <th key={plan.name} className="text-center py-4 px-4">
                      <span className={`text-xs font-bold ${plan.popular ? 'text-gray-900' : 'text-gray-600'}`}>
                        {plan.name}
                      </span>
                      <br />
                      <span className="text-xs text-gray-400">
                        ab {billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice} €/Monat
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              {comparisonData.map((section) => (
                <tbody key={section.category}>
                  <tr>
                    <td colSpan={5} className="pt-6 pb-2 px-4">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        {section.category}
                      </span>
                    </td>
                  </tr>
                  {section.features.map((feature, i) => (
                    <tr
                      key={feature.name}
                      className={`${i % 2 === 0 ? 'bg-gray-50/50' : ''} border-b border-gray-50`}
                    >
                      <td className="py-3 px-4 text-xs text-gray-500">{feature.name}</td>
                      {feature.values.map((val, j) => (
                        <td key={j} className="py-3 px-4 text-center">
                          <CellValue value={val} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </section>

      {/* ── Benefits ────────────────────────────────────── */}
      <section className="py-16 border-t border-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            In jedem Plan enthalten
          </h2>
          <p className="text-sm text-gray-400 text-center mb-12 max-w-lg mx-auto">
            Jeder PrüfPilot-Plan enthält die Grundlagen für sicheres und rechtskonformes Arbeiten.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: Shield, title: 'DSGVO-konform · Deutsche Server', desc: 'Alle Daten auf Hetzner in Deutschland. SSL-Verschlüsselung, regelmäßige Backups.' },
              { icon: FileCheck, title: 'Automatische Erinnerungen', desc: 'Nie wieder Prüffristen verpassen. PrüfPilot erinnert rechtzeitig an fällige Prüfungen.' },
              { icon: Zap, title: 'Sofort einsatzbereit', desc: 'Registrieren, Daten eingeben, loslegen — ohne komplizierte Einrichtung.' },
              { icon: Users, title: 'Mehrere Benutzer & Rollen', desc: 'Individuelle Zugriffsrechte für Ihr Team. Jeder sieht was er braucht.' },
              { icon: Headphones, title: 'Deutscher Support', desc: 'Unser Team sitzt in Deutschland — per E-Mail, Telefon oder persönlich.' },
              { icon: Building2, title: 'Für KMUs gemacht', desc: 'Ohne Enterprise-Komplexität, mit voller Leistung. Speziell für den Mittelstand.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-50 rounded-xl mb-3">
                  <Icon className="h-5 w-5 text-gray-900" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="py-16 px-4 border-t border-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Häufig gestellte Fragen
          </h2>
          <p className="text-sm text-gray-400 text-center mb-8">
            Noch Fragen? Hier finden Sie Antworten.
          </p>
          <div>
            {faqs.map((faq) => (
              <FAQItem key={faq.q} faq={faq} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────── */}
      <section className="py-16 bg-gray-950">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="text-2xl font-bold text-white mb-3">
            Bereit, Ihren Arbeitsschutz zu digitalisieren?
          </h2>
          <p className="text-gray-500 mb-8 text-sm">
            14 Tage kostenlos, ohne Kreditkarte, ohne Risiko.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/onboarding')}
              className="bg-white hover:bg-gray-100 text-gray-900 font-semibold px-8 py-3 rounded-xl text-sm transition-colors inline-flex items-center justify-center gap-2"
            >
              Kostenlos testen
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/login"
              className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-medium px-8 py-3 rounded-xl text-sm transition-colors text-center"
            >
              Anmelden
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-gray-950 border-t border-gray-800 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <Shield className="text-gray-950" size={12} />
            </div>
            <span className="text-sm font-semibold text-white">PrüfPilot</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/impressum" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Impressum</Link>
            <Link to="/datenschutz" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Datenschutz</Link>
          </div>
          <p className="text-xs text-gray-600">© 2026 PrüfPilot</p>
        </div>
      </footer>
    </div>
  )
}
