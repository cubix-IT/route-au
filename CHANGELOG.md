# Changelog

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
