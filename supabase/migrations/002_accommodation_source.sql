ALTER TABLE accommodation DROP CONSTRAINT IF EXISTS accommodation_source_check;
ALTER TABLE accommodation ADD CONSTRAINT accommodation_source_check
  CHECK (source IN ('osm','static','google'));
