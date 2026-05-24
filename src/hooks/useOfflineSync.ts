import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function useOfflineSync() {
  const setOffline = useAppStore((s) => s.setOffline)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    update()
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [setOffline])
}
