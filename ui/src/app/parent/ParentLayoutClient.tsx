'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Protected } from '@/components/Protected';
import { useAuth } from '@/components/AuthProvider';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';
import { filterNavSections } from '@/lib/featureMapping';
import { UserDropdown, UserDropdownMobile } from '@/components/UserDropdown';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const parentNav: NavSection[] = [
  {
    label: 'Dashboard',
    items: [{ label: 'Overview', href: '/parent', icon: '🏠' }],
  },
  {
    label: 'Students',
    items: [
      { label: 'My Students', href: '/parent/students', icon: '👨‍👧‍👦' },
      { label: 'Register Student', href: '/parent/students/register', icon: '➕' },
    ],
  },
  {
    label: 'Communication',
    items: [{ label: 'Messages', href: '/parent/messages', icon: '💬' }],
  },
  {
    label: 'Account',
    items: [
      { label: 'My Profile', href: '/parent/profile', icon: '👤' },
      { label: 'Settings', href: '/parent/settings', icon: '⚙️' },
    ],
  },
];

type ProfileData = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  isProfileComplete?: boolean;
};

export default function ParentLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, getIdToken } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Filter navigation based on feature flags
  const navigation = useMemo(() => {
    return filterNavSections(parentNav, 'parent', isFeatureEnabled);
  }, [isFeatureEnabled]);

  // Fetch profile to check completion status
  useEffect(() => {
    async function checkProfile() {
      if (!user) {
        setProfileLoading(false);
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          setProfileLoading(false);
          return;
        }

        const res = await fetch('/api/v1/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
          setProfileComplete(data.isProfileComplete === true);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setProfileLoading(false);
      }
    }

    checkProfile();
  }, [user, getIdToken]);

  const handleProfileComplete = () => {
    setProfileComplete(true);
  };

  const isActive = (href: string) => {
    if (href === '/parent') {
      return pathname === '/parent';
    }
    return pathname.startsWith(href);
  };

  return (
    <Protected roles={['parent']}>
      {/* Profile Completion Modal - blocks access until profile is complete */}
      {!profileLoading && !profileComplete && (
        <ProfileCompletionModal
          initialData={profileData || undefined}
          onComplete={handleProfileComplete}
        />
      )}
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Brand */}
              <Link href="/parent" className="text-xl font-bold text-gray-900">
                Parent Portal
              </Link>

              {/* Desktop: User dropdown */}
              <div className="hidden md:flex items-center gap-4">
                <UserDropdown />
              </div>

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
                {/* User menu for mobile */}
                <div className="px-4">
                  <UserDropdownMobile onItemClick={() => setMobileMenuOpen(false)} />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Two-pane layout */}
        <div className="flex">
          {/* Left Sidebar - Desktop only */}
          <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
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

