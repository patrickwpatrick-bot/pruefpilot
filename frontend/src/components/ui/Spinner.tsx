/**
 * Spinner — Core UI Component
 * Loading indicator in 3 sizes
 */
import React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[2.5px]',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${sizeStyles[size]} border-gray-300 border-t-black rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Wird geladen..."
    />
  )
}

/** Full-screen centered spinner */
export function SpinnerOverlay({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner size="lg" />
      {label && <p className="text-sm text-gray-400">{label}</p>}
    </div>
  )
}
