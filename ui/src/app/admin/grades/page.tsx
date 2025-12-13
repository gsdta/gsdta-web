'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { adminGetGrades, adminUpdateGrade, adminSeedGrades, adminCheckGradesSeeded } from '@/lib/grade-api';
import type { Grade, GradeStatus } from '@/lib/grade-types';

export default function AdminGradesPage() {
  const { getIdToken } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<GradeStatus | 'all'>('all');
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ displayName: string; displayOrder: string }>({
    displayName: '',
    displayOrder: '',
  });
  const [updating, setUpdating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [isSeeded, setIsSeeded] = useState(true);

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminGetGrades(getIdToken, { status: statusFilter });
      setGrades(result.grades);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter]);

  const checkSeeded = useCallback(async () => {
    try {
      const seeded = await adminCheckGradesSeeded(getIdToken);
      setIsSeeded(seeded);
    } catch {
      // Ignore errors, assume seeded
      setIsSeeded(true);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchGrades();
    checkSeeded();
  }, [fetchGrades, checkSeeded]);

  const handleSeedGrades = async () => {
    try {
      setSeeding(true);
      setError(null);
      const result = await adminSeedGrades(getIdToken);
      alert(`${result.message}`);
      setIsSeeded(true);
      fetchGrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed grades');
    } finally {
      setSeeding(false);
    }
  };

  const startEditing = (grade: Grade) => {
    setEditingGradeId(grade.id);
    setEditForm({
      displayName: grade.displayName,
      displayOrder: String(grade.displayOrder),
    });
  };

  const cancelEditing = () => {
    setEditingGradeId(null);
    setEditForm({ displayName: '', displayOrder: '' });
  };

  const handleUpdate = async (gradeId: string) => {
    try {
      setUpdating(true);
      setError(null);
      await adminUpdateGrade(getIdToken, gradeId, {
        displayName: editForm.displayName,
        displayOrder: parseInt(editForm.displayOrder, 10),
      });
      cancelEditing();
      fetchGrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update grade');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (grade: Grade) => {
    try {
      setUpdating(true);
      setError(null);
      const newStatus: GradeStatus = grade.status === 'active' ? 'inactive' : 'active';
      await adminUpdateGrade(getIdToken, grade.id, { status: newStatus });
      fetchGrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update grade status');
    } finally {
      setUpdating(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage grades for the Tamil school (rarely needs changes)
          </p>
        </div>
        {!isSeeded && (
          <button
            onClick={handleSeedGrades}
            disabled={seeding}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {seeding ? 'Seeding...' : 'Seed Default Grades'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as GradeStatus | 'all')}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={fetchGrades}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {/* Grades Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No grades found.</p>
          {!isSeeded && (
            <button
              onClick={handleSeedGrades}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Seed default grades
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Name
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
              {grades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingGradeId === grade.id ? (
                      <input
                        type="number"
                        value={editForm.displayOrder}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, displayOrder: e.target.value }))
                        }
                        className="w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        min="1"
                        max="100"
                      />
                    ) : (
                      grade.displayOrder
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {grade.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {grade.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingGradeId === grade.id ? (
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, displayName: e.target.value }))
                        }
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    ) : (
                      grade.displayName
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig[grade.status].bgColor} ${statusConfig[grade.status].textColor}`}
                    >
                      {statusConfig[grade.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingGradeId === grade.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdate(grade.id)}
                          disabled={updating}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEditing(grade)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(grade)}
                          disabled={updating}
                          className={
                            grade.status === 'active'
                              ? 'text-red-600 hover:text-red-900 disabled:opacity-50'
                              : 'text-green-600 hover:text-green-900 disabled:opacity-50'
                          }
                        >
                          {grade.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">About Grades</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Grades are used to organize classes by curriculum level</li>
          <li>Each class is assigned to a grade (e.g., PS-1 Class A, Grade-5 Class B)</li>
          <li>Grade IDs match the textbooks section for consistency</li>
          <li>Deactivating a grade will hide it from class creation dropdowns</li>
        </ul>
      </div>
    </div>
  );
}
