'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { adminGetVolunteers, adminCreateVolunteer, adminUpdateVolunteer, adminDeleteVolunteer } from '@/lib/volunteer-api';
import type { Volunteer, VolunteerStatus, VolunteerType, CreateVolunteerInput } from '@/lib/volunteer-types';
import { VOLUNTEER_TYPES, GRADE_LEVELS, DAYS_OF_WEEK, CURRENT_ACADEMIC_YEAR } from '@/lib/volunteer-types';

export default function AdminVolunteersPage() {
  const { getIdToken } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus | 'all'>('active');
  const [typeFilter, setTypeFilter] = useState<VolunteerType | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateVolunteerInput>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    type: 'high_school',
    school: '',
    gradeLevel: '',
    academicYear: CURRENT_ACADEMIC_YEAR,
    availableDays: [],
    notes: '',
  });

  const fetchVolunteers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminGetVolunteers(getIdToken, {
        status: statusFilter,
        type: typeFilter || undefined,
        search: searchTerm || undefined,
      });
      setVolunteers(result.volunteers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch volunteers');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter, typeFilter, searchTerm]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      await adminCreateVolunteer(getIdToken, createForm);
      setShowCreateModal(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        type: 'high_school',
        school: '',
        gradeLevel: '',
        academicYear: CURRENT_ACADEMIC_YEAR,
        availableDays: [],
        notes: '',
      });
      fetchVolunteers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create volunteer');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (volunteer: Volunteer) => {
    try {
      const newStatus: VolunteerStatus = volunteer.status === 'active' ? 'inactive' : 'active';
      await adminUpdateVolunteer(getIdToken, volunteer.id, { status: newStatus });
      fetchVolunteers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update volunteer');
    }
  };

  const handleDelete = async (volunteer: Volunteer) => {
    if (!confirm(`Are you sure you want to remove ${volunteer.firstName} ${volunteer.lastName}?`)) return;
    try {
      await adminDeleteVolunteer(getIdToken, volunteer.id);
      fetchVolunteers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete volunteer');
    }
  };

  const handleDayToggle = (day: string) => {
    const currentDays = createForm.availableDays || [];
    if (currentDays.includes(day)) {
      setCreateForm({ ...createForm, availableDays: currentDays.filter((d) => d !== day) });
    } else {
      setCreateForm({ ...createForm, availableDays: [...currentDays, day] });
    }
  };

  const statusConfig = {
    active: { label: 'Active', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    inactive: { label: 'Inactive', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  };

  const typeConfig = {
    high_school: { label: 'HS', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    parent: { label: 'Parent', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    community: { label: 'Community', bgColor: 'bg-teal-100', textColor: 'text-teal-800' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volunteers</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage high school and parent volunteers
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add Volunteer
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VolunteerStatus | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as VolunteerType | '')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">All Types</option>
            {VOLUNTEER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
        <button
          onClick={fetchVolunteers}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {/* Volunteers Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : volunteers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No volunteers found.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Add your first volunteer
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School/Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {volunteers.map((volunteer) => (
                <tr key={volunteer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {volunteer.firstName} {volunteer.lastName}
                    </div>
                    {volunteer.classAssignments.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {volunteer.classAssignments.length} class(es)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeConfig[volunteer.type].bgColor} ${typeConfig[volunteer.type].textColor}`}
                    >
                      {typeConfig[volunteer.type].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{volunteer.email || '-'}</div>
                    <div>{volunteer.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {volunteer.type === 'high_school' ? (
                      <>
                        <div>{volunteer.school || '-'}</div>
                        <div>{volunteer.gradeLevel || '-'}</div>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {volunteer.totalHours || 0} hrs
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig[volunteer.status].bgColor} ${statusConfig[volunteer.status].textColor}`}
                    >
                      {statusConfig[volunteer.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleToggleStatus(volunteer)}
                      className={
                        volunteer.status === 'active'
                          ? 'text-yellow-600 hover:text-yellow-900 mr-3'
                          : 'text-green-600 hover:text-green-900 mr-3'
                      }
                    >
                      {volunteer.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(volunteer)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Volunteer</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volunteer Type *</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as VolunteerType })}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {VOLUNTEER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.email || ''}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value || undefined })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={createForm.phone || ''}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value || undefined })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              {createForm.type === 'high_school' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">High School</label>
                      <input
                        type="text"
                        value={createForm.school || ''}
                        onChange={(e) => setCreateForm({ ...createForm, school: e.target.value || undefined })}
                        placeholder="e.g., Poway High School"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                      <select
                        value={createForm.gradeLevel || ''}
                        onChange={(e) => setCreateForm({ ...createForm, gradeLevel: e.target.value || undefined })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select Grade</option>
                        {GRADE_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available Days</label>
                <div className="flex gap-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <label key={day} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={createForm.availableDays?.includes(day) || false}
                        onChange={() => handleDayToggle(day)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={createForm.notes || ''}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value || undefined })}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {creating ? 'Creating...' : 'Add Volunteer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">About Volunteers</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>High school volunteers (HV) help with classroom activities</li>
          <li>Track community service hours for high school students</li>
          <li>Parent volunteers can assist with multiple classes</li>
          <li>Volunteers can be assigned to classes from the teacher assignments page</li>
        </ul>
      </div>
    </div>
  );
}
