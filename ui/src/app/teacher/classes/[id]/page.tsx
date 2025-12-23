'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Protected } from '@/components/Protected';
import { useAuth } from '@/components/AuthProvider';
import {
  teacherGetClassRoster,
  type ClassRosterInfo,
  type RosterStudent,
} from '@/lib/teacher-api';

export default function TeacherClassDetailPage() {
  const params = useParams();
  const classId = params.id as string;
  const { getIdToken } = useAuth();

  const [classInfo, setClassInfo] = useState<ClassRosterInfo | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherGetClassRoster(getIdToken, classId);
      setClassInfo(data.class);
      setStudents(data.students);
    } catch (err) {
      console.error('Failed to load class:', err);
      setError(err instanceof Error ? err.message : 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Protected roles={['teacher', 'admin']}>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Protected>
    );
  }

  if (error || !classInfo) {
    return (
      <Protected roles={['teacher', 'admin']}>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error || 'Class not found'}</p>
              <Link
                href="/teacher/classes"
                className="inline-block mt-4 text-blue-600 hover:text-blue-800"
              >
                ← Back to My Classes
              </Link>
            </div>
          </div>
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['teacher', 'admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/teacher" className="hover:text-blue-600">
                Dashboard
              </Link>
              <span>/</span>
              <Link href="/teacher/classes" className="hover:text-blue-600">
                My Classes
              </Link>
              <span>/</span>
              <span className="text-gray-900">{classInfo.name}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{classInfo.name}</h1>
                <p className="mt-1 text-gray-600">
                  {classInfo.gradeName} • {classInfo.day} {classInfo.time}
                </p>
              </div>
              <Link
                href={`/teacher/classes/${classId}/attendance`}
                className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Mark Attendance
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Class Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Grade</p>
                <p className="font-medium">{classInfo.gradeName || classInfo.gradeId}</p>
              </div>
              <div>
                <p className="text-gray-500">Schedule</p>
                <p className="font-medium">{classInfo.day} {classInfo.time}</p>
              </div>
              <div>
                <p className="text-gray-500">Enrollment</p>
                <p className="font-medium">{classInfo.enrolled} / {classInfo.capacity} students</p>
              </div>
              {classInfo.academicYear && (
                <div>
                  <p className="text-gray-500">Academic Year</p>
                  <p className="font-medium">{classInfo.academicYear}</p>
                </div>
              )}
            </div>
          </div>

          {/* Student Roster */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Student Roster ({students.length})
              </h2>
            </div>
            {students.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="text-4xl mb-4 block">👨‍🎓</span>
                <p>No students enrolled in this class yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student, index) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              student.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Back Link */}
          <div className="mt-6">
            <Link
              href="/teacher/classes"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to My Classes
            </Link>
          </div>
        </div>
      </div>
    </Protected>
  );
}
