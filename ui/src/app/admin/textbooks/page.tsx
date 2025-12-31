'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { adminGetTextbooks, adminCreateTextbook, adminUpdateTextbook, adminDeleteTextbook } from '@/lib/textbook-api';
import { adminGetGrades } from '@/lib/grade-api';
import type { Textbook, TextbookStatus, TextbookType, CreateTextbookInput } from '@/lib/textbook-types';
import { TEXTBOOK_TYPES, SEMESTERS, CURRENT_ACADEMIC_YEAR } from '@/lib/textbook-types';
import type { Grade } from '@/lib/grade-types';
import { TableRowActionMenu, useTableRowActions, type TableAction } from '@/components/TableRowActionMenu';

export default function AdminTextbooksPage() {
  const { getIdToken } = useAuth();
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TextbookStatus | 'all'>('active');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const { selectedItem, menuPosition, handleRowClick, closeMenu, isMenuOpen } = useTableRowActions<Textbook>();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTextbooks, setTotalTextbooks] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

  const handleToggleStatus = async (textbook: Textbook) => {
    try {
      const newStatus: TextbookStatus = textbook.status === 'active' ? 'inactive' : 'active';
      await adminUpdateTextbook(getIdToken, textbook.id, { status: newStatus });
      fetchTextbooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update textbook');
    }
  };

  const handleDelete = async (textbook: Textbook) => {
    if (!confirm(`Are you sure you want to delete "${textbook.name}"?`)) return;
    try {
      await adminDeleteTextbook(getIdToken, textbook.id);
      fetchTextbooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete textbook');
    }
  };

  const getTextbookActions = (textbook: Textbook): TableAction[] => [
    {
      label: textbook.status === 'active' ? 'Deactivate' : 'Activate',
      onClick: () => handleToggleStatus(textbook),
      variant: textbook.status === 'active' ? 'warning' : 'success',
    },
    {
      label: 'Delete',
      onClick: () => handleDelete(textbook),
      variant: 'danger',
    },
  ];

  const [createForm, setCreateForm] = useState<CreateTextbookInput>({
    gradeId: '',
    itemNumber: '',
    name: '',
    type: 'textbook',
    semester: '',
    pageCount: 0,
    copies: 0,
    academicYear: CURRENT_ACADEMIC_YEAR,
  });

  const fetchTextbooks = useCallback(async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * pageSize;
      const result = await adminGetTextbooks(getIdToken, {
        status: statusFilter,
        gradeId: gradeFilter || undefined,
        limit: pageSize,
        offset,
      });
      setTextbooks(result.textbooks);
      setTotalTextbooks(result.total);
      setHasMore(offset + result.textbooks.length < result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch textbooks');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter, gradeFilter, currentPage, pageSize]);

  const fetchGrades = useCallback(async () => {
    try {
      const result = await adminGetGrades(getIdToken, { status: 'active' });
      setGrades(result.grades);
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchTextbooks();
    fetchGrades();
  }, [fetchTextbooks, fetchGrades]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, gradeFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTextbooks(page);
  };

  const totalPages = Math.ceil(totalTextbooks / pageSize);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      await adminCreateTextbook(getIdToken, createForm);
      setShowCreateModal(false);
      setCreateForm({
        gradeId: '',
        itemNumber: '',
        name: '',
        type: 'textbook',
        semester: '',
        pageCount: 0,
        copies: 0,
        academicYear: CURRENT_ACADEMIC_YEAR,
      });
      fetchTextbooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create textbook');
    } finally {
      setCreating(false);
    }
  };

  const getTypeLabel = (type: TextbookType) => {
    return TEXTBOOK_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getGradeName = (gradeId: string) => {
    return grades.find((g) => g.id === gradeId)?.displayName || gradeId;
  };

  const statusConfig = {
    active: { label: 'Active', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    inactive: { label: 'Inactive', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Textbooks</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage textbooks and homework materials
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add Textbook
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
            onChange={(e) => setStatusFilter(e.target.value as TextbookStatus | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Grade:</label>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">All Grades</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.displayName}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchTextbooks()}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {/* Textbooks Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : textbooks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No textbooks found.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Add your first textbook
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Copies
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {textbooks.map((textbook) => (
                <tr
                  key={textbook.id}
                  onClick={(e) => handleRowClick(e, textbook)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === 'Enter' && handleRowClick(e as unknown as React.MouseEvent, textbook)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {textbook.itemNumber}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div>{textbook.name}</div>
                    {textbook.semester && (
                      <div className="text-xs text-gray-500">{textbook.semester} Semester</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getGradeName(textbook.gradeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getTypeLabel(textbook.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {textbook.pageCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {textbook.copies}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig[textbook.status].bgColor} ${statusConfig[textbook.status].textColor}`}
                    >
                      {statusConfig[textbook.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalTextbooks)} of {totalTextbooks} textbooks
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
        </div>
      )}

      {/* Action Menu */}
      {isMenuOpen && selectedItem && menuPosition && (
        <TableRowActionMenu
          actions={getTextbookActions(selectedItem)}
          position={menuPosition}
          onClose={closeMenu}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Textbook</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                <select
                  value={createForm.gradeId}
                  onChange={(e) => setCreateForm({ ...createForm, gradeId: e.target.value })}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select Grade</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Number *</label>
                <input
                  type="text"
                  value={createForm.itemNumber}
                  onChange={(e) => setCreateForm({ ...createForm, itemNumber: e.target.value })}
                  required
                  placeholder="#910131"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  placeholder="Mazhalai Textbook First Semester"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as TextbookType })}
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {TEXTBOOK_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={createForm.semester || ''}
                    onChange={(e) => setCreateForm({ ...createForm, semester: e.target.value || undefined })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Semester</option>
                    {SEMESTERS.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Count *</label>
                  <input
                    type="number"
                    value={createForm.pageCount || ''}
                    onChange={(e) => setCreateForm({ ...createForm, pageCount: parseInt(e.target.value, 10) || 0 })}
                    required
                    min="1"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Copies *</label>
                  <input
                    type="number"
                    value={createForm.copies || ''}
                    onChange={(e) => setCreateForm({ ...createForm, copies: parseInt(e.target.value, 10) || 0 })}
                    required
                    min="0"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                <input
                  type="text"
                  value={createForm.academicYear}
                  onChange={(e) => setCreateForm({ ...createForm, academicYear: e.target.value })}
                  required
                  placeholder="2025-2026"
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
                  {creating ? 'Creating...' : 'Create Textbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">About Textbooks</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Textbooks are linked to grades for curriculum organization</li>
          <li>Track inventory with the copies count</li>
          <li>Use item numbers from the textbook catalog</li>
          <li>Separate textbooks and homework materials by type</li>
        </ul>
      </div>
    </div>
  );
}
