-- Unplanned Escapes — Supabase schema
-- Run this in Supabase SQL Editor to initialise the database

-- Enable pgcrypto for gen_random_uuid if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Clusters ──────────────────────────────────────────────────────
-- Regional groupings shown as cards on the landing page
CREATE TABLE IF NOT EXISTS clusters (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  tagline         TEXT,
  drive_time_range TEXT,
  themes          TEXT[],
  seasonal_scores JSONB NOT NULL DEFAULT '{}',
  image_emoji     TEXT,
  image_url       TEXT,
  gradient_from   TEXT,
  gradient_to     TEXT,
  display_order   INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sub-destinations ──────────────────────────────────────────────
-- Specific towns / areas within a cluster
CREATE TABLE IF NOT EXISTS sub_destinations (
  id               TEXT PRIMARY KEY,
  cluster_id       TEXT NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  drive_time_hours REAL,
  drive_km         INTEGER,
  highlights       TEXT[],
  themes           TEXT[],
  lat              REAL NOT NULL,
  lng              REAL NOT NULL,
  display_order    INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_dest_cluster ON sub_destinations(cluster_id);

-- ── Activities ────────────────────────────────────────────────────
-- Things to do at a specific sub-destination
CREATE TABLE IF NOT EXISTS activities (
  id            TEXT PRIMARY KEY,
  sub_dest_id   TEXT NOT NULL REFERENCES sub_destinations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN (
    'nature','wildlife','food','drink','history','art',
    'family','active','relaxation','markets','viewpoint'
  )),
  emoji         TEXT,
  description   TEXT,
  duration      TEXT,
  cost          TEXT CHECK (cost IN ('free','$','$$','$$$')),
  kids_ok       BOOLEAN DEFAULT TRUE,
  is_hidden_gem BOOLEAN DEFAULT FALSE,
  maps_url      TEXT,
  tags          TEXT[],
  source        TEXT DEFAULT 'manual',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_sub_dest ON activities(sub_dest_id);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);

-- ── Cron log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cron_log (
  id             BIGSERIAL PRIMARY KEY,
  run_at         TIMESTAMPTZ DEFAULT NOW(),
  status         TEXT,
  message        TEXT,
  records_added  INTEGER DEFAULT 0
);

-- ── Row-level security (public read, service-role write) ──────────
ALTER TABLE clusters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_log         ENABLE ROW LEVEL SECURITY;

-- Anyone can read clusters and destinations
CREATE POLICY "public read clusters"         ON clusters         FOR SELECT USING (true);
CREATE POLICY "public read sub_destinations" ON sub_destinations FOR SELECT USING (true);
CREATE POLICY "public read activities"       ON activities       FOR SELECT USING (true);

-- Only service role can write (cron jobs use service key)
CREATE POLICY "service write clusters"         ON clusters         FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write sub_destinations" ON sub_destinations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write activities"       ON activities       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write cron_log"         ON cron_log         FOR ALL USING (auth.role() = 'service_role');
