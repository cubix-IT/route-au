import type { ReactNode } from 'react'

interface Props {
  mapSlot: ReactNode
  panelSlot: ReactNode
}

export function SplitLayout({ mapSlot, panelSlot }: Props) {
  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <div className="h-[50vh] md:h-auto md:flex-[3] relative">{mapSlot}</div>
      <div className="flex-1 md:flex-[2] overflow-y-auto border-t md:border-t-0 md:border-l border-slate-700 bg-slate-900">
        {panelSlot}
      </div>
    </div>
  )
}
