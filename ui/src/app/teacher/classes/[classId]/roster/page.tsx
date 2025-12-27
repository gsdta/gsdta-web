'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getClassRoster, ClassRoster, RosterStudent } from '@/lib/teacher-api';

export default function TeacherRosterPage() {
  const params = useParams();
  const classId = params.classId as string;

  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const loadRoster = useCallback(async (searchTerm?: string) => {
    try {
      setLoading(true);
      const data = await getClassRoster(classId, { search: searchTerm });
      setRoster(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (search) {
        loadRoster(search);
      } else {
        loadRoster();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, loadRoster]);

  const toggleStudent = (studentId: string) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  if (loading && !roster) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <Link href={`/teacher/classes/${classId}`} className="text-green-600 hover:underline mt-2 inline-block">
          Back to Class
        </Link>
      </div>
    );
  }

  if (!roster) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/teacher" className="hover:text-green-600">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/teacher/classes" className="hover:text-green-600">Classes</Link>
        <span className="mx-2">/</span>
        <Link href={`/teacher/classes/${classId}`} className="hover:text-green-600">{roster.class.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Roster</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Roster</h1>
            <p className="mt-1 text-gray-600">
              {roster.class.name} - {roster.class.gradeName}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {roster.total} students
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Student List */}
      {roster.students.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            {search ? 'No students found matching your search.' : 'No students enrolled in this class.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {roster.students.map((student: RosterStudent) => (
            <div key={student.id} className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => toggleStudent(student.id)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold">
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{student.name}</div>
                    {student.grade && (
                      <div className="text-sm text-gray-500">Grade: {student.grade}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    student.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {student.status}
                  </span>
                  <span className="text-gray-400">
                    {expandedStudent === student.id ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {expandedStudent === student.id && (
                <div className="px-4 pb-4 border-t bg-gray-50">
                  <div className="pt-4 space-y-4">
                    {/* Student Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {student.dateOfBirth && (
                        <div>
                          <span className="text-gray-500">Date of Birth:</span>
                          <span className="ml-2 text-gray-900">{student.dateOfBirth}</span>
                        </div>
                      )}
                      {student.gender && (
                        <div>
                          <span className="text-gray-500">Gender:</span>
                          <span className="ml-2 text-gray-900">{student.gender}</span>
                        </div>
                      )}
                    </div>

                    {/* Emergency Contacts */}
                    {student.contacts && student.contacts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Contacts</h4>
                        <div className="space-y-2">
                          {student.contacts.map((contact, idx) => (
                            <div key={idx} className="p-3 bg-white rounded border text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{contact.name}</span>
                                {contact.isEmergency && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                    Emergency
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-500">{contact.relationship}</div>
                              <div className="mt-1">
                                <a href={`tel:${contact.phone}`} className="text-green-600 hover:underline">
                                  {contact.phone}
                                </a>
                                {contact.email && (
                                  <a href={`mailto:${contact.email}`} className="ml-4 text-green-600 hover:underline">
                                    {contact.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medical Notes */}
                    {student.medicalNotes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Medical Notes</h4>
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          {student.medicalNotes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
