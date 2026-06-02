DROP TABLE IF EXISTS changelog;

CREATE TABLE changelog (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deployed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    git_sha       TEXT,
    title         TEXT NOT NULL,
    description   TEXT
);

CREATE INDEX idx_changelog_deployed ON changelog(deployed_at DESC);
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read"   ON changelog FOR SELECT USING (true);
CREATE POLICY "service write" ON changelog FOR ALL   USING (auth.role() = 'service_role');
