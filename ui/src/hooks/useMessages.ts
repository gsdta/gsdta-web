'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFirebaseDb } from '@/lib/firebase/client';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { ConversationResponse, MessageResponse, ConversationRole } from '@/lib/messaging-api';

interface UseConversationsOptions {
  userId: string;
  role: ConversationRole;
  limitCount?: number;
}

interface UseConversationsResult {
  conversations: ConversationResponse[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to subscribe to real-time conversation updates
 */
export function useConversations({
  userId,
  role,
  limitCount = 50,
}: UseConversationsOptions): UseConversationsResult {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!userId) return;

    let unsubscribe: (() => void) | null = null;

    async function subscribe() {
      try {
        const db = getFirebaseDb();
        const fieldName = role === 'parent' ? 'parentId' : 'teacherId';

        const q = query(
          collection(db, 'conversations'),
          where(fieldName, '==', userId),
          orderBy('lastMessageAt', 'desc'),
          limit(limitCount)
        );

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const convs: ConversationResponse[] = [];
            let totalUnread = 0;

            snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data();
              const unreadField =
                role === 'parent' ? 'parentUnreadCount' : 'teacherUnreadCount';
              const unread = data[unreadField] || 0;
              totalUnread += unread;

              convs.push({
                id: doc.id,
                parentId: data.parentId,
                parentName: data.parentName,
                parentEmail: data.parentEmail,
                teacherId: data.teacherId,
                teacherName: data.teacherName,
                teacherEmail: data.teacherEmail,
                studentId: data.studentId,
                studentName: data.studentName,
                classId: data.classId,
                className: data.className,
                lastMessageAt: data.lastMessageAt?.toDate?.()?.toISOString() ?? '',
                lastMessagePreview: data.lastMessagePreview || '',
                lastMessageSenderId: data.lastMessageSenderId || '',
                unreadCount: unread,
                createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? '',
              });
            });

            setConversations(convs);
            setUnreadCount(totalUnread);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error('Conversations subscription error:', err);
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error subscribing to conversations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
        setLoading(false);
      }
    }

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, role, limitCount, refreshKey]);

  return { conversations, unreadCount, loading, error, refresh };
}

interface UseMessagesOptions {
  conversationId: string;
  limitCount?: number;
}

interface UseMessagesResult {
  messages: MessageResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to subscribe to real-time message updates for a conversation
 */
export function useMessages({
  conversationId,
  limitCount = 100,
}: UseMessagesOptions): UseMessagesResult {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    let unsubscribe: (() => void) | null = null;

    async function subscribe() {
      try {
        const db = getFirebaseDb();

        const q = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          orderBy('createdAt', 'asc'),
          limit(limitCount)
        );

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const msgs: MessageResponse[] = [];

            snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data();
              msgs.push({
                id: doc.id,
                conversationId: data.conversationId,
                senderId: data.senderId,
                senderName: data.senderName,
                senderRole: data.senderRole,
                content: data.content,
                readAt: data.readAt?.toDate?.()?.toISOString(),
                createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
                isOwn: false, // Will be set by the component based on current user
              });
            });

            setMessages(msgs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error('Messages subscription error:', err);
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error subscribing to messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        setLoading(false);
      }
    }

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, limitCount, refreshKey]);

  return { messages, loading, error, refresh };
}
