'use client';

import { useEffect, useRef } from 'react';
import type { MessageResponse } from '@/lib/messaging-api';

interface MessageThreadProps {
  messages: MessageResponse[];
  currentUserId: string;
  loading?: boolean;
  error?: string | null;
}

function formatMessageTime(isoString: string): string {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (diffDays === 0) {
    return timeStr;
  } else if (diffDays === 1) {
    return `Yesterday ${timeStr}`;
  } else if (diffDays < 7) {
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    return `${dayStr} ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr} ${timeStr}`;
  }
}

function shouldShowDateSeparator(
  currentMsg: MessageResponse,
  prevMsg: MessageResponse | null
): boolean {
  if (!prevMsg) return true;

  const currentDate = new Date(currentMsg.createdAt).toDateString();
  const prevDate = new Date(prevMsg.createdAt).toDateString();

  return currentDate !== prevDate;
}

function formatDateSeparator(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
}

export default function MessageThread({
  messages,
  currentUserId,
  loading = false,
  error = null,
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-600">Error loading messages: {error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No messages yet. Send the first message!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      {messages.map((message, index) => {
        const isOwn = message.senderId === currentUserId;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator = shouldShowDateSeparator(message, prevMessage);

        return (
          <div key={message.id}>
            {/* Date separator */}
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                  {formatDateSeparator(message.createdAt)}
                </span>
              </div>
            )}

            {/* Message bubble */}
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  isOwn
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Sender name (only for received messages) */}
                {!isOwn && (
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    {message.senderName}
                  </p>
                )}

                {/* Message content */}
                <p className="whitespace-pre-wrap break-words">{message.content}</p>

                {/* Timestamp */}
                <p
                  className={`text-xs mt-1 ${
                    isOwn ? 'text-green-100' : 'text-gray-400'
                  }`}
                >
                  {formatMessageTime(message.createdAt)}
                  {message.readAt && isOwn && (
                    <span className="ml-2">Read</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
