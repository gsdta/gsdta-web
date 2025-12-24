export interface BilingualText {
  en: string;
  ta: string;
}

export interface FlashNews {
  id: string;
  text: BilingualText;
  linkUrl?: string | null;
  linkText?: BilingualText | null;
  isActive: boolean;
  isUrgent: boolean;
  priority: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
