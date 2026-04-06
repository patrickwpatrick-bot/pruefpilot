/**
 * Input — Core UI Component
 * Types: text, email, password, number, textarea
 * With: label, error message, hint
 */
import React, { forwardRef } from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  inputSize?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, inputSize = 'md', className = '', required, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {label}{required && ' *'}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border ${
            error ? 'border-red-300 focus:ring-red-400 focus:border-red-400' : 'border-gray-200 focus:ring-black focus:border-black'
          } bg-white focus:ring-1 outline-none transition-colors placeholder:text-gray-300 ${sizeStyles[inputSize]} ${className}`}
          {...props}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        {hint && !error && <p className="text-gray-400 text-[10px] mt-1">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', required, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {label}{required && ' *'}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full rounded-lg border ${
            error ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-black focus:border-black'
          } bg-white focus:ring-1 outline-none transition-colors placeholder:text-gray-300 px-3 py-2 text-sm resize-none ${className}`}
          {...props}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        {hint && !error && <p className="text-gray-400 text-[10px] mt-1">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
