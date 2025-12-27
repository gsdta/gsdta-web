'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTeacherClasses, TeacherClass } from '@/lib/teacher-api';

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      try {
        const data = await getTeacherClasses();
        setClasses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load classes');
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="mt-2 text-gray-600">
          View and manage your assigned classes.
        </p>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">You are not assigned to any classes yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-600">{cls.gradeName}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      cls.teacherRole === 'primary'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {cls.teacherRole}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📅</span>
                    {cls.day}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🕐</span>
                    {cls.time}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">👨‍🎓</span>
                    {cls.enrolled}/{cls.capacity} students
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Link
                    href={`/teacher/classes/${cls.id}`}
                    className="flex-1 px-4 py-2 bg-green-600 text-white text-sm text-center rounded-md hover:bg-green-700"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/teacher/classes/${cls.id}/roster`}
                    className="flex-1 px-4 py-2 bg-white text-gray-700 text-sm text-center rounded-md border hover:bg-gray-50"
                  >
                    Roster
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
