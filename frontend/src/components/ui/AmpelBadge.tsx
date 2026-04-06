/**
 * Traffic light badge — clean minimal style
 */
import { clsx } from 'clsx'
import type { AmpelFarbe } from '@/types'

const colorMap: Record<AmpelFarbe, { dot: string; bg: string; text: string; label: string }> = {
  gruen: { dot: 'bg-ampel-gruen', bg: 'bg-green-50', text: 'text-green-700', label: 'Aktuell' },
  gelb: { dot: 'bg-ampel-gelb', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Bald fällig' },
  rot: { dot: 'bg-ampel-rot', bg: 'bg-red-50', text: 'text-red-700', label: 'Überfällig' },
  unbekannt: { dot: 'bg-gray-300', bg: 'bg-gray-50', text: 'text-gray-500', label: 'Unbekannt' },
}

export function AmpelBadge({ status, className }: { status: AmpelFarbe; className?: string }) {
  const { dot, bg, text, label } = colorMap[status] ?? colorMap.unbekannt
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', bg, text, className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </span>
  )
}
