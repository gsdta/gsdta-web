'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Protected } from '@/components/Protected';
import { useI18n } from '@/i18n/LanguageProvider';

type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

type NotificationPreferences = {
  email: boolean;
  sms: boolean;
};

type ProfileData = {
  uid: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: Address;
  preferredLanguage?: 'en' | 'ta';
  notificationPreferences?: NotificationPreferences;
  emailVerified?: boolean;
};

function ProfileContent() {
  const { user, getIdToken } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    preferredLanguage: 'en' as 'en' | 'ta',
    emailNotifications: true,
    smsNotifications: false,
  });

  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE === 'firebase' ? 'firebase' : 'mock';
  const canResetPassword = authMode === 'firebase' && user?.authProvider === 'password';

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const token = await getIdToken();
        if (!token) return;
        // Use trailing slash to avoid 308 redirect that strips Authorization header
        const res = await fetch('/api/v1/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          // Initialize form data
          setFormData({
            name: data.name || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            street: data.address?.street || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            zip: data.address?.zip || '',
            preferredLanguage: data.preferredLanguage || 'en',
            emailNotifications: data.notificationPreferences?.email ?? true,
            smsNotifications: data.notificationPreferences?.sms ?? false,
          });
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user, getIdToken]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getIdToken();
      if (!token) return;
      const payload: Record<string, unknown> = {
        name: formData.name,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        preferredLanguage: formData.preferredLanguage,
        notificationPreferences: {
          email: formData.emailNotifications,
          sms: formData.smsNotifications,
        },
      };

      // Only include address if at least one field is filled
      if (formData.street || formData.city || formData.state || formData.zip) {
        payload.address = {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
        };
      }

      // Use trailing slash to avoid 308 redirect that strips Authorization header
      const res = await fetch('/api/v1/me/', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditMode(false);
        setSuccess(t('profile.updateSuccess'));
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        street: profile.address?.street || '',
        city: profile.address?.city || '',
        state: profile.address?.state || '',
        zip: profile.address?.zip || '',
        preferredLanguage: profile.preferredLanguage || 'en',
        emailNotifications: profile.notificationPreferences?.email ?? true,
        smsNotifications: profile.notificationPreferences?.sms ?? false,
      });
    }
    setEditMode(false);
    setError(null);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    setError(null);

    try {
      const { getFirebaseAuth } = await import('@/lib/firebase/client');
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      setSuccess(t('profile.resetEmailSent'));
    } catch (err) {
      console.error('Failed to send reset email:', err);
      setError(t('profile.resetEmailFailed'));
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="page-title">{t('profile.title')}</h1>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('profile.edit')}
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Account Info (Read-only) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.accountInfo')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('profile.email')}</label>
            <p className="mt-1 text-gray-900">{profile?.email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('profile.emailVerified')}</label>
            <p className="mt-1">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  profile?.emailVerified
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {profile?.emailVerified ? t('profile.verified') : t('profile.notVerified')}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('profile.currentRole')}</label>
            <p className="mt-1 text-gray-900 capitalize">{user?.role || '-'}</p>
          </div>
          {user && user.roles.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-500">{t('profile.allRoles')}</label>
              <p className="mt-1 text-gray-900 capitalize">{user.roles.join(', ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset */}
      {canResetPassword && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.security')}</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700">{t('profile.resetPasswordDescription')}</p>
              {resetEmailSent && (
                <p className="text-sm text-green-600 mt-1">{t('profile.resetEmailSentTo')} {user?.email}</p>
              )}
            </div>
            <button
              onClick={handleResetPassword}
              disabled={sendingReset || resetEmailSent}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingReset ? t('common.sending') : resetEmailSent ? t('profile.emailSent') : t('profile.resetPassword')}
            </button>
          </div>
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.personalInfo')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.displayName')}</label>
            {editMode ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.name || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.phone')}</label>
            {editMode ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="555-123-4567"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.phone || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.firstName')}</label>
            {editMode ? (
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.firstName || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.lastName')}</label>
            {editMode ? (
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.lastName || '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.address')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">{t('profile.street')}</label>
            {editMode ? (
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.address?.street || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.city')}</label>
            {editMode ? (
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.address?.city || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.state')}</label>
            {editMode ? (
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.address?.state || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.zip')}</label>
            {editMode ? (
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.address?.zip || '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.preferences')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.preferredLanguage')}</label>
            {editMode ? (
              <select
                name="preferredLanguage"
                value={formData.preferredLanguage}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="ta">Tamil</option>
              </select>
            ) : (
              <p className="mt-1 text-gray-900">
                {profile?.preferredLanguage === 'ta' ? 'Tamil' : 'English'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.notificationPrefs')}
            </label>
            {editMode ? (
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="emailNotifications"
                    checked={formData.emailNotifications}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700">{t('profile.emailNotifications')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="smsNotifications"
                    checked={formData.smsNotifications}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700">{t('profile.smsNotifications')}</span>
                </label>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-gray-900">
                  {t('profile.email')}: {profile?.notificationPreferences?.email ? t('common.enabled') : t('common.disabled')}
                </p>
                <p className="text-gray-900">
                  SMS: {profile?.notificationPreferences?.sms ? t('common.enabled') : t('common.disabled')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {editMode && (
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Protected>
      <ProfileContent />
    </Protected>
  );
}
