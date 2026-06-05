drop policy if exists "public read trails" on trails;
create policy "public read trails" on trails
  for select to anon, authenticated
  using (true);
