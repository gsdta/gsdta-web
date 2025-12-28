/**
 * Calendar Event Types for UI
 */
export type EventType = 'gsdta' | 'holiday' | 'test' | 'meeting' | 'academic' | 'sports' | 'other';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventVisibility = 'public' | 'parent' | 'teacher' | 'admin';
export type EventStatus = 'active' | 'inactive';

export interface BilingualText {
  en: string;
  ta?: string;
}

export interface CalendarEvent {
  id: string;
  title: BilingualText;
  description?: BilingualText;
  date: string;
  endDate?: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  eventType: EventType;
  recurrence: RecurrencePattern;
  recurrenceEndDate?: string;
  visibility: EventVisibility[];
  status: EventStatus;
  location?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface CreateCalendarEventInput {
  title: BilingualText;
  description?: BilingualText;
  date: string;
  endDate?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  eventType: EventType;
  recurrence?: RecurrencePattern;
  recurrenceEndDate?: string;
  visibility?: EventVisibility[];
  location?: string;
}

export interface UpdateCalendarEventInput {
  title?: BilingualText;
  description?: BilingualText;
  date?: string;
  endDate?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  eventType?: EventType;
  recurrence?: RecurrencePattern;
  recurrenceEndDate?: string;
  visibility?: EventVisibility[];
  status?: EventStatus;
  location?: string;
}

export interface CalendarEventListResponse {
  events: CalendarEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface CalendarEventFilters {
  startDate?: string;
  endDate?: string;
  eventType?: EventType;
  status?: EventStatus;
  limit?: number;
  offset?: number;
}

/**
 * Event type display names
 */
export const EVENT_TYPE_LABELS: Record<EventType, { en: string; ta: string }> = {
  gsdta: { en: 'GSDTA Event', ta: 'GSDTA நிகழ்வு' },
  holiday: { en: 'Holiday', ta: 'விடுமுறை' },
  test: { en: 'Test/Exam', ta: 'தேர்வு' },
  meeting: { en: 'Meeting', ta: 'கூட்டம்' },
  academic: { en: 'Academic', ta: 'கல்வி' },
  sports: { en: 'Sports', ta: 'விளையாட்டு' },
  other: { en: 'Other', ta: 'மற்றவை' },
};

/**
 * Event type colors (for UI display)
 */
export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  gsdta: '#22c55e',    // Green
  holiday: '#ef4444',  // Red
  test: '#f59e0b',     // Amber
  meeting: '#3b82f6',  // Blue
  academic: '#8b5cf6', // Purple
  sports: '#06b6d4',   // Cyan
  other: '#6b7280',    // Gray
};

/**
 * Recurrence pattern labels
 */
export const RECURRENCE_LABELS: Record<RecurrencePattern, string> = {
  none: 'No repeat',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

/**
 * Visibility labels
 */
export const VISIBILITY_LABELS: Record<EventVisibility, string> = {
  public: 'Public',
  parent: 'Parents',
  teacher: 'Teachers',
  admin: 'Admins',
};
