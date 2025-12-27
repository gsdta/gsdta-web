'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAttendanceRecord,
  getTeacherClass,
  updateAttendanceRecord,
  AttendanceRecord,
  TeacherClass
} from '@/lib/teacher-api';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export default function EditAttendanceRecordPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;
  const recordId = params.recordId as string;

  const [classData, setClassData] = useState<TeacherClass | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [arrivalTime, setArrivalTime] = useState('');
  const [notes, setNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [cls, rec] = await Promise.all([
          getTeacherClass(classId),
          getAttendanceRecord(classId, recordId),
        ]);
        setClassData(cls);
        setRecord(rec);
        setStatus(rec.status);
        setArrivalTime(rec.arrivalTime || '');
        setNotes(rec.notes || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classId, recordId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editReason.trim()) {
      setError('Please provide a reason for editing this record.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await updateAttendanceRecord(classId, recordId, {
        status,
        arrivalTime: arrivalTime || undefined,
        notes: notes || undefined,
        editReason,
      });

      router.push(`/teacher/classes/${classId}/attendance`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusButtonClass = (target: AttendanceStatus) => {
    const baseClasses = 'px-4 py-2 rounded-md transition-colors';
    const isActive = status === target;

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

  if (error && !record) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <Link href={`/teacher/classes/${classId}/attendance`} className="text-green-600 hover:underline mt-2 inline-block">
          Back to Attendance
        </Link>
      </div>
    );
  }

  if (!record) {
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
        <Link href={`/teacher/classes/${classId}`} className="hover:text-green-600">{classData?.name}</Link>
        <span className="mx-2">/</span>
        <Link href={`/teacher/classes/${classId}/attendance`} className="hover:text-green-600">Attendance</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Edit Record</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Attendance Record</h1>
        <p className="mt-1 text-gray-600">
          {record.studentName} - {record.date}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Current Record Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Current Record</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Student:</span>
              <span className="ml-2 text-gray-900">{record.studentName}</span>
            </div>
            <div>
              <span className="text-gray-500">Date:</span>
              <span className="ml-2 text-gray-900">{record.date}</span>
            </div>
            <div>
              <span className="text-gray-500">Recorded by:</span>
              <span className="ml-2 text-gray-900">{record.recordedByName}</span>
            </div>
            <div>
              <span className="text-gray-500">Recorded at:</span>
              <span className="ml-2 text-gray-900">{record.recordedAt}</span>
            </div>
            {record.lastEditedByName && (
              <>
                <div>
                  <span className="text-gray-500">Last edited by:</span>
                  <span className="ml-2 text-gray-900">{record.lastEditedByName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last edited at:</span>
                  <span className="ml-2 text-gray-900">{record.lastEditedAt}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Status</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatus('present')}
              className={getStatusButtonClass('present')}
            >
              Present
            </button>
            <button
              type="button"
              onClick={() => setStatus('absent')}
              className={getStatusButtonClass('absent')}
            >
              Absent
            </button>
            <button
              type="button"
              onClick={() => setStatus('late')}
              className={getStatusButtonClass('late')}
            >
              Late
            </button>
            <button
              type="button"
              onClick={() => setStatus('excused')}
              className={getStatusButtonClass('excused')}
            >
              Excused
            </button>
          </div>
        </div>

        {/* Arrival Time (for late) */}
        {status === 'late' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Optional notes about this attendance record..."
          />
        </div>

        {/* Edit Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Edit <span className="text-red-500">*</span>
          </label>
          <textarea
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            rows={2}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Please explain why you are editing this record..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
