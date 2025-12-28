'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface DeletedDataEntry {
  id: string;
  collection: string;
  originalId: string;
  data: Record<string, unknown>;
  deletedAt: string;
  deletedBy: string;
  deletedByEmail: string;
  expiresAt: string;
  restored?: boolean;
  restoredAt?: string;
  restoredBy?: string;
}

interface SuspensionRecord {
  id: string;
  userId: string;
  userEmail: string;
  reason: string;
  severity: 'warning' | 'temporary' | 'permanent';
  suspendedBy: string;
  suspendedByEmail: string;
  suspendedAt: string;
  expiresAt?: string;
  lifted?: boolean;
  liftedAt?: string;
  liftedBy?: string;
  liftReason?: string;
}

type TabType = 'deleted' | 'suspensions';

export default function RecoveryPage() {
  const { user, getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('deleted');
  const [deletedData, setDeletedData] = useState<DeletedDataEntry[]>([]);
  const [suspensions, setSuspensions] = useState<SuspensionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filter state
  const [collectionFilter, setCollectionFilter] = useState('');

  // Modal state
  const [restoreModal, setRestoreModal] = useState<DeletedDataEntry | null>(null);
  const [suspendModal, setSuspendModal] = useState<{ userId: string; email: string } | null>(null);
  const [liftModal, setLiftModal] = useState<SuspensionRecord | null>(null);
  const [processing, setProcessing] = useState(false);

  // Suspend form state
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendSeverity, setSuspendSeverity] = useState<'warning' | 'temporary' | 'permanent'>('temporary');
  const [suspendDays, setSuspendDays] = useState(7);

  // Lift form state
  const [liftReason, setLiftReason] = useState('');

  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;
  const limit = 20;

  const fetchDeletedData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const params = new URLSearchParams({
        type: 'deleted',
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      if (collectionFilter) {
        params.append('collection', collectionFilter);
      }

      const res = await fetch(`${apiBase}/api/v1/super-admin/deleted-data?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch deleted data');
      }

      const data = await res.json();
      setDeletedData(data.data.entries || []);
      setTotal(data.data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, page, collectionFilter]);

  const fetchSuspensions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/deleted-data?type=suspensions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch suspensions');
      }

      const data = await res.json();
      setSuspensions(data.data.suspensions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (isSuperAdmin) {
      if (activeTab === 'deleted') {
        fetchDeletedData();
      } else {
        fetchSuspensions();
      }
    }
  }, [isSuperAdmin, activeTab, fetchDeletedData, fetchSuspensions]);

  const handleRestore = async () => {
    if (!restoreModal) return;

    try {
      setProcessing(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/deleted-data/${restoreModal.id}/restore`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to restore data');
      }

      setSuccess('Data restored successfully');
      setRestoreModal(null);
      await fetchDeletedData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore data');
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendModal || !suspendReason.trim()) return;

    try {
      setProcessing(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const body: Record<string, unknown> = {
        reason: suspendReason.trim(),
        severity: suspendSeverity,
      };

      if (suspendSeverity === 'temporary') {
        body.durationDays = suspendDays;
      }

      const res = await fetch(
        `${apiBase}/api/v1/super-admin/users/${suspendModal.userId}/emergency-suspend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to suspend user');
      }

      setSuccess('User suspended successfully');
      setSuspendModal(null);
      setSuspendReason('');
      setSuspendSeverity('temporary');
      setSuspendDays(7);
      await fetchSuspensions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setProcessing(false);
    }
  };

  const handleLift = async () => {
    if (!liftModal || !liftReason.trim()) return;

    try {
      setProcessing(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(
        `${apiBase}/api/v1/super-admin/users/${liftModal.userId}/emergency-suspend`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: liftReason.trim() }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to lift suspension');
      }

      setSuccess('Suspension lifted successfully');
      setLiftModal(null);
      setLiftReason('');
      await fetchSuspensions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lift suspension');
    } finally {
      setProcessing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'temporary':
        return 'bg-orange-100 text-orange-800';
      case 'permanent':
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Recovery & Emergency Actions</h1>
        <p className="text-gray-600 mt-1">Restore deleted data and manage user suspensions.</p>
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

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('deleted');
              setPage(0);
            }}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deleted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Deleted Data
          </button>
          <button
            onClick={() => setActiveTab('suspensions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'suspensions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Suspensions
          </button>
        </nav>
      </div>

      {/* Deleted Data Tab */}
      {activeTab === 'deleted' && (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
              <select
                value={collectionFilter}
                onChange={(e) => {
                  setCollectionFilter(e.target.value);
                  setPage(0);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Collections</option>
                <option value="users">Users</option>
                <option value="students">Students</option>
                <option value="classes">Classes</option>
                <option value="grades">Grades</option>
              </select>
            </div>

            <button
              onClick={fetchDeletedData}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading deleted data...</p>
            </div>
          ) : deletedData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No deleted data found.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deleted At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Collection
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Original ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deleted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deletedData.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimestamp(entry.deletedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {entry.collection}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {entry.originalId.substring(0, 12)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.deletedByEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimestamp(entry.expiresAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setRestoreModal(entry)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} entries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page {page + 1} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Suspensions Tab */}
      {activeTab === 'suspensions' && (
        <>
          <div className="mb-6">
            <button
              onClick={fetchSuspensions}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading suspensions...</p>
            </div>
          ) : suspensions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No active suspensions.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Suspended At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {suspensions.map((suspension) => (
                    <tr key={suspension.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(suspension.suspendedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {suspension.userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(
                            suspension.severity
                          )}`}
                        >
                          {suspension.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {suspension.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {suspension.expiresAt ? formatTimestamp(suspension.expiresAt) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setLiftModal(suspension)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Lift Suspension
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Restore Modal */}
      {restoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Restore Deleted Data</h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Collection:</span> {restoreModal.collection}
                </div>
                <div>
                  <span className="font-medium">Original ID:</span> {restoreModal.originalId}
                </div>
                <div>
                  <span className="font-medium">Deleted:</span> {formatTimestamp(restoreModal.deletedAt)}
                </div>
                <div>
                  <span className="font-medium">By:</span> {restoreModal.deletedByEmail}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              This will restore the data to its original collection. The restore action will be logged
              in the audit trail.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRestoreModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Restoring...' : 'Restore Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Suspend User</h3>

            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                <span className="font-medium">User:</span> {suspendModal.email}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Describe the reason for suspension..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={suspendSeverity}
                  onChange={(e) =>
                    setSuspendSeverity(e.target.value as 'warning' | 'temporary' | 'permanent')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="warning">Warning</option>
                  <option value="temporary">Temporary</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

              {suspendSeverity === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={suspendDays}
                    onChange={(e) => setSuspendDays(parseInt(e.target.value) || 7)}
                    min={1}
                    max={365}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSuspendModal(null);
                  setSuspendReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={!suspendReason.trim() || processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Suspending...' : 'Suspend User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lift Suspension Modal */}
      {liftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lift User Suspension</h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">User:</span> {liftModal.userEmail}
                </div>
                <div>
                  <span className="font-medium">Severity:</span> {liftModal.severity}
                </div>
                <div>
                  <span className="font-medium">Original Reason:</span> {liftModal.reason}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Lifting <span className="text-red-500">*</span>
              </label>
              <textarea
                value={liftReason}
                onChange={(e) => setLiftReason(e.target.value)}
                placeholder="Describe why the suspension is being lifted..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setLiftModal(null);
                  setLiftReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLift}
                disabled={!liftReason.trim() || processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Lifting...' : 'Lift Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
