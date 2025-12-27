'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

type ExportType = 'full' | 'users' | 'students' | 'audit' | 'classes';
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ExportJob {
  id: string;
  type: ExportType;
  status: ExportStatus;
  requestedBy: string;
  requestedByEmail: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
  metadata?: {
    recordCount?: number;
    collections?: string[];
  };
}

const EXPORT_TYPE_INFO: Record<ExportType, { label: string; description: string }> = {
  full: { label: 'Full Export', description: 'All system data (users, students, classes, attendance)' },
  users: { label: 'Users Only', description: 'All user accounts and profiles' },
  students: { label: 'Students Only', description: 'All student records and enrollment data' },
  audit: { label: 'Audit Trail', description: 'Audit logs, admin promotions, and security events' },
  classes: { label: 'Classes & Grades', description: 'All classes, grades, and attendance records' },
};

export default function ExportPage() {
  const { user, getIdToken } = useAuth();
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ExportType>('full');

  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/export?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch export jobs');
      }

      const data = await res.json();
      setJobs(data.data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchJobs();
    }
  }, [isSuperAdmin, fetchJobs]);

  const handleCreateExport = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/export`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: selectedType }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create export');
      }

      setSuccess(`${EXPORT_TYPE_INFO[selectedType].label} export started. It will be ready shortly.`);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create export');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (jobId: string) => {
    try {
      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/export/${jobId}?download=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to download export');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `export-${jobId}.json`;

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download export');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: ExportStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
          <p className="text-red-600 mt-1">You must be a Super Administrator to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Export</h1>
        <p className="text-gray-600 mt-1">Export system data for backup or compliance purposes.</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {/* Create Export Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Export</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {(Object.keys(EXPORT_TYPE_INFO) as ExportType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                selectedType === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{EXPORT_TYPE_INFO[type].label}</div>
              <div className="text-sm text-gray-500 mt-1">{EXPORT_TYPE_INFO[type].description}</div>
            </button>
          ))}
        </div>

        <button
          onClick={handleCreateExport}
          disabled={creating}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {creating ? 'Creating Export...' : 'Start Export'}
        </button>
      </div>

      {/* Export Jobs List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Export History</h2>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Loading export jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No export jobs found. Create your first export above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(job.requestedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {EXPORT_TYPE_INFO[job.type]?.label || job.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.metadata?.recordCount !== undefined
                        ? job.metadata.recordCount.toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.requestedByEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {job.status === 'completed' && (
                        <>
                          {job.expiresAt && new Date(job.expiresAt) > new Date() ? (
                            <button
                              onClick={() => handleDownload(job.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Download
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">Expired</span>
                          )}
                        </>
                      )}
                      {job.status === 'failed' && job.error && (
                        <span className="text-red-600 text-sm" title={job.error}>
                          {job.error.substring(0, 20)}...
                        </span>
                      )}
                      {job.status === 'processing' && (
                        <span className="text-blue-600 text-sm">Processing...</span>
                      )}
                      {job.status === 'pending' && (
                        <span className="text-yellow-600 text-sm">Pending...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800">About Data Exports</h3>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Exports are generated as JSON files for maximum compatibility</li>
          <li>Download links expire after 24 hours for security</li>
          <li>Full exports include all system data and may take longer to generate</li>
          <li>All export actions are logged in the audit trail</li>
        </ul>
      </div>
    </div>
  );
}
