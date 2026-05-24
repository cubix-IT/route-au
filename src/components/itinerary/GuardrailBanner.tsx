import type { GuardrailWarning } from '@/types'

interface Props {
  warning: GuardrailWarning
}

const CONFIG = {
  MANDATORY_STOP: { bg: 'bg-red-950', border: 'border-red-700', text: 'text-red-200', icon: '🛑' },
  WARNING: { bg: 'bg-amber-950', border: 'border-amber-700', text: 'text-amber-200', icon: '⚠️' },
  NOTICE: { bg: 'bg-blue-950', border: 'border-blue-700', text: 'text-blue-200', icon: 'ℹ️' },
}

export function GuardrailBanner({ warning }: Props) {
  const style = CONFIG[warning.severity]

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${style.bg} ${style.border} ${style.text}`}>
      <span className="text-lg shrink-0 mt-0.5">{style.icon}</span>
      <p className="text-sm leading-snug">{warning.message}</p>
    </div>
  )
}
