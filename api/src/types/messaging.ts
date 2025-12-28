import { Timestamp } from 'firebase-admin/firestore';

/**
 * User role in a conversation
 */
export type ConversationRole = 'parent' | 'teacher';

/**
 * Message in a conversation
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: ConversationRole;
  content: string;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

/**
 * Conversation between a parent and teacher
 */
export interface Conversation {
  id: string;

  // Participants
  parentId: string;
  parentName: string;
  parentEmail: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;

  // Context (optional - for reference)
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;

  // Status
  lastMessageAt: Timestamp;
  lastMessagePreview: string;      // First 100 chars of last message
  lastMessageSenderId: string;     // Who sent the last message
  parentUnreadCount: number;
  teacherUnreadCount: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;               // User who initiated
}

/**
 * DTO for creating a new conversation
 */
export interface CreateConversationDto {
  // Target participant (the other user)
  targetUserId: string;

  // Optional context
  studentId?: string;
  classId?: string;

  // Initial message
  initialMessage: string;
}

/**
 * DTO for sending a message
 */
export interface SendMessageDto {
  content: string;
}

/**
 * Response types for API
 */
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
  unreadCount: number;             // For the requesting user
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
  isOwn: boolean;                  // True if sender is requesting user
}

/**
 * Filters for listing conversations
 */
export interface ConversationListFilters {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

/**
 * Filters for listing messages
 */
export interface MessageListFilters {
  limit?: number;
  before?: string;                 // Cursor for pagination (message ID)
}

/**
 * Convert Firestore Conversation to API response
 */
export function conversationToResponse(
  conv: Conversation,
  requestingUserId: string,
  requestingRole: ConversationRole
): ConversationResponse {
  return {
    id: conv.id,
    parentId: conv.parentId,
    parentName: conv.parentName,
    parentEmail: conv.parentEmail,
    teacherId: conv.teacherId,
    teacherName: conv.teacherName,
    teacherEmail: conv.teacherEmail,
    studentId: conv.studentId,
    studentName: conv.studentName,
    classId: conv.classId,
    className: conv.className,
    lastMessageAt: conv.lastMessageAt?.toDate?.()?.toISOString() ?? '',
    lastMessagePreview: conv.lastMessagePreview,
    lastMessageSenderId: conv.lastMessageSenderId,
    unreadCount: requestingRole === 'parent' ? conv.parentUnreadCount : conv.teacherUnreadCount,
    createdAt: conv.createdAt?.toDate?.()?.toISOString() ?? '',
    updatedAt: conv.updatedAt?.toDate?.()?.toISOString() ?? '',
  };
}

/**
 * Convert Firestore Message to API response
 */
export function messageToResponse(
  msg: Message,
  requestingUserId: string
): MessageResponse {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    content: msg.content,
    readAt: msg.readAt?.toDate?.()?.toISOString(),
    createdAt: msg.createdAt?.toDate?.()?.toISOString() ?? '',
    isOwn: msg.senderId === requestingUserId,
  };
}
