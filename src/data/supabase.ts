/* Supabase connection. The URL and the anon key come from the build environment
   (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Without them the app runs in demo mode.
   The anon key is meant to be public: data is protected by the login and by row level security. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Opened from a "forgot my password" e-mail. Read before the client reads (and clears) the address. */
export const openedFromRecoveryLink = location.hash.includes('type=recovery');
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const isDemoMode = !supabase;
export const SUPABASE_URL = url ?? '';
export const TABLE = 'registros';
export const BUCKET = 'imagens';
