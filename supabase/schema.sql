-- Unplanned Escapes — Supabase schema v2
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
--
-- MIGRATION: Drops old text-PK tables and recreates everything with INT PKs.
-- All FKs are named {table_singular}_id so joins are self-documenting.
-- Run once. Idempotent via DROP IF EXISTS + CREATE.

-- ─────────────────────────────────────────────────────────────────
-- CLEANUP: drop old tables from previous schema version
-- ─────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cron_log         CASCADE;
DROP TABLE IF EXISTS activities       CASCADE;
DROP TABLE IF EXISTS sub_destinations CASCADE;
DROP TABLE IF EXISTS clusters         CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- CORE: clusters + sub_destinations
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE clusters (
    cluster_id      INT         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug            TEXT        NOT NULL UNIQUE,
    name            TEXT        NOT NULL,
    tagline         TEXT,
    image_url       TEXT,
    gradient_from   TEXT        NOT NULL DEFAULT '#1a3a2a',
    gradient_to     TEXT        NOT NULL DEFAULT '#2a5a3a',
    seasonal_scores JSONB       NOT NULL DEFAULT '{}',
    display_order   SMALLINT    NOT NULL DEFAULT 0
);

CREATE TABLE sub_destinations (
    sub_dest_id      INT            GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug             TEXT           NOT NULL UNIQUE,
    cluster_id       INT            NOT NULL REFERENCES clusters(cluster_id) ON DELETE RESTRICT,
    name             TEXT           NOT NULL,
    lat              DOUBLE PRECISION NOT NULL,
    lng              DOUBLE PRECISION NOT NULL,
    drive_time_hours NUMERIC(4,2),
    drive_km         SMALLINT,
    highlights       TEXT[]         NOT NULL DEFAULT '{}',
    themes           TEXT[]         NOT NULL DEFAULT '{}',
    image_url        TEXT,
    neighbour_ids    INT[]          NOT NULL DEFAULT '{}',
    display_order    SMALLINT       NOT NULL DEFAULT 0
);

CREATE INDEX idx_sub_dest_cluster    ON sub_destinations(cluster_id);
CREATE INDEX idx_sub_dest_neighbours ON sub_destinations USING GIN(neighbour_ids);
CREATE INDEX idx_sub_dest_coords     ON sub_destinations(lat, lng);

-- ─────────────────────────────────────────────────────────────────
-- CONTENT: activities, food_places, nature_spots, accommodation
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE activities (
    activity_id     BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug            TEXT    NOT NULL UNIQUE,
    sub_dest_id     INT     NOT NULL REFERENCES sub_destinations(sub_dest_id) ON DELETE CASCADE,

    name            TEXT    NOT NULL,
    category        TEXT    NOT NULL CHECK (category IN (
                      'nature','wildlife','history','art','family','active','relaxation',
                      'markets','viewpoint','beach','wellness','entertainment','sports','shopping',
                      'food','drink'
                    )),
    emoji           TEXT    NOT NULL DEFAULT '📍',
    description     TEXT,
    duration        TEXT,
    cost            TEXT    NOT NULL DEFAULT 'free' CHECK (cost IN ('free','$','$$','$$$')),

    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    address         TEXT,

    kids_ok         BOOLEAN NOT NULL DEFAULT TRUE,
    is_hidden_gem   BOOLEAN NOT NULL DEFAULT FALSE,

    google_place_id TEXT,
    attributes      JSONB   NOT NULL DEFAULT '{}',

    maps_url        TEXT,
    website         TEXT,
    phone           TEXT,

    tags            TEXT[]  NOT NULL DEFAULT '{}',
    source          TEXT    NOT NULL DEFAULT 'static' CHECK (source IN ('static','osm','google')),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_sub_dest ON activities(sub_dest_id);
CREATE INDEX idx_activities_category ON activities(sub_dest_id, category);
CREATE INDEX idx_activities_kids     ON activities(sub_dest_id, kids_ok);

-- ──────────────────────────────────────────────────────────────────

CREATE TABLE food_places (
    food_place_id   BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug            TEXT    NOT NULL UNIQUE,
    sub_dest_id     INT     NOT NULL REFERENCES sub_destinations(sub_dest_id) ON DELETE CASCADE,

    name            TEXT    NOT NULL,
    category        TEXT    NOT NULL CHECK (category IN (
                      'Cafe','Pub','Restaurant','Winery','Bakery',
                      'Seafood','Brewery','Distillery','Roadhouse','Bar','Deli','Other'
                    )),
    description     TEXT,

    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    address         TEXT,

    price_range     TEXT    CHECK (price_range IN ('$','$$','$$$')),
    must_book       BOOLEAN NOT NULL DEFAULT FALSE,
    signature_dish  TEXT,
    meal_times      TEXT[]  NOT NULL DEFAULT '{}',

    google_place_id TEXT,
    attributes      JSONB   NOT NULL DEFAULT '{}',
    -- OSM attributes stored here:
    -- { outdoor_seating, wheelchair, parking, diet_vegetarian,
    --   internet_access, takeaway, opening_hours_raw }

    website         TEXT,
    phone           TEXT,
    opening_hours   TEXT,

    source          TEXT    NOT NULL DEFAULT 'static' CHECK (source IN ('static','osm','google')),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_food_sub_dest  ON food_places(sub_dest_id);
CREATE INDEX idx_food_category  ON food_places(sub_dest_id, category);

-- ──────────────────────────────────────────────────────────────────

CREATE TABLE nature_spots (
    nature_spot_id  BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug            TEXT    NOT NULL UNIQUE,
    sub_dest_id     INT     NOT NULL REFERENCES sub_destinations(sub_dest_id) ON DELETE CASCADE,

    name            TEXT    NOT NULL,
    type            TEXT    NOT NULL CHECK (type IN (
                      'hiking','viewpoint','beach','waterfall','national_park',
                      'nature_reserve','hot_spring','lake','river','cave',
                      'forest','wetland','summit','gorge'
                    )),
    description     TEXT,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    address         TEXT,

    route_length    TEXT,
    difficulty      TEXT    CHECK (difficulty IN ('easy','moderate','hard')),
    kids_ok         BOOLEAN NOT NULL DEFAULT TRUE,

    google_place_id TEXT,
    attributes      JSONB   NOT NULL DEFAULT '{}',

    website         TEXT,
    phone           TEXT,

    source          TEXT    NOT NULL DEFAULT 'osm' CHECK (source IN ('osm','static')),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nature_sub_dest ON nature_spots(sub_dest_id);
CREATE INDEX idx_nature_type     ON nature_spots(sub_dest_id, type);
CREATE INDEX idx_nature_kids     ON nature_spots(sub_dest_id, kids_ok);

-- ──────────────────────────────────────────────────────────────────

CREATE TABLE accommodation (
    accommodation_id BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug             TEXT    NOT NULL UNIQUE,
    sub_dest_id      INT     NOT NULL REFERENCES sub_destinations(sub_dest_id) ON DELETE CASCADE,

    name             TEXT    NOT NULL,
    type             TEXT    NOT NULL CHECK (type IN (
                       'hotel','motel','resort','campsite','caravan_park',
                       'hostel','cabin','guest_house','bed_and_breakfast'
                     )),
    description      TEXT,
    lat              DOUBLE PRECISION,
    lng              DOUBLE PRECISION,
    address          TEXT,
    stars            SMALLINT CHECK (stars BETWEEN 1 AND 5),

    google_place_id  TEXT,
    attributes       JSONB   NOT NULL DEFAULT '{}',

    website          TEXT,
    phone            TEXT,

    source           TEXT    NOT NULL DEFAULT 'osm' CHECK (source IN ('osm','static')),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accom_sub_dest ON accommodation(sub_dest_id);
CREATE INDEX idx_accom_type     ON accommodation(sub_dest_id, type);

-- ─────────────────────────────────────────────────────────────────
-- FUEL: stations + prices (Fair Fuel API — open government data)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE fuel_stations (
    fuel_station_id INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    external_id     TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    brand           TEXT,
    address         TEXT,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fuel_station_coords ON fuel_stations(lat, lng);
CREATE INDEX idx_fuel_station_brand  ON fuel_stations(brand);

CREATE TABLE fuel_prices (
    fuel_price_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fuel_station_id INT    NOT NULL REFERENCES fuel_stations(fuel_station_id) ON DELETE CASCADE,
    fuel_type       TEXT   NOT NULL CHECK (fuel_type IN ('P95','P98','DSL','E10','LPG','U91')),
    price_cents     NUMERIC(6,1) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (fuel_station_id, fuel_type)
);

CREATE INDEX idx_fuel_prices_station  ON fuel_prices(fuel_station_id);
CREATE INDEX idx_fuel_prices_type     ON fuel_prices(fuel_type);

-- ─────────────────────────────────────────────────────────────────
-- AI: destination summaries (wiki + claude, weekly refresh)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE destination_summaries (
    summary_id  INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sub_dest_id INT  NOT NULL UNIQUE REFERENCES sub_destinations(sub_dest_id) ON DELETE CASCADE,
    wiki_text   TEXT,
    ai_summary  TEXT,
    best_for    TEXT[]   NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- OBSERVABILITY: cron_log, cron_status, deployment_log, bug_reports
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE cron_log (
    cron_log_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_name                TEXT   NOT NULL,
    run_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ,
    status                  TEXT   NOT NULL CHECK (status IN ('ok','error','partial')),
    message                 TEXT,
    records_upserted        INT    NOT NULL DEFAULT 0,
    destinations_processed  INT    NOT NULL DEFAULT 0,
    duration_ms             INT
);

CREATE INDEX idx_cron_log_job ON cron_log(job_name, run_at DESC);

-- One row per job — shows last success at a glance ("Fuel prices updated 2h ago")
CREATE TABLE cron_status (
    cron_status_id         INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_name               TEXT NOT NULL UNIQUE,
    last_run_at            TIMESTAMPTZ,
    last_success_at        TIMESTAMPTZ,
    last_error_at          TIMESTAMPTZ,
    last_error_message     TEXT,
    total_runs             INT  NOT NULL DEFAULT 0,
    total_records_upserted INT  NOT NULL DEFAULT 0
);

INSERT INTO cron_status (job_name) VALUES
  ('enrich-places'),
  ('fuel-prices'),
  ('enrich-summaries');

-- ──────────────────────────────────────────────────────────────────

CREATE TABLE deployment_log (
    deployment_id  INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_name      TEXT NOT NULL,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ,
    status         TEXT NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress','completed','failed','rolled_back')),
    git_sha        TEXT,
    notes          TEXT
);

-- ──────────────────────────────────────────────────────────────────

CREATE TABLE bug_reports (
    bug_report_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    component      TEXT,
    endpoint       TEXT,
    error_message  TEXT NOT NULL,
    stack_trace    TEXT,
    sub_dest_id    INT  REFERENCES sub_destinations(sub_dest_id) ON DELETE SET NULL,
    user_agent     TEXT,
    reported_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status         TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','resolved','wont_fix')),
    resolution     TEXT
);

CREATE INDEX idx_bug_reports_status    ON bug_reports(status, reported_at DESC);
CREATE INDEX idx_bug_reports_component ON bug_reports(component);

-- ─────────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- Anyone can read content tables; only service_role can write
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE clusters              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_destinations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_places           ENABLE ROW LEVEL SECURITY;
ALTER TABLE nature_spots          ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_stations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_status           ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports           ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "public read" ON clusters              FOR SELECT USING (true);
CREATE POLICY "public read" ON sub_destinations      FOR SELECT USING (true);
CREATE POLICY "public read" ON activities            FOR SELECT USING (true);
CREATE POLICY "public read" ON food_places           FOR SELECT USING (true);
CREATE POLICY "public read" ON nature_spots          FOR SELECT USING (true);
CREATE POLICY "public read" ON accommodation         FOR SELECT USING (true);
CREATE POLICY "public read" ON fuel_stations         FOR SELECT USING (true);
CREATE POLICY "public read" ON fuel_prices           FOR SELECT USING (true);
CREATE POLICY "public read" ON destination_summaries FOR SELECT USING (true);
CREATE POLICY "public read" ON cron_status           FOR SELECT USING (true);

-- Service-role write (cron jobs + seed script)
CREATE POLICY "service write" ON clusters              FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON sub_destinations      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON activities            FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON food_places           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON nature_spots          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON accommodation         FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON fuel_stations         FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON fuel_prices           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON destination_summaries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON cron_log              FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON cron_status           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON deployment_log        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service write" ON bug_reports           FOR ALL USING (auth.role() = 'service_role');

-- Bug reports can be inserted by anon users (client-side error reporting)
CREATE POLICY "anon insert bugs" ON bug_reports FOR INSERT WITH CHECK (true);
