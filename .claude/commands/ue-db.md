# UE Database — Session Health Check & Query Tool

Run this at the start of any Unplanned Escapes session to get a full DB health snapshot.

## Step 1 — Run the status script
```bash
npm run db:status
```
This reports:
- Row counts for all tables (sub_destinations, activities, food_places, nature_spots, accommodation, trails, fuel_stations, fuel_prices, deploy_log)
- How many destinations are missing AI summaries
- Null-description counts per table
- Food place breakdown by category
- Last enrich run timestamp + outcome
- Last deploy timestamp + commit SHA

## Step 2 — Interpret results

| Signal | Action |
|---|---|
| `>0 missing summaries` | Trigger: `curl -X POST https://unplanned-escapes.vercel.app/api/cron/summaries?force=true` |
| `enrich run >7 days ago` | Run `npm run enrich -- --all` |
| `null food_places descriptions >0` | Run `npm run enrich -- --force` on affected destinations |
| `deploy_log last deploy >24h` | Ask Raj if a deploy is needed |

## Step 3 — Table queries (ad hoc)

```bash
# Show destinations missing summaries
npm run db -- sub_destinations "summary=is.null" 20

# Show activities in a category
npm run db -- activities "category=eq.history" 10

# Show food places without descriptions
npm run db -- food_places "description=is.null" 20

# Show all nature spots
npm run db -- nature_spots "" 50
```

Filter format: `column=operator.value`
- `is.null` — IS NULL
- `eq.VALUE` — equals
- `ilike.*PATTERN*` — case-insensitive contains
- `gt.VALUE` — greater than

## Tables Reference
| Table | Key columns |
|---|---|
| sub_destinations | slug, name, summary, status, region |
| activities | slug, name, category, description, lat, lng, dest_slug |
| food_places | slug, name, category, description, lat, lng, dest_slug |
| nature_spots | slug, name, description, lat, lng, dest_slug |
| accommodation | slug, name, type, address, lat, lng, dest_slug |
| trails | slug, name, distance_km, difficulty, dest_slug |
| fuel_stations | id, name, brand, lat, lng |
| fuel_prices | station_id, fuel_type, price, updated_at |
| deploy_log | deployed_at, commit_sha, notes |

## Supabase Dashboard (for complex SQL)
Open SQL Editor at: Supabase dashboard → SQL Editor
Connection string is in `.env` as `SUPABASE_URL`.
