-- Habit Life Quest: cloud save table.
-- Run this once in the Supabase dashboard (SQL Editor) if you self-host.

create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "own_saves_select" on public.saves;
create policy "own_saves_select" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "own_saves_insert" on public.saves;
create policy "own_saves_insert" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "own_saves_update" on public.saves;
create policy "own_saves_update" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_saves_delete" on public.saves;
create policy "own_saves_delete" on public.saves
  for delete using (auth.uid() = user_id);
