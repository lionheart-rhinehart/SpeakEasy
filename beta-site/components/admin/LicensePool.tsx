'use client';

import { useState } from 'react';

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

interface LicensePoolProps {
  licenses: License[];
  stats: {
    available: number;
    assigned: number;
    total: number;
  };
  onGenerate: (count: number) => Promise<void>;
  onRevoke: (licenseId: string) => Promise<void>;
}

export default function LicensePool({ licenses, stats, onGenerate, onRevoke }: LicensePoolProps) {
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [filter, setFilter] = useState<'all' | 'available' | 'assigned'>('all');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(generateCount);
    } finally {
      setGenerating(false);
    }
  };

  const filteredLicenses = licenses.filter((license) => {
    if (filter === 'available') return !license.assigned_to_email && license.is_active;
    if (filter === 'assigned') return !!license.assigned_to_email;
    return true;
  });

  const maskLicenseKey = (key: string) => {
    return key.slice(0, 8) + '••••••••' + key.slice(-4);
  };

  return (
    <div className="space-y-6">
      {/* Pool Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Available</div>
          <div className="text-2xl font-bold text-green-600">{stats.available}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Assigned</div>
          <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
      </div>

      {/* Generate Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Generate New Licenses</h3>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Count</label>
            <input
              type="number"
              min="1"
              max="100"
              value={generateCount}
              onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : `Generate ${generateCount} Licenses`}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show:</span>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-sm rounded-full ${
            filter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`px-3 py-1 text-sm rounded-full ${
            filter === 'available'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Available
        </button>
        <button
          onClick={() => setFilter('assigned')}
          className={`px-3 py-1 text-sm rounded-full ${
            filter === 'assigned'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Assigned
        </button>
      </div>

      {/* Licenses Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License Key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLicenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No licenses match your filter
                </td>
              </tr>
            ) : (
              filteredLicenses.slice(0, 50).map((license) => (
                <tr key={license.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {maskLicenseKey(license.license_key)}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {license.assigned_to_email ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        Assigned
                      </span>
                    ) : license.is_active ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        Revoked
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {license.assigned_to_email ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {license.assigned_to_name}
                        </div>
                        <div className="text-sm text-gray-500">{license.assigned_to_email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(license.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {license.is_active && license.assigned_to_email && (
                      <button
                        onClick={() => onRevoke(license.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filteredLicenses.length > 50 && (
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
            Showing 50 of {filteredLicenses.length} licenses
          </div>
        )}
      </div>
    </div>
  );
}
