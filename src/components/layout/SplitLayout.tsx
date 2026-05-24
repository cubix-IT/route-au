import type { ReactNode } from 'react'

interface Props {
  mapSlot: ReactNode
  panelSlot: ReactNode
}

export function SplitLayout({ mapSlot, panelSlot }: Props) {
  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <div className="h-[50vh] md:h-auto md:flex-[3] relative">{mapSlot}</div>
      <div
        className="flex-1 md:flex-[2] overflow-y-auto"
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        {panelSlot}
      </div>
    </div>
  )
}
