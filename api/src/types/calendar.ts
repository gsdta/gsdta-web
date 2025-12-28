import { Timestamp } from 'firebase-admin/firestore';

/**
 * Calendar Event Types
 */
export type EventType = 'gsdta' | 'holiday' | 'test' | 'meeting' | 'academic' | 'sports' | 'other';

/**
 * Recurrence patterns for events
 */
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Event visibility levels
 */
export type EventVisibility = 'public' | 'parent' | 'teacher' | 'admin';

/**
 * Event status
 */
export type EventStatus = 'active' | 'inactive';

/**
 * Bilingual text for title and description
 */
export interface BilingualText {
  en: string;
  ta?: string;
}

/**
 * Calendar Event stored in Firestore
 */
export interface CalendarEvent {
  id: string;
  title: BilingualText;
  description?: BilingualText;

  // Date and time
  date: string;       // YYYY-MM-DD (start date)
  endDate?: string;   // YYYY-MM-DD (for multi-day events)
  allDay: boolean;    // If false, use startTime/endTime
  startTime?: string; // HH:MM (24-hour format)
  endTime?: string;   // HH:MM (24-hour format)

  // Event classification
  eventType: EventType;

  // Recurrence
  recurrence: RecurrencePattern;
  recurrenceEndDate?: string; // YYYY-MM-DD - when recurring events stop

  // Visibility and status
  visibility: EventVisibility[];
  status: EventStatus;

  // Location (optional)
  location?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;

  // Soft delete flag
  docStatus: 'active' | 'deleted';
}

/**
 * DTO for creating a calendar event
 */
export interface CreateCalendarEventDto {
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

/**
 * DTO for updating a calendar event
 */
export interface UpdateCalendarEventDto {
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

/**
 * Filters for listing calendar events
 */
export interface CalendarEventFilters {
  startDate?: string;      // Filter events from this date
  endDate?: string;        // Filter events until this date
  eventType?: EventType;   // Filter by event type
  visibility?: EventVisibility; // Filter by visibility level
  status?: EventStatus;    // Filter by status (default: active)
  limit?: number;          // Pagination limit
  offset?: number;         // Pagination offset
}

/**
 * Response for listing calendar events
 */
export interface CalendarEventListResponse {
  events: CalendarEvent[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Expanded event instance (for recurring events)
 * Same as CalendarEvent but with instanceDate for the specific occurrence
 */
export interface CalendarEventInstance extends Omit<CalendarEvent, 'date'> {
  date: string;           // The date of this specific instance
  originalDate: string;   // The original/base date of the recurring event
  isRecurringInstance: boolean;
}

/**
 * Default values
 */
export const DEFAULT_EVENT_VISIBILITY: EventVisibility[] = ['public'];
export const DEFAULT_RECURRENCE: RecurrencePattern = 'none';
export const DEFAULT_STATUS: EventStatus = 'active';

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
