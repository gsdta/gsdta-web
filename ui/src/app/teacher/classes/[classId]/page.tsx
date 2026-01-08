'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getTeacherClass, TeacherClass } from '@/lib/teacher-api';

export default function TeacherClassDetailPage() {
  const params = useParams();
  const classId = params.classId as string;

  const [classData, setClassData] = useState<TeacherClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClass() {
      try {
        const data = await getTeacherClass(classId);
        setClassData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load class');
      } finally {
        setLoading(false);
      }
    }
    loadClass();
  }, [classId]);

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
        <Link href="/teacher/classes" className="text-green-600 hover:underline mt-2 inline-block">
          Back to Classes
        </Link>
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/teacher" className="hover:text-green-600">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/teacher/classes" className="hover:text-green-600">Classes</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{classData.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
            <p className="mt-1 text-gray-600">{classData.gradeName}</p>
          </div>
          <span
            className={`text-sm px-3 py-1 rounded-full ${
              classData.teacherRole === 'primary'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {classData.teacherRole}
          </span>
        </div>
      </div>

      {/* Class Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Day</div>
            <div className="text-lg font-medium text-gray-900">{classData.day}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Time</div>
            <div className="text-lg font-medium text-gray-900">{classData.time}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Enrollment</div>
            <div className="text-lg font-medium text-gray-900">
              {classData.enrolled}/{classData.capacity} students
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Available Spots</div>
            <div className="text-lg font-medium text-gray-900">{classData.available}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href={`/teacher/classes/${classId}/roster`}
            className="flex items-center p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-2xl mr-3">👥</span>
            <div>
              <p className="font-medium text-blue-900">View Roster</p>
              <p className="text-sm text-blue-600">{classData.enrolled} students</p>
            </div>
          </Link>

          <Link
            href={`/teacher/classes/${classId}/attendance/mark`}
            className="flex items-center p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl mr-3">✅</span>
            <div>
              <p className="font-medium text-green-900">Mark Attendance</p>
              <p className="text-sm text-green-600">Record today&apos;s attendance</p>
            </div>
          </Link>

          <Link
            href={`/teacher/classes/${classId}/attendance`}
            className="flex items-center p-4 border-2 border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <span className="text-2xl mr-3">📋</span>
            <div>
              <p className="font-medium text-purple-900">Attendance History</p>
              <p className="text-sm text-purple-600">View past records</p>
            </div>
          </Link>

          <Link
            href={`/teacher/classes/${classId}/assignments`}
            className="flex items-center p-4 border-2 border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <span className="text-2xl mr-3">📝</span>
            <div>
              <p className="font-medium text-orange-900">Assignments</p>
              <p className="text-sm text-orange-600">Create and manage assignments</p>
            </div>
          </Link>

          <Link
            href={`/teacher/classes/${classId}/gradebook`}
            className="flex items-center p-4 border-2 border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <span className="text-2xl mr-3">📊</span>
            <div>
              <p className="font-medium text-indigo-900">Gradebook</p>
              <p className="text-sm text-indigo-600">View and edit grades</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
