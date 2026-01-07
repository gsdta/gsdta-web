'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  adminGetClass,
  adminGetClassTeachers,
  getPrimaryTeacher,
  getAssistantTeachers,
  type Class,
  type ClassTeacher,
} from '@/lib/class-api';
import { adminGetStudents } from '@/lib/student-api';
import type { Student } from '@/lib/student-types';

interface StudentListItem {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  status: string;
  grade?: string;
  parentEmail?: string;
}

export default function ClassDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getIdToken } = useAuth();

  const [classData, setClassData] = useState<Class | null>(null);
  const [teachers, setTeachers] = useState<ClassTeacher[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentsTotal, setStudentsTotal] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [cls, teachersList, studentsResult] = await Promise.all([
          adminGetClass(getIdToken, id),
          adminGetClassTeachers(getIdToken, id).catch(() => [] as ClassTeacher[]),
          adminGetStudents(getIdToken, { classId: id, limit: 100 }),
        ]);
        setClassData(cls);
        setTeachers(teachersList);
        setStudents(studentsResult.students as unknown as StudentListItem[]);
        setStudentsTotal(studentsResult.pagination?.total || studentsResult.students.length);
      } catch (err) {
        console.error('Failed to fetch class details:', err);
        setError('Failed to load class details');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, getIdToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading class details...</div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/classes"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Classes
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error || 'Class not found'}
        </div>
      </div>
    );
  }

  const primaryTeacher = getPrimaryTeacher(teachers);
  const assistantTeachers = getAssistantTeachers(teachers);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/classes"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Classes
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                  {classData.gradeName || classData.level || 'No Grade'}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    classData.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {classData.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            href={`/admin/classes/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Class
          </Link>
          <Link
            href="/admin/teachers/assign"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Assign Teachers
          </Link>
        </div>
      </div>

      {/* Class Info and Teachers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="text-sm text-gray-900">{classData.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Grade</dt>
              <dd className="text-sm text-gray-900">{classData.gradeName || classData.level || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Schedule</dt>
              <dd className="text-sm text-gray-900">{classData.day} {classData.time}</dd>
            </div>
            {classData.room && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Room</dt>
                <dd className="text-sm text-gray-900">{classData.room}</dd>
              </div>
            )}
            {classData.section && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Section</dt>
                <dd className="text-sm text-gray-900">{classData.section}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Capacity</dt>
              <dd className="text-sm text-gray-900">
                <div className="flex items-center gap-2">
                  <span>{classData.enrolled}/{classData.capacity} students</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        classData.enrolled >= classData.capacity
                          ? 'bg-red-500'
                          : classData.enrolled >= classData.capacity * 0.8
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (classData.enrolled / classData.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              </dd>
            </div>
            {classData.academicYear && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Academic Year</dt>
                <dd className="text-sm text-gray-900">{classData.academicYear}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Teachers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Teachers</h2>
            <Link
              href="/admin/teachers/assign"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage
            </Link>
          </div>
          {teachers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 mb-2">No teachers assigned</p>
              <Link
                href="/admin/teachers/assign"
                className="text-sm text-blue-600 hover:underline"
              >
                Assign a teacher
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Primary Teacher */}
              {primaryTeacher && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-medium">
                      {primaryTeacher.teacherName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{primaryTeacher.teacherName}</p>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-200 text-blue-800">
                        Primary
                      </span>
                    </div>
                    {primaryTeacher.teacherEmail && (
                      <p className="text-sm text-gray-500">{primaryTeacher.teacherEmail}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Assistant Teachers */}
              {assistantTeachers.map((teacher) => (
                <div key={teacher.teacherId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-700 font-medium">
                      {teacher.teacherName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{teacher.teacherName}</p>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                        Assistant
                      </span>
                    </div>
                    {teacher.teacherEmail && (
                      <p className="text-sm text-gray-500">{teacher.teacherEmail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Students</h2>
            <p className="text-sm text-gray-500">{studentsTotal} students enrolled</p>
          </div>
          <Link
            href="/admin/students/assign-class"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Assign Students
          </Link>
        </div>

        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">No students in this class</p>
            <Link
              href="/admin/students/assign-class"
              className="text-blue-600 hover:underline text-sm"
            >
              Assign students to this class
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-medium text-sm">
                            {student.firstName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <Link
                            href={`/admin/students/${student.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {student.firstName} {student.lastName}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{student.grade || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          student.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : student.status === 'admitted'
                            ? 'bg-blue-100 text-blue-700'
                            : student.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.parentEmail ? (
                        <a
                          href={`mailto:${student.parentEmail}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {student.parentEmail}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
