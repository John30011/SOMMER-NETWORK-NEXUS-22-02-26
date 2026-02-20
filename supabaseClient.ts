import { createClient } from '@supabase/supabase-js';

// CONEXIÓN A SUPABASE
const SUPABASE_URL = 'https://xellkrtqohbyrdlcnuux.supabase.co';

// Safety check for process.env to avoid crashing in environments where it's undefined
const getEnvVar = (key: string, fallback: string) => {
  try {
    // Check if process is defined first to prevent ReferenceError
    if (typeof process !== 'undefined' && process && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  return fallback;
};

const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbGxrcnRxb2hieXJkbGNudXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzcyNjEsImV4cCI6MjA4NTY1MzI2MX0.4EXAPLDKCM9qoOnz9wgFTLAWmt0a8280z5OA5uMg_jE');

// Detectar si estamos en modo demo
const isValidKey = SUPABASE_ANON_KEY.startsWith('eyJ');
export const isDemoMode = !isValidKey || SUPABASE_ANON_KEY === 'your-anon-key' || SUPABASE_ANON_KEY.includes('PEGAR_AQUI');

// Cast to any to bypass inconsistent type definitions for auth methods (v1 vs v2 mismatch)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as any;