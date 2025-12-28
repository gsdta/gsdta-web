'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminGetStudents, adminBulkAssignClass, BulkAssignClassResult } from '@/lib/student-api';
import { adminGetClassOptions, ClassOption } from '@/lib/class-api';
import type { Student } from '@/lib/student-types';

export default function BulkAssignClassPage() {
  const { getIdToken } = useAuth();

  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Assignment state
  const [isAssigning, setIsAssigning] = useState(false);
  const [result, setResult] = useState<BulkAssignClassResult | null>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [studentsRes, classesRes] = await Promise.all([
          adminGetStudents(getIdToken, { status: 'admitted', limit: 500 }),
          adminGetClassOptions(getIdToken),
        ]);
        setStudents(studentsRes.students);
        setClasses(classesRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [getIdToken]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.parentEmail?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  // Get selected class info
  const selectedClassInfo = useMemo(() => {
    return classes.find((c) => c.id === selectedClass);
  }, [classes, selectedClass]);

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Select all filtered students
  const selectAll = () => {
    setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedStudents(new Set());
  };

  // Handle assignment
  const handleAssign = async () => {
    if (selectedStudents.size === 0 || !selectedClass) return;

    setIsAssigning(true);
    setError(null);

    try {
      const assignResult = await adminBulkAssignClass(
        getIdToken,
        Array.from(selectedStudents),
        selectedClass
      );
      setResult(assignResult);

      // Remove assigned students from the list
      if (assignResult.updated.length > 0) {
        const updatedIds = new Set(assignResult.updated);
        setStudents((prev) => prev.filter((s) => !updatedIds.has(s.id)));
        setSelectedStudents(new Set());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  // Reset result
  const handleContinue = () => {
    setResult(null);
    setSelectedClass('');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin/students" className="hover:text-gray-700">
            Students
          </Link>
          <span>/</span>
          <span>Assign Class</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Assign Class</h1>
        <p className="mt-2 text-gray-600">
          Select admitted students and assign them to a class
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className={`mb-6 rounded-lg border p-6 ${
          result.failed.length === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <h2 className="text-lg font-medium mb-2">
            {result.failed.length === 0 ? 'Assignment Successful!' : 'Assignment Completed with Issues'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">{result.message}</p>

          {result.failed.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-700 mb-2">Failed Assignments:</h3>
              <ul className="text-sm text-red-600 space-y-1">
                {result.failed.map((f, idx) => (
                  <li key={idx}>{f.name}: {f.reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleContinue}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Assign More Students
            </button>
            <Link
              href="/admin/students"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View All Students
            </Link>
          </div>
        </div>
      )}

      {!result && (
        <>
          {/* Class Selection */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select Class</h2>
            <div className="max-w-md">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.enrolled}/{c.capacity} enrolled)
                  </option>
                ))}
              </select>
              {selectedClassInfo && (
                <p className="mt-2 text-sm text-gray-500">
                  Available slots: {selectedClassInfo.capacity - selectedClassInfo.enrolled}
                </p>
              )}
            </div>
          </div>

          {/* Student Selection */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Select Students ({selectedStudents.size} selected)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name or parent email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {students.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No admitted students available for class assignment.</p>
                <p className="text-sm mt-2">Students must be admitted before they can be assigned to a class.</p>
              </div>
            ) : (
              <>
                {/* Student List */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                            onChange={() => {
                              if (selectedStudents.size === filteredStudents.length) {
                                deselectAll();
                              } else {
                                selectAll();
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Parent Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Enrolling Grade
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedStudents.has(student.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => toggleStudent(student.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(student.id)}
                              onChange={() => toggleStudent(student.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {student.parentEmail || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {student.enrollingGrade || student.grade || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredStudents.length === 0 && searchQuery && (
                  <p className="text-center py-4 text-gray-500">
                    No students match your search.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Action Bar */}
          <div className="mt-6 flex justify-end gap-4">
            <Link
              href="/admin/students"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleAssign}
              disabled={selectedStudents.size === 0 || !selectedClass || isAssigning}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssigning
                ? 'Assigning...'
                : `Assign ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
