import { Timestamp } from 'firebase-admin/firestore';

export interface BilingualText {
  en: string;
  ta: string;
}

export interface FlashNews {
  id: string;
  
  // Bilingual content (short text for marquee)
  text: BilingualText;
  
  // Optional link
  linkUrl?: string;
  linkText?: BilingualText;
  
  // Display control
  isActive: boolean;
  isUrgent: boolean; // Shows with warning icon, different styling
  priority: number;  // Higher priority shows first
  
  // Scheduling
  startDate?: Timestamp;
  endDate?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Admin UID
}

export interface CreateFlashNewsDto {
  text: BilingualText;
  linkUrl?: string;
  linkText?: BilingualText;
  isUrgent?: boolean;
  priority?: number;
  startDate?: string; // ISO 8601
  endDate?: string;   // ISO 8601
}

export interface UpdateFlashNewsDto {
  text?: BilingualText;
  linkUrl?: string | null;
  linkText?: BilingualText | null;
  isActive?: boolean;
  isUrgent?: boolean;
  priority?: number;
  startDate?: string | null;
  endDate?: string | null;
}
