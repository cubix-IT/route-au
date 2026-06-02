# Roadmap

## Phase 1 — Foundation ✅
- 139 Victorian destinations with OSM data
- Daily enrichment cron (Overpass + Wikipedia + Claude)
- Landing page with destination grid
- Trip wizard + results (desktop + mobile)
- Fuel prices, weather, hazard alerts
- Rebrand from RouteAU → Unplanned Escapes

## Phase 2 — Auth + Domain (current)
- [x] Auth code written (`useAuth.ts`, `AuthModal.tsx`, `tripsService.ts`)
- [x] DB migration written (`006_auth_profiles_trips.sql`)
- [ ] **Run migration 006 in Supabase SQL Editor**
- [ ] **Enable Google OAuth in Supabase Dashboard**
- [ ] **Set Site URL + redirect URLs in Supabase Auth config**
- [x] Victorian Heritage Database integration
- [x] OSM + VHD attribution in footer + privacy page
- [x] docs/ folder
- [ ] Custom domain: `unplannedescapes.com.au` → Cloudflare → Vercel
- [ ] Marketing push

## Phase 3 — Paywall
- Stripe integration — Explorer plan ~$29/yr
- Explorer perks:
  - Unlimited saved trips (free tier: 3)
  - Offline GPX export
  - Trip journal
  - PDF export
  - Snow reports
  - Winery opening hours
- Stripe webhook verification
- Supabase RLS on trip data

## Backlog / Nice to have
- Recreation tracks from data.vic (static GeoJSON import)
- Parks & conservation reserves layer
- OSM attribution in MapLibre map canvas (legal requirement for map display)
- Rate limiting on `/api/*` Vercel functions
- CSP headers in `vercel.json`
- Custom domain alias update in Vercel (currently still aliased to route-au.vercel.app)
