'use client';

import { useEffect, useState } from 'react';
import LicensePool from '@/components/admin/LicensePool';

interface License {
  id: string;
  license_key: string;
  is_active: boolean;
  max_activations: number;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  assigned_at: string | null;
  created_at: string;
}

interface Stats {
  available: number;
  assigned: number;
  total: number;
}

export default function LicensesPage() {
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<Stats>({ available: 0, assigned: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const response = await fetch('/api/admin/licenses');
      if (!response.ok) throw new Error('Failed to fetch licenses');

      const data = await response.json();
      setLicenses(data.licenses);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (count: number) => {
    try {
      const response = await fetch('/api/admin/licenses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });

      if (!response.ok) throw new Error('Failed to generate licenses');

      // Refresh the list
      await fetchLicenses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate licenses');
    }
  };

  const handleRevoke = async (licenseId: string) => {
    if (!confirm('Are you sure you want to revoke this license? The user will lose access.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/licenses/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId }),
      });

      if (!response.ok) throw new Error('Failed to revoke license');

      // Refresh the list
      await fetchLicenses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke license');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Licenses</h1>
        <p className="text-gray-600 mt-1">Manage your license pool</p>
      </div>

      <LicensePool
        licenses={licenses}
        stats={stats}
        onGenerate={handleGenerate}
        onRevoke={handleRevoke}
      />
    </div>
  );
}
