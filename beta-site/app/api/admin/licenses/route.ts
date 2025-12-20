import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get all licenses
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate pool stats
    const available = licenses?.filter(l => !l.assigned_to_email && l.is_active).length || 0;
    const assigned = licenses?.filter(l => l.assigned_to_email).length || 0;
    const total = licenses?.length || 0;

    return NextResponse.json({
      licenses: licenses || [],
      stats: {
        available,
        assigned,
        total,
      },
    });
  } catch (error) {
    console.error('Licenses fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch licenses' },
      { status: 500 }
    );
  }
}
