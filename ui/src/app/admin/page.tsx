'use client';

import Link from 'next/link';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';
import { shouldShowNavItem } from '@/lib/featureMapping';

interface TileItem {
  label: string;
  description: string;
  href: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'gray' | 'red' | 'orange' | 'teal';
}

interface TileSection {
  title: string;
  items: TileItem[];
}

const colorStyles = {
  blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900',
  green: 'border-green-200 bg-green-50 hover:bg-green-100 text-green-900',
  yellow: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-900',
  purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900',
  gray: 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-900',
  red: 'border-red-200 bg-red-50 hover:bg-red-100 text-red-900',
  orange: 'border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-900',
  teal: 'border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900',
};

const descriptionStyles = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  purple: 'text-purple-600',
  gray: 'text-gray-500',
  red: 'text-red-600',
  orange: 'text-orange-600',
  teal: 'text-teal-600',
};

const tileSections: TileSection[] = [
  {
    title: 'Students',
    items: [
      {
        label: 'All Students',
        description: 'View and manage student records',
        href: '/admin/students',
        icon: '👨‍🎓',
        color: 'blue',
      },
      {
        label: 'Pending Review',
        description: 'Review new registrations',
        href: '/admin/students?status=pending',
        icon: '⏳',
        color: 'yellow',
      },
    ],
  },
  {
    title: 'Teachers',
    items: [
      {
        label: 'All Teachers',
        description: 'View teacher roster',
        href: '/admin/users/teachers/list',
        icon: '👩‍🏫',
        color: 'green',
      },
      {
        label: 'Invite Teacher',
        description: 'Send invitation to new teacher',
        href: '/admin/teachers/invite',
        icon: '✉️',
        color: 'blue',
      },
      {
        label: 'Assign to Classes',
        description: 'Manage teacher assignments',
        href: '/admin/teachers/assign',
        icon: '📋',
        color: 'purple',
      },
    ],
  },
  {
    title: 'Classes',
    items: [
      {
        label: 'All Classes',
        description: 'View and manage classes',
        href: '/admin/classes',
        icon: '📚',
        color: 'blue',
      },
      {
        label: 'Create Class',
        description: 'Add a new class',
        href: '/admin/classes/create',
        icon: '➕',
        color: 'green',
      },
      {
        label: 'Grades',
        description: 'Manage grade levels',
        href: '/admin/grades',
        icon: '📊',
        color: 'purple',
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        label: 'Textbooks',
        description: 'Manage textbook resources',
        href: '/admin/textbooks',
        icon: '📖',
        color: 'orange',
      },
    ],
  },
  {
    title: 'Volunteers',
    items: [
      {
        label: 'All Volunteers',
        description: 'Manage volunteer registrations',
        href: '/admin/volunteers',
        icon: '🤝',
        color: 'teal',
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        label: 'Attendance Analytics',
        description: 'View attendance reports',
        href: '/admin/attendance/analytics',
        icon: '📈',
        color: 'green',
      },
    ],
  },
  {
    title: 'Content',
    items: [
      {
        label: 'Hero Content',
        description: 'Manage homepage banners',
        href: '/admin/content/hero',
        icon: '🖼️',
        color: 'purple',
      },
    ],
  },
  {
    title: 'Calendar',
    items: [
      {
        label: 'All Events',
        description: 'View calendar events',
        href: '/admin/calendar',
        icon: '📅',
        color: 'blue',
      },
      {
        label: 'Create Event',
        description: 'Add a new event',
        href: '/admin/calendar/new',
        icon: '➕',
        color: 'green',
      },
    ],
  },
];

export default function AdminDashboard() {
  const { isFeatureEnabled } = useFeatureFlags();

  // Filter sections and items based on feature flags
  const filteredSections = tileSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        shouldShowNavItem('admin', item.href, isFeatureEnabled)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage students, teachers, classes, and content from your admin portal.
        </p>
      </div>

      {/* All Navigation Tiles */}
      {filteredSections.map((section) => (
        <div key={section.title} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center p-4 border-2 rounded-lg transition-colors ${colorStyles[item.color]}`}
              >
                <span className="text-2xl mr-3">{item.icon}</span>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className={`text-sm ${descriptionStyles[item.color]}`}>
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
