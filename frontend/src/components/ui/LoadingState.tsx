/**
 * LoadingState — Consistent loading indicator
 */
export function LoadingState({ text = 'Laden...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}
