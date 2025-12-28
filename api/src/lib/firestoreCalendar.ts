import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  CalendarEvent,
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarEventFilters,
  CalendarEventListResponse,
  CalendarEventInstance,
  DEFAULT_EVENT_VISIBILITY,
  DEFAULT_RECURRENCE,
  DEFAULT_STATUS,
} from '@/types/calendar';

const COLLECTION = 'calendar';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(
  data: CreateCalendarEventDto,
  creatorUid: string,
  creatorName?: string
): Promise<CalendarEvent> {
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc();
  const now = Timestamp.now();

  const event: CalendarEvent = {
    id: docRef.id,
    title: data.title,
    description: data.description,
    date: data.date,
    endDate: data.endDate,
    allDay: data.allDay ?? true,
    startTime: data.startTime,
    endTime: data.endTime,
    eventType: data.eventType,
    recurrence: data.recurrence ?? DEFAULT_RECURRENCE,
    recurrenceEndDate: data.recurrenceEndDate,
    visibility: data.visibility ?? DEFAULT_EVENT_VISIBILITY,
    status: DEFAULT_STATUS,
    location: data.location,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorUid,
    createdByName: creatorName,
    docStatus: 'active',
  };

  await docRef.set(event);
  return event;
}

/**
 * Get a single calendar event by ID
 */
export async function getCalendarEventById(id: string): Promise<CalendarEvent | null> {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data();
  if (!data || data.docStatus === 'deleted') return null;

  return {
    id: doc.id,
    ...data,
  } as CalendarEvent;
}

/**
 * Get all calendar events with filters
 */
export async function getAllCalendarEvents(
  filters: CalendarEventFilters = {}
): Promise<CalendarEventListResponse> {
  const db = getDb();
  let query = db.collection(COLLECTION).where('docStatus', '==', 'active');

  // Filter by status
  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  // Filter by event type
  if (filters.eventType) {
    query = query.where('eventType', '==', filters.eventType);
  }

  // Filter by visibility
  if (filters.visibility) {
    query = query.where('visibility', 'array-contains', filters.visibility);
  }

  // Order by date
  query = query.orderBy('date', 'asc');

  // Get all matching documents first for total count
  const allDocs = await query.get();
  let events = allDocs.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CalendarEvent[];

  // Apply date range filters in memory (Firestore limitation with multiple range queries)
  if (filters.startDate) {
    events = events.filter((e) => e.date >= filters.startDate!);
  }
  if (filters.endDate) {
    events = events.filter((e) => e.date <= filters.endDate!);
  }

  const total = events.length;

  // Apply pagination
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 100;
  events = events.slice(offset, offset + limit);

  return {
    events,
    total,
    limit,
    offset,
  };
}

/**
 * Get public calendar events (for unauthenticated access)
 */
export async function getPublicCalendarEvents(
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> {
  const db = getDb();
  const query = db
    .collection(COLLECTION)
    .where('docStatus', '==', 'active')
    .where('status', '==', 'active')
    .where('visibility', 'array-contains', 'public')
    .orderBy('date', 'asc');

  const snapshot = await query.get();
  let events = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CalendarEvent[];

  // Apply date range filters
  if (startDate) {
    events = events.filter((e) => e.date >= startDate);
  }
  if (endDate) {
    events = events.filter((e) => e.date <= endDate);
  }

  return events;
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  id: string,
  data: UpdateCalendarEventDto,
  updaterUid: string,
  updaterName?: string
): Promise<CalendarEvent | null> {
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists || doc.data()?.docStatus === 'deleted') {
    return null;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
    updatedBy: updaterUid,
    updatedByName: updaterName,
  };

  // Only update fields that are provided
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.allDay !== undefined) updateData.allDay = data.allDay;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;
  if (data.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = data.recurrenceEndDate;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.location !== undefined) updateData.location = data.location;

  await docRef.update(updateData);

  return getCalendarEventById(id);
}

/**
 * Soft delete a calendar event
 */
export async function deleteCalendarEvent(
  id: string,
  updaterUid: string
): Promise<boolean> {
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists || doc.data()?.docStatus === 'deleted') {
    return false;
  }

  await docRef.update({
    docStatus: 'deleted',
    status: 'inactive',
    updatedAt: Timestamp.now(),
    updatedBy: updaterUid,
  });

  return true;
}

/**
 * Expand recurring events into individual instances within a date range
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  startDate: string,
  endDate: string
): CalendarEventInstance[] {
  const instances: CalendarEventInstance[] = [];

  for (const event of events) {
    if (event.recurrence === 'none') {
      // Non-recurring event - include if within range
      if (event.date >= startDate && event.date <= endDate) {
        instances.push({
          ...event,
          originalDate: event.date,
          isRecurringInstance: false,
        });
      }
    } else {
      // Recurring event - generate instances
      const recurringInstances = generateRecurringInstances(event, startDate, endDate);
      instances.push(...recurringInstances);
    }
  }

  // Sort by date
  instances.sort((a, b) => a.date.localeCompare(b.date));

  return instances;
}

/**
 * Generate recurring event instances within a date range
 */
function generateRecurringInstances(
  event: CalendarEvent,
  startDate: string,
  endDate: string
): CalendarEventInstance[] {
  const instances: CalendarEventInstance[] = [];
  const eventStart = new Date(event.date);
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  const recurrenceEnd = event.recurrenceEndDate
    ? new Date(event.recurrenceEndDate)
    : new Date(endDate);

  // Use the later of event start or range start as our starting point
  const current = new Date(Math.max(eventStart.getTime(), rangeStart.getTime()));

  // Adjust current to the first occurrence on or after range start
  if (event.recurrence === 'weekly') {
    // Find the first occurrence of the same day of week within range
    const eventDayOfWeek = eventStart.getDay();
    while (current.getDay() !== eventDayOfWeek) {
      current.setDate(current.getDate() + 1);
    }
  } else if (event.recurrence === 'monthly') {
    // Find the first occurrence of the same day of month within range
    const eventDayOfMonth = eventStart.getDate();
    current.setDate(eventDayOfMonth);
    if (current < rangeStart) {
      current.setMonth(current.getMonth() + 1);
      current.setDate(eventDayOfMonth);
    }
  } else if (event.recurrence === 'yearly') {
    // Find the first occurrence of the same month and day within range
    current.setMonth(eventStart.getMonth());
    current.setDate(eventStart.getDate());
    if (current < rangeStart) {
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  // Generate instances
  const maxInstances = 365; // Safety limit
  let count = 0;

  while (current <= rangeEnd && current <= recurrenceEnd && count < maxInstances) {
    const dateStr = current.toISOString().split('T')[0];

    instances.push({
      ...event,
      date: dateStr,
      originalDate: event.date,
      isRecurringInstance: true,
    });

    // Move to next occurrence
    switch (event.recurrence) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }

    count++;
  }

  return instances;
}

/**
 * Migrate static JSON events to Firestore
 * This is a one-time migration utility
 */
export async function migrateStaticEvents(
  events: Array<{
    date: string;
    gsdtaEvents?: string | null;
    indiaHolidays?: string | null;
    longWeekend?: string | null;
  }>,
  creatorUid: string,
  creatorName?: string
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  const skipped = 0;

  for (const event of events) {
    // Create GSDTA event if exists
    if (event.gsdtaEvents && event.gsdtaEvents.trim()) {
      await createCalendarEvent(
        {
          title: { en: event.gsdtaEvents },
          date: event.date,
          eventType: 'gsdta',
          visibility: ['public'],
        },
        creatorUid,
        creatorName
      );
      created++;
    }

    // Create holiday event if exists
    if (event.indiaHolidays && event.indiaHolidays.trim()) {
      await createCalendarEvent(
        {
          title: { en: event.indiaHolidays },
          date: event.date,
          eventType: 'holiday',
          visibility: ['public'],
        },
        creatorUid,
        creatorName
      );
      created++;
    }

    // Create long weekend event if exists
    if (event.longWeekend && event.longWeekend.trim()) {
      await createCalendarEvent(
        {
          title: { en: event.longWeekend },
          date: event.date,
          eventType: 'holiday',
          visibility: ['public'],
        },
        creatorUid,
        creatorName
      );
      created++;
    }
  }

  return { created, skipped };
}
