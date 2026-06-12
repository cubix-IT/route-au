# Changelog

## 12 June 2026

- **Data quality — purge OSM sculpture-trail and vandalism noise**
  - Deleted 94 junk rows: individual artwork nodes ("Untitled (I Love You)", "Aftermath 9-11", solar-system trail markers, statue spam), defunct places ("Sawdust Pile — no longer here")
  - Enrich pipeline now requires Wikipedia/Wikidata notability for `tourism=artwork` POIs and skips places with defunct lifecycle notes
  - New `scripts/clean-junk.mts` (dry-run + `--apply`) and `scripts/quality-scan.mts` for ongoing data audits
- **Performance — 71% smaller first load**
  - Code-split planner: maplibre-gl (1 MB), wizard, panels and modals now lazy-load; landing page JS down from 556 KB → 164 KB gzipped
  - Planner chunks prefetch while the wizard is open — map appears instantly when the itinerary is ready
  - Replaced `@turf/turf` kitchen-sink with 5 scoped packages
  - Logo 469 KB → 6.6 KB (was 6250×6250px!); og-image 2.4 MB → 175 KB JPEG
- **Resilience — network timeouts everywhere**
  - Added `AbortSignal.timeout` to weather (10s), Photon autocomplete (6s) and fuel (10s) fetches — no more indefinite hangs on flaky regional connections
  - Photon autocomplete failures now return empty suggestions instead of unhandled promise rejections
  - Branded loading spinner while planner chunks load (was blank screen)

## 8 June 2026 (4d26db1)

- **PWA polish — iOS meta tags, fix maskable icon, clean up manifest name**

## 8 June 2026 (509f10f)

- **Add og:image and social share meta tags**

## 8 June 2026 (c6baa27)

- **Hide fuel tab and vehicle step from wizard**

## 8 June 2026 (bbc6fd5)

- **Wizard step 3 two-col layout + generating screen discovery grid**
  - Step 3: destination/stats left, fuel right — no scroll needed

## 8 June 2026 (bbc6fd5)

- **Wizard Step 3 two-column layout + generating screen discovery grid**
  - Step 3 (Review): destination hero + stats grid on left (55%), fuel stops on right (45%) — fits without scrolling
  - GeneratingScreen: replaced step list with 14 category discovery tiles (Nature, Viewpoints, Active, Wildlife, History, Art, Relax, Entertainment, Wineries, Breweries, Cafes, Restaurants, Hotels, Camping)
  - Counts animate from 0 → final in sync with the progress bar (display = round(progress% × finalCount))
  - Tile background and text colour interpolate from muted grey-green → vivid bright green as progress fills — categories with zero results stay permanently grey
  - Per-category counts pushed to Zustand store from usePlannerData as data arrives; reset to `{}` on each new trip build

## 8 June 2026 (57ac308)

- **Desktop Overview tab + hourly weather, M3 slider, loading screen, wizard polish**
  - ExperiencePanel: replace All tab with Overview — 3-col category tiles for

## 8 June 2026 (817cbf1)

- **Wizard UI polish, theme/recommendation engine, map marker fix**
  - Wizard crew selector forced to single row (inline button, no CSS class override)

## 8 June 2026 (7f788a9)

- **fix: Map POI marker jumps to top-left on click** — MapLibre sets marker position via `transform: translate(...)` on the root element. `highlightMarker()` was overwriting that with `scale(1.35)`, snapping marker to 0,0. Fix: inner wrapper div holds all visual styles; scale applies to inner only. Popup open changed to `marker.togglePopup()` for correct LngLat anchoring. (closes #76)
- **feat: Wizard crew selector — single row** — Replaced `option-card` CSS class (which had overriding padding) with fully inline `<button>` elements. Fixed in both the standard and preselect wizard flows. (closes #77)
- **feat: Kids section — M3 tonal style** — Yes kids / Adults only as tonal card buttons; age chips with label + desc, no emojis. (closes #77)
- **feat: Calendar — desktop horizontal tile layout** — 5 days shown; each tile has day/date/month on left, weather + temp on right; `flexDirection: mobile ? 'column' : 'row'`. (closes #77)
- **feat: Recommendation engine — DB-count gating** — Wizard fetches live DB row counts before computing suggestions; destinations with 0 confirmed records excluded from Recommended; DB count boosts score so most-stocked destinations rank highest. (closes #78)
- **feat: Seasonal alpine themes** — Alpine resorts switch to Skiing/Snow in winter, Hiking/Nature otherwise. Bright and Marysville similarly season-aware. (closes #78)
- **feat: Enrichment — tourist-accurate POI filtering** — Local sports clubs and gyms permanently blocked; tourist-accessible recreation (bowling, pools, mini golf, escape rooms) preserved; golf clubs kept in `active`. (closes #79)
- **script: sync-themes.mts** — Derives top-3 static themes per destination from actual DB category counts. (closes #78)

## 7 June 2026 (3451d14)

- **DX skills — cost check, mapcheck, issue-sync**
  npm run cost:

## 7 June 2026 (6417c0d)

- **What's here modal — 2-column card grid on desktop**
  Things to Do and Food & Drinks tabs now display ResultCards in a
- **DX skills + What's here modal parity with results page**
  Skills (closes #59, closes #60):

## 6 June 2026 (b4387fa)

- **Generating screen — Victorian landscape animation with 4WD**
  SVG scene: rolling green hills, animated clouds, swaying trees, road dashes,

## 6 June 2026 (90f2e4d)

- **M3 Expressive wizard redesign + hero browse link contrast fix**
  Wizard: Surface Container tint (#F2F5F1), 28dp corners, linear progress bar,

## 6 June 2026 (de92a30)

- **#32 ME-1/ME-2/ME-4 — radius tokens, colour tokens, shared brand constants**
  ME-4: src/lib/brand.ts — single source for GREEN/WARM/SECONDARY (replaces 20+ inline consts)

## 6 June 2026 (a52f7d3)

- **Wizard stays open until data ready — no loading screen on results**
  - Add tripDataReady flag to Zustand store

## 6 June 2026 (bdee36d)

- **M3 animations — card hover lift, tab fade, wizard step fade**
  1. ClusterCard: mu-card hover lift (translateY -2px + shadow upgrade)

## 6 June 2026 (e219d4f)

- **#5 — VicEmergency hazard icons on map**
  - Add lat/lng to HazardAlert interface

## 6 June 2026 (31d18d7)

- **#6 #30 #31 — distance labels, food chips, local/nearby split**
  #6: Distance from town centre on activity cards (haversine, only >2km)

## 6 June 2026 (157b29d)

- **Hero redesign — clarity, hierarchy, search-first layout**
  - High-contrast H1 (#1A1A1A), kicker, punchy subheadline

## 6 June 2026 (a092722)

- **Ines feedback — tags, errors, card layout, secondary colour, timeline**
  #14: Tags use square corners + border — clearly not buttons

## 6 June 2026 (81ce637)

- **Loading screen, mobile map-on-top, banner image fallback**
  - LoadingScreen: destination hero + progress bar until Supabase+OSRM ready

## 6 June 2026 (07c90bb)

- **Region search, ResultCard, map sync, OSRM drive filter, DB cleanup**
  - Region search in wizard: search box + all 25 cluster chips, unmatched

## 6 June 2026 (d38fef6)

- **Geofabrik enrichment, Food & Drinks tab, Stay tab, UI polish**
  Enrichment:

## 2 June 2026 (7a49bc1)

- **Restore Haiku descriptions with spend docs + CLAUDE.md spend rules**
  - Claude Haiku back in enrichment cron (~$0.003/day, prepaid no auto-reload)

## 2 June 2026 (6252426)

- **Switch weather API from Open-Meteo to MET Norway (api.met.no)**
  Open-Meteo free tier is non-commercial only. MET Norway is free with
