# Enrichment Cron

Daily job that keeps destination data fresh. File: `api/cron/enrich.ts`

## Schedule
`0 1 * * *` UTC = **11am AEST** — runs daily, 8 destinations per run.
All 139 destinations cycle every ~17 days.

## What it does per destination
1. Stamps `enriched_at` immediately (moves dest to end of queue regardless of outcome)
2. Fetches POIs from Overpass API (tiered radius: 2km / 10km / 20km by distance from Melbourne)
3. Fetches VHR heritage buildings from Victorian Heritage Database API
4. Fetches Wikipedia descriptions for items with `wikipedia` OSM tag (up to 5)
5. Fetches Wikipedia pageviews for quality scoring (up to 10 items)
6. Generates AI descriptions via Claude Haiku for items with no description
7. Upserts to `activities`, `food_places`, `nature_spots` tables

## Hard limits / stop conditions
| Source | Limit | Action |
|---|---|---|
| Overpass | 9,000 calls/day | Stop entire run |
| Overpass | Query >10s (3 consecutive) | Stop entire run |
| Overpass | HTTP 429 | Try next mirror, then stop |
| Supabase DB | 450MB estimated | Stop entire run |
| Wikipedia | HTTP 429 | Skip remaining Wikipedia calls this run |

## Manual trigger
```bash
curl -X POST "https://unplanned-escapes.vercel.app/api/cron/enrich?force=1&limit=8"
# force=1 ignores enriched_at staleness check
# limit=N overrides batch size (max 10)
```

## Check status
```bash
curl https://unplanned-escapes.vercel.app/api/status
```

## OSM category → activity category mapping
- `tourism=viewpoint` → `viewpoint 🌄`
- `historic=*` / `railway=station` → `history 🏛️`
- VHD heritage places → `history 🏛️`
- `natural=hot_spring` / `amenity=spa` → `wellness ♨️`
- `craft=brewery` → `brewery 🍺`
- `craft=winery` / `tourism=winery` → `winery 🍷`
- `craft=distillery` → `distillery 🥃`
- See `activityCategory()` in enrich.ts for full mapping

## Quality scoring (0–100)
- Wikipedia monthly pageviews: up to 55 points
- Has wikipedia OSM tag: +20
- Has wikidata OSM tag: +15
- VHD heritage baseline: 40 (officially significant)
- `tourism=attraction`: +10
- Has website: +5

## Email notifications
Sent at end of each full cycle (all 139 destinations done) or if stopped early.
Configured via `RESEND_API_KEY` in Vercel env.
