'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudents } from '@/lib/student-api';
import type { Student } from '@/lib/student-types';

interface StudentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (studentIds: string[]) => Promise<void>;
  gradeId: string;
  gradeName?: string;
  spotsAvailable: number;
  excludeStudentIds?: string[];
}

export default function StudentSelectorModal({
  isOpen,
  onClose,
  onAssign,
  gradeId,
  gradeName,
  spotsAvailable,
  excludeStudentIds = [],
}: StudentSelectorModalProps) {
  const { getIdToken } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Load students when modal opens or retry is triggered
  useEffect(() => {
    if (!isOpen) return;
    
    let isCancelled = false;

    async function fetchStudents() {
      try {
        setLoading(true);
        setError(null);

        // Fetch admitted students for this grade that are not assigned to any class
        const result = await adminGetStudents(getIdToken, {
          status: 'admitted',
          gradeId,
          unassigned: true,
          limit: 200, // Get more students for selection
        });

        if (isCancelled) return;

        // Filter out already enrolled students
        const excludeSet = new Set(excludeStudentIds);
        const available = result.students.filter(
          (s) => !excludeSet.has(s.id)
        );

        setStudents(available);
        setFilteredStudents(available);
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to load students:', err);
        setError(err instanceof Error ? err.message : 'Failed to load students');
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchStudents();
    setSelectedIds(new Set());
    setSearchQuery('');

    return () => {
      isCancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, retryCount]); // Reload when modal opens or retry is triggered

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredStudents(
        students.filter(
          (s) =>
            s.firstName.toLowerCase().includes(query) ||
            s.lastName.toLowerCase().includes(query) ||
            s.name?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredStudents(students);
    }
  }, [searchQuery, students]);

  const handleToggleStudent = (studentId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        // Don't allow selecting more than spots available
        if (newSet.size >= spotsAvailable) {
          return prev;
        }
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // Select up to spotsAvailable students
    const toSelect = filteredStudents.slice(0, spotsAvailable);
    setSelectedIds(new Set(toSelect.map((s) => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;

    try {
      setAssigning(true);
      await onAssign(Array.from(selectedIds));
      onClose();
    } catch (err) {
      console.error('Failed to assign students:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign students');
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Assign Students to Class
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Select students from {gradeName || gradeId} •{' '}
                <span className="font-medium text-blue-600">
                  {spotsAvailable} spot{spotsAvailable !== 1 ? 's' : ''} available
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={assigning}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search students by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Selection Controls */}
          <div className="px-6 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
                disabled={loading || assigning || filteredStudents.length === 0}
              >
                Select All (up to {spotsAvailable})
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-sm text-gray-600 hover:text-gray-800"
                disabled={loading || assigning || selectedIds.size === 0}
              >
                Deselect All
              </button>
            </div>
            <span className="text-sm text-gray-600">
              {selectedIds.size} of {spotsAvailable} selected
            </span>
          </div>

          {/* Student List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-2 text-gray-600">Loading students...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                <p>{error}</p>
                <button
                  onClick={handleRetry}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Try again
                </button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-lg">No eligible students found</p>
                <p className="mt-1 text-sm">
                  {students.length === 0
                    ? `There are no admitted students in ${gradeName || gradeId} without a class assignment.`
                    : 'No students match your search.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const isSelected = selectedIds.has(student.id);
                  const isDisabled =
                    !isSelected && selectedIds.size >= spotsAvailable;

                  return (
                    <li key={student.id}>
                      <label
                        className={`flex items-center px-6 py-3 cursor-pointer hover:bg-gray-50 ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(student.id)}
                          disabled={isDisabled}
                          className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="ml-4 flex-1">
                          <p className="font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {student.grade || 'No grade set'}
                            {student.parentEmail && ` • ${student.parentEmail}`}
                          </p>
                        </div>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {student.status}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              disabled={assigning}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning || selectedIds.size === 0}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></span>
                  Assigning...
                </>
              ) : (
                `Assign ${selectedIds.size} Student${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
