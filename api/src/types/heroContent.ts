import { Timestamp } from 'firebase-admin/firestore';

export interface BilingualText {
  en: string;
  ta: string;
}

export interface HeroContent {
  id: string;
  type: 'thirukkural' | 'event';
  
  // Bilingual fields
  title: BilingualText;
  subtitle: BilingualText;
  description?: BilingualText;
  
  // Media
  imageUrl?: string;
  
  // Call-to-action
  ctaText?: BilingualText;
  ctaLink?: string;
  
  // Display control
  startDate?: Timestamp;
  endDate?: Timestamp;
  isActive: boolean;
  priority?: number; // Higher priority shows first if multiple active
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Admin UID
  updatedBy?: string;
}

export interface CreateHeroContentDto {
  type: 'thirukkural' | 'event';
  title: BilingualText;
  subtitle: BilingualText;
  description?: BilingualText;
  imageUrl?: string;
  ctaText?: BilingualText;
  ctaLink?: string;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  priority?: number;
}

export interface UpdateHeroContentDto {
  title?: BilingualText;
  subtitle?: BilingualText;
  description?: BilingualText;
  imageUrl?: string;
  ctaText?: BilingualText;
  ctaLink?: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  priority?: number;
}
