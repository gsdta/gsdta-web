'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import StudentSelectorModal from '@/components/StudentSelectorModal';
import {
  adminGetClassRoster,
  adminRemoveStudentFromClass,
  adminBulkAssignStudents,
  type RosterStudent,
} from '@/lib/class-api';

interface ClassInfo {
  id: string;
  name: string;
  gradeId: string;
  gradeName?: string;
  capacity: number;
  enrolled: number;
}

export default function ClassRosterPage() {
  const params = useParams();
  const classId = params.id as string;
  const { getIdToken } = useAuth();

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const loadRoster = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminGetClassRoster(getIdToken, classId);
      setClassInfo(data.class);
      setStudents(data.students);
    } catch (err) {
      console.error('Failed to load roster:', err);
      setError(err instanceof Error ? err.message : 'Failed to load class roster');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, classId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  async function handleRemoveStudent(studentId: string, studentName: string) {
    if (!confirm(`Remove ${studentName} from this class?`)) return;

    try {
      setRemoving(studentId);
      await adminRemoveStudentFromClass(getIdToken, classId, studentId);
      await loadRoster();
    } catch (err) {
      console.error('Failed to remove student:', err);
      alert(err instanceof Error ? err.message : 'Failed to remove student');
    } finally {
      setRemoving(null);
    }
  }

  async function handleAssignStudents(studentIds: string[]) {
    await adminBulkAssignStudents(getIdToken, classId, studentIds);
    await loadRoster();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-10 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !classInfo) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error || 'Class not found'}</p>
            <Link
              href="/admin/classes"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Classes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const spotsAvailable = classInfo.capacity - classInfo.enrolled;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/admin/classes" className="hover:text-blue-600">
              Classes
            </Link>
            <span>/</span>
            <Link
              href={`/admin/classes/${classId}/edit`}
              className="hover:text-blue-600"
            >
              {classInfo.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900">Roster</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {classInfo.name} - Roster
              </h1>
              <p className="text-gray-600 mt-1">
                {classInfo.gradeName} • {classInfo.enrolled} / {classInfo.capacity} students
                {spotsAvailable > 0 && (
                  <span className="text-green-600 ml-2">
                    ({spotsAvailable} spot{spotsAvailable !== 1 ? 's' : ''} available)
                  </span>
                )}
                {spotsAvailable === 0 && (
                  <span className="text-orange-600 ml-2">(Full)</span>
                )}
              </p>
            </div>

            <button
              onClick={() => setShowAssignModal(true)}
              disabled={spotsAvailable === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                spotsAvailable === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              + Assign Students
            </button>
          </div>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">No students enrolled yet</p>
              <button
                onClick={() => setShowAssignModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Assign your first student →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent Email
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {student.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.grade || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            student.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : student.status === 'admitted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.parentEmail || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleRemoveStudent(student.id, student.name)}
                          disabled={removing === student.id}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          {removing === student.id ? 'Removing...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <Link
            href={`/admin/classes/${classId}/edit`}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Class Details
          </Link>
        </div>
      </div>

      {/* Student Selector Modal */}
      {classInfo && (
        <StudentSelectorModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleAssignStudents}
          gradeId={classInfo.gradeId}
          gradeName={classInfo.gradeName}
          spotsAvailable={spotsAvailable}
          excludeStudentIds={students.map((s) => s.id)}
        />
      )}
    </div>
  );
}
