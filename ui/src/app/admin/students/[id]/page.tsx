'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudent, adminAdmitStudent, adminAssignClass } from '@/lib/student-api';
import { adminGetClassOptions, type ClassOption } from '@/lib/class-api';
import { statusConfig, type Student } from '@/lib/student-types';

export default function AdminStudentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(
    searchParams.get('action') === 'assign'
  );
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [studentData, classOptions] = await Promise.all([
          adminGetStudent(getIdToken, id),
          adminGetClassOptions(getIdToken),
        ]);
        setStudent(studentData);
        setClasses(classOptions);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load student details');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, getIdToken]);

  const handleAdmit = async () => {
    if (!student || !confirm('Are you sure you want to admit this student?')) return;

    setActionLoading(true);
    try {
      const updated = await adminAdmitStudent(getIdToken, student.id);
      setStudent(updated);
    } catch (err) {
      console.error('Failed to admit student:', err);
      alert('Failed to admit student');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignClass = async () => {
    if (!student || !selectedClassId) return;

    setActionLoading(true);
    try {
      const updated = await adminAssignClass(getIdToken, student.id, selectedClassId);
      setStudent(updated);
      setShowAssignModal(false);
      setSelectedClassId('');
    } catch (err) {
      console.error('Failed to assign class:', err);
      alert(err instanceof Error ? err.message : 'Failed to assign class');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading student details...</div>
      </div>
    );
  }

  if (error || !student) {
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

  const status = statusConfig[student.status] || statusConfig.pending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/students"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Students
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-2xl">
                {student.firstName.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${status.bgColor} ${status.color}`}
                >
                  {status.label}
                </span>
                {student.gender && (
                  <span className="text-sm text-gray-500">
                    {student.gender}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {student.status === 'pending' && (
            <button
              onClick={handleAdmit}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400"
            >
              {actionLoading ? 'Admitting...' : 'Admit Student'}
            </button>
          )}
          {(student.status === 'admitted' || student.status === 'active') && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              {student.classId ? 'Change Class' : 'Assign Class'}
            </button>
          )}
        </div>
      </div>

      {/* Student Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="text-sm text-gray-900">
                {student.firstName} {student.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
              <dd className="text-sm text-gray-900">{formatDate(student.dateOfBirth)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Gender</dt>
              <dd className="text-sm text-gray-900">{student.gender || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Public School Grade</dt>
              <dd className="text-sm text-gray-900">{student.grade || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">School</dt>
              <dd className="text-sm text-gray-900">{student.schoolName || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">School District</dt>
              <dd className="text-sm text-gray-900">{student.schoolDistrict || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Prior Tamil Level</dt>
              <dd className="text-sm text-gray-900">{student.priorTamilLevel || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Photo Consent</dt>
              <dd className="text-sm text-gray-900">{student.photoConsent ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </div>

        {/* Enrollment Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Information</h2>
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
              <dt className="text-sm font-medium text-gray-500">Assigned Class</dt>
              <dd className="text-sm text-gray-900">
                {student.className || (
                  <span className="text-gray-400">Not assigned</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Enrolling Grade</dt>
              <dd className="text-sm text-gray-900">
                {student.enrollingGrade || (
                  <span className="text-gray-400">Not set</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Registered</dt>
              <dd className="text-sm text-gray-900">{formatDateTime(student.createdAt)}</dd>
            </div>
            {student.admittedAt && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Admitted</dt>
                <dd className="text-sm text-gray-900">{formatDateTime(student.admittedAt)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="text-sm text-gray-900">{formatDateTime(student.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Home Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Home Address</h2>
          {student.address && (student.address.street || student.address.city || student.address.zipCode) ? (
            <div className="text-sm text-gray-900">
              {student.address.street && <p>{student.address.street}</p>}
              {(student.address.city || student.address.zipCode) && (
                <p>
                  {student.address.city}{student.address.city && student.address.zipCode && ', '}
                  {student.address.zipCode}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No address provided</p>
          )}
        </div>

        {/* Medical Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Notes</h2>
          {student.medicalNotes ? (
            <p className="text-sm text-gray-900">{student.medicalNotes}</p>
          ) : (
            <p className="text-sm text-gray-400">No medical notes provided</p>
          )}
        </div>

        {/* Mother's Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mother&apos;s Contact</h2>
          {student.contacts?.mother && (student.contacts.mother.name || student.contacts.mother.email || student.contacts.mother.phone) ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{student.contacts.mother.name || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">
                  {student.contacts.mother.email ? (
                    <a href={`mailto:${student.contacts.mother.email}`} className="text-blue-600 hover:underline">
                      {student.contacts.mother.email}
                    </a>
                  ) : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">
                  {student.contacts.mother.phone ? (
                    <a href={`tel:${student.contacts.mother.phone}`} className="text-blue-600 hover:underline">
                      {student.contacts.mother.phone}
                    </a>
                  ) : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Employer</dt>
                <dd className="text-sm text-gray-900">{student.contacts.mother.employer || '-'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-400">No contact information provided</p>
          )}
        </div>

        {/* Father's Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Father&apos;s Contact</h2>
          {student.contacts?.father && (student.contacts.father.name || student.contacts.father.email || student.contacts.father.phone) ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{student.contacts.father.name || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">
                  {student.contacts.father.email ? (
                    <a href={`mailto:${student.contacts.father.email}`} className="text-blue-600 hover:underline">
                      {student.contacts.father.email}
                    </a>
                  ) : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">
                  {student.contacts.father.phone ? (
                    <a href={`tel:${student.contacts.father.phone}`} className="text-blue-600 hover:underline">
                      {student.contacts.father.phone}
                    </a>
                  ) : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Employer</dt>
                <dd className="text-sm text-gray-900">{student.contacts.father.employer || '-'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-400">No contact information provided</p>
          )}
        </div>

        {/* Legacy Parent Info (for backwards compatibility) */}
        {student.parentEmail && !student.contacts && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Parent Contact</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">
                  <a
                    href={`mailto:${student.parentEmail}`}
                    className="text-blue-600 hover:underline"
                  >
                    {student.parentEmail}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Parent ID</dt>
                <dd className="text-sm text-gray-500 font-mono text-xs">
                  {student.parentId || '-'}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Assign Class Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Class to {student.firstName}
            </h3>

            {classes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No classes available.</p>
                <Link
                  href="/admin/classes/create"
                  className="text-blue-600 hover:underline"
                >
                  Create a class first
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select a Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a class...</option>
                    {classes.map((cls) => (
                      <option
                        key={cls.id}
                        value={cls.id}
                        disabled={cls.available <= 0}
                      >
                        {cls.name} - {cls.day} {cls.time} ({cls.enrolled}/{cls.capacity} students)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClassId && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    {(() => {
                      const selected = classes.find((c) => c.id === selectedClassId);
                      if (!selected) return null;
                      return (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{selected.name}</p>
                          <p className="text-gray-600">
                            {selected.gradeName || 'Grade not set'} - {selected.day} {selected.time}
                          </p>
                          <p className="text-gray-600">
                            {selected.enrolled}/{selected.capacity} students ({selected.available} spots available)
                          </p>
                          {selected.room && (
                            <p className="text-gray-600">Room: {selected.room}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedClassId('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignClass}
                    disabled={!selectedClassId || actionLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400"
                  >
                    {actionLoading ? 'Assigning...' : 'Assign Class'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
