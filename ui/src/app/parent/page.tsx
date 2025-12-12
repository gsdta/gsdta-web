'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

type LinkedStudent = {
  id: string;
  name: string;
  grade?: string;
  status: string;
};

export default function ParentDashboard() {
  const { user, getIdToken } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);

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

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/parent/students/register"
            className="flex items-center p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-2xl mr-3">➕</span>
            <div>
              <p className="font-medium text-blue-900">Register Student</p>
              <p className="text-sm text-blue-600">Add a new student</p>
            </div>
          </Link>

          <Link
            href="/parent/students"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">👨‍👧‍👦</span>
            <div>
              <p className="font-medium text-gray-900">My Students</p>
              <p className="text-sm text-gray-500">View linked students</p>
            </div>
          </Link>

          <Link
            href="/parent/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">👤</span>
            <div>
              <p className="font-medium text-gray-900">My Profile</p>
              <p className="text-sm text-gray-500">View and update your profile</p>
            </div>
          </Link>

          <Link
            href="/parent/settings"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">⚙️</span>
            <div>
              <p className="font-medium text-gray-900">Settings</p>
              <p className="text-sm text-gray-500">Manage preferences</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Students Preview */}
      {!loading && students.length > 0 && (
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
      {!loading && students.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-4">👨‍👧‍👦</div>
          <h3 className="text-lg font-medium text-gray-900">No students registered yet</h3>
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
        </div>
      )}
    </div>
  );
}
