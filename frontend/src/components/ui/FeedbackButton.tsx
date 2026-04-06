/**
 * FeedbackButton — Floating feedback button on every page
 */
import { useState } from 'react'
import { MessageSquarePlus, X, Send } from 'lucide-react'
import api from '@/lib/api'

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      // Send feedback to backend (could be stored or emailed)
      await api.post('/organisation/feedback', {
        text: text.trim(),
        seite: window.location.pathname,
      })
      setSent(true)
      setText('')
      setTimeout(() => { setSent(false); setOpen(false) }, 2000)
    } catch {
      // Still close on error
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false) }, 2000)
    }
    setSending(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center md:bottom-8 md:right-8"
        title="Feedback geben"
      >
        {open ? <X size={18} /> : <MessageSquarePlus size={18} />}
      </button>

      {/* Feedback popup */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl p-5 md:bottom-24 md:right-8">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-sm font-medium text-green-600">Danke für dein Feedback!</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-black mb-1">Was fehlt hier?</h3>
              <p className="text-xs text-gray-400 mb-3">Hilf uns, PrüfPilot besser zu machen.</p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Dein Feedback..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none resize-none"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                <Send size={14} /> Absenden
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
