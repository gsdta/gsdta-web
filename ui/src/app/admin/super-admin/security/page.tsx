'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface SecurityEvent {
  id: string;
  type: 'login_failed' | 'rate_limit_exceeded' | 'unauthorized_access' | 'suspicious_activity';
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

interface SecurityStats {
  failedLogins24h: number;
  rateLimitExceeded24h: number;
  unauthorizedAccess24h: number;
  unresolvedEvents: number;
}

export default function SecurityPage() {
  const { user, getIdToken } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    type: '',
    resolved: '',
  });
  const [resolveModal, setResolveModal] = useState<SecurityEvent | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;
  const limit = 20;

  const fetchStats = useCallback(async () => {
    try {
      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/super-admin/security?stats=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch security stats:', err);
    }
  }, [getIdToken]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      if (filters.type) params.append('type', filters.type);
      if (filters.resolved) params.append('resolved', filters.resolved);

      const res = await fetch(`${apiBase}/api/v1/super-admin/security?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch security events');
      }

      const data = await res.json();
      setEvents(data.data.events || []);
      setTotal(data.data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, page, filters]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchStats();
      fetchEvents();
    }
  }, [isSuperAdmin, fetchStats, fetchEvents]);

  const handleResolve = async () => {
    if (!resolveModal || !resolution.trim()) return;

    try {
      setResolving(true);
      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/security`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: resolveModal.id,
          resolution: resolution.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to resolve event');
      }

      // Refresh data
      await fetchStats();
      await fetchEvents();
      setResolveModal(null);
      setResolution('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve');
    } finally {
      setResolving(false);
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'login_failed':
        return 'bg-orange-100 text-orange-800';
      case 'rate_limit_exceeded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unauthorized_access':
        return 'bg-red-100 text-red-800';
      case 'suspicious_activity':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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
        <h1 className="text-2xl font-bold text-gray-900">Security Monitoring</h1>
        <p className="text-gray-600 mt-1">Monitor security events and respond to incidents.</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-600">{stats.failedLogins24h}</div>
            <div className="text-sm text-orange-800">Failed Logins (24h)</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-600">{stats.rateLimitExceeded24h}</div>
            <div className="text-sm text-yellow-800">Rate Limits (24h)</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">{stats.unauthorizedAccess24h}</div>
            <div className="text-sm text-red-800">Unauthorized (24h)</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-600">{stats.unresolvedEvents}</div>
            <div className="text-sm text-purple-800">Unresolved Events</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
          <select
            value={filters.type}
            onChange={(e) => {
              setFilters({ ...filters, type: e.target.value });
              setPage(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="login_failed">Failed Login</option>
            <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
            <option value="unauthorized_access">Unauthorized Access</option>
            <option value="suspicious_activity">Suspicious Activity</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.resolved}
            onChange={(e) => {
              setFilters({ ...filters, resolved: e.target.value });
              setPage(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </select>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchEvents();
          }}
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
          <p className="text-gray-500">Loading security events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No security events found.</p>
        </div>
      ) : (
        <>
          {/* Events Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email / IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
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
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEventTypeBadge(
                          event.type
                        )}`}
                      >
                        {formatEventType(event.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {event.email && (
                        <div className="text-sm font-medium text-gray-900">{event.email}</div>
                      )}
                      <div className="text-xs text-gray-500 font-mono">{event.ipAddress}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {JSON.stringify(event.details)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {event.resolved ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Unresolved
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {!event.resolved && (
                        <button
                          onClick={() => setResolveModal(event)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Resolve
                        </button>
                      )}
                      {event.resolved && event.resolution && (
                        <span className="text-xs text-gray-500" title={event.resolution}>
                          {event.resolution.substring(0, 20)}...
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} events
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

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolve Security Event</h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div>
                  <span className="font-medium">Type:</span> {formatEventType(resolveModal.type)}
                </div>
                {resolveModal.email && (
                  <div>
                    <span className="font-medium">Email:</span> {resolveModal.email}
                  </div>
                )}
                <div>
                  <span className="font-medium">IP:</span> {resolveModal.ipAddress}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {formatTimestamp(resolveModal.timestamp)}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe how this event was resolved..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setResolveModal(null);
                  setResolution('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution.trim() || resolving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resolving ? 'Resolving...' : 'Mark as Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
