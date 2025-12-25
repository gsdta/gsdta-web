'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
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

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  status: 'active' | 'inactive';
}

export default function TeacherEditPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = use(params);
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    status: 'active',
  });

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
          setFormData({
            firstName: data.data.teacher.firstName || '',
            lastName: data.data.teacher.lastName || '',
            phone: data.data.teacher.phone || '',
            status: (data.data.teacher.status as 'active' | 'inactive') || 'active',
          });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Build update payload - compute name from firstName/lastName
      const updatePayload: Record<string, string> = {};

      if (formData.firstName !== (teacher?.firstName || '')) {
        updatePayload.firstName = formData.firstName;
      }
      if (formData.lastName !== (teacher?.lastName || '')) {
        updatePayload.lastName = formData.lastName;
      }
      if (formData.phone !== (teacher?.phone || '')) {
        updatePayload.phone = formData.phone;
      }
      if (formData.status !== teacher?.status) {
        updatePayload.status = formData.status;
      }

      // Also update computed name if firstName or lastName changed
      if (updatePayload.firstName !== undefined || updatePayload.lastName !== undefined) {
        const newFirstName = updatePayload.firstName ?? formData.firstName;
        const newLastName = updatePayload.lastName ?? formData.lastName;
        updatePayload.name = `${newFirstName} ${newLastName}`.trim();
      }

      if (Object.keys(updatePayload).length === 0) {
        setSuccessMessage('No changes to save');
        return;
      }

      const data = await apiFetch<TeacherResponse>(`/v1/admin/teachers/${uid}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });

      if (data.success) {
        setTeacher(data.data.teacher);
        setSuccessMessage('Teacher updated successfully');
        // Redirect back to view page after short delay
        setTimeout(() => {
          router.push(`/admin/users/teachers/${uid}`);
        }, 1500);
      } else {
        throw new Error('Failed to update teacher');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading teacher details...</span>
      </div>
    );
  }

  if (!teacher) {
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href={`/admin/users/teachers/${uid}`}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Teacher Details
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Teacher</h1>
        <p className="text-sm text-gray-600 mt-1">
          Editing: {teacher.name || teacher.email}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter first name"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={teacher.email}
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link
            href={`/admin/users/teachers/${uid}`}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
