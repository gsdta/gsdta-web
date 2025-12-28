'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

interface Teacher {
  uid: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: string;
  phone: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface TeacherResponse {
  success: boolean;
  data: {
    teacher: Teacher;
  };
}

export default function TeacherViewPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = use(params);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeacher() {
      try {
        setLoading(true);
        setError(null);

        const data = await apiFetch<TeacherResponse>(`/v1/admin/teachers/${uid}`, {
          method: 'GET',
        });

        if (data.success) {
          setTeacher(data.data.teacher);
        } else {
          throw new Error('Failed to load teacher');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTeacher();
  }, [uid]);

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading teacher details...</span>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/users/teachers/list"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Teachers
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error || 'Teacher not found'}
        </div>
      </div>
    );
  }

  const statusConfig = {
    active: { label: 'Active', bgColor: 'bg-green-100', color: 'text-green-800' },
    inactive: { label: 'Inactive', bgColor: 'bg-gray-100', color: 'text-gray-800' },
  };

  const status = statusConfig[teacher.status as keyof typeof statusConfig] || statusConfig.inactive;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/users/teachers/list"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Teachers
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-2xl">
                {(teacher.firstName || teacher.name || teacher.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {teacher.name || teacher.email.split('@')[0]}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${status.bgColor} ${status.color}`}
                >
                  {status.label}
                </span>
                {teacher.roles.map((role) => (
                  <span
                    key={role}
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <Link
          href={`/admin/users/teachers/${uid}/edit`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Edit Teacher
        </Link>
      </div>

      {/* Teacher Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Teacher Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="text-sm text-gray-900">
                {teacher.name || `${teacher.firstName} ${teacher.lastName}`.trim() || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">First Name</dt>
              <dd className="text-sm text-gray-900">{teacher.firstName || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Last Name</dt>
              <dd className="text-sm text-gray-900">{teacher.lastName || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-sm text-gray-900">
                <a href={`mailto:${teacher.email}`} className="text-blue-600 hover:underline">
                  {teacher.email}
                </a>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900">
                {teacher.phone ? (
                  <a href={`tel:${teacher.phone}`} className="text-blue-600 hover:underline">
                    {teacher.phone}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
                >
                  {status.label}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Roles</dt>
              <dd className="text-sm text-gray-900">
                {teacher.roles.length > 0 ? teacher.roles.join(', ') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="text-sm text-gray-500 font-mono text-xs">
                {teacher.uid}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{formatDateTime(teacher.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="text-sm text-gray-900">{formatDateTime(teacher.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
