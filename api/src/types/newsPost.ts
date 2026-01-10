import { Timestamp } from 'firebase-admin/firestore';

/**
 * Bilingual text for Tamil and English support
 */
export interface BilingualText {
  en: string;
  ta: string;
}

/**
 * Rich text content stored as HTML (from TipTap editor)
 */
export interface BilingualRichText {
  en: string;  // HTML content
  ta: string;  // HTML content
}

/**
 * News post categories
 */
export type NewsPostCategory = 'school-news' | 'events' | 'announcements' | 'academic';

/**
 * News post workflow status
 */
export type NewsPostStatus =
  | 'draft'           // Initial state, author can edit
  | 'pending_review'  // Submitted for admin review
  | 'approved'        // Admin approved, ready to publish
  | 'rejected'        // Admin rejected with feedback
  | 'published'       // Live and visible to public
  | 'unpublished';    // Was published, now hidden

/**
 * Document status for soft delete
 */
export type NewsPostDocStatus = 'active' | 'deleted';

/**
 * Image attachment for news posts
 */
export interface NewsPostImage {
  id: string;              // Unique identifier
  url: string;             // Firebase Storage URL
  thumbnailUrl?: string;   // Optimized thumbnail URL
  alt?: BilingualText;     // Alt text for accessibility
  caption?: BilingualText; // Image caption
  order: number;           // Display order
}

/**
 * Full NewsPost record as stored in Firestore
 */
export interface NewsPost {
  id: string;

  // Content
  title: BilingualText;
  summary: BilingualText;          // Short preview (plain text, max 300 chars)
  body: BilingualRichText;         // Rich text HTML content
  slug: string;                    // URL-friendly slug (auto-generated)

  // Categorization
  category: NewsPostCategory;
  tags?: string[];                 // Optional tags for filtering

  // Media
  featuredImage?: NewsPostImage;   // Main/hero image
  images?: NewsPostImage[];        // Additional gallery images

  // Status & Workflow
  status: NewsPostStatus;
  docStatus: NewsPostDocStatus;

  // Scheduling
  startDate?: Timestamp;           // When to start showing (optional)
  endDate?: Timestamp;             // When to stop showing (optional)
  priority: number;                // Display order (1-100, higher = first)

  // Author tracking
  authorId: string;                // Teacher/Admin UID who created
  authorName: string;              // Denormalized author name
  authorRole: 'teacher' | 'admin'; // Role at creation time

  // Review workflow
  submittedAt?: Timestamp;         // When submitted for review
  reviewedBy?: string;             // Admin UID who reviewed
  reviewedByName?: string;         // Admin name who reviewed
  reviewedAt?: Timestamp;          // When reviewed
  rejectionReason?: string;        // Feedback if rejected

  // Publishing
  publishedAt?: Timestamp;         // When made public
  publishedBy?: string;            // Admin UID who published
  publishedByName?: string;        // Admin name who published
  unpublishedAt?: Timestamp;       // When unpublished
  unpublishedBy?: string;          // Admin UID who unpublished

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * DTO for creating a news post
 */
export interface CreateNewsPostDto {
  title: BilingualText;
  summary: BilingualText;
  body: BilingualRichText;
  category: NewsPostCategory;
  tags?: string[];
  featuredImage?: Omit<NewsPostImage, 'id'>;
  images?: Omit<NewsPostImage, 'id'>[];
  priority?: number;               // Defaults to 50
  startDate?: string;              // ISO 8601
  endDate?: string;                // ISO 8601
  status?: 'draft' | 'pending_review'; // Initial status (teachers can only set these)
}

/**
 * DTO for updating a news post
 */
export interface UpdateNewsPostDto {
  title?: BilingualText;
  summary?: BilingualText;
  body?: BilingualRichText;
  category?: NewsPostCategory;
  tags?: string[];
  featuredImage?: Omit<NewsPostImage, 'id'> | null; // null to remove
  images?: Omit<NewsPostImage, 'id'>[];
  priority?: number;
  startDate?: string | null;       // null to clear
  endDate?: string | null;         // null to clear
}

/**
 * Admin review action DTO
 */
export interface ReviewNewsPostDto {
  action: 'approve' | 'reject';
  rejectionReason?: string;        // Required if rejecting
}

/**
 * News post response for public API (stripped down, no workflow fields)
 */
export interface NewsPostPublic {
  id: string;
  title: BilingualText;
  summary: BilingualText;
  body: BilingualRichText;
  slug: string;
  category: NewsPostCategory;
  tags?: string[];
  featuredImage?: NewsPostImage;
  images?: NewsPostImage[];
  authorName: string;
  publishedAt: string;             // ISO 8601
  priority: number;
}

/**
 * List filters for admin
 */
export interface NewsPostFilters {
  status?: NewsPostStatus | 'all';
  category?: NewsPostCategory | 'all';
  authorId?: string;
  authorRole?: 'teacher' | 'admin' | 'all';
  limit?: number;
  offset?: number;
}

/**
 * List filters for teacher (own posts)
 */
export interface TeacherNewsPostFilters {
  status?: NewsPostStatus | 'all';
  limit?: number;
  offset?: number;
}

/**
 * List filters for public
 */
export interface PublicNewsPostFilters {
  category?: NewsPostCategory | 'all';
  limit?: number;
  offset?: number;
}

/**
 * Category display names (bilingual)
 */
export const NEWS_POST_CATEGORIES: Record<NewsPostCategory, BilingualText> = {
  'school-news': { en: 'School News', ta: 'பள்ளி செய்திகள்' },
  'events': { en: 'Events', ta: 'நிகழ்வுகள்' },
  'announcements': { en: 'Announcements', ta: 'அறிவிப்புகள்' },
  'academic': { en: 'Academic', ta: 'கல்வி' },
};

/**
 * Status display names
 */
export const NEWS_POST_STATUS_NAMES: Record<NewsPostStatus, string> = {
  'draft': 'Draft',
  'pending_review': 'Pending Review',
  'approved': 'Approved',
  'rejected': 'Rejected',
  'published': 'Published',
  'unpublished': 'Unpublished',
};

/**
 * Constants for validation
 */
export const NEWS_POST_CONSTANTS = {
  MAX_TITLE_LENGTH: 200,
  MAX_SUMMARY_LENGTH: 300,
  MAX_BODY_LENGTH: 50000,          // HTML content
  MAX_IMAGES: 10,
  MAX_TAGS: 10,
  MAX_TAG_LENGTH: 50,
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 100,
  DEFAULT_PRIORITY: 50,
  VALID_CATEGORIES: ['school-news', 'events', 'announcements', 'academic'] as const,
  VALID_STATUSES: ['draft', 'pending_review', 'approved', 'rejected', 'published', 'unpublished'] as const,
};
