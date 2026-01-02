'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';
import { shouldShowNavItem } from '@/lib/featureMapping';

interface TileItem {
  label: string;
  description: string;
  href: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
}

const colorStyles = {
  blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900',
  green: 'border-green-200 bg-green-50 hover:bg-green-100 text-green-900',
  yellow: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-900',
  purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900',
  gray: 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-900',
};

const descriptionStyles = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  purple: 'text-purple-600',
  gray: 'text-gray-500',
};

const allTiles: TileItem[] = [
  {
    label: 'My Students',
    description: 'View linked students',
    href: '/parent/students',
    icon: '👨‍👧‍👦',
    color: 'green',
  },
  {
    label: 'Register Student',
    description: 'Add a new student',
    href: '/parent/students/register',
    icon: '➕',
    color: 'blue',
  },
  {
    label: 'Messages',
    description: 'Communicate with teachers',
    href: '/parent/messages',
    icon: '💬',
    color: 'yellow',
  },
  {
    label: 'My Profile',
    description: 'View and update your profile',
    href: '/parent/profile',
    icon: '👤',
    color: 'purple',
  },
  {
    label: 'Settings',
    description: 'Manage preferences',
    href: '/parent/settings',
    icon: '⚙️',
    color: 'gray',
  },
];

type LinkedStudent = {
  id: string;
  name: string;
  grade?: string;
  status: string;
};

export default function ParentDashboard() {
  const { user, getIdToken } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter tiles based on feature flags
  const filteredTiles = useMemo(() => {
    return allTiles.filter((tile) =>
      shouldShowNavItem('parent', tile.href, isFeatureEnabled)
    );
  }, [isFeatureEnabled]);

  // Check if specific features are enabled
  const canRegisterStudent = shouldShowNavItem('parent', '/parent/students/register', isFeatureEnabled);
  const canViewStudents = shouldShowNavItem('parent', '/parent/students', isFeatureEnabled);

  useEffect(() => {
    async function fetchStudents() {
      if (!user) return;
      try {
        const token = await getIdToken();
        if (!token) return;
        // Use trailing slash to avoid 308 redirect that strips Authorization header
        const res = await fetch('/api/v1/me/students/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStudents(data.data?.students || []);
        }
      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [user, getIdToken]);

  const activeStudents = students.filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your profile and view your linked students from your parent dashboard.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">👨‍👧‍👦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Linked Students</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : students.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Students</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : activeStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-2xl">👤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Profile Status</p>
              <p className="text-2xl font-semibold text-green-600">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - All Navigation Tiles */}
      {filteredTiles.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {filteredTiles.map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className={`flex items-center p-4 border-2 rounded-lg transition-colors ${colorStyles[tile.color]}`}
              >
                <span className="text-2xl mr-3">{tile.icon}</span>
                <div>
                  <p className="font-medium">{tile.label}</p>
                  <p className={`text-sm ${descriptionStyles[tile.color]}`}>
                    {tile.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Students Preview */}
      {!loading && students.length > 0 && canViewStudents && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Students</h2>
            <Link
              href="/parent/students"
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {students.slice(0, 3).map((student) => (
              <div key={student.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-medium">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{student.name}</p>
                    {student.grade && (
                      <p className="text-sm text-gray-500">Grade {student.grade}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    student.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {student.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && students.length === 0 && canViewStudents && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-4">👨‍👧‍👦</div>
          <h3 className="text-lg font-medium text-gray-900">No students registered yet</h3>
          {canRegisterStudent ? (
            <>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                Register your child to enroll them in our Tamil school. Click the button below to get started.
              </p>
              <Link
                href="/parent/students/register"
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Register Your First Student
              </Link>
            </>
          ) : (
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              Student registration is currently not available. Please check back later.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
