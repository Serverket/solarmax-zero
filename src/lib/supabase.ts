import { createClient } from '@supabase/supabase-js';

// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY should be defined in .env
// We also support SUPABASE_ prefix for strict deployment environments like Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

// Safely export client. If keys are missing, it stays null (graceful degradation)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => supabase !== null;
