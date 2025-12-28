'use client';

import { useAuth } from '@/components/AuthProvider';
import { useConversations } from '@/hooks/useMessages';
import ConversationList from '@/components/messaging/ConversationList';

export default function ParentMessagesPage() {
  const { user } = useAuth();
  const userId = user?.id || '';

  const { conversations, unreadCount, loading, error } = useConversations({
    userId,
    role: 'parent',
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">
          Communicate with your child&apos;s teachers
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {unreadCount} unread
            </span>
          )}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Conversations list */}
      <div className="bg-white rounded-lg shadow">
        <ConversationList
          conversations={conversations}
          currentUserId={userId}
          role="parent"
          baseUrl="/parent/messages"
          loading={loading}
          emptyMessage="No messages yet. Your teachers will be able to message you once your child is enrolled in a class."
        />
      </div>
    </div>
  );
}
