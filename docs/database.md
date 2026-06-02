# Database

Supabase free tier — Sydney region — 500MB limit (currently ~13MB used).

## Tables

| Table | Rows (Jun 2026) | Purpose |
|---|---|---|
| `sub_destinations` | 139 | Destination list with coords, themes, enrichment timestamp |
| `activities` | ~13+ | Things to do — OSM + VHD heritage |
| `food_places` | 372 | Restaurants, cafes, pubs, wineries etc |
| `nature_spots` | 79 | Parks, beaches, waterfalls |
| `accommodation` | 5,665 | OSM accommodation (hidden from wizard — data not ready) |
| `clusters` | — | Regional groupings of sub_destinations |
| `cron_log` | — | Enrichment run history |
| `deployment_log` | — | Deploy history (written by `npm run deploy`) |
| `profiles` | — | Auth user profiles (added migration 006) |
| `trips` | — | Saved trips per user (added migration 006) |

## Key constraints
- `activities.source` CHECK: must be `'static'` — enforced, never use `'osm'` or `'google'`
- `activities.category` CHECK: `'nature','wildlife','history','art','family','active','relaxation','markets','viewpoint','beach','wellness','entertainment','sports','shopping','food','drink'`
- `food_places.source` CHECK: `'static'`

## Slug conventions
- OSM items: `osm-<type>-<id>` (e.g. `osm-way-123456`)
- VHD heritage: `vhd-<id>` (e.g. `vhd-329`)
- Manual items: descriptive slug (e.g. `daylesford-convent-spa`)

## Migrations
Run in Supabase SQL Editor in order:
1. `001` — initial schema (run at project creation, not in migrations folder)
2. `002_accommodation_source.sql`
3. `003_rls_security_fixes.sql`
4. `004_sub_dest_enriched_at.sql`
5. `005_food_places_categories.sql`
6. `006_auth_profiles_trips.sql` ← **pending** (not yet run in dashboard)
7. `007_deploy_log.sql`

## RLS
All tables have RLS enabled. Public read allowed on all content tables. Write requires `service_role` (server-side only via `SUPABASE_SERVICE_KEY`).

## DB size guard
Enrichment cron stops at 450MB estimated usage (rough: rows × 2KB). Hard Supabase limit is 500MB.
