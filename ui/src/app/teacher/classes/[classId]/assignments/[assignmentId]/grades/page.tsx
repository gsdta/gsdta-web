'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getAssignment,
  getAssignmentGrades,
  saveGrades,
  Assignment,
  GradeInput,
  calculateLetterGrade,
  formatDate,
} from '@/lib/assignment-api';
import { getClassRoster } from '@/lib/teacher-api';

interface GradeEntry {
  studentId: string;
  studentName: string;
  pointsEarned: string;
  feedback: string;
  percentage: number;
  letterGrade: string;
  existingGradeId?: string;
}

export default function GradeEntryPage() {
  const params = useParams();
  const classId = params.classId as string;
  const assignmentId = params.assignmentId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [stats, setStats] = useState({
    gradedCount: 0,
    totalStudents: 0,
    averagePercentage: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [assignmentData, rosterData, gradesData] = await Promise.all([
          getAssignment(classId, assignmentId),
          getClassRoster(classId),
          getAssignmentGrades(classId, assignmentId),
        ]);

        setAssignment(assignmentData);

        // Build grade entries from roster
        const gradeMap = new Map(
          gradesData.grades.map((g) => [g.studentId, g])
        );

        const entries: GradeEntry[] = rosterData.students.map((student) => {
          const existingGrade = gradeMap.get(student.id);
          const pointsEarned = existingGrade?.pointsEarned?.toString() || '';
          const points = pointsEarned ? parseFloat(pointsEarned) : 0;
          const percentage = pointsEarned ? (points / assignmentData.maxPoints) * 100 : 0;

          return {
            studentId: student.id,
            studentName: student.name,
            pointsEarned,
            feedback: existingGrade?.feedback || '',
            percentage,
            letterGrade: pointsEarned ? calculateLetterGrade(percentage) : '-',
            existingGradeId: existingGrade?.id,
          };
        });

        // Sort by student name
        entries.sort((a, b) => a.studentName.localeCompare(b.studentName));
        setGrades(entries);

        // Calculate stats
        const gradedEntries = entries.filter((e) => e.pointsEarned !== '');
        const avgPercentage = gradedEntries.length > 0
          ? gradedEntries.reduce((sum, e) => sum + e.percentage, 0) / gradedEntries.length
          : 0;

        setStats({
          gradedCount: gradedEntries.length,
          totalStudents: entries.length,
          averagePercentage: avgPercentage,
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classId, assignmentId]);

  const updateGrade = (index: number, field: 'pointsEarned' | 'feedback', value: string) => {
    setGrades((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Recalculate percentage and letter grade
      if (field === 'pointsEarned' && assignment) {
        const points = value ? parseFloat(value) : 0;
        const percentage = value ? (points / assignment.maxPoints) * 100 : 0;
        updated[index].percentage = percentage;
        updated[index].letterGrade = value ? calculateLetterGrade(percentage) : '-';
      }

      return updated;
    });
  };

  const handleSave = async () => {
    if (!assignment) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Only save entries that have points entered
      const gradesToSave: GradeInput[] = grades
        .filter((g) => g.pointsEarned !== '')
        .map((g) => ({
          studentId: g.studentId,
          pointsEarned: parseFloat(g.pointsEarned),
          feedback: g.feedback || undefined,
        }));

      if (gradesToSave.length === 0) {
        setError('No grades to save. Enter at least one grade.');
        setSaving(false);
        return;
      }

      // Validate grades
      for (const grade of gradesToSave) {
        if (grade.pointsEarned < 0 || grade.pointsEarned > assignment.maxPoints) {
          setError(`Points must be between 0 and ${assignment.maxPoints}`);
          setSaving(false);
          return;
        }
      }

      const result = await saveGrades(classId, assignmentId, gradesToSave);
      setSuccess(`${result.count} grade(s) saved successfully`);

      // Update stats
      const gradedEntries = grades.filter((e) => e.pointsEarned !== '');
      const avgPercentage = gradedEntries.length > 0
        ? gradedEntries.reduce((sum, e) => sum + e.percentage, 0) / gradedEntries.length
        : 0;

      setStats({
        gradedCount: gradedEntries.length,
        totalStudents: grades.length,
        averagePercentage: avgPercentage,
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <Link href={`/teacher/classes/${classId}/assignments`} className="text-green-600 hover:underline mt-2 inline-block">
          Back to Assignments
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
        <Link href={`/teacher/classes/${classId}`} className="hover:text-green-600">Class</Link>
        <span className="mx-2">/</span>
        <Link href={`/teacher/classes/${classId}/assignments`} className="hover:text-green-600">Assignments</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Grade</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assignment?.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>Max Points: <strong>{assignment?.maxPoints}</strong></span>
              <span>Due: <strong>{assignment ? formatDate(assignment.dueDate) : ''}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.gradedCount}/{stats.totalStudents}</div>
              <div className="text-xs text-gray-500">Graded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.averagePercentage.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">Class Average</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Grade Entry Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Points
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  %
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Grade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grades.map((grade, index) => (
                <tr key={grade.studentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{grade.studentName}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={assignment?.maxPoints || 100}
                        step="0.5"
                        value={grade.pointsEarned}
                        onChange={(e) => updateGrade(index, 'pointsEarned', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        placeholder="-"
                      />
                      <span className="text-gray-400 text-sm">/ {assignment?.maxPoints}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {grade.pointsEarned ? `${grade.percentage.toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      grade.letterGrade === 'A' ? 'bg-green-100 text-green-700' :
                      grade.letterGrade === 'B' ? 'bg-blue-100 text-blue-700' :
                      grade.letterGrade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                      grade.letterGrade === 'D' ? 'bg-orange-100 text-orange-700' :
                      grade.letterGrade === 'F' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {grade.letterGrade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={grade.feedback}
                      onChange={(e) => updateGrade(index, 'feedback', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Optional feedback..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Save Button */}
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <Link
            href={`/teacher/classes/${classId}/assignments`}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Assignments
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save All Grades'}
          </button>
        </div>
      </div>
    </div>
  );
}
