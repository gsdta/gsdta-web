'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  adminGetClass,
  adminUpdateClass,
  adminAssignTeacher,
  adminRemoveTeacher,
  adminUpdateTeacherRole,
  type Class,
  type ClassTeacher,
  type ClassTeacherRole,
  type UpdateClassInput,
} from '@/lib/class-api';
import { adminGetGradeOptions } from '@/lib/grade-api';
import type { GradeOption } from '@/lib/grade-types';
import { apiFetch } from '@/lib/api-client';

const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Teacher {
  uid: string;
  email: string;
  name: string;
  status: string;
}

interface TeachersResponse {
  success: boolean;
  data: {
    teachers: Teacher[];
    total: number;
  };
}

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const { getIdToken } = useAuth();

  const [classData, setClassData] = useState<Class | null>(null);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<UpdateClassInput>({
    name: '',
    gradeId: '',
    day: '',
    time: '',
    capacity: 1,
    status: 'active',
    academicYear: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Teacher assignment state
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ClassTeacherRole>('assistant');
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  const fetchClass = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminGetClass(getIdToken, classId);
      setClassData(data);
      setFormData({
        name: data.name,
        gradeId: data.gradeId || '',
        day: data.day,
        time: data.time,
        capacity: data.capacity,
        status: data.status,
        academicYear: data.academicYear || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, classId]);

  const fetchGrades = useCallback(async () => {
    try {
      setLoadingGrades(true);
      const gradeOptions = await adminGetGradeOptions(getIdToken);
      setGrades(gradeOptions);
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    } finally {
      setLoadingGrades(false);
    }
  }, [getIdToken]);

  const fetchAvailableTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const response = await apiFetch<TeachersResponse>('/v1/admin/teachers?status=active&limit=100');
      if (response.success) {
        setAvailableTeachers(response.data.teachers);
      }
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  useEffect(() => {
    fetchClass();
    fetchGrades();
    fetchAvailableTeachers();
  }, [fetchClass, fetchGrades, fetchAvailableTeachers]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? parseInt(value, 10) : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setSubmitSuccess(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Class name is required';
    }
    if (!formData.gradeId) {
      newErrors.gradeId = 'Grade is required';
    }
    if (!formData.day) {
      newErrors.day = 'Day is required';
    }
    if (!formData.time?.trim()) {
      newErrors.time = 'Time is required';
    }
    if (!formData.capacity || formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await adminUpdateClass(getIdToken, classId, formData);
      setSubmitSuccess(true);
      // Refresh class data
      await fetchClass();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) {
      setTeacherError('Please select a teacher');
      return;
    }

    const teacher = availableTeachers.find((t) => t.uid === selectedTeacherId);
    if (!teacher) {
      setTeacherError('Teacher not found');
      return;
    }

    // Check if teacher is already assigned
    if (classData?.teachers?.some((t) => t.teacherId === selectedTeacherId)) {
      setTeacherError('This teacher is already assigned to this class');
      return;
    }

    setAssigningTeacher(true);
    setTeacherError(null);

    try {
      await adminAssignTeacher(getIdToken, classId, {
        teacherId: teacher.uid,
        teacherName: teacher.name || teacher.email,
        teacherEmail: teacher.email,
        role: selectedRole,
      });

      // Refresh class data
      await fetchClass();
      setSelectedTeacherId('');
      setSelectedRole('assistant');
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : 'Failed to assign teacher');
    } finally {
      setAssigningTeacher(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!confirm('Are you sure you want to remove this teacher from the class?')) return;

    try {
      setTeacherError(null);
      await adminRemoveTeacher(getIdToken, classId, teacherId);
      await fetchClass();
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : 'Failed to remove teacher');
    }
  };

  const handleUpdateRole = async (teacherId: string, newRole: ClassTeacherRole) => {
    try {
      setTeacherError(null);
      await adminUpdateTeacherRole(getIdToken, classId, teacherId, newRole);
      await fetchClass();
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : 'Failed to update teacher role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading class...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
        <div className="mt-4">
          <Link href="/admin/classes" className="text-blue-600 hover:underline">
            Back to Classes
          </Link>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-gray-500">Class not found</div>
        <div className="mt-4">
          <Link href="/admin/classes" className="text-blue-600 hover:underline">
            Back to Classes
          </Link>
        </div>
      </div>
    );
  }

  // Filter out already assigned teachers from available list
  const unassignedTeachers = availableTeachers.filter(
    (t) => !classData.teachers?.some((ct) => ct.teacherId === t.uid)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/classes"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Classes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Class</h1>
        <p className="mt-1 text-gray-600">
          Update class details and manage teacher assignments.
        </p>
      </div>

      {/* Class Details Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Class Details</h2>

        {/* Success Message */}
        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            Class updated successfully!
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {submitError}
          </div>
        )}

        {/* Class Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Class Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              formErrors.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
        </div>

        {/* Grade and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gradeId" className="block text-sm font-medium text-gray-700 mb-1">
              Grade <span className="text-red-500">*</span>
            </label>
            {loadingGrades ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                Loading grades...
              </div>
            ) : (
              <select
                id="gradeId"
                name="gradeId"
                value={formData.gradeId}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.gradeId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a grade</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name} - {grade.displayName}
                  </option>
                ))}
              </select>
            )}
            {formErrors.gradeId && <p className="mt-1 text-sm text-red-600">{formErrors.gradeId}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Day and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">
              Day <span className="text-red-500">*</span>
            </label>
            <select
              id="day"
              name="day"
              value={formData.day}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.day ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            {formErrors.day && <p className="mt-1 text-sm text-red-600">{formErrors.day}</p>}
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.time ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 10:00 AM - 12:00 PM"
            />
            {formErrors.time && <p className="mt-1 text-sm text-red-600">{formErrors.time}</p>}
          </div>
        </div>

        {/* Capacity and Academic Year */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
              Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              min={1}
              max={100}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.capacity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.capacity && <p className="mt-1 text-sm text-red-600">{formErrors.capacity}</p>}
            <p className="mt-1 text-sm text-gray-500">
              Currently enrolled: {classData.enrolled}
            </p>
          </div>

          <div>
            <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year
            </label>
            <input
              type="text"
              id="academicYear"
              name="academicYear"
              value={formData.academicYear}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 2024-2025"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>

      {/* Teacher Management Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Teacher Assignments</h2>

        {/* Teacher Error */}
        {teacherError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {teacherError}
          </div>
        )}

        {/* Current Teachers */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Assigned Teachers</h3>
          {!classData.teachers || classData.teachers.length === 0 ? (
            <div className="text-gray-500 text-sm py-4 px-3 bg-gray-50 rounded-md">
              No teachers assigned to this class yet.
            </div>
          ) : (
            <div className="space-y-2">
              {classData.teachers.map((teacher: ClassTeacher) => (
                <div
                  key={teacher.teacherId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {teacher.teacherName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{teacher.teacherName}</div>
                      {teacher.teacherEmail && (
                        <div className="text-sm text-gray-500">{teacher.teacherEmail}</div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        teacher.role === 'primary'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {teacher.role === 'primary' ? 'Primary' : 'Assistant'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleUpdateRole(
                          teacher.teacherId,
                          teacher.role === 'primary' ? 'assistant' : 'primary'
                        )
                      }
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {teacher.role === 'primary' ? 'Make Assistant' : 'Make Primary'}
                    </button>
                    <button
                      onClick={() => handleRemoveTeacher(teacher.teacherId)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Teacher */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Teacher</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="teacherSelect" className="block text-xs text-gray-500 mb-1">
                Select Teacher
              </label>
              {loadingTeachers ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                  Loading teachers...
                </div>
              ) : unassignedTeachers.length === 0 ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                  No available teachers
                </div>
              ) : (
                <select
                  id="teacherSelect"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select a teacher...</option>
                  {unassignedTeachers.map((teacher) => (
                    <option key={teacher.uid} value={teacher.uid}>
                      {teacher.name || teacher.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="w-36">
              <label htmlFor="roleSelect" className="block text-xs text-gray-500 mb-1">
                Role
              </label>
              <select
                id="roleSelect"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ClassTeacherRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="primary">Primary</option>
                <option value="assistant">Assistant</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAssignTeacher}
              disabled={assigningTeacher || !selectedTeacherId || loadingTeachers}
              className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed text-sm"
            >
              {assigningTeacher ? 'Adding...' : 'Add Teacher'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
          <strong>Note:</strong> Each class can have one primary teacher and multiple assistant teachers.
          The primary teacher is the main instructor for the class.
        </div>
      </div>

      {/* Delete Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Deactivating a class will hide it from student enrollment. This can be undone by changing the status back to active.
        </p>
        {classData.status === 'active' ? (
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to deactivate this class?')) {
                try {
                  await adminUpdateClass(getIdToken, classId, { status: 'inactive' });
                  router.push('/admin/classes');
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to deactivate class');
                }
              }
            }}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            Deactivate Class
          </button>
        ) : (
          <button
            onClick={async () => {
              try {
                await adminUpdateClass(getIdToken, classId, { status: 'active' });
                router.push('/admin/classes');
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to activate class');
              }
            }}
            className="px-4 py-2 text-green-600 border border-green-300 rounded-md hover:bg-green-50 transition-colors"
          >
            Reactivate Class
          </button>
        )}
      </div>
    </div>
  );
}
