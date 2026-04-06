/**
 * EmptyState — Consistent empty state with icon and action
 */
import { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  icon: LucideIcon
  titel: string
  beschreibung: string
  actionLabel?: string
  actionLink?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, titel, beschreibung, actionLabel, actionLink, onAction }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="text-gray-400" size={20} />
      </div>
      <p className="text-black font-medium mb-1">{titel}</p>
      <p className="text-sm text-gray-400 mb-5">{beschreibung}</p>
      {actionLabel && actionLink && (
        <Link to={actionLink} className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionLink && (
        <button onClick={onAction} className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
