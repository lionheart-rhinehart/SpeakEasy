import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-loaded client-side Supabase client (uses anon key)
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }
    
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// For backwards compatibility - lazy getter
export const supabase = {
  get client() {
    return getSupabase();
  }
};

// Server-side Supabase client (uses service role key for admin operations)
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase admin environment variables');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Types for database tables
export interface License {
  id: string;
  license_key: string;
  is_active: boolean;
  max_activations: number;
  expires_at: string | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  assigned_at: string | null;
  created_at: string;
}

export interface BetaSignup {
  id: string;
  email: string;
  name: string;
  license_id: string;
  created_at: string;
  email_sent_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface Feedback {
  id: string;
  license_key: string;
  user_email: string;
  user_name: string;
  category: 'bug' | 'feature' | 'general';
  message: string;
  attachments: string[];
  video_url: string | null;
  status: 'new' | 'replied' | 'resolved';
  replied_at: string | null;
  resolved_at: string | null;
  app_version: string | null;
  os_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activation {
  id: string;
  license_id: string;
  machine_id: string;
  is_active: boolean;
  last_validated_at: string;
  app_version: string | null;
  os_type: string | null;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
}

export interface AdminStats {
  total_signups: number;
  active_licenses: number;
  available_licenses: number;
  total_feedback: number;
  new_feedback: number;
  signups_today: number;
  feedback_today: number;
}
