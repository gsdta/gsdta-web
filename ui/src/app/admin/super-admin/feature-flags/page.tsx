'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type {
  FeatureFlagsConfig,
  FeatureDescriptions,
  FeatureFlagRole,
  AdminFeature,
  TeacherFeature,
  ParentFeature,
} from '@/types/featureFlags';

// Feature lists
const ADMIN_FEATURE_LIST: AdminFeature[] = [
  'Students',
  'Teachers',
  'Classes',
  'Grades',
  'Textbooks',
  'Volunteers',
  'AttendanceAnalytics',
  'HeroContent',
  'Calendar',
];

const TEACHER_FEATURE_LIST: TeacherFeature[] = [
  'Classes',
  'Attendance',
  'Messaging',
];

const PARENT_FEATURE_LIST: ParentFeature[] = [
  'Students',
  'StudentRegistration',
  'Messaging',
  'Profile',
  'Settings',
];

type FeatureToggleProps = {
  feature: string;
  enabled: boolean;
  description: string;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
};

function FeatureToggle({ feature, enabled, description, onChange, disabled }: FeatureToggleProps) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{feature}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

type RoleSectionProps = {
  role: FeatureFlagRole;
  title: string;
  description: string;
  features: string[];
  flags: Record<string, { enabled: boolean }>;
  descriptions: Record<string, string>;
  onToggle: (feature: string, enabled: boolean) => void;
  onSave: () => void;
  saving: boolean;
  hasChanges: boolean;
};

function RoleSection({
  role: _role,
  title,
  description,
  features,
  flags,
  descriptions,
  onToggle,
  onSave,
  saving,
  hasChanges,
}: RoleSectionProps) {
  const enabledCount = features.filter((f) => flags[f]?.enabled).length;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="text-sm text-gray-500">
          {enabledCount}/{features.length} enabled
        </div>
      </div>

      <div className="mb-4">
        {features.map((feature) => (
          <FeatureToggle
            key={feature}
            feature={feature}
            enabled={flags[feature]?.enabled ?? true}
            description={descriptions[feature] || ''}
            onChange={(enabled) => onToggle(feature, enabled)}
            disabled={saving}
          />
        ))}
      </div>

      <button
        onClick={onSave}
        disabled={saving || !hasChanges}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
      </button>
    </div>
  );
}

export default function FeatureFlagsPage() {
  const { user, getIdToken } = useAuth();
  const [config, setConfig] = useState<FeatureFlagsConfig | null>(null);
  const [descriptions, setDescriptions] = useState<FeatureDescriptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<FeatureFlagRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Track local changes for each role
  const [adminFlags, setAdminFlags] = useState<Record<string, { enabled: boolean }>>({});
  const [teacherFlags, setTeacherFlags] = useState<Record<string, { enabled: boolean }>>({});
  const [parentFlags, setParentFlags] = useState<Record<string, { enabled: boolean }>>({});

  // Track if there are unsaved changes
  const [adminChanged, setAdminChanged] = useState(false);
  const [teacherChanged, setTeacherChanged] = useState(false);
  const [parentChanged, setParentChanged] = useState(false);

  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/super-admin/feature-flags`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch feature flags');
      }

      const data = await res.json();
      const cfg = data.data.flags as FeatureFlagsConfig;
      const desc = data.data.descriptions as FeatureDescriptions;

      setConfig(cfg);
      setDescriptions(desc);

      // Populate form state
      setAdminFlags(cfg.admin);
      setTeacherFlags(cfg.teacher);
      setParentFlags(cfg.parent);

      // Reset change trackers
      setAdminChanged(false);
      setTeacherChanged(false);
      setParentChanged(false);
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

  const handleToggle = (role: FeatureFlagRole, feature: string, enabled: boolean) => {
    if (role === 'admin') {
      setAdminFlags((prev) => ({ ...prev, [feature]: { enabled } }));
      setAdminChanged(true);
    } else if (role === 'teacher') {
      setTeacherFlags((prev) => ({ ...prev, [feature]: { enabled } }));
      setTeacherChanged(true);
    } else if (role === 'parent') {
      setParentFlags((prev) => ({ ...prev, [feature]: { enabled } }));
      setParentChanged(true);
    }
  };

  const handleSave = async (role: FeatureFlagRole) => {
    try {
      setSaving(role);
      setError(null);
      setSuccess(null);

      const token = await getIdToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      const flags =
        role === 'admin'
          ? adminFlags
          : role === 'teacher'
            ? teacherFlags
            : parentFlags;

      const res = await fetch(`${apiBase}/api/v1/super-admin/feature-flags`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, flags }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update feature flags');
      }

      setSuccess(`${role.charAt(0).toUpperCase() + role.slice(1)} feature flags updated successfully`);

      // Reset change tracker for this role
      if (role === 'admin') setAdminChanged(false);
      else if (role === 'teacher') setTeacherChanged(false);
      else if (role === 'parent') setParentChanged(false);

      // Refresh config
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature flags');
    } finally {
      setSaving(null);
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
          <p className="text-gray-500">Loading feature flags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-gray-600 mt-1">
          Enable or disable features for each user role. Disabled features will be hidden from navigation and blocked at the API level.
        </p>
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

      {/* Admin Features */}
      <RoleSection
        role="admin"
        title="Admin Features"
        description="Control which features are available in the Admin portal."
        features={ADMIN_FEATURE_LIST}
        flags={adminFlags}
        descriptions={descriptions?.admin || {}}
        onToggle={(feature, enabled) => handleToggle('admin', feature, enabled)}
        onSave={() => handleSave('admin')}
        saving={saving === 'admin'}
        hasChanges={adminChanged}
      />

      {/* Teacher Features */}
      <RoleSection
        role="teacher"
        title="Teacher Features"
        description="Control which features are available in the Teacher portal."
        features={TEACHER_FEATURE_LIST}
        flags={teacherFlags}
        descriptions={descriptions?.teacher || {}}
        onToggle={(feature, enabled) => handleToggle('teacher', feature, enabled)}
        onSave={() => handleSave('teacher')}
        saving={saving === 'teacher'}
        hasChanges={teacherChanged}
      />

      {/* Parent Features */}
      <RoleSection
        role="parent"
        title="Parent Features"
        description="Control which features are available in the Parent portal."
        features={PARENT_FEATURE_LIST}
        flags={parentFlags}
        descriptions={descriptions?.parent || {}}
        onToggle={(feature, enabled) => handleToggle('parent', feature, enabled)}
        onSave={() => handleSave('parent')}
        saving={saving === 'parent'}
        hasChanges={parentChanged}
      />

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">How Feature Flags Work</h3>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Disabled features are hidden from the navigation menu</li>
          <li>API requests to disabled features return a 403 error</li>
          <li>Changes take effect immediately for new page loads</li>
          <li>Users may need to refresh their browser to see changes</li>
          <li>Feature flag changes are logged in the audit log</li>
        </ul>
      </div>
    </div>
  );
}
