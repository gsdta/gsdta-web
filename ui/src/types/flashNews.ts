/**
 * Bilingual text for Tamil and English support
 */
export interface BilingualText {
  en: string;
  ta: string;
}

/**
 * Flash News item for marquee display
 */
export interface FlashNews {
  id: string;
  text: BilingualText;
  link?: string;
  priority: number;
  isActive: boolean;
  startDate?: string;            // ISO 8601 date string
  endDate?: string;              // ISO 8601 date string
  createdAt: string;             // ISO 8601 date string
  updatedAt: string;             // ISO 8601 date string
  createdBy: string;
  updatedBy?: string;
}

/**
 * Flash news for public display (stripped down)
 */
export interface FlashNewsPublic {
  id: string;
  text: BilingualText;
  link?: string;
  priority: number;
}

/**
 * Form data for creating/editing flash news
 */
export interface FlashNewsFormData {
  textEn: string;
  textTa: string;
  link: string;
  priority: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}
