'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  adminGetClasses,
  adminAssignTeacher,
  adminRemoveTeacher,
  type Class,
  type ClassTeacher,
} from '@/lib/class-api';
import { apiFetch } from '@/lib/api-client';
import { adminGetGradeOptions } from '@/lib/grade-api';
import type { GradeOption } from '@/lib/grade-types';

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

interface TeacherWorkload {
  teacherId: string;
  name: string;
  primaryCount: number;
  assistantCount: number;
  totalCount: number;
}

export default function TeacherAssignmentPage() {
  const { getIdToken } = useAuth();

  // Data state
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);

  // Filter state
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(true);

  // UI state
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch classes
  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminGetClasses(getIdToken, { status: 'active' });
      setClasses(result.classes);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const response = await apiFetch<TeachersResponse>(
        '/v1/admin/teachers?status=active&limit=100'
      );
      if (response.success) {
        setTeachers(response.data.teachers);
      }
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  // Fetch grades
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

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchGrades();
  }, [fetchClasses, fetchTeachers, fetchGrades]);

  // Calculate teacher workload
  const teacherWorkload = useMemo(() => {
    const workload: Record<string, TeacherWorkload> = {};

    classes.forEach((cls) => {
      if (cls.teachers) {
        cls.teachers.forEach((teacher) => {
          if (!workload[teacher.teacherId]) {
            workload[teacher.teacherId] = {
              teacherId: teacher.teacherId,
              name: teacher.teacherName,
              primaryCount: 0,
              assistantCount: 0,
              totalCount: 0,
            };
          }

          if (teacher.role === 'primary') {
            workload[teacher.teacherId].primaryCount++;
          } else {
            workload[teacher.teacherId].assistantCount++;
          }
          workload[teacher.teacherId].totalCount++;
        });
      }
    });

    return Object.values(workload).sort((a, b) => b.totalCount - a.totalCount);
  }, [classes]);

  // Filter classes
  const filteredClasses = useMemo(() => {
    let filtered = classes;

    // Filter by grade
    if (gradeFilter !== 'all') {
      filtered = filtered.filter((cls) => cls.gradeId === gradeFilter);
    }

    // Filter by unassigned
    if (showUnassignedOnly) {
      filtered = filtered.filter(
        (cls) => !cls.teachers || !cls.teachers.some((t) => t.role === 'primary')
      );
    }

    return filtered;
  }, [classes, gradeFilter, showUnassignedOnly]);

  // Get primary teacher for a class
  const getPrimaryTeacher = (cls: Class): ClassTeacher | undefined => {
    return cls.teachers?.find((t) => t.role === 'primary');
  };

  // Get assistant teachers for a class
  const getAssistantTeachers = (cls: Class): ClassTeacher[] => {
    return cls.teachers?.filter((t) => t.role === 'assistant') || [];
  };

  // Handle primary teacher assignment
  const handleAssignPrimaryTeacher = async (classId: string, teacherId: string) => {
    if (!teacherId) return;

    const teacher = teachers.find((t) => t.uid === teacherId);
    if (!teacher) return;

    const key = `${classId}-primary`;
    setSavingStates((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: '' }));

    try {
      await adminAssignTeacher(getIdToken, classId, {
        teacherId: teacher.uid,
        teacherName: teacher.name || teacher.email,
        teacherEmail: teacher.email,
        role: 'primary',
      });

      // Refresh classes to show updated data
      await fetchClasses();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign teacher';
      setErrors((prev) => ({ ...prev, [key]: errorMessage }));
    } finally {
      setSavingStates((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Handle assistant teacher assignment
  const handleAssignAssistantTeacher = async (classId: string, teacherId: string) => {
    if (!teacherId) return;

    const teacher = teachers.find((t) => t.uid === teacherId);
    if (!teacher) return;

    const key = `${classId}-assistant-add`;
    setSavingStates((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: '' }));

    try {
      await adminAssignTeacher(getIdToken, classId, {
        teacherId: teacher.uid,
        teacherName: teacher.name || teacher.email,
        teacherEmail: teacher.email,
        role: 'assistant',
      });

      // Refresh classes to show updated data
      await fetchClasses();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign assistant';
      setErrors((prev) => ({ ...prev, [key]: errorMessage }));
    } finally {
      setSavingStates((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Handle remove teacher
  const handleRemoveTeacher = async (classId: string, teacherId: string) => {
    const key = `${classId}-${teacherId}-remove`;
    setSavingStates((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: '' }));

    try {
      await adminRemoveTeacher(getIdToken, classId, teacherId);
      await fetchClasses();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove teacher';
      setErrors((prev) => ({ ...prev, [key]: errorMessage }));
    } finally {
      setSavingStates((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Count assigned/unassigned classes
  const assignedCount = classes.filter((cls) =>
    cls.teachers?.some((t) => t.role === 'primary')
  ).length;
  const unassignedCount = classes.length - assignedCount;

  if (loading || loadingTeachers || loadingGrades) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading teacher assignments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Teacher Assignments</h1>
        <p className="mt-1 text-gray-600">
          Assign teachers to classes for the academic year. Changes save automatically.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="gradeFilter" className="text-sm font-medium text-gray-700">
              Grade:
            </label>
            <select
              id="gradeFilter"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Grades</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showUnassignedOnly}
                onChange={(e) => setShowUnassignedOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Show unassigned only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Teacher Workload Summary */}
      {teacherWorkload.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Teacher Workload</h2>
          <div className="space-y-2">
            {teacherWorkload.map((workload) => (
              <div key={workload.teacherId} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{workload.name}</span>
                <span className="text-gray-600">
                  {workload.totalCount} {workload.totalCount === 1 ? 'class' : 'classes'}
                  {workload.primaryCount > 0 && (
                    <span className="text-blue-600 ml-2">
                      ({workload.primaryCount} primary
                      {workload.assistantCount > 0 && `, ${workload.assistantCount} assistant`})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-blue-900">
            Total: {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'}
          </span>
          <div className="flex gap-4">
            <span className="text-green-700">
              ✓ {assignedCount} assigned
            </span>
            <span className="text-red-700">
              ⚠️ {unassignedCount} unassigned
            </span>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="space-y-4">
        {filteredClasses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No classes found matching your filters.
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const primaryTeacher = getPrimaryTeacher(cls);
            const assistantTeachers = getAssistantTeachers(cls);
            const hasAssignedPrimary = !!primaryTeacher;
            const primaryKey = `${cls.id}-primary`;
            const assistantAddKey = `${cls.id}-assistant-add`;

            return (
              <div
                key={cls.id}
                className="bg-white rounded-lg shadow p-6 space-y-4"
              >
                {/* Class Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                      {hasAssignedPrimary ? (
                        <span className="text-green-600 text-xl" title="Primary teacher assigned">
                          ✓
                        </span>
                      ) : (
                        <span className="text-red-600 text-xl" title="No primary teacher">
                          ⚠️
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">{cls.gradeName || 'N/A'}</span>
                      <span className="mx-2">•</span>
                      <span>{cls.day}, {cls.time}</span>
                      <span className="mx-2">•</span>
                      <span>Capacity: {cls.enrolled}/{cls.capacity}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Teacher Assignment */}
                <div>
                  <label htmlFor={`primary-${cls.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Teacher <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id={`primary-${cls.id}`}
                      value={primaryTeacher?.teacherId || ''}
                      onChange={(e) => handleAssignPrimaryTeacher(cls.id, e.target.value)}
                      disabled={savingStates[primaryKey]}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select primary teacher...</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.uid} value={teacher.uid}>
                          {teacher.name || teacher.email}
                        </option>
                      ))}
                    </select>
                    {savingStates[primaryKey] && (
                      <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                  </div>
                  {errors[primaryKey] && (
                    <p className="mt-1 text-sm text-red-600">{errors[primaryKey]}</p>
                  )}
                </div>

                {/* Assistant Teachers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assistant Teachers (Optional)
                  </label>

                  {/* Current Assistant Teachers */}
                  {assistantTeachers.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {assistantTeachers.map((assistant) => {
                        const removeKey = `${cls.id}-${assistant.teacherId}-remove`;
                        return (
                          <div
                            key={assistant.teacherId}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                          >
                            <span className="text-sm text-gray-700">{assistant.teacherName}</span>
                            <button
                              onClick={() => handleRemoveTeacher(cls.id, assistant.teacherId)}
                              disabled={savingStates[removeKey]}
                              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              {savingStates[removeKey] ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Assistant Teacher */}
                  <div className="flex items-center gap-2">
                    <select
                      value=""
                      onChange={(e) => handleAssignAssistantTeacher(cls.id, e.target.value)}
                      disabled={savingStates[assistantAddKey]}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">+ Add assistant teacher...</option>
                      {teachers
                        .filter((t) => {
                          // Exclude primary teacher and already assigned assistants
                          if (primaryTeacher && t.uid === primaryTeacher.teacherId) return false;
                          if (assistantTeachers.some((a) => a.teacherId === t.uid)) return false;
                          return true;
                        })
                        .map((teacher) => (
                          <option key={teacher.uid} value={teacher.uid}>
                            {teacher.name || teacher.email}
                          </option>
                        ))}
                    </select>
                    {savingStates[assistantAddKey] && (
                      <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                  </div>
                  {errors[assistantAddKey] && (
                    <p className="mt-1 text-sm text-red-600">{errors[assistantAddKey]}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-700">
        <strong>Note:</strong> Each class must have one primary teacher and can have multiple assistant teachers.
        Changes are saved automatically when you make a selection.
      </div>
    </div>
  );
}
