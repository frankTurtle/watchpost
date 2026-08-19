-- Monitors: Uptime checks tracked per URL
create table public.monitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  method text not null default 'GET' check (method in ('GET', 'HEAD')),
  interval_minutes integer not null default 5 check (interval_minutes between 1 and 1440),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Check results: One row per check attempt
create table public.checks (
  id bigint generated always as identity primary key,
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  checked_at timestamptz not null default now(),
  ok boolean not null,
  status_code integer,
  latency_ms integer,
  error text
);

-- Index for fast lookups by monitor and time (for recent checks, latest first)
create index checks_monitor_checked_idx on public.checks (monitor_id, checked_at desc);

-- Row-level security: anon users can only read public status
alter table public.monitors enable row level security;
alter table public.checks enable row level security;

-- Anon (public) can read monitors and checks for the status page
create policy "anon_read_monitors" on public.monitors
  for select to anon using (true);

create policy "anon_read_checks" on public.checks
  for select to anon using (true);

-- All writes (insert, update, delete) go through the service_role key on the server
-- and bypass RLS, so no policies are needed for them. The server never hands RLS-enabled
-- credentials to the client.
