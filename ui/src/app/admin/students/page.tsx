'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudents, adminAdmitStudent } from '@/lib/student-api';
import { statusConfig, type Student, type StudentStatus, type StudentStatusCounts } from '@/lib/student-types';
import { TableRowActionMenu, useTableRowActions, type TableAction } from '@/components/TableRowActionMenu';

type StatusFilter = StudentStatus | 'all';

export default function AdminStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [counts, setCounts] = useState<StudentStatusCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'all'
  );
  const [admittingId, setAdmittingId] = useState<string | null>(null);
  const { selectedItem, menuPosition, handleRowClick, closeMenu, isMenuOpen } = useTableRowActions<Student>();

  const handleAdmit = async (studentId: string) => {
    if (!confirm('Are you sure you want to admit this student?')) return;

    setAdmittingId(studentId);
    try {
      await adminAdmitStudent(getIdToken, studentId);
      // Refresh the list
      fetchStudents();
    } catch (err) {
      console.error('Failed to admit student:', err);
      alert('Failed to admit student');
    } finally {
      setAdmittingId(null);
    }
  };

  const getStudentActions = (student: Student): TableAction[] => [
    { label: 'View Details', onClick: () => router.push(`/admin/students/${student.id}`) },
    { label: 'Edit', onClick: () => router.push(`/admin/students/${student.id}/edit`) },
    {
      label: admittingId === student.id ? 'Admitting...' : 'Admit',
      onClick: () => handleAdmit(student.id),
      variant: 'success',
      hidden: student.status !== 'pending',
      disabled: admittingId === student.id,
    },
    {
      label: 'Assign Class',
      onClick: () => router.push(`/admin/students/${student.id}?action=assign`),
      hidden: student.status !== 'admitted',
    },
  ];

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminGetStudents(getIdToken, {
        status: statusFilter,
        search: searchQuery || undefined,
      });
      setStudents(result.students);
      if (result.counts) {
        setCounts(result.counts);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter, searchQuery]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    // Update URL without reloading
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    router.push(`/admin/students${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="mt-1 text-gray-600">
          Manage student registrations, admissions, and class assignments.
        </p>
      </div>

      {/* Stats Cards */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div
            onClick={() => handleStatusFilterChange('all')}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
              statusFilter === 'all' ? 'border-gray-500 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">
              {counts.pending + counts.admitted + counts.active + counts.inactive + counts.withdrawn}
            </p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div
            onClick={() => handleStatusFilterChange('pending')}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
              statusFilter === 'pending' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'
            }`}
          >
            <p className="text-2xl font-bold text-yellow-600">{counts.pending}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <div
            onClick={() => handleStatusFilterChange('admitted')}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
              statusFilter === 'admitted' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <p className="text-2xl font-bold text-blue-600">{counts.admitted}</p>
            <p className="text-sm text-gray-500">Admitted</p>
          </div>
          <div
            onClick={() => handleStatusFilterChange('active')}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
              statusFilter === 'active' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <p className="text-2xl font-bold text-green-600">{counts.active}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <div
            onClick={() => handleStatusFilterChange('inactive')}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
              statusFilter === 'inactive' ? 'border-gray-500 bg-gray-100' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <p className="text-2xl font-bold text-gray-600">{counts.inactive + counts.withdrawn}</p>
            <p className="text-sm text-gray-500">Inactive</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or parent email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="admitted">Admitted</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
            <button
              onClick={() => fetchStudents()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading students...</div>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-gray-500 mb-2">No students found</div>
            {statusFilter !== 'all' && (
              <button
                onClick={() => handleStatusFilterChange('all')}
                className="text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => {
                  const status = statusConfig[student.status] || statusConfig.pending;
                  return (
                    <tr
                      key={student.id}
                      onClick={(e) => handleRowClick(e, student)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => e.key === 'Enter' && handleRowClick(e as unknown as React.MouseEvent, student)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-medium">
                              {student.firstName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </div>
                            {student.dateOfBirth && (
                              <div className="text-sm text-gray-500">
                                DOB: {formatDate(student.dateOfBirth)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.parentEmail || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {student.className || (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(student.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Menu */}
      {isMenuOpen && selectedItem && menuPosition && (
        <TableRowActionMenu
          actions={getStudentActions(selectedItem)}
          position={menuPosition}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
