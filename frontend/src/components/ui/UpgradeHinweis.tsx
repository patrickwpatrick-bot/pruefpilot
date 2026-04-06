/**
 * UpgradeHinweis — Friendly upgrade prompt when plan limits are reached
 */
import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

interface UpgradeHinweisProps {
  message: string
  current?: number
  max?: number
}

export function UpgradeHinweis({ message, current, max }: UpgradeHinweisProps) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="text-amber-600" size={16} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">{message}</p>
          {current !== undefined && max !== undefined && (
            <div className="mt-2">
              <div className="w-full bg-amber-200 rounded-full h-1.5">
                <div
                  className="bg-amber-500 rounded-full h-1.5 transition-all"
                  style={{ width: `${Math.min((current / max) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-amber-600 mt-1">{current} von {max} genutzt</p>
            </div>
          )}
          <Link
            to="/einstellungen?tab=billing"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Zap size={12} /> Upgrade ab 29€/Monat
          </Link>
        </div>
      </div>
    </div>
  )
}
