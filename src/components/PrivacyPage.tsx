import logoSrc from '@/assets/logo.png'

const GREEN = '#3A6B4F'

const p: React.CSSProperties = { margin: '0 0 16px', lineHeight: 1.8 }

export function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', color: '#1C1C1A', fontFamily: 'inherit' }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 60,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <span style={{ fontSize: 18, color: '#8C8A87', lineHeight: 1 }}>←</span>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#1C1C1A', letterSpacing: '-0.02em' }}>
            Unplanned<span style={{ color: GREEN }}> Escapes</span>
            <span style={{ color: '#8C8A87', fontWeight: 400, fontSize: 13 }}> Victoria</span>
          </div>
        </button>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 28px 80px' }}>

        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6, color: '#1C1C1A' }}>
          About &amp; Privacy
        </h1>
        <p style={{ fontSize: 13, color: '#8C8A87', marginBottom: 48, lineHeight: 1.6 }}>
          Last Updated: May 2026
        </p>

        <Section title="Why Unplanned Escapes Exists">
          <p style={p}>
            Victoria is packed with hidden corners that deserve to be experienced — ancient forests, family-run wineries, wild coastlines, and incredible hiking trails. Yet, most of us end up visiting the same one or two crowded spots every weekend simply because nobody told us what else is out there.
          </p>
          <p style={{ ...p, marginBottom: 0 }}>
            Having spent years exploring this beautiful state, we built this app to share the real gems — the kind you only find when someone who's actually been there points you in the right direction. This is a volunteer passion project, built to help you discover your own backyard and support local regional businesses.
          </p>
        </Section>

        <Section title="Your Privacy (The Short Version)">
          <p style={p}>
            We collect zero personal information. There are no accounts to create, no email sign-ups, and we have no idea who you are.
          </p>
          <p style={p}>
            <strong>Your Settings:</strong> Anything you search or select (like your departure town or favourite activities) is saved strictly on your own device. It never goes to a server and disappears when you start a new trip.
          </p>
          <p style={{ ...p, marginBottom: 0 }}>
            <strong>No Tracking:</strong> There are no ads, no tracking pixels, and no analytics cookies watching what you do.
          </p>
        </Section>

        <Section title="How the App Works">
          <p style={p}>
            To show you live information without storing your data, the app securely passes your search requests to a few trusted, open-source services:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <ServiceEntry
              name="Maps &amp; Locations"
              what="Powered by OpenStreetMap, MapLibre, CARTO, and Komoot. When you search a town or view the map, your app talks directly to them to load the imagery and points of interest."
            />
            <ServiceEntry
              name="Weather"
              what="Powered by Open-Meteo, using only the coordinates of your destination."
            />
            <ServiceEntry
              name="Summaries"
              what="Descriptions of towns are pulled directly from Wikipedia."
            />
            <ServiceEntry
              name="Fuel Prices"
              what="Calculated using real-time open data from Service Victoria."
            />
            <ServiceEntry
              name="Our Database"
              what="Our list of local destinations is hosted securely in Australia via Supabase."
            />
          </div>
          <p style={{ ...p, marginBottom: 0 }}>
            We are incredibly grateful to these platforms for keeping the open web free and privacy-respecting.
          </p>
        </Section>

        <Section title="Get in Touch">
          <p style={{ ...p, marginBottom: 0 }}>
            Questions, feedback, or have a hidden spot we missed? Reach out to us at{' '}
            <a href="mailto:support@cubixit.com.au" style={{ color: GREEN, fontWeight: 600 }}>support@cubixit.com.au</a>
          </p>
        </Section>

      </div>

      {/* Footer */}
      <footer style={{ background: GREEN, padding: '24px 28px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoSrc} alt="Unplanned Escapes" width={36} height={36} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Unplanned Escapes</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>
            Created by <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cubix IT Solutions</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1C1A', marginBottom: 18, borderBottom: '1px solid #E8E6E2', paddingBottom: 12 }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: '#3A3835' }}>
        {children}
      </div>
    </section>
  )
}

function ServiceEntry({ name, what }: { name: string; what: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E6E2', padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1C1C1A', marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: name }} />
      <p style={{ margin: 0, fontSize: 14, color: '#3A3835', lineHeight: 1.7 }}>{what}</p>
    </div>
  )
}
