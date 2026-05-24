import { useAppStore } from '@/store/useAppStore'

export function Header() {
  const { isOffline, setWizardOpen, userProfile } = useAppStore()

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-none tracking-tight">RouteAU</h1>
            <p className="text-amber-500 text-xs leading-none">Australia's road trip planner</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isOffline && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-900 text-red-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Offline
          </span>
        )}

        {!isOffline && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-900 text-green-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Online
          </span>
        )}

        <button
          onClick={() => setWizardOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
        >
          {userProfile ? '⚙ Edit Profile' : '+ Get Started'}
        </button>
      </div>
    </header>
  )
}
