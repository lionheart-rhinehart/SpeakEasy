import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get stats using the helper function
    const { data: stats, error } = await supabase.rpc('get_admin_stats');

    if (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }

    // Get recent feedback
    const { data: recentFeedback } = await supabase
      .from('feedback')
      .select('id, user_name, user_email, category, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent signups
    const { data: recentSignups } = await supabase
      .from('beta_signups')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      stats: stats?.[0] || {
        total_signups: 0,
        active_licenses: 0,
        available_licenses: 0,
        total_feedback: 0,
        new_feedback: 0,
        signups_today: 0,
        feedback_today: 0,
      },
      recentFeedback: recentFeedback || [],
      recentSignups: recentSignups || [],
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
