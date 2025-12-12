'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Protected } from '@/components/Protected';

interface NavSection {
  label: string;
  items: {
    label: string;
    href: string;
  }[];
}

const adminNav: NavSection[] = [
  {
    label: 'Students',
    items: [
      { label: 'All Students', href: '/admin/students' },
      { label: 'Pending Review', href: '/admin/students?status=pending' },
    ],
  },
  {
    label: 'Teachers',
    items: [
      { label: 'All Teachers', href: '/admin/users/teachers/list' },
      { label: 'Invite Teacher', href: '/admin/teachers/invite' },
    ],
  },
  {
    label: 'Classes',
    items: [
      { label: 'All Classes', href: '/admin/classes' },
      { label: 'Create Class', href: '/admin/classes/create' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Hero Content', href: '/admin/content/hero' },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Determine active section based on current path
  const activeSection = adminNav.find((section) =>
    section.items.some((item) => pathname.startsWith(item.href))
  );

  return (
    <Protected roles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header with navigation */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Brand */}
              <Link href="/admin" className="text-xl font-bold text-gray-900">
                Admin Portal
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {adminNav.map((section) => (
                  <div key={section.label} className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === section.label ? null : section.label
                        )
                      }
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSection?.label === section.label
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {section.label}
                      <span className="ml-1">▼</span>
                    </button>

                    {/* Dropdown */}
                    {openDropdown === section.label && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`block px-4 py-2 text-sm hover:bg-gray-50 ${
                              pathname === item.href
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700'
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 space-y-2">
                {adminNav.map((section) => (
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
                          pathname === item.href
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
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
          {/* Left Sidebar - Desktop only, shown when in a section */}
          {activeSection && (
            <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
              <div className="p-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  {activeSection.label}
                </h2>
                <nav className="space-y-1">
                  {activeSection.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                        pathname === item.href
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main content area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </Protected>
  );
}
