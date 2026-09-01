import { createClient } from '@supabase/supabase-js';

// CIA and NSA should be defined in .env
// We also support SUPABASE_ prefix for strict deployment environments like Vercel
// Sanitize inputs to prevent UI copy-paste errors (quotes/spaces)
const sanitizeEnv = (val: string | undefined) => val ? val.replace(/['"]/g, '').trim() : '';

const supabaseUrl = sanitizeEnv(import.meta.env.CIA || import.meta.env.SUPABASE_URL);
const supabaseAnonKey = sanitizeEnv(import.meta.env.NSA || import.meta.env.SUPABASE_ANON_KEY);

// Safely export client. If keys are missing, it stays null (graceful degradation)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => supabase !== null;
