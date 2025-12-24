'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Protected } from '@/components/Protected';
import { useAuth } from '@/components/AuthProvider';
import {
  teacherGetClassRoster,
  teacherGetAttendance,
  teacherSaveAttendance,
  getTodayDateString,
  formatDateDisplay,
  getStatusButtonClass,
  type ClassRosterInfo,
  type RosterStudent,
  type AttendanceStatus,
  type SaveAttendanceInput,
} from '@/lib/teacher-api';

interface StudentAttendance {
  studentId: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus | null;
  notes: string;
}

export default function TeacherAttendancePage() {
  const params = useParams();
  const classId = params.id as string;
  const { getIdToken } = useAuth();

  const [classInfo, setClassInfo] = useState<ClassRosterInfo | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Load class roster
      const rosterData = await teacherGetClassRoster(getIdToken, classId);
      setClassInfo(rosterData.class);

      // Initialize attendance with all students
      const initialAttendance: StudentAttendance[] = rosterData.students.map((s: RosterStudent) => ({
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        status: null,
        notes: '',
      }));

      // Load existing attendance for selected date
      const existingRecords = await teacherGetAttendance(getIdToken, classId, selectedDate);

      // Merge existing records with student list
      const mergedAttendance = initialAttendance.map((student) => {
        const existing = existingRecords.find((r) => r.studentId === student.studentId);
        if (existing) {
          return {
            ...student,
            status: existing.status,
            notes: existing.notes || '',
          };
        }
        return student;
      });

      setAttendance(mergedAttendance);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, classId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((s) =>
        s.studentId === studentId ? { ...s, status } : s
      )
    );
    setSuccessMessage(null);
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendance((prev) =>
      prev.map((s) =>
        s.studentId === studentId ? { ...s, notes } : s
      )
    );
  };

  const handleMarkAllPresent = () => {
    setAttendance((prev) =>
      prev.map((s) => ({ ...s, status: 'present' as AttendanceStatus }))
    );
    setSuccessMessage(null);
  };

  const handleMarkAllAbsent = () => {
    setAttendance((prev) =>
      prev.map((s) => ({ ...s, status: 'absent' as AttendanceStatus }))
    );
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    // Filter to only students with a status set
    const recordsToSave: SaveAttendanceInput[] = attendance
      .filter((s) => s.status !== null)
      .map((s) => ({
        studentId: s.studentId,
        status: s.status!,
        notes: s.notes || undefined,
      }));

    if (recordsToSave.length === 0) {
      setError('Please mark attendance for at least one student');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const result = await teacherSaveAttendance(getIdToken, classId, selectedDate, recordsToSave);
      setSuccessMessage(`Attendance saved successfully (${result.savedCount} records)`);
    } catch (err) {
      console.error('Failed to save attendance:', err);
      setError(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (attendance.length === 0) return;

    const headers = ['Student Name', 'Status', 'Notes'];
    const rows = attendance.map((s) => [
      `${s.firstName} ${s.lastName}`,
      s.status || 'Not marked',
      s.notes || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${classInfo?.name || 'class'}-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const unmarkedCount = attendance.filter((s) => s.status === null).length;
  const presentCount = attendance.filter((s) => s.status === 'present').length;
  const absentCount = attendance.filter((s) => s.status === 'absent').length;

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
                    <div key={i} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Protected>
    );
  }

  if (error && !classInfo) {
    return (
      <Protected roles={['teacher', 'admin']}>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
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
              <Link href={`/teacher/classes/${classId}`} className="hover:text-blue-600">
                {classInfo?.name}
              </Link>
              <span>/</span>
              <span className="text-gray-900">Attendance</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
            <p className="mt-1 text-gray-600">
              {classInfo?.name} • {classInfo?.gradeName}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Date Selection & Actions */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getTodayDateString()}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {formatDateDisplay(selectedDate)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleMarkAllPresent}
                  className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  Mark All Present
                </button>
                <button
                  onClick={handleMarkAllAbsent}
                  className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  Mark All Absent
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-sm text-gray-600">Present</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              <p className="text-sm text-gray-600">Absent</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{unmarkedCount}</p>
              <p className="text-sm text-gray-600">Not Marked</p>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700">
              {successMessage}
            </div>
          )}

          {/* Attendance Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            {attendance.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="text-4xl mb-4 block">👨‍🎓</span>
                <p>No students enrolled in this class.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendance.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(
                              (status) => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(student.studentId, status)}
                                  className={getStatusButtonClass(status, student.status === status)}
                                >
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={student.notes}
                            onChange={(e) => handleNotesChange(student.studentId, e.target.value)}
                            placeholder="Add notes..."
                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Save Button */}
          {attendance.length > 0 && (
            <div className="flex justify-end gap-4">
              <Link
                href={`/teacher/classes/${classId}`}
                className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving || unmarkedCount === attendance.length}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}

          {/* Back Link */}
          <div className="mt-6">
            <Link
              href={`/teacher/classes/${classId}`}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Class Details
            </Link>
          </div>
        </div>
      </div>
    </Protected>
  );
}
