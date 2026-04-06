/**
 * Toast — Core UI Component
 * Notifications: success, error, info
 * Usage: import { useToast } from '@/components/ui/Toast'; const toast = useToast(); toast.success('Gespeichert!')
 */
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

const typeStyles: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  success: {
    icon: <CheckCircle size={16} className="text-green-500" />,
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
  },
  error: {
    icon: <AlertCircle size={16} className="text-red-500" />,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
  },
  info: {
    icon: <Info size={16} className="text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
}

interface ToastContextType {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const api: ToastContextType = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
        {toasts.map(t => {
          const style = typeStyles[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-lg ${style.bg} ${style.border} animate-[slideIn_0.2s_ease-out]`}
            >
              <span className="flex-shrink-0 mt-0.5">{style.icon}</span>
              <p className={`text-sm flex-1 ${style.text}`}>{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
