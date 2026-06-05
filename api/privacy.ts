import type { VercelRequest, VercelResponse } from '@vercel/node'

const GREEN = '#3A6B4F'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>About & Privacy — Unplanned Escapes Victoria</title>
  <meta name="description" content="How Unplanned Escapes works, what data we collect (none), and full attribution for every open data source we use.">
  <link rel="canonical" href="https://unplanned-escapes.vercel.app/privacy">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8F7F4; color: #1C1C1A }
    a { color: ${GREEN} }
    nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; padding: 0 28px; height: 60px; background: rgba(255,255,255,0.88); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(0,0,0,0.07) }
    nav a { font-family: 'Fraunces', Georgia, serif; font-size: 16px; font-weight: 700; color: #1C1C1A; text-decoration: none; letter-spacing: -0.02em }
    nav a span.region { color: #8C8A87; font-weight: 400; font-size: 13px }
    .back { font-size: 18px; color: #8C8A87; margin-right: 10px; text-decoration: none }
    main { max-width: 720px; margin: 0 auto; padding: 56px 28px 80px }
    h1 { font-family: 'Fraunces', Georgia, serif; font-size: 36px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 6px }
    .updated { font-size: 13px; color: #8C8A87; margin: 0 0 48px }
    section { margin-bottom: 52px }
    h2 { font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #1C1C1A; margin-bottom: 18px; border-bottom: 1px solid #E8E6E2; padding-bottom: 12px }
    .prose { font-size: 15px; line-height: 1.8; color: #3A3835 }
    .prose p { margin: 0 0 16px }
    .source-group-label { font-size: 11px; font-weight: 700; color: #8C8A87; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px }
    .source-group { margin-bottom: 28px }
    .source-entry { background: #fff; border-radius: 12px; border: 1px solid #E8E6E2; padding: 16px 20px; margin-bottom: 8px }
    .source-entry-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; flex-wrap: wrap }
    .source-entry-header a { font-weight: 700; font-size: 14px; color: ${GREEN}; text-decoration: none }
    .licence-badge { font-size: 11px; color: #8C8A87; background: #F3F2F0; padding: 2px 8px; border-radius: 20px; text-decoration: none; white-space: nowrap }
    .source-desc { margin: 0; font-size: 13.5px; color: #3A3835; line-height: 1.65 }
    .source-attr { margin: 6px 0 0; font-size: 12px; color: #8C8A87 }
    footer { background: ${GREEN}; padding: 28px }
    .footer-inner { max-width: 720px; margin: 0 auto }
    .footer-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px }
    .footer-brand { font-family: 'Fraunces', Georgia, serif; font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.02em }
    .footer-credit { font-size: 11.5px; color: rgba(255,255,255,0.5) }
    .footer-credit span { color: rgba(255,255,255,0.8); font-weight: 600 }
    .footer-attr { margin: 0; font-size: 11.5px; color: rgba(255,255,255,0.55); line-height: 1.7 }
    .footer-attr a { color: rgba(255,255,255,0.75) }
  </style>
</head>
<body>

<nav>
  <a href="/" class="back">←</a>
  <a href="/">Unplanned<span style="color:${GREEN}"> Escapes</span><span class="region"> Victoria</span></a>
</nav>

<main>
  <h1>About &amp; Privacy</h1>
  <p class="updated">Last updated: June 2026</p>

  <section>
    <h2>Why Unplanned Escapes Exists</h2>
    <div class="prose">
      <p>Victoria is packed with incredible places that deserve to be experienced — ancient forests, family-run wineries, wild coastlines, mineral springs, and hiking trails that take your breath away. Yet most of us visit the same crowded spots every weekend simply because nobody told us what else is out there.</p>
      <p>We built this app to help you discover your own backyard and support the regional communities that make Victoria special. It is a passion project, built and maintained by a solo developer, with zero commercial backing.</p>
    </div>
  </section>

  <section>
    <h2>Your Privacy</h2>
    <div class="prose">
      <p>We collect zero personal information. There are no accounts, no email sign-ups, and we have no way to identify who you are.</p>
      <p><strong>Your preferences</strong> (departure town, trip type, activity preferences) are stored only on your device using your browser's local storage. This data never leaves your device and is cleared when you start a new trip.</p>
      <p><strong>No ads or tracking cookies.</strong> There are no advertising networks or tracking pixels on this site. We collect only anonymous page view counts to understand how many people visit — no personal data, no cookies, and no cross-site tracking. You cannot be identified from this data.</p>
    </div>
  </section>

  <section>
    <h2>Data Sources &amp; Attributions</h2>
    <div class="prose">
      <p>Unplanned Escapes is built entirely on free and open data sources. Here is everything we use, why we use it, and what licence it is published under.</p>
    </div>

    <div class="source-group">
      <div class="source-group-label">Places &amp; Points of Interest</div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap ↗</a>
          <a href="https://opendatacommons.org/licenses/odbl/" class="licence-badge" target="_blank" rel="noopener noreferrer">Open Database Licence (ODbL)</a>
        </div>
        <p class="source-desc">The primary source for activities, food places, nature spots, and accommodation. OSM is a collaborative, community-built map of the world.</p>
        <p class="source-attr">© OpenStreetMap contributors</p>
      </div>
    </div>

    <div class="source-group">
      <div class="source-group-label">Heritage &amp; History</div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://www.data.vic.gov.au" target="_blank" rel="noopener noreferrer">DataVic — Great Trails Victoria ↗</a>
          <a href="https://creativecommons.org/licenses/by/4.0/" class="licence-badge" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
        </div>
        <p class="source-desc">Official trail geometry, waypoints, and facility data for 15 Great Trails Victoria — walking, cycling, and mountain bike trails. Published by the Department of Jobs, Skills, Industry and Regions.</p>
        <p class="source-attr">© State of Victoria (Department of Jobs, Skills, Industry and Regions)</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://vhd.heritagecouncil.vic.gov.au" target="_blank" rel="noopener noreferrer">Victorian Heritage Database ↗</a>
          <a href="https://creativecommons.org/licenses/by/4.0/" class="licence-badge" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
        </div>
        <p class="source-desc">Official register of Victoria's most significant heritage places, maintained by Heritage Council Victoria. We use the Victorian Heritage Register (VHR) listings to add historically significant buildings and sites to destination activity lists.</p>
        <p class="source-attr">© Heritage Council Victoria (State of Victoria)</p>
      </div>
    </div>

    <div class="source-group">
      <div class="source-group-label">Maps &amp; Navigation</div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://carto.com/basemaps" target="_blank" rel="noopener noreferrer">CARTO (Positron tiles) ↗</a>
          <a href="https://creativecommons.org/licenses/by/3.0/" class="licence-badge" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 3.0</a>
        </div>
        <p class="source-desc">Free light-theme map tiles that form the visual base of the route map.</p>
        <p class="source-attr">© CARTO</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://project-osrm.org" target="_blank" rel="noopener noreferrer">OSRM (Open Source Routing Machine) ↗</a>
          <a href="https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE" class="licence-badge" target="_blank" rel="noopener noreferrer">BSD 2-Clause</a>
        </div>
        <p class="source-desc">Calculates the road geometry for your route line on the map. Uses OpenStreetMap road data.</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer">Photon (by Komoot) ↗</a>
          <a href="https://opendatacommons.org/licenses/odbl/" class="licence-badge" target="_blank" rel="noopener noreferrer">OpenStreetMap ODbL</a>
        </div>
        <p class="source-desc">Powers the location search — autocomplete for your departure town and destination. Based on OpenStreetMap data.</p>
      </div>
    </div>

    <div class="source-group">
      <div class="source-group-label">Destination Content</div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://www.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia ↗</a>
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" class="licence-badge" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
        </div>
        <p class="source-desc">Destination summaries and hero images shown in the destination overview. We fetch a short excerpt and thumbnail for each location.</p>
        <p class="source-attr">© Wikipedia contributors</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata ↗</a>
          <a href="https://creativecommons.org/publicdomain/zero/1.0/" class="licence-badge" target="_blank" rel="noopener noreferrer">CC0 (public domain)</a>
        </div>
        <p class="source-desc">Structured data about tourist attractions — used to supplement activity listings.</p>
      </div>
    </div>

    <div class="source-group">
      <div class="source-group-label">Live Information</div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://api.met.no" target="_blank" rel="noopener noreferrer">MET Norway — Locationforecast ↗</a>
          <a href="https://api.met.no/conditions_service.html" class="licence-badge" target="_blank" rel="noopener noreferrer">Norwegian Licence for Open Data (NLOD)</a>
        </div>
        <p class="source-desc">Weather forecasts for your destination, provided by the Norwegian Meteorological Institute. Only destination coordinates are sent — no personal data.</p>
        <p class="source-attr">© Meteorologisk institutt (MET Norway)</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://www.vic.gov.au/fair-fuel" target="_blank" rel="noopener noreferrer">Service Victoria — Fair Fuel Open Data ↗</a>
          <a href="https://creativecommons.org/licenses/by/4.0/" class="licence-badge" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
        </div>
        <p class="source-desc">Real-time fuel prices at stations near your route. Published by the Victorian Government.</p>
        <p class="source-attr">© State of Victoria</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://www.emergency.vic.gov.au" target="_blank" rel="noopener noreferrer">VicEmergency ↗</a>
          <a href="https://creativecommons.org/licenses/by/4.0/" class="licence-badge" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
        </div>
        <p class="source-desc">Live fire, flood, and road hazard alerts for your destination area. Published by Emergency Management Victoria.</p>
        <p class="source-attr">© Emergency Management Victoria</p>
      </div>
    </div>

    <div class="source-group">
      <div class="source-group-label">Open Source — with thanks</div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://react.dev" target="_blank" rel="noopener noreferrer">React ↗</a>
          <a href="https://github.com/facebook/react/blob/main/LICENSE" class="licence-badge" target="_blank" rel="noopener noreferrer">MIT</a>
        </div>
        <p class="source-desc">UI framework powering the entire app.</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">Vite ↗</a>
          <a href="https://github.com/vitejs/vite/blob/main/LICENSE" class="licence-badge" target="_blank" rel="noopener noreferrer">MIT</a>
        </div>
        <p class="source-desc">Build tooling and development server.</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer">MapLibre GL JS ↗</a>
          <a href="https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt" class="licence-badge" target="_blank" rel="noopener noreferrer">BSD 3-Clause</a>
        </div>
        <p class="source-desc">Open-source map rendering engine for the interactive route map.</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://github.com/pmndrs/zustand" target="_blank" rel="noopener noreferrer">Zustand ↗</a>
          <a href="https://github.com/pmndrs/zustand/blob/main/LICENSE" class="licence-badge" target="_blank" rel="noopener noreferrer">MIT</a>
        </div>
        <p class="source-desc">Lightweight state management.</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer">Tailwind CSS ↗</a>
          <a href="https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE" class="licence-badge" target="_blank" rel="noopener noreferrer">MIT</a>
        </div>
        <p class="source-desc">Utility-first CSS framework.</p>
      </div>
      <div class="source-entry">
        <div class="source-entry-header">
          <a href="https://project-osrm.org" target="_blank" rel="noopener noreferrer">OSRM ↗</a>
          <a href="https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE" class="licence-badge" target="_blank" rel="noopener noreferrer">BSD 2-Clause</a>
        </div>
        <p class="source-desc">Road routing engine for drive time calculations and route geometry.</p>
      </div>
    </div>
  </section>

  <section>
    <h2>Contact</h2>
    <div class="prose">
      <p>Questions, feedback, or found a place we missed? <a href="mailto:support@cubixit.com.au" style="font-weight:600">support@cubixit.com.au</a></p>
    </div>
  </section>
</main>

<footer>
  <div class="footer-inner">
    <div class="footer-top">
      <span class="footer-brand">Unplanned Escapes</span>
      <span class="footer-credit">Created by <span>Cubix IT Solutions</span></span>
    </div>
    <p class="footer-attr">
      Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> (ODbL) ·
      Map tiles © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a> ·
      Destination summaries © <a href="https://en.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia contributors</a> (CC BY-SA) ·
      Heritage data © <a href="https://vhd.heritagecouncil.vic.gov.au" target="_blank" rel="noopener noreferrer">Heritage Council Victoria</a> (CC BY 4.0) ·
      Fuel data © State of Victoria
    </p>
  </div>
</footer>

</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  return res.status(200).send(html)
}
