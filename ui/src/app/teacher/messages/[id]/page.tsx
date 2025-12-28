'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useMessages } from '@/hooks/useMessages';
import {
  getConversation,
  sendMessage,
  markAsRead,
  type ConversationResponse,
} from '@/lib/messaging-api';
import MessageThread from '@/components/messaging/MessageThread';
import MessageInput from '@/components/messaging/MessageInput';

export default function TeacherConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const conversationId = params.id as string;
  const userId = user?.id || '';

  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [loadingConv, setLoadingConv] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);

  const { messages, loading: loadingMessages, error: messagesError } = useMessages({
    conversationId,
  });

  // Fetch conversation details
  useEffect(() => {
    async function fetchConversation() {
      if (!conversationId) return;

      try {
        const conv = await getConversation(getIdToken, conversationId);
        setConversation(conv);
        setConvError(null);
      } catch (err) {
        console.error('Failed to fetch conversation:', err);
        setConvError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        setLoadingConv(false);
      }
    }

    fetchConversation();
  }, [conversationId, getIdToken]);

  // Mark messages as read when viewing
  useEffect(() => {
    async function markRead() {
      if (!conversationId || !conversation || conversation.unreadCount === 0) return;

      try {
        await markAsRead(getIdToken, conversationId);
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    markRead();
  }, [conversationId, conversation, getIdToken]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      await sendMessage(getIdToken, conversationId, content);
    },
    [getIdToken, conversationId]
  );

  if (loadingConv) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (convError) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <Link
            href="/teacher/messages"
            className="text-green-600 hover:text-green-700"
          >
            &larr; Back to Messages
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{convError}</p>
          <button
            onClick={() => router.push('/teacher/messages')}
            className="mt-2 text-red-600 hover:text-red-700 underline"
          >
            Return to inbox
          </button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <Link
            href="/teacher/messages"
            className="text-green-600 hover:text-green-700"
          >
            &larr; Back to Messages
          </Link>
        </div>
        <div className="text-center py-8 text-gray-500">
          Conversation not found
        </div>
      </div>
    );
  }

  // Enrich messages with isOwn flag
  const enrichedMessages = messages.map((msg) => ({
    ...msg,
    isOwn: msg.senderId === userId,
  }));

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/teacher/messages"
          className="text-green-600 hover:text-green-700 text-sm"
        >
          &larr; Back to Messages
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow flex flex-col h-full">
        {/* Conversation header */}
        <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
          <h2 className="font-semibold text-gray-900">
            {conversation.parentName}
          </h2>
          {(conversation.studentName || conversation.className) && (
            <p className="text-sm text-gray-500">
              {conversation.studentName && (
                <span>Student: {conversation.studentName}</span>
              )}
              {conversation.studentName && conversation.className && ' - '}
              {conversation.className}
            </p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageThread
            messages={enrichedMessages}
            currentUserId={userId}
            loading={loadingMessages}
            error={messagesError}
          />
        </div>

        {/* Input */}
        <MessageInput
          onSend={handleSendMessage}
          placeholder="Type a message to the parent..."
        />
      </div>
    </div>
  );
}
