'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getAssignments,
  Assignment,
  AssignmentStatus,
  ASSIGNMENT_TYPE_LABELS,
  ASSIGNMENT_STATUS_CONFIG,
  formatDate,
} from '@/lib/assignment-api';
import { getTeacherClass, TeacherClass } from '@/lib/teacher-api';

export default function AssignmentsListPage() {
  const params = useParams();
  const classId = params.classId as string;

  const [classData, setClassData] = useState<TeacherClass | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [classInfo, assignmentsList] = await Promise.all([
          getTeacherClass(classId),
          getAssignments(classId),
        ]);
        setClassData(classInfo);
        setAssignments(assignmentsList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classId]);

  const filteredAssignments = assignments.filter(
    (a) => statusFilter === 'all' || a.status === statusFilter
  );

  const statusCounts = {
    all: assignments.length,
    draft: assignments.filter((a) => a.status === 'draft').length,
    published: assignments.filter((a) => a.status === 'published').length,
    closed: assignments.filter((a) => a.status === 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
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
        <Link href={`/teacher/classes/${classId}`} className="hover:text-green-600">
          {classData?.name || 'Class'}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Assignments</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="mt-1 text-gray-600">{classData?.name}</p>
        </div>
        <Link
          href={`/teacher/classes/${classId}/assignments/new`}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Assignment
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['all', 'draft', 'published', 'closed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === status
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {status === 'all' ? 'All' : ASSIGNMENT_STATUS_CONFIG[status].label}
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100">
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Assignments List */}
        <div className="divide-y divide-gray-200">
          {filteredAssignments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {statusFilter === 'all'
                ? 'No assignments yet. Create your first assignment!'
                : `No ${statusFilter} assignments.`}
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <div key={assignment.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teacher/classes/${classId}/assignments/${assignment.id}`}
                        className="text-lg font-medium text-gray-900 hover:text-green-600"
                      >
                        {assignment.title}
                      </Link>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          ASSIGNMENT_STATUS_CONFIG[assignment.status].bgColor
                        } ${ASSIGNMENT_STATUS_CONFIG[assignment.status].color}`}
                      >
                        {ASSIGNMENT_STATUS_CONFIG[assignment.status].label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {ASSIGNMENT_TYPE_LABELS[assignment.type]}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {assignment.maxPoints} pts
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Due: {formatDate(assignment.dueDate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {assignment.status === 'published' && (
                      <Link
                        href={`/teacher/classes/${classId}/assignments/${assignment.id}/grades`}
                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Grade
                      </Link>
                    )}
                    <Link
                      href={`/teacher/classes/${classId}/assignments/${assignment.id}/edit`}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
