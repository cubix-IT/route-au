CREATE TABLE IF NOT EXISTS changelog (
    changelog_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deployed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    commit_sha    TEXT,
    title         TEXT NOT NULL,
    description   TEXT,
    category      TEXT NOT NULL DEFAULT 'feature' CHECK (category IN ('feature','improvement','fix'))
);

CREATE INDEX IF NOT EXISTS idx_changelog_deployed ON changelog(deployed_at DESC);

ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'changelog' AND policyname = 'public read') THEN
    CREATE POLICY "public read" ON changelog FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'changelog' AND policyname = 'service write') THEN
    CREATE POLICY "service write" ON changelog FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
