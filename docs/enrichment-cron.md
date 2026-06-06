# Enrichment

Local script (Geofabrik PBF) + monthly cron. File: `scripts/enrich.ts`

## Run commands
```bash
npm run enrich                        # 8 stale destinations
npm run enrich -- --all               # all 130 destinations
npm run enrich -- --slug healesville  # single destination
npm run enrich -- --force             # ignore staleness
npm run enrich -- --no-push           # dry run (no git commit)
```

## Architecture: Wikipedia-first, OSM-as-supplement

1. **Wikipedia discovery** — fetch Tourism/Recreation/Heritage sections from the destination's Wikipedia article, use Claude Haiku to extract named attractions as structured data (`name`, `category`, `description`)
2. **Geocoding** — for each Wikipedia attraction, check OSM PBF first (name match), then Photon geocoder. Drop items with no coordinates.
3. **OSM supplement** — bounding-box scan of Geofabrik PBF for POIs Wikipedia missed (cafes, pubs, wineries, natural features). Deduplicated against Wikipedia finds by name.
4. **VHD heritage** — Victorian Heritage Database API for historic buildings
5. **Description fill** — Wikipedia extract for items with `tags.wikipedia`; Claude Haiku for everything else. Prompt: visitor experience, never population/dates.
6. **Quality gate** — activities must have description >20 chars; nature spots need description OR `tags.wikipedia` (filled by step 5)

## Data sources
| Source | Used for |
|---|---|
| Geofabrik PBF (Geofabrik.de) | All POI discovery — no rate limits |
| Wikipedia REST API | Destination summaries + item descriptions |
| Claude Haiku | Descriptions for items without Wikipedia (~$0.003/destination) |
| Victorian Heritage Database | Heritage buildings with VHR numbers |
| Photon (Komoot) | Geocoding Wikipedia-found attractions |

## Quality filters (what gets excluded)
- `amenity=library` — not weekend destinations
- Zoo/sanctuary sub-enclosure labels (Dingo1, Koala, etc.)
- Accommodation (belongs in `accommodation` table)
- Chain businesses (McDonald's, Coles, BP, etc.)
- Items with no description after Wikipedia + Haiku fill
- Wikipedia attractions with no geocoded coordinates (can't pin them)
- Food (cafes/bakeries) without Wikipedia tag — tourist-notable only

## Destination summary (About section)
- Fetched from Wikipedia via `fetchWikipediaSummary()` in `src/lib/overpass.ts`
- Picks the first visitor-relevant sentence — skips population, founding dates, disasters, compass directions
- Cached in localStorage `ue-wiki-cache-v2` with 24h TTL

## Schedule (GitHub Actions)
`.github/workflows/enrich.yml` — weekly Sunday 2am AEST when laptop is off.
Requires secrets: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`

## Run log
`logs/enrich-runs.jsonl` — appended and committed after each run. Fields: `run_at`, `completed_at`, `duration_sec`, `mode`, `destinations`, `upserted`, `pbf_source`, `results[]`.
