'use client';

import { TeacherInviteForm } from '@/components/TeacherInviteForm';

export default function InviteTeacherPage() {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Teacher</h1>
        <p className="text-gray-600 mb-6">
          Send an invitation email to a new teacher. They will receive a unique link to set up their account.
        </p>

        <TeacherInviteForm />

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How it works</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Enter the teacher&apos;s email address</li>
            <li>System sends an invitation link valid for 7 days</li>
            <li>Teacher clicks link to create account with teacher role</li>
            <li>Account appears in &quot;All Teachers&quot; list once created</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
