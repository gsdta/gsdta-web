'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface AdminUser {
  uid: string;
  email: string;
  name: string;
  roles: string[];
  status: string;
  createdAt?: string;
}

export default function AdminUsersPage() {
  const { user, getIdToken } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [promotableUsers, setPromotableUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [showDemoteModal, setShowDemoteModal] = useState(false);
  const [demoteTarget, setDemoteTarget] = useState<AdminUser | null>(null);

  // Check if current user is super_admin
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/super-admin/users/admins?include_promotable=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data = await res.json();
      setAdmins(data.data.admins || []);
      setPromotableUsers(data.data.promotableUsers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin, fetchAdmins]);

  const handlePromote = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(selectedUser.uid);
      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/users/${selectedUser.uid}/promote`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: actionReason || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to promote user');
      }

      // Refresh the list
      await fetchAdmins();
      setShowPromoteModal(false);
      setSelectedUser(null);
      setActionReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to promote user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async () => {
    if (!demoteTarget) return;

    try {
      setActionLoading(demoteTarget.uid);
      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/users/${demoteTarget.uid}/demote`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: actionReason || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to demote admin');
      }

      // Refresh the list
      await fetchAdmins();
      setShowDemoteModal(false);
      setDemoteTarget(null);
      setActionReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to demote admin');
    } finally {
      setActionLoading(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Users Management</h1>
        <p className="text-gray-600 mt-1">Manage administrators and promote users to admin role.</p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setShowPromoteModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Promote User to Admin
        </button>
        <button
          onClick={fetchAdmins}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading administrators...</p>
        </div>
      ) : (
        <>
          {/* Admin List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Administrators ({admins.length})
              </h2>
            </div>
            {admins.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No administrators found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.uid}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{admin.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {admin.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap">
                          {admin.roles.map((role) => (
                            <span
                              key={role}
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                role === 'super_admin'
                                  ? 'bg-red-100 text-red-800'
                                  : role === 'admin'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {role === 'super_admin' ? 'Super Admin' : role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            admin.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {admin.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {admin.roles.includes('super_admin') ? (
                          <span className="text-gray-400 text-sm">Protected</span>
                        ) : (
                          <button
                            onClick={() => {
                              setDemoteTarget(admin);
                              setShowDemoteModal(true);
                            }}
                            disabled={actionLoading === admin.uid}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === admin.uid ? 'Processing...' : 'Demote'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Promote User to Admin</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                value={selectedUser?.uid || ''}
                onChange={(e) => {
                  const user = promotableUsers.find((u) => u.uid === e.target.value);
                  setSelectedUser(user || null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a user...</option>
                {promotableUsers.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.name || user.email} ({user.roles.join(', ')})
                  </option>
                ))}
              </select>
              {promotableUsers.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No users available for promotion. All active users are already admins.
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Why is this user being promoted?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPromoteModal(false);
                  setSelectedUser(null);
                  setActionReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={!selectedUser || actionLoading !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Promoting...' : 'Promote to Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demote Modal */}
      {showDemoteModal && demoteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Demote Admin</h3>

            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                You are about to remove admin privileges from{' '}
                <strong>{demoteTarget.name || demoteTarget.email}</strong>.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Why is this admin being demoted?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDemoteModal(false);
                  setDemoteTarget(null);
                  setActionReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDemote}
                disabled={actionLoading !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Demoting...' : 'Demote Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
