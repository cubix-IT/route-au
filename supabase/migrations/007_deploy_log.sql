-- Deploy log: records every production deployment automatically via Vercel webhook
create table if not exists deploy_log (
  deploy_log_id  serial primary key,
  deployed_at    timestamptz not null default now(),
  environment    text not null default 'production',
  status         text not null,           -- 'success' | 'error' | 'building'
  vercel_url     text,                    -- deployment URL
  vercel_id      text,                    -- Vercel deployment ID
  commit_sha     text,                    -- git commit SHA
  commit_message text,                    -- git commit message
  branch         text,                    -- git branch
  author         text,                    -- who triggered it
  duration_ms    integer,                 -- build duration
  notes          text                     -- optional free-text
);

-- Only service role can insert/read
alter table deploy_log enable row level security;
create policy "service role only" on deploy_log using (false);
