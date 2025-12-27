'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTeacherClasses, TeacherClass } from '@/lib/teacher-api';

export default function SelectClassForAttendancePage() {
  const router = useRouter();
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

  const getDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const todaysClasses = classes.filter(cls => cls.day === getDayOfWeek());
  const otherClasses = classes.filter(cls => cls.day !== getDayOfWeek());

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
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="mt-2 text-gray-600">
          Select a class to mark attendance.
        </p>
      </div>

      {/* Today's Classes */}
      {todaysClasses.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Today&apos;s Classes ({getDayOfWeek()})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todaysClasses.map((cls) => (
              <button
                key={cls.id}
                onClick={() => router.push(`/teacher/classes/${cls.id}/attendance/mark`)}
                className="p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">{cls.name}</div>
                <div className="text-sm text-gray-600">{cls.gradeName}</div>
                <div className="text-sm text-gray-500 mt-1">{cls.time}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {cls.enrolled} students
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    cls.teacherRole === 'primary'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {cls.teacherRole}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Other Classes */}
      {otherClasses.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherClasses.map((cls) => (
              <button
                key={cls.id}
                onClick={() => router.push(`/teacher/classes/${cls.id}/attendance/mark`)}
                className="p-4 border rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">{cls.name}</div>
                <div className="text-sm text-gray-600">{cls.gradeName}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {cls.day} {cls.time}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {cls.enrolled} students
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Classes */}
      {classes.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">You are not assigned to any classes.</p>
          <Link href="/teacher" className="text-green-600 hover:underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
