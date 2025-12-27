'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface MaintenanceConfig {
  enabled: boolean;
  message?: {
    en: string;
    ta: string;
  };
  startTime?: string;
  endTime?: string;
  allowedRoles?: string[];
}

interface RateLimitConfig {
  inviteCreation: number;
  loginAttempts: number;
  apiGeneral: number;
}

interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  retentionDays: number;
  lastBackupAt?: string;
}

interface SystemConfig {
  maintenance: MaintenanceConfig;
  rateLimits: RateLimitConfig;
  backup: BackupConfig;
  updatedAt: string;
  updatedBy: string;
}

export default function SettingsPage() {
  const { user, getIdToken } = useAuth();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Maintenance mode form state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessageEn, setMaintenanceMessageEn] = useState('');
  const [maintenanceMessageTa, setMaintenanceMessageTa] = useState('');

  // Rate limits form state
  const [rateLimits, setRateLimits] = useState<RateLimitConfig>({
    inviteCreation: 10,
    loginAttempts: 5,
    apiGeneral: 100,
  });

  // Backup form state
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState<'daily' | 'weekly'>('daily');
  const [backupRetentionDays, setBackupRetentionDays] = useState(30);

  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/super-admin/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch system configuration');
      }

      const data = await res.json();
      const cfg = data.data as SystemConfig;
      setConfig(cfg);

      // Populate form state
      setMaintenanceEnabled(cfg.maintenance.enabled);
      setMaintenanceMessageEn(cfg.maintenance.message?.en || '');
      setMaintenanceMessageTa(cfg.maintenance.message?.ta || '');
      setRateLimits(cfg.rateLimits);
      setBackupEnabled(cfg.backup.enabled);
      setBackupFrequency(cfg.backup.frequency);
      setBackupRetentionDays(cfg.backup.retentionDays);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchConfig();
    }
  }, [isSuperAdmin, fetchConfig]);

  const handleToggleMaintenance = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const action = maintenanceEnabled ? 'disable_maintenance' : 'enable_maintenance';
      const body: Record<string, unknown> = { action };

      if (action === 'enable_maintenance') {
        if (!maintenanceMessageEn.trim() || !maintenanceMessageTa.trim()) {
          setError('Please provide maintenance messages in both English and Tamil');
          setSaving(false);
          return;
        }
        body.message = {
          en: maintenanceMessageEn.trim(),
          ta: maintenanceMessageTa.trim(),
        };
      }

      const res = await fetch(`${apiBase}/api/v1/super-admin/config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to toggle maintenance mode');
      }

      setSuccess(action === 'enable_maintenance' ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRateLimits = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rateLimits }),
      });

      if (!res.ok) {
        throw new Error('Failed to update rate limits');
      }

      setSuccess('Rate limits updated successfully');
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rate limits');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBackup = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const res = await fetch(`${apiBase}/api/v1/super-admin/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup: {
            enabled: backupEnabled,
            frequency: backupFrequency,
            retentionDays: backupRetentionDays,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update backup settings');
      }

      setSuccess('Backup settings updated successfully');
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update backup settings');
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Never';
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure system-wide settings and maintenance mode.</p>
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

      {/* Last Updated */}
      {config && (
        <div className="mb-6 text-sm text-gray-500">
          Last updated: {formatTimestamp(config.updatedAt)} by {config.updatedBy}
        </div>
      )}

      {/* Maintenance Mode Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Maintenance Mode</h2>
            <p className="text-sm text-gray-600">
              Enable maintenance mode to prevent users from accessing the application.
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              maintenanceEnabled
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {maintenanceEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {config?.maintenance.startTime && maintenanceEnabled && (
          <div className="mb-4 text-sm text-gray-600">
            Started: {formatTimestamp(config.maintenance.startTime)}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (English) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={maintenanceMessageEn}
              onChange={(e) => setMaintenanceMessageEn(e.target.value)}
              placeholder="The system is currently under maintenance. Please check back later."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={maintenanceEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (Tamil) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={maintenanceMessageTa}
              onChange={(e) => setMaintenanceMessageTa(e.target.value)}
              placeholder="கணினி தற்போது பராமரிப்பில் உள்ளது. பின்னர் மீண்டும் வருக."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={maintenanceEnabled}
            />
          </div>

          <button
            onClick={handleToggleMaintenance}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              maintenanceEnabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {saving
              ? 'Saving...'
              : maintenanceEnabled
              ? 'Disable Maintenance Mode'
              : 'Enable Maintenance Mode'}
          </button>
        </div>
      </div>

      {/* Rate Limits Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rate Limits</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure rate limits for various API operations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite Creation (per hour)
            </label>
            <input
              type="number"
              value={rateLimits.inviteCreation}
              onChange={(e) =>
                setRateLimits({ ...rateLimits, inviteCreation: parseInt(e.target.value) || 0 })
              }
              min={1}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login Attempts (per 15 min)
            </label>
            <input
              type="number"
              value={rateLimits.loginAttempts}
              onChange={(e) =>
                setRateLimits({ ...rateLimits, loginAttempts: parseInt(e.target.value) || 0 })
              }
              min={1}
              max={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              General API (per minute)
            </label>
            <input
              type="number"
              value={rateLimits.apiGeneral}
              onChange={(e) =>
                setRateLimits({ ...rateLimits, apiGeneral: parseInt(e.target.value) || 0 })
              }
              min={10}
              max={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleUpdateRateLimits}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Update Rate Limits'}
        </button>
      </div>

      {/* Backup Settings Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Backup Settings</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure automatic backup schedule and retention.
        </p>

        {config?.backup.lastBackupAt && (
          <div className="mb-4 text-sm text-gray-600">
            Last backup: {formatTimestamp(config.backup.lastBackupAt)}
          </div>
        )}

        <div className="space-y-4 mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="backupEnabled"
              checked={backupEnabled}
              onChange={(e) => setBackupEnabled(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="backupEnabled" className="ml-2 text-sm text-gray-700">
              Enable automatic backups
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={backupFrequency}
                onChange={(e) => setBackupFrequency(e.target.value as 'daily' | 'weekly')}
                disabled={!backupEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retention (days)
              </label>
              <input
                type="number"
                value={backupRetentionDays}
                onChange={(e) => setBackupRetentionDays(parseInt(e.target.value) || 30)}
                min={7}
                max={365}
                disabled={!backupEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleUpdateBackup}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Update Backup Settings'}
        </button>
      </div>
    </div>
  );
}
