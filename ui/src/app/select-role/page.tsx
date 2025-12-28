'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Protected } from '@/components/Protected';
import { useI18n } from '@/i18n/LanguageProvider';
import type { Role } from '@/lib/auth-types';

const roleConfig: Record<Role, { labelKey: string; descriptionKey: string; color: string; dashboard: string }> = {
  super_admin: {
    labelKey: 'roles.superAdmin',
    descriptionKey: 'roles.superAdminDescription',
    color: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-800',
    dashboard: '/admin',
  },
  admin: {
    labelKey: 'roles.admin',
    descriptionKey: 'roles.adminDescription',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800',
    dashboard: '/admin',
  },
  teacher: {
    labelKey: 'roles.teacher',
    descriptionKey: 'roles.teacherDescription',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-800',
    dashboard: '/teacher',
  },
  parent: {
    labelKey: 'roles.parent',
    descriptionKey: 'roles.parentDescription',
    color: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-800',
    dashboard: '/parent',
  },
};

function SelectRoleContent() {
  const { user, setRole } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  // If user has only one role, redirect directly to their dashboard
  useEffect(() => {
    if (user && user.roles.length === 1) {
      const config = roleConfig[user.roles[0]];
      router.replace(config.dashboard);
    }
  }, [user, router]);

  if (!user) return null;

  // If only one role, show loading while redirecting
  if (user.roles.length === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  const handleRoleSelect = async (role: Role) => {
    await setRole(role);
    const config = roleConfig[role];
    router.push(config.dashboard);
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2" data-testid="page-title">
          {t('selectRole.title')}
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {t('selectRole.description')}
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {user.roles.map((role) => {
            const config = roleConfig[role];
            return (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className={`p-6 rounded-lg border-2 transition-all ${config.color} text-left`}
              >
                <h2 className="text-lg font-semibold mb-2">{t(config.labelKey)}</h2>
                <p className="text-sm opacity-80">{t(config.descriptionKey)}</p>
                {user.role === role && (
                  <span className="inline-block mt-3 text-xs font-medium bg-white/50 px-2 py-1 rounded">
                    {t('selectRole.currentRole')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <Protected>
      <SelectRoleContent />
    </Protected>
  );
}
