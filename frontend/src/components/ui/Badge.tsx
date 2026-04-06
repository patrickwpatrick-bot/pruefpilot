/**
 * Badge — Core UI Component
 * Status pills: success, warning, danger, neutral, info
 */
import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  danger: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
}

export function Badge({ variant = 'neutral', children, dot = false, className = '' }: BadgeProps) {
  const styles = variantStyles[variant]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </span>
  )
}
