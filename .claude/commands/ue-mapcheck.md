# UE Maps URL Policy Check

Zero-tolerance check on maps URL format. Run before every deploy and after every enrich run.

```bash
npm run mapcheck
```

## The rule (NON-NEGOTIABLE)

| ❌ FORBIDDEN | ✅ REQUIRED |
|---|---|
| `maps.google.com/?q=-37.8,145.2` | `google.com/maps/maps?q=-37.8,145.2+(Place+Name)` |
| Raw coordinates, no label | Coordinates with `+(Name)` label |
| Reported 3+ times, caused confusion | Natural features, heritage sites |

For business/venue searches:
```
https://www.google.com/maps/search/?api=1&query=Name%2C+Victoria
```

## Where violations can appear
- `activities.maps_url` in Supabase — most common
- `food_places.maps_url` — rare (usually null)
- Source code (`src/`, `api/`) — enrich.ts, MobilePlanner.tsx, MapContainer.tsx

## If violations found

**In DB:** Run the fix SQL printed by the check:
```sql
UPDATE activities
SET maps_url = 'https://www.google.com/maps/maps?q=' || lat || ',' || lng || '+(' || name || ')'
WHERE maps_url ~ '\?q=-?\d+\.\d+,-?\d+\.\d+$';
```

**In source:** Use `coordMapsUrl()` from `ExperiencePanel.tsx`:
```ts
coordMapsUrl(name, lat, lng, destName)
// → https://www.google.com/maps/maps?q=LAT,LNG+(Name)
```

**In enrich.ts:** Use the `mapsUrl()` helper already defined at the top of the script.
