import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
}

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export type Document = {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  full_text?: string;
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