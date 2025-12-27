'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getClassRoster,
  getTeacherClass,
  getClassAttendance,
  markClassAttendance,
  ClassRoster,
  TeacherClass,
  AttendanceRecord
} from '@/lib/teacher-api';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentAttendance {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  arrivalTime?: string;
  notes?: string;
}

export default function MarkAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [classData, setClassData] = useState<TeacherClass | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [existingAttendance, setExistingAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [cls, ros, att] = await Promise.all([
        getTeacherClass(classId),
        getClassRoster(classId),
        getClassAttendance(classId, { date }),
      ]);

      setClassData(cls);
      setRoster(ros);
      setExistingAttendance(att.records);

      // Initialize attendance data from roster
      const existingMap = new Map(att.records.map(r => [r.studentId, r]));

      const initialData: StudentAttendance[] = ros.students.map(student => {
        const existing = existingMap.get(student.id);
        return {
          studentId: student.id,
          studentName: student.name,
          status: existing?.status || 'present',
          arrivalTime: existing?.arrivalTime,
          notes: existing?.notes,
        };
      });

      setAttendanceData(initialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [classId, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, status } : s
    ));
  };

  const updateStudentNotes = (studentId: string, notes: string) => {
    setAttendanceData(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, notes } : s
    ));
  };

  const setAllStatus = (status: AttendanceStatus) => {
    setAttendanceData(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const records = attendanceData.map(({ studentId, status, arrivalTime, notes }) => ({
        studentId,
        status,
        arrivalTime,
        notes,
      }));

      await markClassAttendance(classId, date, records);
      setSuccessMessage('Attendance saved successfully!');

      // Reload to get updated records
      await loadData();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusButtonClass = (current: AttendanceStatus, target: AttendanceStatus) => {
    const baseClasses = 'px-3 py-1 text-sm rounded-md transition-colors';
    const isActive = current === target;

    switch (target) {
      case 'present':
        return `${baseClasses} ${isActive ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`;
      case 'absent':
        return `${baseClasses} ${isActive ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`;
      case 'late':
        return `${baseClasses} ${isActive ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`;
      case 'excused':
        return `${baseClasses} ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error && !roster) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <Link href={`/teacher/classes/${classId}`} className="text-green-600 hover:underline mt-2 inline-block">
          Back to Class
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/teacher" className="hover:text-green-600">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/teacher/classes" className="hover:text-green-600">Classes</Link>
        <span className="mx-2">/</span>
        <Link href={`/teacher/classes/${classId}`} className="hover:text-green-600">{classData?.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Mark Attendance</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
            <p className="mt-1 text-gray-600">
              {classData?.name} - {classData?.gradeName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {existingAttendance.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">
            Attendance has already been marked for this date. You can update the records below.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 mr-2">Mark all as:</span>
          <button
            onClick={() => setAllStatus('present')}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
          >
            Present
          </button>
          <button
            onClick={() => setAllStatus('absent')}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Absent
          </button>
        </div>
      </div>

      {/* Student List */}
      {attendanceData.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No students enrolled in this class.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attendanceData.map((student) => (
            <div key={student.studentId} className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="font-medium text-gray-900">{student.studentName}</div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateStudentStatus(student.studentId, 'present')}
                    className={getStatusButtonClass(student.status, 'present')}
                  >
                    Present
                  </button>
                  <button
                    onClick={() => updateStudentStatus(student.studentId, 'absent')}
                    className={getStatusButtonClass(student.status, 'absent')}
                  >
                    Absent
                  </button>
                  <button
                    onClick={() => updateStudentStatus(student.studentId, 'late')}
                    className={getStatusButtonClass(student.status, 'late')}
                  >
                    Late
                  </button>
                  <button
                    onClick={() => updateStudentStatus(student.studentId, 'excused')}
                    className={getStatusButtonClass(student.status, 'excused')}
                  >
                    Excused
                  </button>
                </div>
              </div>

              {/* Notes field - shown for non-present */}
              {student.status !== 'present' && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Add notes (optional)"
                    value={student.notes || ''}
                    onChange={(e) => updateStudentNotes(student.studentId, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit Button */}
      {attendanceData.length > 0 && (
        <div className="sticky bottom-4 bg-white rounded-lg shadow p-4 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-600">
              {attendanceData.filter(s => s.status === 'present').length} present,
              {' '}{attendanceData.filter(s => s.status === 'absent').length} absent,
              {' '}{attendanceData.filter(s => s.status === 'late').length} late,
              {' '}{attendanceData.filter(s => s.status === 'excused').length} excused
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/teacher/classes/${classId}`)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
