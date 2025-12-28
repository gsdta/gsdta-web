/**
 * Messaging API client for parent-teacher communication
 */

export type ConversationRole = 'parent' | 'teacher';

export interface ConversationResponse {
  id: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageSenderId: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: ConversationRole;
  content: string;
  readAt?: string;
  createdAt: string;
  isOwn: boolean;
}

export interface ConversationsListResponse {
  success: boolean;
  data: {
    conversations: ConversationResponse[];
    total: number;
    unreadCount: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export interface MessagesListResponse {
  success: boolean;
  data: {
    messages: MessageResponse[];
    hasMore: boolean;
  };
}

export interface CreateConversationRequest {
  targetUserId: string;
  studentId?: string;
  classId?: string;
  initialMessage: string;
}

type TokenGetter = () => Promise<string | null>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(
  getIdToken: TokenGetter,
  params: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<ConversationsListResponse['data']> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.unreadOnly) queryParams.set('unreadOnly', 'true');

  const url = `/api/v1/me/conversations/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<ConversationsListResponse['data']>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch conversations');
  }

  return json.data!;
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(
  getIdToken: TokenGetter,
  conversationId: string
): Promise<ConversationResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/me/conversations/${conversationId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<{ conversation: ConversationResponse }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch conversation');
  }

  return json.data!.conversation;
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  getIdToken: TokenGetter,
  conversationId: string,
  params: { limit?: number; before?: string } = {}
): Promise<MessagesListResponse['data']> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.before) queryParams.set('before', params.before);

  const url = `/api/v1/me/conversations/${conversationId}/messages/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<MessagesListResponse['data']>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch messages');
  }

  return json.data!;
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  getIdToken: TokenGetter,
  conversationId: string,
  content: string
): Promise<MessageResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/me/conversations/${conversationId}/messages/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  const json = (await res.json()) as ApiResponse<{ message: MessageResponse }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to send message');
  }

  return json.data!.message;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  getIdToken: TokenGetter,
  request: CreateConversationRequest
): Promise<{ conversation: ConversationResponse; message: MessageResponse }> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/me/conversations/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const json = (await res.json()) as ApiResponse<{
    conversation: ConversationResponse;
    message: MessageResponse;
  }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to create conversation');
  }

  return json.data!;
}

/**
 * Mark all messages in a conversation as read
 */
export async function markAsRead(
  getIdToken: TokenGetter,
  conversationId: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/me/conversations/${conversationId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || 'Failed to mark as read');
  }
}
