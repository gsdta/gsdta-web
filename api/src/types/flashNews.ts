import { Timestamp } from 'firebase-admin/firestore';

/**
 * Bilingual text for Tamil and English support
 */
export interface BilingualText {
  en: string;
  ta: string;
}

/**
 * Flash News item for marquee display
 * Short announcements that scroll across the screen
 */
export interface FlashNews {
  id: string;

  // Content
  text: BilingualText;           // Short announcement text (max 200 chars each)
  link?: string;                 // Optional click-through URL

  // Display settings
  priority: number;              // Higher priority = shows first (1-100)
  isActive: boolean;             // Toggle visibility

  // Scheduling
  startDate?: Timestamp;         // When to start showing
  endDate?: Timestamp;           // When to stop showing

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;             // Admin UID who created
  updatedBy?: string;            // Admin UID who last updated
}

/**
 * DTO for creating a new flash news item
 */
export interface CreateFlashNewsDto {
  text: BilingualText;
  link?: string;
  priority?: number;             // Defaults to 50
  isActive?: boolean;            // Defaults to false
  startDate?: string;            // ISO 8601 date string
  endDate?: string;              // ISO 8601 date string
}

/**
 * DTO for updating a flash news item
 */
export interface UpdateFlashNewsDto {
  text?: BilingualText;
  link?: string | null;          // null to clear
  priority?: number;
  isActive?: boolean;
  startDate?: string | null;     // null to clear
  endDate?: string | null;       // null to clear
}

/**
 * Flash news response for public API (stripped down)
 */
export interface FlashNewsPublic {
  id: string;
  text: BilingualText;
  link?: string;
  priority: number;
}

/**
 * List filters for admin
 */
export interface FlashNewsFilters {
  status?: 'all' | 'active' | 'inactive';
  limit?: number;
}
