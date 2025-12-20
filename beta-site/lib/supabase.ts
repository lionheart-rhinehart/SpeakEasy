import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client (uses service role key for admin operations)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
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
