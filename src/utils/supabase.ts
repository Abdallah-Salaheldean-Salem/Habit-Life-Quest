import { createClient } from '@supabase/supabase-js';

// Get credentials from Vite environment variables, falling back to the ones provided
const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://snsijevqejrrzplvdotk.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lPxkJMcKr4gLzeQB9AjEfA_bpP6LdYz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

