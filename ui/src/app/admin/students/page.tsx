'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudents, adminAdmitStudent, adminTransferClass, adminUnassignClass, type AdminStudentsListParams } from '@/lib/student-api';
import { adminGetClassOptions, type ClassOption } from '@/lib/class-api';
import { statusConfig, type Student, type StudentStatus, type StudentStatusCounts } from '@/lib/student-types';
import { TableRowActionMenu, useTableRowActions, type TableAction } from '@/components/TableRowActionMenu';
import { AdvancedSearchPanel } from './AdvancedSearchPanel';

type StatusFilter = StudentStatus | 'all';

export default function AdminStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [counts, setCounts] = useState<StudentStatusCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'all'
  );
  const [admittingId, setAdmittingId] = useState<string | null>(null);
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const { selectedItem, menuPosition, handleRowClick, closeMenu, isMenuOpen } = useTableRowActions<Student>();

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<AdminStudentsListParams>({
    enrollingGrade: searchParams.get('enrollingGrade') || undefined,
    schoolDistrict: searchParams.get('schoolDistrict') || undefined,
    unassigned: searchParams.get('unassigned') === 'true' || undefined,
    dateField: (searchParams.get('dateField') as 'createdAt' | 'admittedAt') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

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

  const openTransferModal = async (student: Student) => {
    setTransferringStudent(student);
    setSelectedClassId('');
    setTransferError(null);
    try {
      const classes = await adminGetClassOptions(getIdToken);
      // Filter out the student's current class
      setClassOptions(classes.filter(c => c.id !== student.classId && c.available > 0));
    } catch (err) {
      console.error('Failed to load classes:', err);
      setTransferError('Failed to load class options');
    }
  };

  const handleTransfer = async () => {
    if (!transferringStudent || !selectedClassId) return;

    setTransferLoading(true);
    setTransferError(null);
    try {
      await adminTransferClass(getIdToken, transferringStudent.id, selectedClassId);
      setTransferringStudent(null);
      setSelectedClassId('');
      fetchStudents();
    } catch (err) {
      console.error('Failed to transfer student:', err);
      setTransferError(err instanceof Error ? err.message : 'Failed to transfer student');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleUnassign = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from their class? They will remain active but without a class assignment.`)) return;

    setUnassigningId(studentId);
    try {
      await adminUnassignClass(getIdToken, studentId);
      fetchStudents();
    } catch (err) {
      console.error('Failed to unassign student:', err);
      alert(err instanceof Error ? err.message : 'Failed to unassign student from class');
    } finally {
      setUnassigningId(null);
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
    {
      label: 'Transfer Class',
      onClick: () => openTransferModal(student),
      hidden: student.status !== 'active' || !student.classId,
    },
    {
      label: unassigningId === student.id ? 'Removing...' : 'Remove from Class',
      onClick: () => handleUnassign(student.id, `${student.firstName} ${student.lastName}`),
      variant: 'danger',
      hidden: student.status !== 'active' || !student.classId,
      disabled: unassigningId === student.id,
    },
  ];

  const fetchStudents = useCallback(async (page: number = currentPage) => {
    try {
      setLoading(true);
      const offset = (page - 1) * pageSize;
      const result = await adminGetStudents(getIdToken, {
        status: statusFilter,
        search: searchQuery || undefined,
        enrollingGrade: advancedFilters.enrollingGrade,
        schoolDistrict: advancedFilters.schoolDistrict,
        unassigned: advancedFilters.unassigned,
        dateField: advancedFilters.dateField,
        dateFrom: advancedFilters.dateFrom,
        dateTo: advancedFilters.dateTo,
        limit: pageSize,
        offset,
      });
      setStudents(result.students);
      if (result.counts) {
        setCounts(result.counts);
      }
      if (result.pagination) {
        setTotalStudents(result.pagination.total);
        setHasMore(result.pagination.hasMore);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter, searchQuery, advancedFilters, currentPage, pageSize]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset to first page when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, advancedFilters]);

  // Update URL when filters change
  const updateUrlWithFilters = useCallback((newFilters: AdminStudentsListParams, newStatus?: StatusFilter, newSearch?: string) => {
    const params = new URLSearchParams();
    const status = newStatus ?? statusFilter;
    const search = newSearch ?? searchQuery;

    if (status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    if (newFilters.enrollingGrade) params.set('enrollingGrade', newFilters.enrollingGrade);
    if (newFilters.schoolDistrict) params.set('schoolDistrict', newFilters.schoolDistrict);
    if (newFilters.unassigned) params.set('unassigned', 'true');
    if (newFilters.dateField) params.set('dateField', newFilters.dateField);
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);

    router.push(`/admin/students${params.toString() ? `?${params.toString()}` : ''}`);
  }, [router, statusFilter, searchQuery]);

  const handleAdvancedFiltersChange = (newFilters: AdminStudentsListParams) => {
    setAdvancedFilters(newFilters);
    updateUrlWithFilters(newFilters);
  };

  const handleClearAdvancedFilters = () => {
    const clearedFilters: AdminStudentsListParams = {
      enrollingGrade: undefined,
      schoolDistrict: undefined,
      unassigned: undefined,
      dateField: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setAdvancedFilters(clearedFilters);
    updateUrlWithFilters(clearedFilters);
  };

  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filter changes
    updateUrlWithFilters(advancedFilters, status);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchStudents(page);
  };

  const totalPages = Math.ceil(totalStudents / pageSize);

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
              placeholder="Search by student name, parent email, parent name, or teacher..."
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

      {/* Advanced Search Panel */}
      <AdvancedSearchPanel
        filters={advancedFilters}
        onFiltersChange={handleAdvancedFiltersChange}
        onClear={handleClearAdvancedFilters}
      />

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
          <>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalStudents)} of {totalStudents} students
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasMore}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
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

      {/* Transfer Class Modal */}
      {transferringStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
              onClick={() => setTransferringStudent(null)}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Transfer Student to New Class
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Transfer <strong>{transferringStudent.firstName} {transferringStudent.lastName}</strong> from{' '}
                <strong>{transferringStudent.className}</strong> to a different class.
              </p>

              {transferError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
                  {transferError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select New Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a class...</option>
                  {classOptions.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.day} {cls.time} ({cls.available} slots available)
                    </option>
                  ))}
                </select>
                {classOptions.length === 0 && !transferError && (
                  <p className="text-sm text-gray-500 mt-2">
                    No classes with available capacity found.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setTransferringStudent(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={!selectedClassId || transferLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {transferLoading ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
