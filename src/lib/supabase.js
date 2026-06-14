import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const STORAGE_BUCKET = 'uploads';

// Guard: jangan crash saat env vars belum diisi
const isConfigured =
  supabaseUrl &&
  supabaseUrl !== '' &&
  supabaseAnonKey &&
  supabaseAnonKey !== '';

// Client untuk browser (anon key)
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Tentukan key untuk admin: pakai service role jika ada & valid, fallback ke anon
const adminKey =
  supabaseServiceKey &&
  supabaseServiceKey !== '' &&
  supabaseServiceKey !== 'PASTE_SERVICE_ROLE_KEY_HERE'
    ? supabaseServiceKey
    : supabaseAnonKey;

// Client untuk server/API routes
export const supabaseAdmin = isConfigured
  ? createClient(supabaseUrl, adminKey)
  : null;

// Helper: cek apakah Supabase sudah terkonfigurasi
export function checkSupabase(res) {
  if (!supabaseAdmin) {
    res
      .status(500)
      .json({ error: 'Supabase belum dikonfigurasi. Set env variables NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.' });
    return false;
  }
  return true;
}
