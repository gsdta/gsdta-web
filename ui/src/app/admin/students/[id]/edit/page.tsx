'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudent, adminUpdateStudent } from '@/lib/student-api';
import { type Student, type StudentStatus, statusConfig, tamilLevelOptions, genderOptions } from '@/lib/student-types';

interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  grade: string;
  schoolName: string;
  schoolDistrict: string;
  priorTamilLevel: string;
  medicalNotes: string;
  photoConsent: boolean;
  status: StudentStatus;
  notes: string;
}

export default function StudentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    grade: '',
    schoolName: '',
    schoolDistrict: '',
    priorTamilLevel: '',
    medicalNotes: '',
    photoConsent: false,
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    async function fetchStudent() {
      try {
        setLoading(true);
        setError(null);

        const studentData = await adminGetStudent(getIdToken, id);
        setStudent(studentData);
        setFormData({
          firstName: studentData.firstName || '',
          lastName: studentData.lastName || '',
          dateOfBirth: studentData.dateOfBirth || '',
          gender: studentData.gender || '',
          grade: studentData.grade || '',
          schoolName: studentData.schoolName || '',
          schoolDistrict: studentData.schoolDistrict || '',
          priorTamilLevel: studentData.priorTamilLevel || '',
          medicalNotes: studentData.medicalNotes || '',
          photoConsent: studentData.photoConsent || false,
          status: studentData.status || 'pending',
          notes: studentData.notes || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStudent();
  }, [id, getIdToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Build update payload - only include changed fields
      const updatePayload: Record<string, unknown> = {};

      if (formData.firstName !== (student?.firstName || '')) {
        updatePayload.firstName = formData.firstName;
      }
      if (formData.lastName !== (student?.lastName || '')) {
        updatePayload.lastName = formData.lastName;
      }
      if (formData.dateOfBirth !== (student?.dateOfBirth || '')) {
        updatePayload.dateOfBirth = formData.dateOfBirth;
      }
      if (formData.grade !== (student?.grade || '')) {
        updatePayload.grade = formData.grade;
      }
      if (formData.schoolName !== (student?.schoolName || '')) {
        updatePayload.schoolName = formData.schoolName;
      }
      if (formData.priorTamilLevel !== (student?.priorTamilLevel || '')) {
        updatePayload.priorTamilLevel = formData.priorTamilLevel;
      }
      if (formData.medicalNotes !== (student?.medicalNotes || '')) {
        updatePayload.medicalNotes = formData.medicalNotes;
      }
      if (formData.photoConsent !== (student?.photoConsent ?? false)) {
        updatePayload.photoConsent = formData.photoConsent;
      }
      if (formData.status !== student?.status) {
        updatePayload.status = formData.status;
      }
      if (formData.notes !== (student?.notes || '')) {
        updatePayload.notes = formData.notes;
      }

      if (Object.keys(updatePayload).length === 0) {
        setSuccessMessage('No changes to save');
        return;
      }

      const updatedStudent = await adminUpdateStudent(getIdToken, id, updatePayload);
      setStudent(updatedStudent);
      setSuccessMessage('Student updated successfully');
      // Redirect back to view page after short delay
      setTimeout(() => {
        router.push(`/admin/students/${id}`);
      }, 1500);
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
        <span className="ml-3 text-gray-600">Loading student details...</span>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/students"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Students
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error || 'Student not found'}
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[student.status] || statusConfig.pending;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href={`/admin/students/${id}`}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Student Details
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-gray-600">
            Editing: {student.firstName} {student.lastName}
          </p>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${currentStatus.bgColor} ${currentStatus.color}`}
          >
            {currentStatus.label}
          </span>
        </div>
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
        {/* Basic Info */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* School Info */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">School Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                Public School Grade
              </label>
              <input
                type="text"
                id="grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 3rd Grade"
              />
            </div>

            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
                School Name
              </label>
              <input
                type="text"
                id="schoolName"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter school name"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="priorTamilLevel" className="block text-sm font-medium text-gray-700 mb-2">
              Prior Tamil Level
            </label>
            <select
              id="priorTamilLevel"
              value={formData.priorTamilLevel}
              onChange={(e) => setFormData({ ...formData, priorTamilLevel: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {tamilLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Medical & Consent */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Medical & Consent</h2>
          <div>
            <label htmlFor="medicalNotes" className="block text-sm font-medium text-gray-700 mb-2">
              Medical Notes
            </label>
            <textarea
              id="medicalNotes"
              value={formData.medicalNotes}
              onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any medical notes or allergies"
            />
          </div>

          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="photoConsent"
              checked={formData.photoConsent}
              onChange={(e) => setFormData({ ...formData, photoConsent: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="photoConsent" className="ml-2 block text-sm text-gray-700">
              Photo Consent (Allow photos to be taken and shared)
            </label>
          </div>
        </div>

        {/* Status & Notes */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Status & Admin Notes</h2>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending Review</option>
              <option value="admitted">Admitted</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Internal notes about the student"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link
            href={`/admin/students/${id}`}
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
