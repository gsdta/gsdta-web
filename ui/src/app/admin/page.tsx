'use client';

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Admin Portal</h1>
        <p className="text-gray-600 mb-6">
          Use the navigation menu above to manage teachers, classes, and content.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-6 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Teachers</h3>
            <p className="text-sm text-gray-600">
              View all teachers and send invitations to new instructors.
            </p>
          </div>

          <div className="p-6 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Classes</h3>
            <p className="text-sm text-gray-600">
              Manage classes, schedules, and student assignments.
            </p>
          </div>

          <div className="p-6 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Content</h3>
            <p className="text-sm text-gray-600">
              Manage hero banners and homepage content.
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Quick Tip:</strong> Click on any menu item in the header to see available options.
          </p>
        </div>
      </div>
    </div>
  );
}

