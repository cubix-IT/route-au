# Data Sources

All sources are free, open, and require no API keys unless noted.

## OpenStreetMap via Overpass API
- **What**: Activities, food places, nature spots, accommodation
- **Endpoint**: `https://overpass-api.de/api/interpreter` (with mirror fallback)
- **Limits**: 10,000 queries/day safe limit — hard stop at 9,000
- **Rate limiting**: 3s sleep between destinations; stop run if query >10s
- **Mirrors**: overpass-api.de → overpass.kumi.systems → overpass.private.coffee
- **Source field**: always `'static'` (DB constraint)

## Victorian Heritage Database (VHD) API
- **What**: VHR-registered heritage buildings and sites per destination
- **Endpoint**: `https://api.heritagecouncil.vic.gov.au/v1/places`
- **Auth**: None required
- **Key params**: `?sub=<town>&aut=1086&rpp=50` — VHR only (aut=1086 = Victorian Heritage Register)
- **Licence**: CC BY 4.0 — © Heritage Council Victoria
- **Notes**: `geo` param sorts but doesn't filter — we post-filter by haversine distance
- **Slug prefix**: `vhd-<id>`

## Wikipedia REST API
- **What**: Destination summaries, hero images, pageview counts for quality scoring
- **Endpoint**: `https://en.wikipedia.org/api/rest_v1/page/summary/<slug>`
- **Limits**: 200 req/min with User-Agent — we sleep 350ms between calls
- **Pageviews**: `https://wikimedia.org/api/rest_v1/metrics/pageviews/...` — 3-month avg

## Open-Meteo
- **What**: Weather forecasts for destination
- **Auth**: None required
- **Licence**: Free for non-commercial use

## Service Victoria Fair Fuel API
- **What**: Real-time fuel prices near route
- **Key**: `a2fe59...` (in Vercel env as `SERVICE_VIC_FUEL_KEY`)
- **Endpoint**: `/api/fuel.ts`
- **Licence**: CC BY 4.0 — © State of Victoria

## VicEmergency
- **What**: Live fire/flood/hazard alerts
- **Endpoint**: `/api/hazards.ts`
- **Licence**: CC BY 4.0 — © Emergency Management Victoria

## OSRM
- **What**: Road routing geometry for map display
- **Auth**: None required

## Photon (Komoot)
- **What**: Location search / autocomplete
- **Auth**: None required

## Anthropic Claude (Haiku)
- **What**: AI-generated descriptions for POIs with no Wikipedia article
- **Key**: `ANTHROPIC_API_KEY` (Vercel env, server-side only)
- **Model**: `claude-haiku-4-5-20251001`
- **Cost**: ~$0.003/day · ~$0.09/month · prepaid credit, no auto-reload = hard cap
- **Pricing**: $0.80/M input tokens, $4/M output tokens (Haiku 4.5)
- **Only fires**: in enrichment cron, never on user requests
- **Safe because**: Raj's Anthropic account is prepaid with no auto-reload — if credit runs out it stops, no debt
