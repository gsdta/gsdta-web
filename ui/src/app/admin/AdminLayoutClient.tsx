'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Protected } from '@/components/Protected';
import { useAuth } from '@/components/AuthProvider';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const adminNav: NavSection[] = [
  {
    label: 'Dashboard',
    items: [{ label: 'Overview', href: '/admin', icon: '🏠' }],
  },
  {
    label: 'Students',
    items: [
      { label: 'All Students', href: '/admin/students', icon: '👨‍🎓' },
      { label: 'Pending Review', href: '/admin/students?status=pending', icon: '⏳' },
    ],
  },
  {
    label: 'Teachers',
    items: [
      { label: 'All Teachers', href: '/admin/users/teachers/list', icon: '👩‍🏫' },
      { label: 'Invite Teacher', href: '/admin/teachers/invite', icon: '✉️' },
      { label: 'Assign to Classes', href: '/admin/teachers/assign', icon: '📋' },
    ],
  },
  {
    label: 'Classes',
    items: [
      { label: 'All Classes', href: '/admin/classes', icon: '📚' },
      { label: 'Create Class', href: '/admin/classes/create', icon: '➕' },
      { label: 'Grades', href: '/admin/grades', icon: '📊' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Textbooks', href: '/admin/textbooks', icon: '📖' },
    ],
  },
  {
    label: 'Volunteers',
    items: [
      { label: 'All Volunteers', href: '/admin/volunteers', icon: '🤝' },
    ],
  },
  {
    label: 'Content',
    items: [{ label: 'Hero Content', href: '/admin/content/hero', icon: '🖼️' }],
  },
];

// Super Admin navigation (only visible to super_admin role)
const superAdminNav: NavSection = {
  label: 'Super Admin',
  items: [
    { label: 'Admin Users', href: '/admin/super-admin/admins', icon: '👑' },
    { label: 'Audit Log', href: '/admin/super-admin/audit-log', icon: '📋' },
    { label: 'Security', href: '/admin/super-admin/security', icon: '🛡️' },
    { label: 'Settings', href: '/admin/super-admin/settings', icon: '⚙️' },
    // Future phases will add: Recovery, Export
  ],
};

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  // Check if user is super_admin
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  // Build navigation with super admin section if applicable
  const navigation = isSuperAdmin ? [...adminNav, superAdminNav] : adminNav;

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    // Handle query params in href
    const hrefPath = href.split('?')[0];
    return pathname === hrefPath || pathname.startsWith(hrefPath + '/');
  };

  return (
    <Protected roles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Brand */}
              <Link href="/admin" className="text-xl font-bold text-gray-900">
                Admin Portal
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 space-y-2 border-t border-gray-100">
                {navigation.map((section) => (
                  <div key={section.label}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                      {section.label}
                    </div>
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block px-4 py-2 text-sm ${
                          isActive(item.href)
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Two-pane layout */}
        <div className="flex">
          {/* Left Sidebar - Desktop only */}
          <aside className="hidden md:block w-64 flex-shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
            <div className="p-4">
              {navigation.map((section) => (
                <div key={section.label} className="mb-6">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    {section.label}
                  </h2>
                  <nav className="space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          isActive(item.href)
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="mr-3 text-lg">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </Protected>
  );
}

