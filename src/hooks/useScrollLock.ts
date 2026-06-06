import { useEffect } from 'react'

// Locks body scroll while mounted. Restores on unmount.
// Handles multiple concurrent callers by counting refs.
let lockCount = 0
let savedScrollY = 0

export function useScrollLock() {
  useEffect(() => {
    if (lockCount === 0) {
      savedScrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${savedScrollY}px`
      document.body.style.width = '100%'
    }
    lockCount++
    return () => {
      lockCount--
      if (lockCount === 0) {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, savedScrollY)
      }
    }
  }, [])
}
