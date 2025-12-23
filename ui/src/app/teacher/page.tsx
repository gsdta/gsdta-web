'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Protected } from '@/components/Protected';
import { useAuth } from '@/components/AuthProvider';
import { teacherGetClasses, type TeacherClass } from '@/lib/teacher-api';

export default function TeacherDashboardPage() {
  const { getIdToken, user } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      try {
        setLoading(true);
        const data = await teacherGetClasses(getIdToken);
        setClasses(data);
      } catch (err) {
        console.error('Failed to load classes:', err);
        setError(err instanceof Error ? err.message : 'Failed to load classes');
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, [getIdToken]);

  return (
    <Protected roles={['teacher', 'admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="mt-1 text-gray-600">
              Welcome back, {user?.name || user?.email || 'Teacher'}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/teacher/classes"
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <span className="text-2xl mb-2 block">📚</span>
                <span className="text-sm font-medium text-gray-900">My Classes</span>
              </Link>
              <Link
                href="/teacher/classes"
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <span className="text-2xl mb-2 block">✅</span>
                <span className="text-sm font-medium text-gray-900">Attendance</span>
              </Link>
              <Link
                href="/teacher/classes"
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <span className="text-2xl mb-2 block">👨‍🎓</span>
                <span className="text-sm font-medium text-gray-900">Students</span>
              </Link>
              <Link
                href="/teacher/classes"
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <span className="text-2xl mb-2 block">📊</span>
                <span className="text-sm font-medium text-gray-900">Reports</span>
              </Link>
            </div>
          </div>

          {/* My Classes */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Classes</h2>
              <Link
                href="/teacher/classes"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            ) : classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <span className="text-4xl mb-4 block">📚</span>
                <p>No classes assigned yet.</p>
                <p className="text-sm mt-2">Contact your administrator to be assigned to classes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls) => (
                  <div key={cls.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            cls.myRole === 'primary'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {cls.myRole === 'primary' ? 'Primary' : 'Assistant'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {cls.gradeName || cls.gradeId}
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        {cls.day} • {cls.time}
                      </p>
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <span>
                          {cls.enrolled} / {cls.capacity} students
                        </span>
                        {cls.academicYear && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{cls.academicYear}</span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/teacher/classes/${cls.id}`}
                          className="flex-1 px-3 py-2 text-sm text-center bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/teacher/classes/${cls.id}/attendance`}
                          className="flex-1 px-3 py-2 text-sm text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Attendance
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Protected>
  );
}

