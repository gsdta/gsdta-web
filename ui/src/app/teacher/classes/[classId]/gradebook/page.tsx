'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getGradebook,
  saveGrades,
  GradebookResponse,
  calculateLetterGrade,
} from '@/lib/assignment-api';
import { getTeacherClass, TeacherClass } from '@/lib/teacher-api';

interface EditingCell {
  studentId: string;
  assignmentId: string;
}

export default function GradebookPage() {
  const params = useParams();
  const classId = params.classId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classData, setClassData] = useState<TeacherClass | null>(null);
  const [gradebook, setGradebook] = useState<GradebookResponse | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingCell, setSavingCell] = useState<EditingCell | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [classInfo, gradebookData] = await Promise.all([
          getTeacherClass(classId),
          getGradebook(classId),
        ]);
        setClassData(classInfo);
        setGradebook(gradebookData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gradebook');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classId]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = (studentId: string, assignmentId: string, currentValue: number | null) => {
    setEditingCell({ studentId, assignmentId });
    setEditValue(currentValue !== null ? currentValue.toString() : '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell || !gradebook) return;

    const { studentId, assignmentId } = editingCell;
    const assignment = gradebook.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    const points = editValue === '' ? null : parseFloat(editValue);

    // Validate
    if (points !== null && (isNaN(points) || points < 0 || points > assignment.maxPoints)) {
      setError(`Points must be between 0 and ${assignment.maxPoints}`);
      return;
    }

    if (points === null) {
      // Can't "ungrade" through this interface - just cancel
      cancelEditing();
      return;
    }

    setSavingCell(editingCell);
    setError(null);

    try {
      await saveGrades(classId, assignmentId, [
        { studentId, pointsEarned: points },
      ]);

      // Update local state
      setGradebook((prev) => {
        if (!prev) return prev;

        const updatedStudents = prev.students.map((student) => {
          if (student.studentId !== studentId) return student;

          const percentage = (points / assignment.maxPoints) * 100;
          const updatedGrades = {
            ...student.grades,
            [assignmentId]: {
              id: `${assignmentId}-${studentId}`,
              assignmentId,
              assignmentTitle: assignment.title,
              classId,
              className: prev.className,
              studentId,
              studentName: student.studentName,
              pointsEarned: points,
              maxPoints: assignment.maxPoints,
              percentage,
              letterGrade: calculateLetterGrade(percentage),
              gradedBy: '',
              gradedByName: '',
              gradedAt: new Date().toISOString(),
            },
          };

          // Recalculate student average
          let totalPoints = 0;
          let totalMax = 0;
          for (const a of prev.assignments) {
            const grade = updatedGrades[a.id];
            if (grade) {
              totalPoints += grade.pointsEarned;
              totalMax += grade.maxPoints;
            }
          }

          return {
            ...student,
            grades: updatedGrades,
            totalPoints,
            maxPoints: totalMax,
            averagePercentage: totalMax > 0 ? (totalPoints / totalMax) * 100 : 0,
            letterGrade: totalMax > 0 ? calculateLetterGrade((totalPoints / totalMax) * 100) : '-',
          };
        });

        // Recalculate class average
        const studentsWithGrades = updatedStudents.filter((s) => s.maxPoints > 0);
        const classAverage = studentsWithGrades.length > 0
          ? studentsWithGrades.reduce((sum, s) => sum + s.averagePercentage, 0) / studentsWithGrades.length
          : 0;

        return {
          ...prev,
          students: updatedStudents,
          classAverage,
        };
      });

      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grade');
    } finally {
      setSavingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error && !gradebook) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <Link href={`/teacher/classes/${classId}`} className="text-green-600 hover:underline mt-2 inline-block">
          Back to Class
        </Link>
      </div>
    );
  }

  const hasAssignments = gradebook && gradebook.assignments.length > 0;
  const hasStudents = gradebook && gradebook.students.length > 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/teacher" className="hover:text-green-600">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/teacher/classes" className="hover:text-green-600">Classes</Link>
        <span className="mx-2">/</span>
        <Link href={`/teacher/classes/${classId}`} className="hover:text-green-600">
          {classData?.name || 'Class'}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Gradebook</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
          <p className="mt-1 text-gray-600">{classData?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/classes/${classId}/assignments`}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Assignments
          </Link>
          {gradebook && (
            <div className="px-4 py-2 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Class Average: </span>
              <span className="font-bold text-green-700">{gradebook.classAverage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Empty States */}
      {!hasAssignments && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No assignments yet. Create an assignment to start grading.</p>
          <Link
            href={`/teacher/classes/${classId}/assignments/new`}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Assignment
          </Link>
        </div>
      )}

      {hasAssignments && !hasStudents && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No students enrolled in this class yet.</p>
        </div>
      )}

      {/* Gradebook Table */}
      {hasAssignments && hasStudents && gradebook && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Student
                  </th>
                  {gradebook.assignments.map((assignment) => (
                    <th
                      key={assignment.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]"
                    >
                      <Link
                        href={`/teacher/classes/${classId}/assignments/${assignment.id}/grades`}
                        className="hover:text-green-600 block"
                      >
                        <div className="truncate max-w-[120px]" title={assignment.title}>
                          {assignment.title}
                        </div>
                        <div className="text-gray-400 font-normal normal-case">
                          {assignment.maxPoints} pts
                        </div>
                      </Link>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                    Average
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gradebook.students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                      <span className="font-medium text-gray-900">{student.studentName}</span>
                    </td>
                    {gradebook.assignments.map((assignment) => {
                      const grade = student.grades[assignment.id];
                      const isEditing = editingCell?.studentId === student.studentId && editingCell?.assignmentId === assignment.id;
                      const isSaving = savingCell?.studentId === student.studentId && savingCell?.assignmentId === assignment.id;

                      return (
                        <td
                          key={assignment.id}
                          className="px-4 py-3 whitespace-nowrap text-center"
                        >
                          {isEditing ? (
                            <div className="flex items-center justify-center">
                              <input
                                ref={inputRef}
                                type="number"
                                min={0}
                                max={assignment.maxPoints}
                                step="0.5"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={handleKeyDown}
                                className="w-16 px-2 py-1 border border-green-500 rounded text-center text-sm focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          ) : isSaving ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(student.studentId, assignment.id, grade?.pointsEarned ?? null)}
                              className={`px-2 py-1 rounded text-sm hover:bg-gray-100 transition-colors min-w-[60px] ${
                                grade ? 'text-gray-900' : 'text-gray-400'
                              }`}
                            >
                              {grade ? (
                                <span>
                                  {grade.pointsEarned}/{assignment.maxPoints}
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 whitespace-nowrap text-center bg-gray-50">
                      <span className="font-medium text-gray-900">
                        {student.maxPoints > 0 ? `${student.averagePercentage.toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center bg-gray-50">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        student.letterGrade === 'A' ? 'bg-green-100 text-green-700' :
                        student.letterGrade === 'B' ? 'bg-blue-100 text-blue-700' :
                        student.letterGrade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                        student.letterGrade === 'D' ? 'bg-orange-100 text-orange-700' :
                        student.letterGrade === 'F' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {student.letterGrade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Click on any cell to edit grade directly. Press Enter to save, Escape to cancel.
          </div>
        </div>
      )}
    </div>
  );
}
