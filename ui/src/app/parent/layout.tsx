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
    icon?: string;
  }[];
}

const parentNav: NavSection[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Overview', href: '/parent', icon: '🏠' },
    ],
  },
  {
    label: 'Profile',
    items: [
      { label: 'My Profile', href: '/parent/profile', icon: '👤' },
      { label: 'Settings', href: '/parent/settings', icon: '⚙️' },
    ],
  },
  {
    label: 'Students',
    items: [
      { label: 'My Students', href: '/parent/students', icon: '👨‍👧‍👦' },
    ],
  },
];

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Determine active section based on current path
  const activeSection = parentNav.find((section) =>
    section.items.some((item) =>
      item.href === '/parent'
        ? pathname === '/parent'
        : pathname.startsWith(item.href)
    )
  );

  return (
    <Protected roles={['parent']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header with navigation */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Brand */}
              <Link href="/parent" className="text-xl font-bold text-gray-900">
                Parent Portal
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {parentNav.map((section) => (
                  <div key={section.label} className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === section.label ? null : section.label
                        )
                      }
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSection?.label === section.label
                          ? 'bg-green-50 text-green-700'
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
                              pathname === item.href ||
                              (item.href !== '/parent' && pathname.startsWith(item.href))
                                ? 'bg-green-50 text-green-700 font-medium'
                                : 'text-gray-700'
                            }`}
                          >
                            <span className="mr-2">{item.icon}</span>
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
                {parentNav.map((section) => (
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
                          pathname === item.href ||
                          (item.href !== '/parent' && pathname.startsWith(item.href))
                            ? 'bg-green-50 text-green-700 font-medium'
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
          <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
            <div className="p-4">
              {parentNav.map((section) => (
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
                          pathname === item.href ||
                          (item.href !== '/parent' && pathname.startsWith(item.href))
                            ? 'bg-green-50 text-green-700 font-medium'
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
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </Protected>
  );
}
