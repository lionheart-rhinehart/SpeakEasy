import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { count } = await request.json();
    const generateCount = Math.min(Math.max(1, count || 10), 100); // Min 1, max 100

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('generate_licenses', {
      count: generateCount,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      generated: data || generateCount,
    });
  } catch (error) {
    console.error('Generate licenses error:', error);
    return NextResponse.json(
      { error: 'Failed to generate licenses' },
      { status: 500 }
    );
  }
}
