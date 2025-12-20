import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get all signups with their license info
    const { data: signups, error: signupsError } = await supabase
      .from('beta_signups')
      .select(`
        id,
        name,
        email,
        created_at,
        email_sent_at,
        license_id,
        licenses (
          license_key,
          is_active,
          max_activations
        )
      `)
      .order('created_at', { ascending: false });

    if (signupsError) {
      throw signupsError;
    }

    // Get activations for each license
    const licenseIds = signups?.map(s => s.license_id).filter(Boolean) || [];

    const { data: activations } = await supabase
      .from('activations')
      .select('license_id, is_active, last_validated_at, machine_id')
      .in('license_id', licenseIds);

    // Map activations to signups
    const usersWithActivations = signups?.map(signup => {
      const licenseActivations = activations?.filter(
        a => a.license_id === signup.license_id && a.is_active
      ) || [];

      return {
        ...signup,
        activations: licenseActivations,
        active_devices: licenseActivations.length,
      };
    });

    return NextResponse.json({ users: usersWithActivations || [] });
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
