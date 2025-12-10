'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

interface Teacher {
  uid: string;
  email: string;
  name: string;
  roles: string[];
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface TeachersResponse {
  success: boolean;
  data: {
    teachers: Teacher[];
    total: number;
    limit: number;
    offset: number;
  };
}

export default function TeachersListPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, offset]);

  async function fetchTeachers() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: statusFilter,
        limit: String(limit),
        offset: String(offset),
      });

      if (search) {
        params.append('search', search);
      }

      const data = await apiFetch<TeachersResponse>(`/v1/admin/teachers?${params.toString()}`, {
        method: 'GET',
      });

      if (data.success) {
        setTeachers(data.data.teachers);
        setTotal(data.data.total);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setOffset(0);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value as 'active' | 'inactive' | 'all');
    setOffset(0);
  }

  function handleNextPage() {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  }

  function handlePrevPage() {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Teachers</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage all teachers in the system
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={handleStatusChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading teachers...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
            <p className="font-medium text-red-700">Error loading teachers</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchTeachers}
              className="mt-3 text-sm text-red-700 underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {teachers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No teachers found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {search || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'No teachers have been added yet'}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {offset + 1} - {Math.min(offset + limit, total)} of {total} teacher{total !== 1 ? 's' : ''}
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teachers.map((teacher) => (
                        <tr key={teacher.uid} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {teacher.name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{teacher.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                teacher.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {teacher.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {teacher.createdAt 
                              ? new Date(teacher.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a
                              href={`/admin/users/teachers/${teacher.uid}`}
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              View
                            </a>
                            <a
                              href={`/admin/users/teachers/${teacher.uid}/edit`}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              Edit
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <button
                      onClick={handlePrevPage}
                      disabled={offset === 0}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={handleNextPage}
                      disabled={offset + limit >= total}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
  );
}
