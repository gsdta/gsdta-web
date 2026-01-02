'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getTeacherDashboard, TeacherDashboard } from '@/lib/teacher-api';
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
    label: 'My Classes',
    description: 'View all assigned classes',
    href: '/teacher/classes',
    icon: '📚',
    color: 'green',
  },
  {
    label: 'Mark Attendance',
    description: "Record today's attendance",
    href: '/teacher/attendance/mark',
    icon: '✅',
    color: 'blue',
  },
  {
    label: 'Attendance History',
    description: 'View past records',
    href: '/teacher/attendance',
    icon: '📋',
    color: 'purple',
  },
  {
    label: 'Messages',
    description: 'Communicate with parents',
    href: '/teacher/messages',
    icon: '💬',
    color: 'yellow',
  },
];

export default function TeacherDashboardPage() {
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFeatureEnabled } = useFeatureFlags();

  // Filter tiles based on feature flags
  const filteredTiles = useMemo(() => {
    return allTiles.filter((tile) =>
      shouldShowNavItem('teacher', tile.href, isFeatureEnabled)
    );
  }, [isFeatureEnabled]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getTeacherDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {dashboard.teacher.name}
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your classes, view rosters, and track attendance from your teacher portal.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">{dashboard.stats.totalClasses}</div>
          <div className="text-sm text-gray-600">Assigned Classes</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{dashboard.stats.totalStudents}</div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">{dashboard.stats.classesToday}</div>
          <div className="text-sm text-gray-600">Classes Today</div>
        </div>
      </div>

      {/* Today's Schedule */}
      {dashboard.todaysSchedule.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Schedule</h2>
          <div className="space-y-3">
            {dashboard.todaysSchedule.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
              >
                <div>
                  <Link
                    href={`/teacher/classes/${cls.id}`}
                    className="font-medium text-gray-900 hover:text-green-700"
                  >
                    {cls.name}
                  </Link>
                  <div className="text-sm text-gray-600">
                    {cls.time} - {cls.studentCount} students
                  </div>
                </div>
                <div className="flex gap-2">
                  {!cls.todayAttendance && (
                    <Link
                      href={`/teacher/classes/${cls.id}/attendance/mark`}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Mark Attendance
                    </Link>
                  )}
                  {cls.todayAttendance && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {cls.todayAttendance.attendanceRate}% present
                    </span>
                  )}
                  <Link
                    href={`/teacher/classes/${cls.id}/roster`}
                    className="px-4 py-2 bg-white text-gray-700 text-sm rounded-md border hover:bg-gray-50"
                  >
                    View Roster
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - All Navigation Tiles */}
      {filteredTiles.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* My Classes */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Classes</h2>
          <Link href="/teacher/classes" className="text-green-600 hover:text-green-700 text-sm">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboard.classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/teacher/classes/${cls.id}`}
              className="block p-4 border rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="font-medium text-gray-900">{cls.name}</div>
              <div className="text-sm text-gray-600">{cls.gradeName}</div>
              <div className="text-sm text-gray-500 mt-1">
                {cls.day} {cls.time}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {cls.studentCount}/{cls.capacity} students
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  cls.teacherRole === 'primary'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {cls.teacherRole}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Attendance */}
      {dashboard.recentAttendance.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Attendance</h2>
            <Link href="/teacher/attendance" className="text-green-600 hover:text-green-700 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {dashboard.recentAttendance.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <span className="font-medium">{record.studentName}</span>
                  <span className="text-sm text-gray-500 ml-2">- {record.className}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{record.date}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      record.status === 'present'
                        ? 'bg-green-100 text-green-700'
                        : record.status === 'absent'
                        ? 'bg-red-100 text-red-700'
                        : record.status === 'late'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

