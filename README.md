# Habit Life Quest

An RPG habit tracker. Turn real-life habits into quests, earn XP, level up five
core stats — **Body, Mind, Spirit, Career, Hobby** — and hold streaks to unlock
achievements. Built as an installable PWA with optional cross-device cloud sync.

## Stack

React 19 + TypeScript, Vite, Tailwind CSS v4, Recharts (radar chart),
Motion (animation), and Supabase (passwordless email auth + save sync).

## Run locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

The app runs fully offline against `localStorage` with no configuration — cloud
sync is optional.

## Cloud sync (optional)

Sync lets you carry one character across devices via passwordless email login.

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor** and run
   [`supabase/migrations/0001_create_saves.sql`](supabase/migrations/0001_create_saves.sql).
   This creates the `saves` table and row-level security so each user can only
   read and write their own data.
3. Copy `.env.example` to `.env.local` and fill in your project URL and
   publishable (anon) key from **Project Settings → API**. Both are safe to
   expose in the browser because RLS protects the data.

Email one-time-code login is enabled by default on new Supabase projects.

## Deploy

Configured for Vercel (see `vercel.json`) as a static SPA. Set the two
`VITE_SUPABASE_*` environment variables in your Vercel project if you use sync.

```bash
npm run build   # outputs to dist/
```

## How the game works

- **Quests** are habits, tagged to one of the five stats and a difficulty
  (easy / normal / hard). Types: daily, weekly (with a per-week target), and
  one-off milestones.
- **XP** scales with difficulty and type; your chosen class gives a 1.2x bonus
  to its affinity stat.
- **Levels** follow a 1.25x-per-level curve; each stat also earns its own rank.
- **Streaks** drive achievements — including *Iron Will* for a 30-day daily
  streak. Streak math is timezone-safe.
