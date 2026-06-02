import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/store/useAppStore'
import { signInWithGoogle, signInWithMagicLink } from '@/hooks/useAuth'

const GREEN = '#3A6B4F'

export function AuthModal() {
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    await signInWithGoogle()
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    const result = await signInWithMagicLink(email.trim())
    setLoading(false)
    if (result?.error) {
      toast.error(result.error.message)
    } else {
      setEmailSent(true)
    }
  }

  return (
    <div className="wizard-overlay" onClick={() => setAuthModalOpen(false)}>
      <div
        className="wizard-card"
        style={{ maxWidth: 420, maxHeight: 'unset' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '28px 28px 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, color: '#1C1C1A', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Save your trips
            </div>
            <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Sign in to save up to 3 trips across devices — free forever.
            </p>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', padding: '0 0 0 12px', lineHeight: 1 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Google sign-in */}
          <button
            onClick={handleGoogle}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '13px 20px', borderRadius: 12,
              background: GREEN, color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or use email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Magic link */}
          {emailSent ? (
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--green-light)', border: '1px solid rgba(58,107,79,0.25)',
              fontSize: 14, color: GREEN, lineHeight: 1.5, textAlign: 'center',
            }}>
              ✉️ Check your inbox — we sent a sign-in link to <strong>{email}</strong>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1.5px solid var(--border)', background: 'var(--bg-muted)',
                  fontSize: 14, color: 'var(--text-primary)',
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = GREEN)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  width: '100%', padding: '11px 20px', borderRadius: 10,
                  background: 'var(--bg-muted)', color: 'var(--text-primary)',
                  border: '1.5px solid var(--border)', cursor: loading ? 'wait' : 'pointer',
                  fontSize: 14, fontWeight: 600,
                  opacity: loading || !email.trim() ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          )}

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5, marginTop: 4 }}>
            No password. No spam. Your data stays yours.
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#fff" fillOpacity=".9"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#fff" fillOpacity=".7"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#fff" fillOpacity=".5"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#fff" fillOpacity=".8"/>
    </svg>
  )
}
