'use client';

import Link from 'next/link';

export default function ParentSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* Profile Settings */}
        <Link
          href="/parent/profile"
          className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">👤</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Profile Settings</h3>
                <p className="text-sm text-gray-500">
                  Update your personal information and contact details
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </Link>

        {/* Notification Settings */}
        <Link
          href="/parent/profile"
          className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">🔔</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
                <p className="text-sm text-gray-500">
                  Manage how you receive notifications
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </Link>

        {/* Language Settings */}
        <Link
          href="/parent/profile"
          className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">🌐</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Language Settings</h3>
                <p className="text-sm text-gray-500">
                  Choose your preferred language
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </Link>

        {/* Security (Coming Soon) */}
        <div className="bg-white rounded-lg shadow opacity-60">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 rounded-full">
                <span className="text-2xl">🔒</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Security</h3>
                <p className="text-sm text-gray-500">
                  Password and account security settings
                </p>
              </div>
            </div>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h2>
        <p className="text-gray-600 mb-4">
          If you have any questions or need assistance, please contact your school administrator.
        </p>
        <div className="text-sm text-gray-500">
          <p>Email: support@gsdta.com</p>
        </div>
      </div>
    </div>
  );
}
