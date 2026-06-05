grant usage on schema public to anon, authenticated;
grant select on trails to anon, authenticated;

drop policy if exists "public read trails" on trails;
create policy "public read trails" on trails
  for select to anon, authenticated
  using (true);
