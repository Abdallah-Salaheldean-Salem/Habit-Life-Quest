import { createClient } from '@supabase/supabase-js';

// Publishable (anon) key + URL. Safe to ship in the browser because every
// table is protected by row-level security — a user can only read/write
// their own row. Values can be overridden per-environment via .env.local.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://snsijevqejrrzplvdotk.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_lPxkJMcKr4gLzeQB9AjEfA_bpP6LdYz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
