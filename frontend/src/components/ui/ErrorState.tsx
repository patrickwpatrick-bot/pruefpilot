/**
 * ErrorState — Consistent error display with retry option
 */
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  titel?: string
  beschreibung?: string
  onRetry?: () => void
}

export function ErrorState({
  titel = 'Etwas ist schiefgelaufen',
  beschreibung = 'Bitte versuche es erneut oder kontaktiere den Support.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="bg-white rounded-xl border border-red-100 p-10 text-center">
      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="text-red-500" size={20} />
      </div>
      <p className="text-black font-medium mb-1">{titel}</p>
      <p className="text-sm text-gray-400 mb-5">{beschreibung}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-black text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} /> Erneut versuchen
        </button>
      )}
    </div>
  )
}
