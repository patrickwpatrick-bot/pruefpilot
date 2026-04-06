/**
 * Login & Registration — Modern split-screen, market-ready
 * Supports ?register=1 query param from Onboarding flow
 * Reads onboarding data from localStorage (pruefpilot_onboarding)
 */
import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Shield, CheckCircle2, BarChart2, Star, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { BranchenAutocomplete } from '@/components/ui/BranchenAutocomplete'
import api from '@/lib/api'

// Onboarding-Daten aus dem Wizard
interface OnboardingData {
  employees?: string
  industry?: string
  modules?: string[]
  current?: string
  role?: string
  selectedPlan?: string
}

// Branche aus Onboarding-ID zu lesbarem Namen mappen
const industryTobranche: Record<string, string> = {
  produktion: 'Produktion & Fertigung',
  handwerk: 'Handwerk',
  bau: 'Bauwesen',
  logistik: 'Logistik & Transport',
  handel: 'Handel & Einzelhandel',
  gastronomie: 'Gastronomie & Hotel',
  gesundheit: 'Gesundheitswesen',
  dienstleistung: 'Dienstleistung & Büro',
  bildung: 'Bildung & Forschung',
  oeffentlich: 'Öffentlicher Dienst',
  sonstige: '',
}

export function Login() {
  const [searchParams] = useSearchParams()
  const registerFromOnboarding = searchParams.get('register') === '1'

  const [isRegister, setIsRegister] = useState(registerFromOnboarding)
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [firmenname, setFirmenname] = useState('')
  const [branche, setBranche] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  // Onboarding-Daten laden wenn vorhanden
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pruefpilot_onboarding')
      if (raw) {
        const data: OnboardingData = JSON.parse(raw)
        setOnboardingData(data)
        // Branche aus Onboarding vorausfüllen
        if (data.industry && industryTobranche[data.industry]) {
          setBranche(industryTobranche[data.industry])
        }
      }
    } catch { /* ignore */ }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register({ email, passwort, vorname, nachname, firmenname, branche })
        try {
          await api.post('/seed/default-checklisten')
          await api.post('/seed/default-unterweisungen')
          await api.post('/seed/branchen-checklisten')
        } catch { /* ignore */ }
        // Onboarding-Daten aufräumen
        localStorage.removeItem('pruefpilot_onboarding')
      } else {
        await login(email, passwort)
      }
      navigate(isRegister ? '/schnellstart' : '/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Shield,
      title: 'Prüfprotokolle in Minuten',
      desc: 'Rechtssichere Protokolle — direkt auf dem Tablet erstellt und per E-Mail versendet.',
    },
    {
      icon: CheckCircle2,
      title: 'BG-ready in 30 Tagen',
      desc: 'Dein BG-Ready-Score zeigt auf einen Blick, was noch fehlt — und was als nächstes zu tun ist.',
    },
    {
      icon: BarChart2,
      title: 'Alle Arbeitsmittel im Blick',
      desc: 'Ampelfarben, Fristen und QR-Codes halten dein Team immer auf dem aktuellen Stand.',
    },
  ]

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (desktop only) ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-950 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/[0.02] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/[0.02] rounded-full pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <Shield className="text-gray-950" size={18} />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">PrüfPilot</span>
          </div>
          <p className="text-gray-500 text-sm">Arbeitsschutz-Zentrale für den Mittelstand</p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-white text-3xl font-bold leading-tight mb-3">
              Arbeitsschutz.<br />
              <span className="text-gray-400">Endlich einfach.</span>
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Von der Prüfung bis zum Protokoll — alles digital, rechtssicher und in Minuten erledigt.
            </p>
          </div>

          <div className="space-y-5">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-9 h-9 bg-white/[0.07] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="text-white" size={16} />
                </div>
                <div>
                  <p className="text-white text-sm font-medium mb-0.5">{f.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="text-amber-400 fill-amber-400" size={13} />
            ))}
          </div>
          <p className="text-gray-400 text-sm italic">
            "Endlich haben wir den Überblick. Prüffristen verpassen war gestern."
          </p>
          <p className="text-gray-600 text-xs mt-1.5">— Marcus H., Betriebsleiter · Maschinenbau</p>
          <p className="text-gray-700 text-xs mt-4">Vertrauen von 500+ Betrieben in Deutschland</p>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden px-6 pt-8 pb-2 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-950 rounded-lg flex items-center justify-center">
            <Shield className="text-white" size={15} />
          </div>
          <span className="text-gray-950 text-lg font-bold tracking-tight">PrüfPilot</span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10">
          <div className="w-full max-w-sm mx-auto">
            {/* Zurück-Link wenn vom Onboarding kommend */}
            {isRegister && onboardingData && (
              <button
                onClick={() => navigate('/onboarding')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors"
              >
                <ArrowLeft size={12} />
                Zurück zum Fragebogen
              </button>
            )}

            <h1 className="text-2xl font-bold text-gray-950 mb-1">
              {isRegister ? 'Konto erstellen' : 'Willkommen zurück'}
            </h1>
            <p className="text-sm text-gray-400 mb-8">
              {isRegister
                ? onboardingData
                  ? 'Fast geschafft — erstellen Sie Ihr kostenloses Konto.'
                  : '30 Tage kostenlos testen — keine Kreditkarte nötig.'
                : 'Melde dich an, um fortzufahren.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isRegister && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Vorname</label>
                      <input
                        type="text"
                        placeholder="Max"
                        value={vorname}
                        onChange={e => setVorname(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Nachname</label>
                      <input
                        type="text"
                        placeholder="Mustermann"
                        value={nachname}
                        onChange={e => setNachname(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Firmenname</label>
                    <input
                      type="text"
                      placeholder="Mustermann GmbH"
                      value={firmenname}
                      onChange={e => setFirmenname(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Branche</label>
                    <BranchenAutocomplete
                      value={branche}
                      onChange={setBranche}
                      placeholder='Branche suchen — z.B. "CNC", "Bau"...'
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">E-Mail-Adresse</label>
                <input
                  type="email"
                  placeholder="max@mustermann.de"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-600">Passwort</label>
                  {!isRegister && (
                    <button type="button" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                      Passwort vergessen?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  placeholder={isRegister ? 'Mindestens 8 Zeichen' : '••••••••'}
                  value={passwort}
                  onChange={e => setPasswort(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gray-950 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 active:scale-[0.99] transition-all disabled:opacity-40 mt-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Bitte warten...
                  </span>
                ) : isRegister ? 'Kostenlos starten' : 'Anmelden'}
              </button>

              {isRegister && (
                <p className="text-center text-xs text-gray-400">
                  Mit der Registrierung akzeptierst du unsere{' '}
                  <Link to="/datenschutz" className="underline hover:text-gray-900 transition-colors">
                    Datenschutzerklärung
                  </Link>.
                </p>
              )}
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-400">
                {isRegister ? 'Bereits ein Konto?' : 'Noch kein Konto?'}{' '}
                <button
                  onClick={() => { setIsRegister(!isRegister); setError('') }}
                  className="text-gray-950 font-semibold hover:underline transition-colors"
                >
                  {isRegister ? 'Jetzt anmelden' : 'Kostenlos registrieren'}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-300">
            <Link to="/datenschutz" className="hover:text-gray-500 transition-colors">Datenschutz</Link>
            {' · '}
            <Link to="/impressum" className="hover:text-gray-500 transition-colors">Impressum</Link>
            {' · '}
            © 2026 PrüfPilot
          </p>
        </div>
      </div>
    </div>
  )
}
