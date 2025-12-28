'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  getAttendanceAnalytics,
  getClassComparison,
  getChronicAbsentees,
  exportAttendanceCSV,
  type AttendanceAnalytics,
  type ClassComparison,
  type ChronicAbsentee,
} from '@/lib/attendance-analytics-api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Get date 30 days ago
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function AttendanceAnalyticsPage() {
  const { getIdToken } = useAuth();
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [classComparison, setClassComparison] = useState<ClassComparison[]>([]);
  const [chronicAbsentees, setChronicAbsentees] = useState<ChronicAbsentee[]>([]);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsData, comparisonData, absenteesData] = await Promise.all([
        getAttendanceAnalytics(getIdToken, { startDate, endDate }),
        getClassComparison(getIdToken, { startDate, endDate }),
        getChronicAbsentees(getIdToken, { startDate, endDate, limit: 10 }),
      ]);

      setAnalytics(analyticsData);
      setClassComparison(comparisonData);
      setChronicAbsentees(absenteesData.absentees);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportAttendanceCSV(getIdToken, { startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">
            Admin
          </Link>
          <span>/</span>
          <span>Attendance Analytics</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Analytics</h1>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-300"
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Attendance Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {analytics.overallStats.attendanceRate}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.totalSessions}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Present</p>
              <p className="text-3xl font-bold text-blue-600">
                {analytics.overallStats.present}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Absent</p>
              <p className="text-3xl font-bold text-red-600">
                {analytics.overallStats.absent}
              </p>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Attendance Trend
            </h2>
            {analytics.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(value) => new Date(String(value)).toLocaleDateString()}
                    formatter={(value) => [`${value}%`, 'Attendance Rate']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="attendanceRate"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Attendance Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No attendance data for this period
              </p>
            )}
          </div>

          {/* Class Comparison Chart */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Class Comparison
            </h2>
            {classComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="className"
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Attendance Rate']}
                  />
                  <Bar
                    dataKey="stats.attendanceRate"
                    fill="#16a34a"
                    name="Attendance Rate"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No class data available
              </p>
            )}
          </div>

          {/* Chronic Absentees */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Students Needing Attention
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Below 80% attendance)
              </span>
            </h2>
            {chronicAbsentees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Class
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Sessions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Attendance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Last Attended
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {chronicAbsentees.map((student) => (
                      <tr key={student.studentId}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/admin/students/${student.studentId}`}
                            className="text-green-600 hover:text-green-700"
                          >
                            {student.studentName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {student.className || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {student.totalSessions}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              student.attendanceRate < 50
                                ? 'bg-red-100 text-red-800'
                                : student.attendanceRate < 70
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {student.attendanceRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {student.lastAttendedDate || 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No students below 80% attendance threshold
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
