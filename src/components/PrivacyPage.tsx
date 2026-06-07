import { GREEN } from '@/lib/brand'

const p: React.CSSProperties = { margin: '0 0 16px', lineHeight: 1.8, color: 'var(--text-secondary)' }

export function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>

      {/* Nav — identical to LandingPage */}
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
        <a href="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Unplanned<span style={{ color: GREEN }}> Escapes</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}> Victoria</span>
          </div>
        </a>
        <button onClick={onBack} style={{
          padding: '7px 16px', borderRadius: 9,
          background: GREEN, border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', letterSpacing: '-0.01em',
        }}>
          Plan a trip
        </button>
      </nav>

      {/* Page hero — same padding/treatment as landing sections */}
      <section style={{
        padding: 'clamp(40px, 6vw, 72px) 28px clamp(32px, 5vw, 56px)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-base)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            About &amp; Privacy
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Last updated: June 2026 · A passion project helping Victorians discover their backyard.
          </p>
        </div>
      </section>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 28px 80px' }}>

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
            <strong>No ads or tracking cookies.</strong> There are no advertising networks or tracking pixels on this site.
            We use <a href="https://vercel.com/analytics" target="_blank" rel="noopener noreferrer" style={{ color: GREEN }}>Vercel Web Analytics</a> to understand how many people visit — this collects only anonymous page view counts with no personal data, no cookies, and no cross-site tracking. You cannot be identified from this data.
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
              name="MET Norway (api.met.no)"
              url="https://api.met.no"
              what="Weather forecasts for your destination from the Norwegian Meteorological Institute. Freely available worldwide — only destination coordinates are sent, no personal data."
              licence="Norwegian Licence for Open Government Data (NLOD)"
              licenceUrl="https://api.met.no/doc/License"
              attribution="Weather forecast from MET Norway"
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
              name="Vercel Web Analytics"
              url="https://vercel.com/analytics"
              what="Privacy-friendly page view analytics. Collects anonymous visit counts only — no cookies, no personal data, no cross-site tracking, and no way to identify individual users."
              licence="Commercial service — free tier"
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

      {/* Footer — matches LandingPage exactly */}
      <footer style={{ background: GREEN, padding: '32px 28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Unplanned Escapes
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 500, marginTop: 1 }}>Victoria</div>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <a href="/changelog" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, textDecoration: 'none', letterSpacing: '-0.01em' }}>What's new</a>
              <a href="/privacy" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, textDecoration: 'none', letterSpacing: '-0.01em' }}>Privacy &amp; About</a>
            </div>
          </div>
          <div style={{ marginBottom: 16, fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>OpenStreetMap contributors</a>
            {' '}(ODbL) · Map tiles © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>CARTO</a>
            {' '}· Destination content © <a href="https://en.wikipedia.org" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>Wikipedia contributors</a>
            {' '}(CC BY-SA) · Trail data © <a href="https://www.data.vic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>DataVic</a>
            {' '}(CC BY 4.0) · Heritage data © <a href="https://vhd.heritagecouncil.vic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>Heritage Council Victoria</a>
            {' '}(CC BY 4.0) · Fuel data © State of Victoria · Weather by{' '}
            <a href="https://api.met.no" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>MET Norway</a>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>Helping Victorians escape, one weekend at a time.</span>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>
              Created by <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cubix IT Solutions</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 52 }}>
      <h2 style={{
        fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700,
        letterSpacing: '-0.02em', color: 'var(--text-primary)',
        marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14,
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  )
}

function SourceGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
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
    <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: 14, color: GREEN, textDecoration: 'none' }}>
          {name} ↗
        </a>
        <a href={licenceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {licence}
        </a>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{what}</p>
      {attribution && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{attribution}</p>
      )}
    </div>
  )
}
