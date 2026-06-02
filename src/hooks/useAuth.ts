import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

export function useAuth() {
  const { setAuthState } = useAppStore()

  useEffect(() => {
    if (!supabase) return

    // Hydrate from existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session?.user ?? null, data.session ?? null)
    })

    // Listen for sign in / sign out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(session?.user ?? null, session ?? null)

        if (event === 'SIGNED_IN' && session?.user) {
          await ensureProfile(session.user)
          await migrateLocalDataIfNeeded(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

export async function signInWithGoogle() {
  await supabase?.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export async function signInWithMagicLink(email: string) {
  return supabase?.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
}

export async function signOut() {
  await supabase?.auth.signOut()
}

// Creates a profiles row on first sign-in — idempotent via upsert + ignoreDuplicates
async function ensureProfile(user: User) {
  if (!supabase) return
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'Traveller'
  const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null

  await supabase.from('profiles').upsert(
    { id: user.id, display_name: displayName, avatar_url: avatarUrl },
    { onConflict: 'id', ignoreDuplicates: true }
  )
}

// One-shot: copy localStorage userProfile/vehicleProfile → Supabase profiles row
async function migrateLocalDataIfNeeded(userId: string) {
  if (!supabase) return

  const migratedKey = `migrated-${userId}`
  if (localStorage.getItem(migratedKey)) return

  try {
    const stored = localStorage.getItem('route-au-v4')
    if (!stored) return
    const parsed = JSON.parse(stored)
    const userProfile = parsed?.state?.userProfile ?? null
    const vehicleProfile = parsed?.state?.vehicleProfile ?? null
    if (!userProfile && !vehicleProfile) return

    await supabase.from('profiles').update({
      user_profile: userProfile ?? {},
      vehicle_profile: vehicleProfile ?? {},
    }).eq('id', userId)

    localStorage.setItem(migratedKey, '1')
  } catch {
    // Migration is best-effort — never block login
  }
}
