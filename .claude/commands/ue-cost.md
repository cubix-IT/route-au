# UE Cost & Free-Tier Check

Run before every deploy to verify nothing has crept onto a paid tier.

```bash
npm run cost
```

## What it checks

| Check | Limit | Tool |
|---|---|---|
| Google Places API key in env | Must not exist | env audit |
| Paid API domains in source | Zero tolerance | grep src/ api/ |
| Supabase DB size | < 500MB free | Supabase REST |
| Vercel cron jobs | ≤ 2 (Hobby) | vercel.json |
| Vercel serverless functions | ≤ 12 (Hobby) | api/ file count |
| Anthropic spend | ~$0.003/dest (Haiku) | enrich log |
| All data sources | 100% free | hardcoded list |

## Free data sources confirmed
- Photon (Komoot) — geocoding
- OSRM — routing
- MET Norway — weather
- Wikipedia REST — summaries + images
- Geofabrik — OSM PBF downloads
- data.vic.gov.au — trails, heritage
- Service Victoria Fuel — open government data
- VicEmergency — open government data

## Only approved paid service
- **Anthropic Claude Haiku** — ~A$0.003/destination, prepaid, no auto-reload
- Raj's account: prepaid only, auto-reload OFF

## 🚨 If cost check fails
1. Identify the failing check
2. Remove the offending API key / code before deploying
3. If Google Places key detected: check `.env`, `.env.local`, `.env.production` and remove
4. Google Places caused A$1,992 bill in May 2026 — treat as P0

## Run mapcheck too
```bash
npm run mapcheck
```
Zero-tolerance check on maps URL format — no raw coordinate links.
