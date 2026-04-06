/**
 * Public Training Signing — no auth required
 * Employees access via link, read training content, and sign with name
 */
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface TrainingData {
  vorlage_name: string
  vorlage_inhalt: string
  mitarbeiter_name: string
  organisation_name: string
  already_signed: boolean
  signed_at?: string
}

type State = 'loading' | 'content' | 'error' | 'signed'

export function PublicSigningPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setstate] = useState<State>('loading')
  const [data, setData] = useState<TrainingData | null>(null)
  const [error, setError] = useState('')
  const [scrollPercent, setScrollPercent] = useState(0)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [signature, setSignature] = useState('')
  const [isSigningLoading, setIsSigningLoading] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch training data
  useEffect(() => {
    if (!token) {
      setError('Token fehlend')
      setstate('error')
      return
    }

    const fetchData = async () => {
      try {
        const response = await axios.get(
          `/api/v1/public/unterweisung/${token}`
        )
        const trainData = response.data
        setData(trainData)

        if (trainData.already_signed) {
          setstate('signed')
        } else {
          setstate('content')
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          setError('Link ungültig oder abgelaufen')
        } else {
          setError('Fehler beim Laden der Unterweisung')
        }
        setstate('error')
      }
    }

    fetchData()
  }, [token])

  // Scroll tracking
  const handleScroll = () => {
    if (!contentRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current
    const totalScroll = scrollTop + clientHeight
    const percent = (totalScroll / scrollHeight) * 100
    setScrollPercent(Math.min(percent, 100))

    // Enable checkbox when scrolled 90% through
    if (percent >= 90 && !hasConfirmed) {
      setHasConfirmed(false) // Allow checking
    }
  }

  // Handle signing
  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !hasConfirmed || !signature.trim()) return

    setIsSigningLoading(true)
    try {
      await axios.post(
        `/api/v1/public/unterweisung/${token}/sign`,
        {
          unterschrift_name: signature,
          gelesen_bestaetigt: true,
        }
      )
      setstate('signed')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Fehler beim Unterschreiben')
    } finally {
      setIsSigningLoading(false)
    }
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Lädt Unterweisung...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-black mb-2">
            {error}
          </h2>
          <p className="text-sm text-gray-400">
            Bitte überprüfe den Link oder kontaktiere deinen Administrator
          </p>
        </div>
      </div>
    )
  }

  // Already signed state
  if (state === 'signed' && data?.already_signed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-black mb-2">
            Vielen Dank!
          </h2>
          <p className="text-sm text-gray-400">
            Diese Unterweisung wurde bereits am{' '}
            <span className="font-medium text-gray-600">
              {data.signed_at ? new Date(data.signed_at).toLocaleDateString('de-DE') : 'bekannt'}
            </span>
            {' '}unterschrieben
          </p>
        </div>
      </div>
    )
  }

  // Success state (just signed)
  if (state === 'signed') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto animate-bounce" />
          </div>
          <h2 className="text-lg font-semibold text-black mb-2">
            Vielen Dank!
          </h2>
          <p className="text-sm text-gray-400">
            Die Unterweisung wurde erfolgreich unterschrieben.
          </p>
        </div>
      </div>
    )
  }

  // Content state
  if (!data) return null

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black tracking-tight">PrüfPilot</h1>
          <p className="text-sm text-gray-400 mt-1">Arbeitsschutz-Zentrale</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {data.organisation_name}
            </p>
            <h2 className="text-2xl font-bold text-black mb-1">
              {data.vorlage_name}
            </h2>
            <p className="text-sm text-gray-500">
              Unterweisung für: <span className="font-medium text-gray-700">{data.mitarbeiter_name}</span>
            </p>
          </div>

          {/* Content Container with Scroll Tracking */}
          <form onSubmit={handleSign} className="space-y-6">
            {/* Scroll Progress Bar */}
            <div className="relative h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-150"
                style={{ width: `${scrollPercent}%` }}
              />
            </div>

            {/* Content */}
            <div
              ref={contentRef}
              onScroll={handleScroll}
              className="relative h-64 overflow-y-auto bg-gray-50 rounded-lg p-6 text-sm text-gray-700 leading-relaxed border border-gray-100"
            >
              <div
                dangerouslySetInnerHTML={{ __html: data.vorlage_inhalt }}
                className="prose prose-sm max-w-none text-gray-700"
              />

              {/* Scroll Hint */}
              {scrollPercent < 90 && (
                <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg">
                  Bitte scrolle den gesamten Inhalt durch
                </div>
              )}
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={scrollPercent >= 90 ? hasConfirmed : false}
                onChange={e => setHasConfirmed(e.target.checked)}
                disabled={scrollPercent < 90}
                className="mt-1 w-4 h-4 rounded border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              />
              <span className={clsx(
                'text-sm leading-relaxed transition-colors',
                scrollPercent >= 90 ? 'text-gray-700' : 'text-gray-400'
              )}>
                Ich bestätige, dass ich den gesamten Inhalt gelesen und verstanden habe
              </span>
            </label>

            {/* Signature Field */}
            <input
              type="text"
              placeholder="Ihr vollständiger Name als digitale Unterschrift"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              disabled={scrollPercent < 90}
              className={clsx(
                'w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm',
                'placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black',
                'outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!hasConfirmed || !signature.trim() || scrollPercent < 90 || isSigningLoading}
              className={clsx(
                'w-full py-2.5 bg-black text-white rounded-lg text-sm font-medium',
                'transition-colors disabled:opacity-40',
                !isSigningLoading && 'hover:bg-gray-800'
              )}
            >
              {isSigningLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Unterschreiben...
                </span>
              ) : 'Unterschreiben'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-300 mt-8">
          &copy; 2026 PrüfPilot
        </p>
      </div>
    </div>
  )
}
