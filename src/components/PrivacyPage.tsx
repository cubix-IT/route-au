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
          Last updated: June 2026
        </p>

        <Section title="Why Unplanned Escapes Exists">
          <p style={p}>
            Victoria is packed with incredible places that deserve to be experienced — ancient forests, family-run wineries, wild coastlines, mineral springs, and hiking trails that take your breath away. Yet most of us visit the same crowded spots every weekend simply because nobody told us what else is out there.
          </p>
          <p style={{ ...p, marginBottom: 0 }}>
            We built this app to help you discover your own backyard and support the regional communities that make Victoria special. It is a passion project, built and maintained by a solo developer, with zero commercial backing.
          </p>
        </Section>

        <Section title="Your Privacy">
          <p style={p}>
            We collect zero personal information. There are no accounts, no email sign-ups, and we have no way to identify who you are.
          </p>
          <p style={p}>
            <strong>Your preferences</strong> (departure town, trip type, activity preferences) are stored only on your device using your browser's local storage. This data never leaves your device and is cleared when you start a new trip.
          </p>
          <p style={{ ...p, marginBottom: 0 }}>
            <strong>No tracking.</strong> There are no ads, no analytics cookies, and no third-party tracking pixels on this site.
          </p>
        </Section>

        <Section title="Data Sources &amp; Attributions">
          <p style={p}>
            Unplanned Escapes is built entirely on free and open data sources. Here is everything we use, why we use it, and what licence it is published under.
          </p>

          <SourceGroup label="Places &amp; Points of Interest">
            <SourceEntry
              name="OpenStreetMap"
              url="https://www.openstreetmap.org"
              what="The primary source for activities, food places, nature spots, and accommodation. OSM is a collaborative, community-built map of the world."
              licence="Open Database Licence (ODbL)"
              licenceUrl="https://opendatacommons.org/licenses/odbl/"
              attribution="© OpenStreetMap contributors"
            />
          </SourceGroup>

          <SourceGroup label="Maps &amp; Navigation">
            <SourceEntry
              name="MapLibre GL JS"
              url="https://maplibre.org"
              what="Open-source map rendering engine used to display the interactive route map."
              licence="BSD 3-Clause"
              licenceUrl="https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt"
            />
            <SourceEntry
              name="CARTO (Positron tiles)"
              url="https://carto.com/basemaps"
              what="Free light-theme map tiles that form the visual base of the route map."
              licence="Creative Commons Attribution 3.0"
              licenceUrl="https://creativecommons.org/licenses/by/3.0/"
              attribution="© CARTO"
            />
            <SourceEntry
              name="OSRM (Open Source Routing Machine)"
              url="https://project-osrm.org"
              what="Calculates the road geometry for your route line on the map. Uses OpenStreetMap road data."
              licence="BSD 2-Clause"
              licenceUrl="https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE"
            />
            <SourceEntry
              name="Photon (by Komoot)"
              url="https://photon.komoot.io"
              what="Powers the location search — autocomplete for your departure town and destination. Based on OpenStreetMap data."
              licence="OpenStreetMap ODbL"
              licenceUrl="https://opendatacommons.org/licenses/odbl/"
            />
          </SourceGroup>

          <SourceGroup label="Destination Content">
            <SourceEntry
              name="Wikipedia"
              url="https://www.wikipedia.org"
              what="Destination summaries and hero images shown in the destination overview. We fetch a short excerpt and thumbnail for each location."
              licence="Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)"
              licenceUrl="https://creativecommons.org/licenses/by-sa/4.0/"
              attribution="© Wikipedia contributors"
            />
            <SourceEntry
              name="Wikidata"
              url="https://www.wikidata.org"
              what="Structured data about tourist attractions — used to supplement activity listings."
              licence="Creative Commons CC0 (public domain)"
              licenceUrl="https://creativecommons.org/publicdomain/zero/1.0/"
            />
          </SourceGroup>

          <SourceGroup label="Live Information">
            <SourceEntry
              name="Open-Meteo"
              url="https://open-meteo.com"
              what="Weather forecasts for your destination. Only the destination coordinates are sent — no personal data."
              licence="Free for non-commercial use"
              licenceUrl="https://open-meteo.com/en/terms"
            />
            <SourceEntry
              name="Service Victoria — Fair Fuel Open Data"
              url="https://www.vic.gov.au/fair-fuel"
              what="Real-time fuel prices at stations near your route. Published by the Victorian Government."
              licence="Creative Commons Attribution 4.0 (CC BY 4.0)"
              licenceUrl="https://creativecommons.org/licenses/by/4.0/"
              attribution="© State of Victoria"
            />
            <SourceEntry
              name="VicEmergency"
              url="https://www.emergency.vic.gov.au"
              what="Live fire, flood, and road hazard alerts for your destination area. Published by Emergency Management Victoria."
              licence="Creative Commons Attribution 4.0 (CC BY 4.0)"
              licenceUrl="https://creativecommons.org/licenses/by/4.0/"
              attribution="© Emergency Management Victoria"
            />
          </SourceGroup>

          <SourceGroup label="Infrastructure">
            <SourceEntry
              name="Supabase"
              url="https://supabase.com"
              what="Database hosting our curated destination data, activities, food places, and nature spots. Hosted in Australia (Sydney region)."
              licence="Commercial service — free tier"
              licenceUrl="https://supabase.com/privacy"
            />
            <SourceEntry
              name="Vercel"
              url="https://vercel.com"
              what="Hosts and serves this web application globally."
              licence="Commercial service — free hobby tier"
              licenceUrl="https://vercel.com/legal/privacy-policy"
            />
            <SourceEntry
              name="Anthropic Claude"
              url="https://www.anthropic.com"
              what="AI-generated destination summaries for some locations where no Wikipedia article exists. Used server-side only — your trip details are never sent to Claude."
              licence="Commercial service — API"
              licenceUrl="https://www.anthropic.com/legal/privacy"
            />
          </SourceGroup>

          <SourceGroup label="Open Source Libraries">
            <SourceEntry
              name="React, Vite, TypeScript"
              url="https://react.dev"
              what="Frontend framework and build tooling."
              licence="MIT"
              licenceUrl="https://github.com/facebook/react/blob/main/LICENSE"
            />
            <SourceEntry
              name="Zustand"
              url="https://github.com/pmndrs/zustand"
              what="Lightweight state management for your trip preferences."
              licence="MIT"
              licenceUrl="https://github.com/pmndrs/zustand/blob/main/LICENSE"
            />
            <SourceEntry
              name="Tailwind CSS"
              url="https://tailwindcss.com"
              what="Utility-first CSS framework used for styling."
              licence="MIT"
              licenceUrl="https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE"
            />
          </SourceGroup>
        </Section>

        <Section title="Contact">
          <p style={{ ...p, marginBottom: 0 }}>
            Questions, feedback, or found a place we missed?{' '}
            <a href="mailto:support@cubixit.com.au" style={{ color: GREEN, fontWeight: 600 }}>support@cubixit.com.au</a>
          </p>
        </Section>

      </div>

      {/* Footer */}
      <footer style={{ background: GREEN, padding: '28px 28px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={logoSrc} alt="Unplanned Escapes" width={36} height={36} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Unplanned Escapes</span>
            </div>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>
              Created by <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cubix IT Solutions</span>
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>OpenStreetMap contributors</a> (ODbL) ·{' '}
            Map tiles © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>CARTO</a> ·{' '}
            Destination summaries © <a href="https://en.wikipedia.org" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>Wikipedia contributors</a> (CC BY-SA) ·{' '}
            Fuel data © State of Victoria
          </p>
        </div>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 52 }}>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1C1A', marginBottom: 18, borderBottom: '1px solid #E8E6E2', paddingBottom: 12 }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: '#3A3835' }}>
        {children}
      </div>
    </section>
  )
}

function SourceGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8C8A87', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

function SourceEntry({ name, url, what, licence, licenceUrl, attribution }: {
  name: string; url: string; what: string
  licence: string; licenceUrl: string; attribution?: string
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E6E2', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: 14, color: GREEN, textDecoration: 'none' }}>
          {name} ↗
        </a>
        <a href={licenceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#8C8A87', background: '#F3F2F0', padding: '2px 8px', borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {licence}
        </a>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: '#3A3835', lineHeight: 1.65 }}>{what}</p>
      {attribution && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8C8A87' }}>{attribution}</p>
      )}
    </div>
  )
}
