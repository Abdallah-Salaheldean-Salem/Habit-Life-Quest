import { createClient } from '@supabase/supabase-js';

// Publishable (anon) key + URL. Safe to ship in the browser because every
// table is protected by row-level security — a user can only read/write
// their own row. Values can be overridden per-environment via .env.local.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://iffuewpvadmxhjdiuqhc.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_OmEkl2KgTxzeKaTn-8XN3g_aCOEvqeI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
