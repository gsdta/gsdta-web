'use client';

import Link from 'next/link';
import type { ConversationResponse, ConversationRole } from '@/lib/messaging-api';

interface ConversationListProps {
  conversations: ConversationResponse[];
  currentUserId: string;
  role: ConversationRole;
  selectedId?: string;
  baseUrl: string;
  loading?: boolean;
  emptyMessage?: string;
}

function formatTime(isoString: string): string {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}

function getOtherParticipantName(
  conversation: ConversationResponse,
  role: ConversationRole
): string {
  return role === 'parent' ? conversation.teacherName : conversation.parentName;
}

export default function ConversationList({
  conversations,
  currentUserId,
  role,
  selectedId,
  baseUrl,
  loading = false,
  emptyMessage = 'No conversations yet',
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedId;
        const otherName = getOtherParticipantName(conversation, role);
        const isOwnMessage = conversation.lastMessageSenderId === currentUserId;

        return (
          <Link
            key={conversation.id}
            href={`${baseUrl}/${conversation.id}`}
            className={`block p-4 transition-colors hover:bg-gray-50 ${
              isSelected ? 'bg-green-50' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Participant name and unread badge */}
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium truncate ${
                    conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {otherName}
                  </h3>
                  {conversation.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>

                {/* Student/class context if available */}
                {(conversation.studentName || conversation.className) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {conversation.studentName && (
                      <span>Re: {conversation.studentName}</span>
                    )}
                    {conversation.studentName && conversation.className && ' - '}
                    {conversation.className && (
                      <span>{conversation.className}</span>
                    )}
                  </p>
                )}

                {/* Message preview */}
                <p className={`text-sm mt-1 truncate ${
                  conversation.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'
                }`}>
                  {isOwnMessage && <span className="text-gray-400">You: </span>}
                  {conversation.lastMessagePreview || 'No messages yet'}
                </p>
              </div>

              {/* Time */}
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatTime(conversation.lastMessageAt)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
