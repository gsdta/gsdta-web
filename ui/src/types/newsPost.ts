/**
 * Bilingual text for Tamil and English support
 */
export interface BilingualText {
  en: string;
  ta: string;
}

/**
 * Rich text content stored as HTML
 */
export interface BilingualRichText {
  en: string;
  ta: string;
}

/**
 * News post categories
 */
export type NewsPostCategory = 'school-news' | 'events' | 'announcements' | 'academic';

/**
 * News post workflow status
 */
export type NewsPostStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'unpublished';

/**
 * Document status for soft delete
 */
export type NewsPostDocStatus = 'active' | 'deleted';

/**
 * Image attachment for news posts
 */
export interface NewsPostImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  alt?: BilingualText;
  caption?: BilingualText;
  order: number;
}

/**
 * Full NewsPost record (UI version with ISO date strings)
 */
export interface NewsPost {
  id: string;
  title: BilingualText;
  summary: BilingualText;
  body: BilingualRichText;
  slug: string;
  category: NewsPostCategory;
  tags?: string[];
  featuredImage?: NewsPostImage;
  images?: NewsPostImage[];
  status: NewsPostStatus;
  docStatus: NewsPostDocStatus;
  isPinned: boolean;               // Pin to top of list
  startDate?: string;              // ISO 8601
  endDate?: string;                // ISO 8601
  priority: number;
  views: number;                   // View count
  metaDescription?: BilingualText; // SEO meta description
  metaKeywords?: string[];         // SEO keywords
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'admin';
  submittedAt?: string;            // ISO 8601
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;             // ISO 8601
  rejectionReason?: string;
  publishedAt?: string;            // ISO 8601
  publishedBy?: string;
  publishedByName?: string;
  unpublishedAt?: string;          // ISO 8601
  unpublishedBy?: string;
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}

/**
 * News post for public display
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
  isPinned: boolean;               // Pin to top of list
  views: number;                   // View count
  metaDescription?: BilingualText; // SEO meta description
  metaKeywords?: string[];         // SEO keywords
}

/**
 * Form data for creating/editing news posts
 */
export interface NewsPostFormData {
  titleEn: string;
  titleTa: string;
  summaryEn: string;
  summaryTa: string;
  bodyEn: string;
  bodyTa: string;
  category: NewsPostCategory;
  tags: string[];
  featuredImage?: Omit<NewsPostImage, 'id'>;
  images: Omit<NewsPostImage, 'id'>[];
  priority: number;
  startDate: string;
  endDate: string;
  isPinned: boolean;               // Admin only - pin to top
  metaDescriptionEn: string;       // SEO meta description (English)
  metaDescriptionTa: string;       // SEO meta description (Tamil)
  metaKeywords: string[];          // SEO keywords
}

/**
 * Category display names
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
 * Status colors for badges
 */
export const NEWS_POST_STATUS_COLORS: Record<NewsPostStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'pending_review': 'bg-yellow-100 text-yellow-800',
  'approved': 'bg-blue-100 text-blue-800',
  'rejected': 'bg-red-100 text-red-800',
  'published': 'bg-green-100 text-green-800',
  'unpublished': 'bg-orange-100 text-orange-800',
};

/**
 * Category colors for badges
 */
export const NEWS_POST_CATEGORY_COLORS: Record<NewsPostCategory, string> = {
  'school-news': 'bg-blue-100 text-blue-800',
  'events': 'bg-purple-100 text-purple-800',
  'announcements': 'bg-yellow-100 text-yellow-800',
  'academic': 'bg-green-100 text-green-800',
};

/**
 * Validation constants
 */
export const NEWS_POST_CONSTANTS = {
  MAX_TITLE_LENGTH: 200,
  MAX_SUMMARY_LENGTH: 300,
  MAX_BODY_LENGTH: 50000,
  MAX_IMAGES: 10,
  MAX_TAGS: 10,
  MAX_TAG_LENGTH: 50,
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 100,
  DEFAULT_PRIORITY: 50,
  MAX_META_DESCRIPTION_LENGTH: 160,
  MAX_META_KEYWORDS: 10,
};
