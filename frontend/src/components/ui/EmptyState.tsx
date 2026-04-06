/**
 * EmptyState — Core UI Component
 * When no data available (with Icon + CTA)
 */
import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center py-10 px-4 ${className}`}>
      {icon && (
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      {description && <p className="text-xs text-gray-400 mb-4 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
