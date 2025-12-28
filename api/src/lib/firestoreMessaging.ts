import { adminDb } from './firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type {
  Conversation,
  Message,
  CreateConversationDto,
  ConversationRole,
  ConversationListFilters,
  MessageListFilters,
} from '@/types/messaging';
import { getUserProfile } from './firestoreUsers';
import { getStudentById } from './firestoreStudents';
import { getClassById } from './firestoreClasses';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

/**
 * Get a conversation by ID
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  const doc = await getDb().collection(CONVERSATIONS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Conversation;
}

/**
 * Find existing conversation between parent and teacher
 */
export async function findConversation(
  parentId: string,
  teacherId: string
): Promise<Conversation | null> {
  const snap = await getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .where('parentId', '==', parentId)
    .where('teacherId', '==', teacherId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Conversation;
}

/**
 * Create a new conversation with an initial message
 */
export async function createConversation(
  initiatorId: string,
  initiatorRole: ConversationRole,
  data: CreateConversationDto
): Promise<{ conversation: Conversation; message: Message }> {
  const now = Timestamp.now();

  // Get initiator profile
  const initiator = await getUserProfile(initiatorId);
  if (!initiator) {
    throw new Error('Initiator user not found');
  }

  // Get target profile
  const target = await getUserProfile(data.targetUserId);
  if (!target) {
    throw new Error('Target user not found');
  }

  // Determine parent and teacher based on roles
  let parentId: string, parentName: string, parentEmail: string;
  let teacherId: string, teacherName: string, teacherEmail: string;

  if (initiatorRole === 'parent') {
    parentId = initiatorId;
    parentName = initiator.name || initiator.email || 'Unknown';
    parentEmail = initiator.email || '';
    teacherId = data.targetUserId;
    teacherName = target.name || target.email || 'Unknown';
    teacherEmail = target.email || '';

    // Verify target is a teacher
    if (!target.roles.includes('teacher') && !target.roles.includes('admin')) {
      throw new Error('Target user is not a teacher');
    }
  } else {
    teacherId = initiatorId;
    teacherName = initiator.name || initiator.email || 'Unknown';
    teacherEmail = initiator.email || '';
    parentId = data.targetUserId;
    parentName = target.name || target.email || 'Unknown';
    parentEmail = target.email || '';

    // Verify target is a parent
    if (!target.roles.includes('parent')) {
      throw new Error('Target user is not a parent');
    }
  }

  // Check if conversation already exists
  const existing = await findConversation(parentId, teacherId);
  if (existing) {
    // Add message to existing conversation
    const message = await sendMessage(existing.id, initiatorId, initiatorRole, data.initialMessage);
    const updated = await getConversationById(existing.id);
    return { conversation: updated!, message };
  }

  // Get optional context
  let studentName: string | undefined;
  let className: string | undefined;

  if (data.studentId) {
    const student = await getStudentById(data.studentId);
    if (student) {
      studentName = `${student.firstName} ${student.lastName}`;
    }
  }

  if (data.classId) {
    const classInfo = await getClassById(data.classId);
    if (classInfo) {
      className = classInfo.name;
    }
  }

  // Create message preview
  const messagePreview = data.initialMessage.substring(0, 100);

  // Create conversation
  const conversationData: Omit<Conversation, 'id'> = {
    parentId,
    parentName,
    parentEmail,
    teacherId,
    teacherName,
    teacherEmail,
    studentId: data.studentId,
    studentName,
    classId: data.classId,
    className,
    lastMessageAt: now,
    lastMessagePreview: messagePreview,
    lastMessageSenderId: initiatorId,
    parentUnreadCount: initiatorRole === 'teacher' ? 1 : 0,
    teacherUnreadCount: initiatorRole === 'parent' ? 1 : 0,
    createdAt: now,
    updatedAt: now,
    createdBy: initiatorId,
  };

  const convRef = await getDb().collection(CONVERSATIONS_COLLECTION).add(conversationData);

  // Create initial message
  const messageData: Omit<Message, 'id'> = {
    conversationId: convRef.id,
    senderId: initiatorId,
    senderName: initiatorRole === 'parent' ? parentName : teacherName,
    senderRole: initiatorRole,
    content: data.initialMessage,
    createdAt: now,
  };

  const msgRef = await getDb().collection(MESSAGES_COLLECTION).add(messageData);

  return {
    conversation: { id: convRef.id, ...conversationData },
    message: { id: msgRef.id, ...messageData },
  };
}

/**
 * Send a message in an existing conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderRole: ConversationRole,
  content: string
): Promise<Message> {
  const now = Timestamp.now();

  // Get conversation to update
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Verify sender is a participant
  if (senderId !== conversation.parentId && senderId !== conversation.teacherId) {
    throw new Error('User is not a participant in this conversation');
  }

  // Get sender name
  const senderName = senderRole === 'parent' ? conversation.parentName : conversation.teacherName;

  // Create message
  const messageData: Omit<Message, 'id'> = {
    conversationId,
    senderId,
    senderName,
    senderRole,
    content,
    createdAt: now,
  };

  const msgRef = await getDb().collection(MESSAGES_COLLECTION).add(messageData);

  // Update conversation
  const messagePreview = content.substring(0, 100);
  const updateData: Record<string, unknown> = {
    lastMessageAt: now,
    lastMessagePreview: messagePreview,
    lastMessageSenderId: senderId,
    updatedAt: now,
  };

  // Increment unread count for the other participant
  if (senderRole === 'parent') {
    updateData.teacherUnreadCount = FieldValue.increment(1);
  } else {
    updateData.parentUnreadCount = FieldValue.increment(1);
  }

  await getDb().collection(CONVERSATIONS_COLLECTION).doc(conversationId).update(updateData);

  return { id: msgRef.id, ...messageData };
}

/**
 * Get conversations for a user
 */
export async function getConversationsForUser(
  userId: string,
  role: ConversationRole,
  filters: ConversationListFilters = {}
): Promise<{ conversations: Conversation[]; total: number }> {
  const { limit = 50, offset = 0, unreadOnly = false } = filters;

  const fieldName = role === 'parent' ? 'parentId' : 'teacherId';
  let query = getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .where(fieldName, '==', userId)
    .orderBy('lastMessageAt', 'desc');

  if (unreadOnly) {
    const unreadField = role === 'parent' ? 'parentUnreadCount' : 'teacherUnreadCount';
    query = query.where(unreadField, '>', 0);
  }

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const conversations = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Conversation[];

  return { conversations, total };
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  filters: MessageListFilters = {}
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const { limit = 50, before } = filters;

  let query = getDb()
    .collection(MESSAGES_COLLECTION)
    .where('conversationId', '==', conversationId)
    .orderBy('createdAt', 'desc')
    .limit(limit + 1); // Fetch one extra to check if there are more

  if (before) {
    const beforeDoc = await getDb().collection(MESSAGES_COLLECTION).doc(before).get();
    if (beforeDoc.exists) {
      query = query.startAfter(beforeDoc);
    }
  }

  const snap = await query.get();

  const messages = snap.docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Message[];

  // Reverse to get chronological order
  messages.reverse();

  return {
    messages,
    hasMore: snap.docs.length > limit,
  };
}

/**
 * Mark messages as read for a user
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string,
  role: ConversationRole
): Promise<void> {
  const now = Timestamp.now();

  // Get conversation
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Verify user is participant
  if (userId !== conversation.parentId && userId !== conversation.teacherId) {
    throw new Error('User is not a participant in this conversation');
  }

  // Mark unread messages as read
  const unreadQuery = getDb()
    .collection(MESSAGES_COLLECTION)
    .where('conversationId', '==', conversationId)
    .where('senderId', '!=', userId)
    .where('readAt', '==', null);

  const unreadSnap = await unreadQuery.get();

  if (!unreadSnap.empty) {
    const batch = getDb().batch();

    unreadSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { readAt: now });
    });

    await batch.commit();
  }

  // Reset unread count for user
  const unreadField = role === 'parent' ? 'parentUnreadCount' : 'teacherUnreadCount';
  await getDb().collection(CONVERSATIONS_COLLECTION).doc(conversationId).update({
    [unreadField]: 0,
    updatedAt: now,
  });
}

/**
 * Get unread count for a user across all conversations
 */
export async function getUnreadCount(
  userId: string,
  role: ConversationRole
): Promise<number> {
  const fieldName = role === 'parent' ? 'parentId' : 'teacherId';
  const unreadField = role === 'parent' ? 'parentUnreadCount' : 'teacherUnreadCount';

  const snap = await getDb()
    .collection(CONVERSATIONS_COLLECTION)
    .where(fieldName, '==', userId)
    .where(unreadField, '>', 0)
    .get();

  let total = 0;
  snap.docs.forEach((doc) => {
    const data = doc.data();
    total += data[unreadField] || 0;
  });

  return total;
}

/**
 * Check if user can access a conversation
 */
export async function canAccessConversation(
  conversationId: string,
  userId: string
): Promise<{ canAccess: boolean; role?: ConversationRole }> {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return { canAccess: false };
  }

  if (conversation.parentId === userId) {
    return { canAccess: true, role: 'parent' };
  }

  if (conversation.teacherId === userId) {
    return { canAccess: true, role: 'teacher' };
  }

  return { canAccess: false };
}
