-- Habit Quest push reminders (closed-app notifications).
--
-- Separate from the other app on this project (its push_config /
-- push_subscriptions / push function are untouched). Both tables have RLS on
-- and NO policies: only the hq-push edge function (service role) reads or
-- writes them. Devices are tied to the signed-in character (auth user) and are
-- removed with it.

create table if not exists public.hq_push_config (
  id integer primary key default 1 check (id = 1),
  public_key text,
  private_key text,
  -- Shared secret the cron job sends, so only the scheduler can run 'tick'.
  cron_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);
alter table public.hq_push_config enable row level security;
insert into public.hq_push_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.hq_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  tz text not null default 'UTC',
  -- {"dawn": "07:30" | null, "daily": "19:00" | null, "campfire": "21:30" | null}
  prefs jsonb not null default '{}'::jsonb,
  -- {"dawn": "2026-11-21", ...}: the local date each kind was last sent.
  last_sent jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hq_push_subscriptions enable row level security;
create index if not exists hq_push_subscriptions_user_idx on public.hq_push_subscriptions (user_id);

-- Run the reminder check every 15 minutes; each device gets each reminder at
-- most once a day in its own timezone, so extra runs are harmless.
select cron.schedule(
  'hq-push-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://iffuewpvadmxhjdiuqhc.supabase.co/functions/v1/hq-push',
    body := jsonb_build_object('action', 'tick', 'token', (select cron_token from public.hq_push_config where id = 1)),
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
  $$
);
