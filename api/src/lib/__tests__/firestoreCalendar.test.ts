import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCalendarEvent,
  getCalendarEventById,
  getAllCalendarEvents,
  getPublicCalendarEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
  expandRecurringEvents,
  __setAdminDbForTests,
} from '../firestoreCalendar';
import type { CalendarEvent } from '@/types/calendar';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  let docCounter = 0;
  return {
    collection: (name: string) => ({
      doc: (uid?: string) => {
        const id = uid || `auto-id-${++docCounter}`;
        return {
          id,
          async get() {
            const data = storage.get(`${name}/${id}`);
            return {
              id,
              exists: !!data,
              data: () => data || null,
            };
          },
          async set(data: unknown) {
            storage.set(`${name}/${id}`, data as StoredDoc);
          },
          async update(data: unknown) {
            const key = `${name}/${id}`;
            const existing = storage.get(key);
            if (existing) {
              storage.set(key, { ...existing, ...(data as StoredDoc) });
            }
          },
        };
      },
      where: (field: string, op: string, value: unknown) => {
        let docs = Array.from(storage.entries())
          .filter(([key]) => key.startsWith(`${name}/`))
          .map(([key, data]) => ({
            id: key.replace(`${name}/`, ''),
            exists: true,
            data: () => data,
          }));

        // Apply filter
        docs = docs.filter((doc) => {
          const data = doc.data();
          if (op === '==') {
            return data[field] === value;
          }
          if (op === 'array-contains') {
            return Array.isArray(data[field]) && data[field].includes(value);
          }
          return true;
        });

        return {
          where: () => ({ where: () => ({ orderBy: () => ({ get: async () => ({ docs }) }) }) }),
          orderBy: () => ({
            get: async () => ({ docs }),
          }),
        };
      },
    }),
  };
}

test('createCalendarEvent: should create an event with required fields', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const event = await createCalendarEvent(
    {
      title: { en: 'Test Event', ta: 'சோதனை நிகழ்வு' },
      date: '2025-01-15',
      eventType: 'gsdta',
    },
    'creator-uid',
    'Creator Name'
  );

  assert.ok(event.id);
  assert.equal(event.title.en, 'Test Event');
  assert.equal(event.title.ta, 'சோதனை நிகழ்வு');
  assert.equal(event.date, '2025-01-15');
  assert.equal(event.eventType, 'gsdta');
  assert.equal(event.allDay, true);
  assert.equal(event.recurrence, 'none');
  assert.deepEqual(event.visibility, ['public']);
  assert.equal(event.status, 'active');
  assert.equal(event.docStatus, 'active');
  assert.equal(event.createdBy, 'creator-uid');
  assert.equal(event.createdByName, 'Creator Name');

  __setAdminDbForTests(null);
});

test('createCalendarEvent: should create a recurring event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const event = await createCalendarEvent(
    {
      title: { en: 'Weekly Meeting' },
      date: '2025-01-06',
      eventType: 'meeting',
      recurrence: 'weekly',
      recurrenceEndDate: '2025-03-31',
      allDay: false,
      startTime: '10:00',
      endTime: '11:00',
    },
    'admin-uid'
  );

  assert.equal(event.recurrence, 'weekly');
  assert.equal(event.recurrenceEndDate, '2025-03-31');
  assert.equal(event.allDay, false);
  assert.equal(event.startTime, '10:00');
  assert.equal(event.endTime, '11:00');

  __setAdminDbForTests(null);
});

test('getCalendarEventById: should return event when exists', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const created = await createCalendarEvent(
    {
      title: { en: 'Holiday' },
      date: '2025-01-26',
      eventType: 'holiday',
    },
    'admin-uid'
  );

  const fetched = await getCalendarEventById(created.id);

  assert.ok(fetched);
  assert.equal(fetched.id, created.id);
  assert.equal(fetched.title.en, 'Holiday');

  __setAdminDbForTests(null);
});

test('getCalendarEventById: should return null for non-existent event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await getCalendarEventById('non-existent-id');

  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('getCalendarEventById: should return null for deleted event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const created = await createCalendarEvent(
    {
      title: { en: 'To Delete' },
      date: '2025-02-01',
      eventType: 'other',
    },
    'admin-uid'
  );

  await deleteCalendarEvent(created.id, 'admin-uid');

  const fetched = await getCalendarEventById(created.id);

  assert.equal(fetched, null);

  __setAdminDbForTests(null);
});

test('updateCalendarEvent: should update event fields', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const created = await createCalendarEvent(
    {
      title: { en: 'Original Title' },
      date: '2025-03-15',
      eventType: 'meeting',
    },
    'creator-uid'
  );

  const updated = await updateCalendarEvent(
    created.id,
    {
      title: { en: 'Updated Title', ta: 'புதுப்பிக்கப்பட்ட தலைப்பு' },
      location: 'Main Hall',
    },
    'updater-uid',
    'Updater Name'
  );

  assert.ok(updated);
  assert.equal(updated.title.en, 'Updated Title');
  assert.equal(updated.title.ta, 'புதுப்பிக்கப்பட்ட தலைப்பு');
  assert.equal(updated.location, 'Main Hall');
  assert.equal(updated.updatedBy, 'updater-uid');
  assert.equal(updated.updatedByName, 'Updater Name');

  __setAdminDbForTests(null);
});

test('updateCalendarEvent: should return null for non-existent event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await updateCalendarEvent(
    'non-existent-id',
    { title: { en: 'New Title' } },
    'admin-uid'
  );

  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('deleteCalendarEvent: should soft delete event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const created = await createCalendarEvent(
    {
      title: { en: 'To Be Deleted' },
      date: '2025-04-01',
      eventType: 'other',
    },
    'admin-uid'
  );

  const deleted = await deleteCalendarEvent(created.id, 'admin-uid');

  assert.equal(deleted, true);

  // Verify the event is no longer retrievable
  const fetched = await getCalendarEventById(created.id);
  assert.equal(fetched, null);

  __setAdminDbForTests(null);
});

test('deleteCalendarEvent: should return false for non-existent event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const result = await deleteCalendarEvent('non-existent-id', 'admin-uid');

  assert.equal(result, false);

  __setAdminDbForTests(null);
});

test('expandRecurringEvents: should return non-recurring event as-is', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-1',
      title: { en: 'Single Event' },
      date: '2025-01-15',
      eventType: 'gsdta',
      allDay: true,
      recurrence: 'none',
      visibility: ['public'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2025-01-31');

  assert.equal(instances.length, 1);
  assert.equal(instances[0].date, '2025-01-15');
  assert.equal(instances[0].isRecurringInstance, false);
});

test('expandRecurringEvents: should expand weekly recurring event', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-weekly',
      title: { en: 'Weekly Class' },
      date: '2025-01-04', // Saturday
      eventType: 'academic',
      allDay: true,
      recurrence: 'weekly',
      recurrenceEndDate: '2025-02-28',
      visibility: ['public'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2025-01-31');

  // Should have 4-5 instances (every Saturday in January: 4, 11, 18, 25)
  assert.ok(instances.length >= 4);
  instances.forEach((instance) => {
    assert.equal(instance.isRecurringInstance, true);
    assert.equal(instance.originalDate, '2025-01-04');
  });
});

test('expandRecurringEvents: should expand daily recurring event with limit', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-daily',
      title: { en: 'Daily Reminder' },
      date: '2025-01-01',
      eventType: 'other',
      allDay: true,
      recurrence: 'daily',
      recurrenceEndDate: '2025-01-07',
      visibility: ['admin'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2025-01-31');

  // Should have 7 instances (Jan 1-7)
  assert.equal(instances.length, 7);
});

test('expandRecurringEvents: should sort by date', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-2',
      title: { en: 'Later Event' },
      date: '2025-01-20',
      eventType: 'meeting',
      allDay: true,
      recurrence: 'none',
      visibility: ['public'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
    {
      id: 'event-1',
      title: { en: 'Earlier Event' },
      date: '2025-01-05',
      eventType: 'gsdta',
      allDay: true,
      recurrence: 'none',
      visibility: ['public'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2025-01-31');

  assert.equal(instances.length, 2);
  assert.equal(instances[0].date, '2025-01-05');
  assert.equal(instances[1].date, '2025-01-20');
});

test('expandRecurringEvents: should filter events outside date range', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-outside',
      title: { en: 'Outside Range' },
      date: '2025-02-15',
      eventType: 'holiday',
      allDay: true,
      recurrence: 'none',
      visibility: ['public'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2025-01-31');

  assert.equal(instances.length, 0);
});
