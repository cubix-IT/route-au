# Unplanned Escapes — Claude Code Instructions

Victorian weekend getaway discovery app. Live at unplanned-escapes.vercel.app.
Working directory: /home/raj/unplanned-escapes

## Docs (read before modifying anything significant)
- @docs/architecture.md — stack, data flow, key files, design rules
- @docs/data-sources.md — all APIs, limits, auth, licences
- @docs/database.md — schema, tables, constraints, slug conventions
- @docs/enrichment-cron.md — how the daily cron works, limits, manual trigger
- @docs/roadmap.md — current phase, pending tasks, backlog

## Critical rules
- **NO PAID APIs** — Google Places caused A$1,992 bill in May 2026. No googleapis, no Google Places, ever.
- **Deploy via `npm run deploy`** — never `vercel --prod` directly (bypasses deploy_log table)
- **DB source column** — always `'static'`, never `'osm'` or `'google'` (CHECK constraint)
- **Zustand selectors** — scalar only: `(s) => s.x`, never `(s) => ({ x: s.x, y: s.y })`

## Commands
```bash
npm run dev      # dev server → localhost:5174
npm run build    # production build
npm run deploy   # build + deploy to Vercel prod + log to Supabase
npx tsc --noEmit # type check only
```

## Stack
Vite + React + TypeScript · MapLibre GL + CartoDB tiles · Zustand · Tailwind v4
Supabase free (Sydney) · Vercel Hobby · Overpass API · VHD API · Wikipedia · Open-Meteo · OSRM · Photon · VicEmergency
