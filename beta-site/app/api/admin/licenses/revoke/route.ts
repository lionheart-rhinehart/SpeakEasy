import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { licenseId } = await request.json();

    if (!licenseId) {
      return NextResponse.json(
        { error: 'License ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Deactivate the license
    const { error: licenseError } = await supabase
      .from('licenses')
      .update({ is_active: false })
      .eq('id', licenseId);

    if (licenseError) {
      throw licenseError;
    }

    // Deactivate any associated activations
    const { error: activationError } = await supabase
      .from('activations')
      .update({ is_active: false })
      .eq('license_id', licenseId);

    if (activationError) {
      console.error('Failed to deactivate activations:', activationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke license error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke license' },
      { status: 500 }
    );
  }
}
