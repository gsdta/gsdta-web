'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getMyStudents } from '@/lib/student-api';
import { statusConfig, type Student, type StudentStatus } from '@/lib/student-types';

export default function ParentStudentsPage() {
  const { user, getIdToken } = useAuth();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showRegisteredMessage = searchParams.get('registered') === 'true';

  useEffect(() => {
    async function fetchStudents() {
      if (!user) return;
      try {
        const data = await getMyStudents(getIdToken);
        setStudents(data);
      } catch (err) {
        console.error('Failed to fetch students:', err);
        setError('Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [user, getIdToken]);

  const canEdit = (status: StudentStatus) => {
    return status === 'pending' || status === 'admitted';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showRegisteredMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Student registered successfully! They will be reviewed by an administrator.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="mt-1 text-gray-600">
            View and manage students linked to your account.
          </p>
        </div>
        <Link
          href="/parent/students/register"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Register New Student
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Students List */}
      {students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => {
            const status = statusConfig[student.status] || statusConfig.pending;
            return (
              <div
                key={student.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Student Avatar */}
                  <div className="flex items-center mb-4">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold text-xl">
                        {student.firstName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {student.firstName} {student.lastName}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="space-y-2 text-sm">
                    {student.dateOfBirth && (
                      <div className="flex items-center text-gray-600">
                        <span className="w-24 font-medium">DOB:</span>
                        <span>{new Date(student.dateOfBirth).toLocaleDateString()}</span>
                      </div>
                    )}
                    {student.grade && (
                      <div className="flex items-center text-gray-600">
                        <span className="w-24 font-medium">Grade:</span>
                        <span>{student.grade}</span>
                      </div>
                    )}
                    {student.schoolName && (
                      <div className="flex items-center text-gray-600">
                        <span className="w-24 font-medium">School:</span>
                        <span>{student.schoolName}</span>
                      </div>
                    )}
                    {student.className && (
                      <div className="flex items-center text-gray-600">
                        <span className="w-24 font-medium">Class:</span>
                        <span className="text-green-600 font-medium">{student.className}</span>
                      </div>
                    )}
                  </div>

                  {/* Edit Button (only for pending/admitted) */}
                  {canEdit(student.status) && (
                    <div className="mt-4 pt-4 border-t">
                      <Link
                        href={`/parent/students/${student.id}/edit`}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit Details
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900">No students registered yet</h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            Register your child to enroll them in our Tamil school. Click the button below to get started.
          </p>
          <Link
            href="/parent/students/register"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Register Your First Student
          </Link>
        </div>
      )}

      {/* Summary Stats */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {students.filter((s) => s.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {students.filter((s) => s.status === 'admitted').length}
              </p>
              <p className="text-sm text-gray-500">Admitted</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {students.filter((s) => s.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">
                {students.filter((s) => s.status === 'inactive' || s.status === 'withdrawn').length}
              </p>
              <p className="text-sm text-gray-500">Other</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
