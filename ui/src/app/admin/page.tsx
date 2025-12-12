'use client';

import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage students, teachers, classes, and content from your admin portal.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/students?status=pending"
            className="flex items-center p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <span className="text-2xl mr-3">⏳</span>
            <div>
              <p className="font-medium text-yellow-900">Pending Review</p>
              <p className="text-sm text-yellow-600">Review new students</p>
            </div>
          </Link>

          <Link
            href="/admin/teachers/invite"
            className="flex items-center p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-2xl mr-3">✉️</span>
            <div>
              <p className="font-medium text-blue-900">Invite Teacher</p>
              <p className="text-sm text-blue-600">Send invitation</p>
            </div>
          </Link>

          <Link
            href="/admin/classes/create"
            className="flex items-center p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl mr-3">➕</span>
            <div>
              <p className="font-medium text-green-900">Create Class</p>
              <p className="text-sm text-green-600">Add new class</p>
            </div>
          </Link>

          <Link
            href="/admin/content/hero"
            className="flex items-center p-4 border-2 border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <span className="text-2xl mr-3">🖼️</span>
            <div>
              <p className="font-medium text-purple-900">Hero Content</p>
              <p className="text-sm text-purple-600">Manage banners</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Students Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">👨‍🎓</span>
            <h3 className="text-lg font-semibold text-gray-900">Students</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Review registrations, manage student records, and track enrollment status.
          </p>
          <div className="space-y-2">
            <Link
              href="/admin/students"
              className="block px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              View All Students
            </Link>
            <Link
              href="/admin/students?status=pending"
              className="block px-4 py-2 text-sm text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100 transition-colors"
            >
              Pending Review
            </Link>
          </div>
        </div>

        {/* Teachers Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">👩‍🏫</span>
            <h3 className="text-lg font-semibold text-gray-900">Teachers</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            View teacher roster and send invitations to new instructors.
          </p>
          <div className="space-y-2">
            <Link
              href="/admin/users/teachers/list"
              className="block px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              View All Teachers
            </Link>
            <Link
              href="/admin/teachers/invite"
              className="block px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Invite Teacher
            </Link>
          </div>
        </div>

        {/* Classes Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">📚</span>
            <h3 className="text-lg font-semibold text-gray-900">Classes</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Manage classes, schedules, and student assignments.
          </p>
          <div className="space-y-2">
            <Link
              href="/admin/classes"
              className="block px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              View All Classes
            </Link>
            <Link
              href="/admin/classes/create"
              className="block px-4 py-2 text-sm text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
            >
              Create Class
            </Link>
          </div>
        </div>
      </div>

      {/* Content Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🖼️</span>
          <h3 className="text-lg font-semibold text-gray-900">Content Management</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Manage homepage banners and website content.
        </p>
        <Link
          href="/admin/content/hero"
          className="inline-flex items-center px-4 py-2 text-sm text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
        >
          Manage Hero Content
        </Link>
      </div>
    </div>
  );
}
