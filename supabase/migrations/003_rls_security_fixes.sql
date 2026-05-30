-- Fix 1: bug_reports anon insert — require error_message to be non-empty
-- instead of WITH CHECK (true), which triggers Supabase's security advisor.
-- Still allows anonymous inserts from the app, just validates the key field.
DROP POLICY IF EXISTS "anon insert bugs" ON bug_reports;
CREATE POLICY "anon insert bugs" ON bug_reports
  FOR INSERT WITH CHECK (
    error_message IS NOT NULL AND length(trim(error_message)) > 0
  );

-- Fix 2: price_submissions — not in our schema, empty, drop it
DROP TABLE IF EXISTS price_submissions CASCADE;
