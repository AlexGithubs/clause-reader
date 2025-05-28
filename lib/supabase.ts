import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
}

// Create a single supabase client for the entire app (client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a service role client for server-side operations (bypasses RLS)
// Only create this on the server-side where the service key is available
export const supabaseAdmin = typeof window === 'undefined' 
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helper function to get supabaseAdmin with proper error handling
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin is only available on the server-side');
  }
  return supabaseAdmin;
}

// Types for our database tables
export type Document = {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  full_text?: string;
  summary?: string;
  user_party?: string;
  contract_type?: string;
  role_validation?: {
    isRelevant: boolean;
    confidence: number;
    suggestions: string[];
    selectedRole: string;
  };
}

export type Clause = {
  id: string;
  document_id: string;
  text: string;
  page: number;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  score: number; // 0-100 scale: 0=harsh, 50=standard, 100=favorable
  tags: string[];
  explanation: string;
} 