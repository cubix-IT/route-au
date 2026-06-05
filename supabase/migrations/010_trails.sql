create table if not exists trails (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  type            text not null check (type in ('walk', 'cycle', 'mtb')),
  distance_km     numeric,
  description     text,
  region          text,
  kml_url         text not null,
  content_hash    text,
  waypoints       jsonb,
  route_coords    jsonb,
  last_fetched_at timestamptz,
  source          text default 'data.vic.gov.au',
  licence         text default 'CC BY 4.0',
  created_at      timestamptz default now()
);
alter table trails enable row level security;
