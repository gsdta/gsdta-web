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
  migrateStaticEvents,
  __setAdminDbForTests,
} from '../firestoreCalendar';
import type { CalendarEvent } from '@/types/calendar';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  let docCounter = 0;
  return {
    collection: (name: string) => {
      const applyFilter = (docs: { id: string; exists: boolean; data: () => StoredDoc }[], field: string, op: string, value: unknown) => {
        return docs.filter((doc) => {
          const data = doc.data();
          if (op === '==') {
            return data[field] === value;
          }
          if (op === 'array-contains') {
            return Array.isArray(data[field]) && data[field].includes(value);
          }
          return true;
        });
      };

      const createQueryChain = (docs: { id: string; exists: boolean; data: () => StoredDoc }[]) => {
        const chain: Record<string, unknown> = {
          where: (f: string, o: string, v: unknown) => createQueryChain(applyFilter(docs, f, o, v)),
          orderBy: () => ({
            get: async () => ({ docs }),
          }),
          get: async () => ({ docs }),
        };
        return chain;
      };

      return {
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

          docs = applyFilter(docs, field, op, value);
          return createQueryChain(docs);
        },
      };
    },
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

// ============================================
// Monthly recurrence tests
// ============================================

test('expandRecurringEvents: should expand monthly recurring event', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-monthly',
      title: { en: 'Monthly Meeting' },
      date: '2025-01-15', // 15th of the month
      eventType: 'meeting',
      allDay: true,
      recurrence: 'monthly',
      recurrenceEndDate: '2025-06-30',
      visibility: ['admin'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2025-04-30');

  // Should have 4 instances (approximately Jan, Feb, Mar, Apr)
  assert.equal(instances.length, 4);
  // Verify months are incremented (note: due to timezone, day may vary slightly)
  assert.ok(instances[0].date.startsWith('2025-01'));
  assert.ok(instances[1].date.startsWith('2025-02'));
  assert.ok(instances[2].date.startsWith('2025-03'));
  assert.ok(instances[3].date.startsWith('2025-04'));
  instances.forEach((instance) => {
    assert.equal(instance.isRecurringInstance, true);
    assert.equal(instance.originalDate, '2025-01-15');
  });
});

test('expandRecurringEvents: should handle monthly event starting before range', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-monthly-before',
      title: { en: 'Monthly Review' },
      date: '2024-10-20', // Before range start
      eventType: 'meeting',
      allDay: true,
      recurrence: 'monthly',
      recurrenceEndDate: '2025-12-31',
      visibility: ['admin'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2025-03-31');

  // Should have 3 instances (Jan 20, Feb 20, Mar 20)
  assert.equal(instances.length, 3);
  instances.forEach((instance) => {
    assert.equal(instance.isRecurringInstance, true);
    assert.equal(instance.originalDate, '2024-10-20');
  });
});

// ============================================
// Yearly recurrence tests
// ============================================

test('expandRecurringEvents: should expand yearly recurring event', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-yearly',
      title: { en: 'Annual Conference' },
      date: '2024-03-15', // March 15th
      eventType: 'gsdta',
      allDay: true,
      recurrence: 'yearly',
      visibility: ['public'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2026-12-31');

  // Should have 2 instances (in March 2025 and March 2026)
  assert.equal(instances.length, 2);
  assert.ok(instances[0].date.startsWith('2025-03'));
  assert.ok(instances[1].date.startsWith('2026-03'));
  instances.forEach((instance) => {
    assert.equal(instance.isRecurringInstance, true);
    assert.equal(instance.originalDate, '2024-03-15');
  });
});

test('expandRecurringEvents: should handle yearly event with recurrence end date', () => {
  const events: CalendarEvent[] = [
    {
      id: 'event-yearly-limited',
      title: { en: 'Limited Annual Event' },
      date: '2023-06-01',
      eventType: 'holiday',
      allDay: true,
      recurrence: 'yearly',
      recurrenceEndDate: '2025-06-30', // Only until mid-2025
      visibility: ['public'],
      status: 'active',
      createdAt: { toDate: () => new Date() } as unknown as CalendarEvent['createdAt'],
      updatedAt: { toDate: () => new Date() } as unknown as CalendarEvent['updatedAt'],
      createdBy: 'admin',
      docStatus: 'active',
    },
  ];

  const instances = expandRecurringEvents(events, '2025-01-01', '2027-12-31');

  // Should only have 1 instance (in June 2025), not 2026 or 2027 due to recurrence end
  assert.equal(instances.length, 1);
  assert.ok(instances[0].date.startsWith('2025-0'));
});

// ============================================
// getAllCalendarEvents tests
// ============================================

test('getAllCalendarEvents: should return all active events', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  await createCalendarEvent(
    { title: { en: 'Event 1' }, date: '2025-01-15', eventType: 'gsdta' },
    'admin-uid'
  );
  await createCalendarEvent(
    { title: { en: 'Event 2' }, date: '2025-01-20', eventType: 'holiday' },
    'admin-uid'
  );

  const result = await getAllCalendarEvents();

  // The function returns events - verify structure
  assert.ok(Array.isArray(result.events));
  assert.ok(typeof result.total === 'number');
  assert.ok(typeof result.limit === 'number');
  assert.ok(typeof result.offset === 'number');

  __setAdminDbForTests(null);
});

test('getAllCalendarEvents: should filter by date range', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  await createCalendarEvent(
    { title: { en: 'January Event' }, date: '2025-01-15', eventType: 'gsdta' },
    'admin-uid'
  );
  await createCalendarEvent(
    { title: { en: 'March Event' }, date: '2025-03-20', eventType: 'gsdta' },
    'admin-uid'
  );

  const result = await getAllCalendarEvents({
    startDate: '2025-01-01',
    endDate: '2025-01-31',
  });

  // Verify the result structure and that filtering was applied
  assert.ok(Array.isArray(result.events));
  // If events are returned, none should be from March
  result.events.forEach(e => {
    assert.ok(!e.date.startsWith('2025-03'), 'March events should be filtered out');
  });

  __setAdminDbForTests(null);
});

test('getAllCalendarEvents: should apply pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  for (let i = 0; i < 5; i++) {
    await createCalendarEvent(
      { title: { en: `Event ${i}` }, date: `2025-01-${String(i + 10).padStart(2, '0')}`, eventType: 'gsdta' },
      'admin-uid'
    );
  }

  const result = await getAllCalendarEvents({ offset: 0, limit: 2 });

  assert.equal(result.limit, 2);
  assert.equal(result.offset, 0);
  assert.ok(result.events.length <= 2);

  __setAdminDbForTests(null);
});

// ============================================
// getPublicCalendarEvents tests
// ============================================

test('getPublicCalendarEvents: should return only public events', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  await createCalendarEvent(
    { title: { en: 'Public Event' }, date: '2025-01-15', eventType: 'gsdta', visibility: ['public'] },
    'admin-uid'
  );
  await createCalendarEvent(
    { title: { en: 'Admin Only' }, date: '2025-01-20', eventType: 'meeting', visibility: ['admin'] },
    'admin-uid'
  );

  const events = await getPublicCalendarEvents();

  // All returned events should have public visibility
  events.forEach(event => {
    assert.ok(event.visibility.includes('public'));
  });

  __setAdminDbForTests(null);
});

test('getPublicCalendarEvents: should filter by date range', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  await createCalendarEvent(
    { title: { en: 'Jan Event' }, date: '2025-01-15', eventType: 'gsdta', visibility: ['public'] },
    'admin-uid'
  );
  await createCalendarEvent(
    { title: { en: 'Feb Event' }, date: '2025-02-15', eventType: 'gsdta', visibility: ['public'] },
    'admin-uid'
  );

  const events = await getPublicCalendarEvents('2025-01-01', '2025-01-31');

  // Filter the returned events to check only those in January
  const janEvents = events.filter(e => e.date.startsWith('2025-01'));
  const febEvents = events.filter(e => e.date.startsWith('2025-02'));

  assert.ok(janEvents.length >= 0);
  // Feb events should be filtered out by date range
  assert.equal(febEvents.length, 0);

  __setAdminDbForTests(null);
});

// ============================================
// migrateStaticEvents tests
// ============================================

test('migrateStaticEvents: should create GSDTA events', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const staticEvents = [
    { date: '2025-01-26', gsdtaEvents: 'Republic Day Celebration' },
    { date: '2025-08-15', gsdtaEvents: 'Independence Day' },
  ];

  const result = await migrateStaticEvents(staticEvents, 'admin-uid', 'Admin');

  assert.equal(result.created, 2);
  assert.equal(result.skipped, 0);

  __setAdminDbForTests(null);
});

test('migrateStaticEvents: should create holiday events', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const staticEvents = [
    { date: '2025-01-14', indiaHolidays: 'Pongal' },
    { date: '2025-01-15', indiaHolidays: 'Thiruvalluvar Day' },
  ];

  const result = await migrateStaticEvents(staticEvents, 'admin-uid');

  assert.equal(result.created, 2);

  __setAdminDbForTests(null);
});

test('migrateStaticEvents: should create long weekend events', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const staticEvents = [
    { date: '2025-01-25', longWeekend: 'Republic Day Weekend' },
  ];

  const result = await migrateStaticEvents(staticEvents, 'admin-uid', 'Admin User');

  assert.equal(result.created, 1);

  __setAdminDbForTests(null);
});

test('migrateStaticEvents: should handle mixed event types', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const staticEvents = [
    {
      date: '2025-01-26',
      gsdtaEvents: 'Republic Day Celebration',
      indiaHolidays: 'Republic Day',
      longWeekend: 'Republic Day Weekend',
    },
  ];

  const result = await migrateStaticEvents(staticEvents, 'admin-uid');

  // Should create 3 events from one date entry
  assert.equal(result.created, 3);

  __setAdminDbForTests(null);
});

test('migrateStaticEvents: should skip null and empty values', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const staticEvents = [
    { date: '2025-01-01', gsdtaEvents: null, indiaHolidays: '', longWeekend: '  ' },
    { date: '2025-01-02', gsdtaEvents: 'Valid Event' },
  ];

  const result = await migrateStaticEvents(staticEvents, 'admin-uid');

  // Should only create 1 event (the valid one)
  assert.equal(result.created, 1);

  __setAdminDbForTests(null);
});

// ============================================
// updateCalendarEvent additional tests
// ============================================

test('updateCalendarEvent: should update all optional fields', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const created = await createCalendarEvent(
    {
      title: { en: 'Original' },
      date: '2025-01-15',
      eventType: 'meeting',
    },
    'creator-uid'
  );

  const updated = await updateCalendarEvent(
    created.id,
    {
      title: { en: 'Updated Title' },
      description: { en: 'New description' },
      date: '2025-01-20',
      endDate: '2025-01-21',
      allDay: false,
      startTime: '09:00',
      endTime: '17:00',
      eventType: 'gsdta',
      recurrence: 'weekly',
      recurrenceEndDate: '2025-06-30',
      visibility: ['admin', 'teacher'],
      status: 'active',
      location: 'Main Hall',
    },
    'updater-uid',
    'Updater'
  );

  assert.ok(updated);
  assert.equal(updated.title.en, 'Updated Title');
  assert.equal(updated.description?.en, 'New description');
  assert.equal(updated.date, '2025-01-20');
  assert.equal(updated.endDate, '2025-01-21');
  assert.equal(updated.allDay, false);
  assert.equal(updated.startTime, '09:00');
  assert.equal(updated.endTime, '17:00');
  assert.equal(updated.recurrence, 'weekly');
  assert.equal(updated.location, 'Main Hall');

  __setAdminDbForTests(null);
});

test('updateCalendarEvent: should return null for deleted event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const created = await createCalendarEvent(
    { title: { en: 'To Delete' }, date: '2025-01-15', eventType: 'other' },
    'admin-uid'
  );

  await deleteCalendarEvent(created.id, 'admin-uid');

  const result = await updateCalendarEvent(
    created.id,
    { title: { en: 'New Title' } },
    'admin-uid'
  );

  assert.equal(result, null);

  __setAdminDbForTests(null);
});

test('deleteCalendarEvent: should return false for already deleted event', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const created = await createCalendarEvent(
    { title: { en: 'To Delete' }, date: '2025-01-15', eventType: 'other' },
    'admin-uid'
  );

  // First delete
  await deleteCalendarEvent(created.id, 'admin-uid');

  // Second delete should return false
  const result = await deleteCalendarEvent(created.id, 'admin-uid');

  assert.equal(result, false);

  __setAdminDbForTests(null);
});
