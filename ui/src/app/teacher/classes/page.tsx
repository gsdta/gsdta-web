'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Protected } from '@/components/Protected';
import { useAuth } from '@/components/AuthProvider';
import { teacherGetClasses, type TeacherClass } from '@/lib/teacher-api';

export default function TeacherClassesPage() {
  const { getIdToken } = useAuth();
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
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/teacher" className="hover:text-blue-600">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-gray-900">My Classes</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
            <p className="mt-1 text-gray-600">View and manage your assigned classes</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
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
              <p className="text-lg">No classes assigned yet.</p>
              <p className="text-sm mt-2">Contact your administrator to be assigned to classes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">{cls.name}</h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              cls.myRole === 'primary'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {cls.myRole === 'primary' ? 'Primary Teacher' : 'Assistant'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>{cls.gradeName || cls.gradeId}</span>
                          <span>•</span>
                          <span>{cls.day} {cls.time}</span>
                          <span>•</span>
                          <span>{cls.enrolled} / {cls.capacity} students</span>
                          {cls.academicYear && (
                            <>
                              <span>•</span>
                              <span>{cls.academicYear}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/teacher/classes/${cls.id}`}
                          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/teacher/classes/${cls.id}/attendance`}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Mark Attendance
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}
