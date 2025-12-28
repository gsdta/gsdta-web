'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { adminGetClasses, adminUpdateClass, formatTeachersDisplay, type Class } from '@/lib/class-api';
import { adminGetGradeOptions } from '@/lib/grade-api';
import type { GradeOption } from '@/lib/grade-types';
import { TableRowActionMenu, useTableRowActions, type TableAction } from '@/components/TableRowActionMenu';

export default function ClassesPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { selectedItem, menuPosition, handleRowClick, closeMenu, isMenuOpen } = useTableRowActions<Class>();

  const handleToggleStatus = async (classData: Class) => {
    const newStatus = classData.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`Are you sure you want to mark this class as ${newStatus}?`)) return;

    setTogglingId(classData.id);
    try {
      await adminUpdateClass(getIdToken, classData.id, { status: newStatus });
      fetchClasses();
    } catch (err) {
      console.error('Failed to update class status:', err);
      alert('Failed to update class status');
    } finally {
      setTogglingId(null);
    }
  };

  const getClassActions = (cls: Class): TableAction[] => [
    { label: 'Edit', onClick: () => router.push(`/admin/classes/${cls.id}/edit`) },
    {
      label: togglingId === cls.id ? '...' : (cls.status === 'active' ? 'Deactivate' : 'Activate'),
      onClick: () => handleToggleStatus(cls),
      variant: cls.status === 'active' ? 'danger' : 'success',
      disabled: togglingId === cls.id,
    },
  ];

  const fetchGrades = useCallback(async () => {
    try {
      const gradeOptions = await adminGetGradeOptions(getIdToken);
      setGrades(gradeOptions);
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    }
  }, [getIdToken]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminGetClasses(getIdToken, {
        status: statusFilter,
        gradeId: gradeFilter || undefined,
      });
      setClasses(result.classes);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter, gradeFilter]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="mt-1 text-gray-600">
            Manage Tamil class schedules and assignments.
          </p>
        </div>
        <Link
          href="/admin/classes/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Class
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
              Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="gradeFilter" className="text-sm font-medium text-gray-700">
              Grade:
            </label>
            <select
              id="gradeFilter"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Grades</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name} - {grade.displayName}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fetchClasses()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Classes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading classes...</div>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-gray-500 mb-2">No classes found</div>
            <Link
              href="/admin/classes/create"
              className="text-blue-600 hover:underline"
            >
              Create your first class
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.map((cls) => (
                  <tr
                    key={cls.id}
                    onClick={(e) => handleRowClick(e, cls)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleRowClick(e as unknown as React.MouseEvent, cls)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cls.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {cls.gradeName || cls.level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cls.day}</div>
                      <div className="text-sm text-gray-500">{cls.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {cls.enrolled}/{cls.capacity}
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              cls.enrolled >= cls.capacity
                                ? 'bg-red-500'
                                : cls.enrolled >= cls.capacity * 0.8
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, (cls.enrolled / cls.capacity) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cls.teachers && cls.teachers.length > 0 ? (
                          formatTeachersDisplay(cls.teachers)
                        ) : cls.teacherName ? (
                          cls.teacherName
                        ) : (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          cls.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cls.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Menu */}
      {isMenuOpen && selectedItem && menuPosition && (
        <TableRowActionMenu
          actions={getClassActions(selectedItem)}
          position={menuPosition}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
