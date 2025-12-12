'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

type LinkedStudent = {
  id: string;
  name: string;
  grade?: string;
  schoolName?: string;
  enrollmentDate?: string;
  status: string;
};

export default function ParentStudentsPage() {
  const { user, getIdToken } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudents() {
      if (!user) return;
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch('/api/v1/me/students', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStudents(data.data?.students || []);
        } else {
          setError('Failed to load students');
        }
      } catch (err) {
        console.error('Failed to fetch students:', err);
        setError('Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [user, getIdToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="mt-1 text-gray-600">
            View and manage students linked to your account.
          </p>
        </div>
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
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Student Avatar */}
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xl">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : student.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {student.status}
                    </span>
                  </div>
                </div>

                {/* Student Details */}
                <div className="space-y-2 text-sm">
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
                  {student.enrollmentDate && (
                    <div className="flex items-center text-gray-600">
                      <span className="w-24 font-medium">Enrolled:</span>
                      <span>
                        {new Date(student.enrollmentDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👨‍👧‍👦</div>
          <h3 className="text-xl font-medium text-gray-900">No students linked yet</h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            Students will appear here once they are linked to your account by an administrator.
            Please contact your school if you need assistance.
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              <p className="text-sm text-gray-500">Total Students</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {students.filter((s) => s.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {students.filter((s) => s.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">
                {students.filter((s) => s.status !== 'active' && s.status !== 'pending').length}
              </p>
              <p className="text-sm text-gray-500">Other</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
