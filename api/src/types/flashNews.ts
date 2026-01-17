import { Timestamp } from 'firebase-admin/firestore';

export interface BilingualText {
  en: string;
  ta: string;
}

export interface FlashNews {
  id: string;

  // Bilingual content (keep short: ~100 chars for marquee)
  text: BilingualText;

  // Display control
  isActive: boolean;
  isUrgent: boolean; // Show with warning icon, faster scroll
  priority: number; // 0-100, higher shows first

  // Scheduling
  startDate: Timestamp;
  endDate: Timestamp;

  // Optional link
  linkUrl?: string;
  linkText?: BilingualText;

  // Styling (optional, for urgent items)
  backgroundColor?: string; // Hex color
  textColor?: string; // Hex color

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Admin UID
  updatedBy?: string;
}

export interface CreateFlashNewsDto {
  text: BilingualText;
  isUrgent?: boolean;
  priority?: number;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  linkUrl?: string;
  linkText?: BilingualText;
  backgroundColor?: string;
  textColor?: string;
}

export interface UpdateFlashNewsDto {
  text?: BilingualText;
  isActive?: boolean;
  isUrgent?: boolean;
  priority?: number;
  startDate?: string | null;
  endDate?: string | null;
  linkUrl?: string | null;
  linkText?: BilingualText | null;
  backgroundColor?: string | null;
  textColor?: string | null;
}
