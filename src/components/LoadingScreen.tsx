import { useEffect, useState } from 'react'
import logo from '/src/assets/logo.png'

interface Props { onDone: () => void }

const CSS = `
  @keyframes logoIn {
    from { opacity: 0; transform: scale(0.88) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes textIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dot {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
    40%           { transform: scale(1);   opacity: 1; }
  }
  @keyframes screenOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  .ls-logo  { animation: logoIn  0.55s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
  .ls-text  { animation: textIn  0.45s ease-out 0.55s both; }
  .ls-sub   { animation: textIn  0.45s ease-out 0.75s both; }
  .ls-dots  { animation: textIn  0.45s ease-out 0.9s  both; }
  .ls-dot   { animation: dot 1.2s ease-in-out infinite; display: inline-block; }
  .ls-dot:nth-child(2) { animation-delay: 0.2s; }
  .ls-dot:nth-child(3) { animation-delay: 0.4s; }
  .ls-out   { animation: screenOut 0.4s ease-in forwards; }
`

export function LoadingScreen({ onDone }: Props) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2000)
    const t2 = setTimeout(onDone, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      className={exiting ? 'ls-out' : ''}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#F8F7F4',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}
    >
      <style>{CSS}</style>

      {/* Logo */}
      <div className="ls-logo">
        <img
          src={logo}
          alt="Unplanned Escapes"
          style={{ width: 140, height: 140, objectFit: 'contain' }}
        />
      </div>

      {/* Brand name */}
      <div className="ls-text" style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '0.16em',
        color: '#3A6B4F',
        textTransform: 'uppercase',
        marginTop: 18,
      }}>
        Unplanned Escapes
      </div>

      {/* Tagline */}
      <div className="ls-sub" style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.1em',
        color: '#9C9890',
        marginTop: 6,
        textTransform: 'uppercase',
      }}>
        Victorian road trip planner
      </div>

      {/* Loading dots */}
      <div className="ls-dots" style={{ marginTop: 36, display: 'flex', gap: 7 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="ls-dot"
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: '#3A6B4F',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
