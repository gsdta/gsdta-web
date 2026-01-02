// api/src/lib/__tests__/firestoreVolunteers.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVolunteer,
  getVolunteerById,
  getAllVolunteers,
  updateVolunteer,
  deleteVolunteer,
  assignVolunteerToClass,
  removeVolunteerFromClass,
  logVolunteerHours,
  getVolunteersByClass,
  countVolunteersByType,
  __setAdminDbForTests,
} from '../firestoreVolunteers';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  let docCounter = 0;

  return {
    collection: (name: string) => {
      const collectionMethods = {
        doc: (id: string) => ({
          async get() {
            const data = storage.get(`${name}/${id}`);
            return {
              exists: !!data,
              data: () => data || {},
              id: id,
              ref: {
                async update(updateData: Record<string, unknown>) {
                  const existing = storage.get(`${name}/${id}`) || {};
                  storage.set(`${name}/${id}`, { ...existing, ...updateData });
                },
              },
            };
          },
          async set(data: unknown) {
            storage.set(`${name}/${id}`, data as StoredDoc);
          },
        }),
        async add(data: unknown) {
          const id = `auto-id-${++docCounter}`;
          storage.set(`${name}/${id}`, data as StoredDoc);
          return { id };
        },
        orderBy: () => collectionMethods,
        where: () => collectionMethods,
        limit: () => collectionMethods,
        offset: () => collectionMethods,
        count: () => ({
          async get() {
            let count = 0;
            for (const key of storage.keys()) {
              if (key.startsWith(`${name}/`)) count++;
            }
            return { data: () => ({ count }) };
          },
        }),
        async get() {
          const docs: { id: string; data: () => StoredDoc }[] = [];
          for (const [key, value] of storage.entries()) {
            if (key.startsWith(`${name}/`)) {
              const id = key.split('/')[1];
              docs.push({
                id,
                data: () => value,
              });
            }
          }
          return { docs, empty: docs.length === 0 };
        },
      };
      return collectionMethods;
    },
  };
}

test.afterEach(() => {
  __setAdminDbForTests(null);
});

test('createVolunteer: should create a new volunteer', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteer = await createVolunteer({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    type: 'parent',
    academicYear: '2024-2025',
  }, 'admin1');

  assert.ok(volunteer.id);
  assert.equal(volunteer.firstName, 'John');
  assert.equal(volunteer.lastName, 'Doe');
  assert.equal(volunteer.email, 'john@example.com');
  assert.equal(volunteer.type, 'parent');
  assert.equal(volunteer.status, 'active');
  assert.equal(volunteer.totalHours, 0);
  assert.deepEqual(volunteer.classAssignments, []);
  assert.deepEqual(volunteer.hoursLog, []);
  assert.equal(volunteer.createdBy, 'admin1');
});

test('createVolunteer: should handle all optional fields', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteer = await createVolunteer({
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '555-5678',
    type: 'high_school',
    school: 'Central High',
    gradeLevel: '11th',
    parentId: 'parent1',
    studentIds: ['student1', 'student2'],
    availableDays: ['Sunday'],
    availableTimes: ['Morning'],
    academicYear: '2024-2025',
    emergencyContact: { name: 'Parent', phone: '555-0000', relationship: 'parent' },
    notes: 'Test notes',
  });

  assert.ok(volunteer.id);
  assert.equal(volunteer.school, 'Central High');
  assert.equal(volunteer.gradeLevel, '11th');
  assert.deepEqual(volunteer.studentIds, ['student1', 'student2']);
});

test('getVolunteerById: should return volunteer by ID', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    type: 'parent',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteer = await getVolunteerById('v1');

  assert.ok(volunteer);
  assert.equal(volunteer?.id, 'v1');
  assert.equal(volunteer?.firstName, 'John');
});

test('getVolunteerById: should return null for non-existent volunteer', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteer = await getVolunteerById('nonexistent');

  assert.equal(volunteer, null);
});

test('getAllVolunteers: should return volunteers with pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    type: 'parent',
    status: 'active',
    classAssignments: [],
  });
  storage.set('volunteers/v2', {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    type: 'high_school',
    status: 'active',
    classAssignments: [],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllVolunteers();

  assert.ok(result.volunteers);
  assert.ok(Array.isArray(result.volunteers));
  assert.equal(result.total, 2);
});

test('getAllVolunteers: should filter by type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    type: 'parent',
    status: 'active',
    classAssignments: [],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllVolunteers({ type: 'parent' });

  assert.ok(result.volunteers);
});

test('getAllVolunteers: should filter by status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    type: 'parent',
    status: 'inactive',
    classAssignments: [],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllVolunteers({ status: 'inactive' });

  assert.ok(result.volunteers);
});

test('getAllVolunteers: should filter by classId', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    type: 'parent',
    status: 'active',
    classAssignments: [{ classId: 'c1', className: 'Class 1' }],
  });
  storage.set('volunteers/v2', {
    firstName: 'Jane',
    type: 'parent',
    status: 'active',
    classAssignments: [{ classId: 'c2', className: 'Class 2' }],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllVolunteers({ classId: 'c1' });

  assert.ok(result.volunteers);
  assert.equal(result.total, 1);
});

test('getAllVolunteers: should filter by search term', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    type: 'parent',
    status: 'active',
    classAssignments: [],
  });
  storage.set('volunteers/v2', {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    type: 'parent',
    status: 'active',
    classAssignments: [],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllVolunteers({ search: 'John' });

  assert.ok(result.volunteers);
  assert.equal(result.total, 1);
});

test('getAllVolunteers: should search by email', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'unique@example.com',
    type: 'parent',
    status: 'active',
    classAssignments: [],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllVolunteers({ search: 'unique' });

  assert.ok(result.volunteers);
  assert.equal(result.total, 1);
});

test('getAllVolunteers: should apply pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  for (let i = 0; i < 10; i++) {
    storage.set(`volunteers/v${i}`, {
      firstName: `Volunteer${i}`,
      lastName: 'Test',
      type: 'parent',
      status: 'active',
      classAssignments: [],
    });
  }

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllVolunteers({ limit: 5, offset: 0 });

  assert.ok(result.volunteers);
  assert.equal(result.volunteers.length, 5);
  assert.equal(result.total, 10);
});

test('updateVolunteer: should update volunteer fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    type: 'parent',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateVolunteer('v1', { firstName: 'Johnny' });

  assert.ok(updated);

  const storedData = storage.get('volunteers/v1') as any;
  assert.equal(storedData.firstName, 'Johnny');
});

test('updateVolunteer: should return null for non-existent volunteer', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateVolunteer('nonexistent', { firstName: 'Test' });

  assert.equal(updated, null);
});

test('updateVolunteer: should update all provided fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    type: 'parent',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  await updateVolunteer('v1', {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '555-5678',
    type: 'high_school',
    school: 'Central High',
    gradeLevel: '12th',
    parentId: 'p1',
    studentIds: ['s1'],
    availableDays: ['Saturday'],
    availableTimes: ['Afternoon'],
    academicYear: '2025-2026',
    emergencyContact: { name: 'Test', phone: '555-0000', relationship: 'parent' },
    status: 'inactive',
    notes: 'Updated notes',
  });

  const storedData = storage.get('volunteers/v1') as any;
  assert.equal(storedData.firstName, 'Jane');
  assert.equal(storedData.type, 'high_school');
  assert.equal(storedData.status, 'inactive');
});

test('deleteVolunteer: should soft delete volunteer', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await deleteVolunteer('v1');

  assert.equal(result, true);

  const storedData = storage.get('volunteers/v1') as any;
  assert.equal(storedData.status, 'inactive');
});

test('deleteVolunteer: should return false for non-existent volunteer', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await deleteVolunteer('nonexistent');

  assert.equal(result, false);
});

test('assignVolunteerToClass: should assign volunteer to class', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    classAssignments: [],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await assignVolunteerToClass(
    'v1',
    'c1',
    'Class 1',
    'g1',
    'Grade 1',
    'admin1'
  );

  assert.ok(updated);

  const storedData = storage.get('volunteers/v1') as any;
  assert.equal(storedData.classAssignments.length, 1);
  assert.equal(storedData.classAssignments[0].classId, 'c1');
  assert.equal(storedData.classAssignments[0].assignedBy, 'admin1');
});

test('assignVolunteerToClass: should not duplicate assignment', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    classAssignments: [{ classId: 'c1', className: 'Class 1' }],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await assignVolunteerToClass(
    'v1',
    'c1',
    'Class 1',
    'g1',
    'Grade 1',
    'admin1'
  );

  assert.ok(updated);
  // Should still have only one assignment
});

test('assignVolunteerToClass: should return null for non-existent volunteer', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await assignVolunteerToClass(
    'nonexistent',
    'c1',
    'Class 1',
    'g1',
    'Grade 1',
    'admin1'
  );

  assert.equal(updated, null);
});

test('removeVolunteerFromClass: should remove volunteer from class', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    classAssignments: [
      { classId: 'c1', className: 'Class 1' },
      { classId: 'c2', className: 'Class 2' },
    ],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await removeVolunteerFromClass('v1', 'c1');

  assert.ok(updated);

  const storedData = storage.get('volunteers/v1') as any;
  assert.equal(storedData.classAssignments.length, 1);
  assert.equal(storedData.classAssignments[0].classId, 'c2');
});

test('removeVolunteerFromClass: should return null for non-existent volunteer', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await removeVolunteerFromClass('nonexistent', 'c1');

  assert.equal(updated, null);
});

test('logVolunteerHours: should log hours', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    hoursLog: [],
    totalHours: 0,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await logVolunteerHours(
    'v1',
    {
      date: '2024-01-01',
      hours: 2.5,
      classId: 'c1',
      notes: 'Helped with setup',
    },
    'admin1'
  );

  assert.ok(updated);

  const storedData = storage.get('volunteers/v1') as any;
  assert.equal(storedData.hoursLog.length, 1);
  assert.equal(storedData.hoursLog[0].hours, 2.5);
  assert.equal(storedData.hoursLog[0].verifiedBy, 'admin1');
  assert.equal(storedData.totalHours, 2.5);
});

test('logVolunteerHours: should accumulate total hours', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    hoursLog: [{ date: '2024-01-01', hours: 2 }],
    totalHours: 2,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  await logVolunteerHours(
    'v1',
    {
      date: '2024-01-02',
      hours: 3,
    }
  );

  const storedData = storage.get('volunteers/v1') as any;
  assert.equal(storedData.totalHours, 5);
});

test('logVolunteerHours: should return null for non-existent volunteer', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await logVolunteerHours('nonexistent', { date: '2024-01-01', hours: 1 });

  assert.equal(updated, null);
});

test('getVolunteersByClass: should return volunteers for a class', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    type: 'parent',
    status: 'active',
    classAssignments: [{ classId: 'c1', className: 'Class 1' }],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteers = await getVolunteersByClass('c1');

  assert.ok(Array.isArray(volunteers));
  assert.equal(volunteers.length, 1);
  assert.equal(volunteers[0].firstName, 'John');
  assert.ok(volunteers[0].typeLabel);
});

test('getVolunteersByClass: should return empty array for class with no volunteers', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteers = await getVolunteersByClass('nonexistent');

  assert.ok(Array.isArray(volunteers));
  assert.equal(volunteers.length, 0);
});

test('countVolunteersByType: should count volunteers by type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', { type: 'parent', status: 'active' });
  storage.set('volunteers/v2', { type: 'high_school', status: 'active' });
  storage.set('volunteers/v3', { type: 'community', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const counts = await countVolunteersByType();

  assert.ok('high_school' in counts);
  assert.ok('parent' in counts);
  assert.ok('community' in counts);
  assert.equal(typeof counts.parent, 'number');
});

// ============================================
// Additional filter tests
// ============================================

test('getAllVolunteers: should filter by academicYear', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    type: 'parent',
    status: 'active',
    academicYear: '2024-2025',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllVolunteers({ academicYear: '2024-2025' });

  assert.ok(result.volunteers);
});

test('getVolunteersByClass: should return type labels for high_school volunteers', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    type: 'high_school',
    status: 'active',
    classAssignments: [{ classId: 'c1', className: 'Class 1' }],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteers = await getVolunteersByClass('c1');

  assert.equal(volunteers.length, 1);
  assert.equal(volunteers[0].typeLabel, 'High School Volunteer');
});

test('getVolunteersByClass: should return type labels for community volunteers', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@test.com',
    type: 'community',
    status: 'active',
    classAssignments: [{ classId: 'c1', className: 'Class 1' }],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteers = await getVolunteersByClass('c1');

  assert.equal(volunteers.length, 1);
  assert.equal(volunteers[0].typeLabel, 'Community Volunteer');
});

test('getVolunteersByClass: should return default label for unknown type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('volunteers/v1', {
    firstName: 'Bob',
    lastName: 'Brown',
    email: 'bob@test.com',
    type: 'unknown_type',
    status: 'active',
    classAssignments: [{ classId: 'c1', className: 'Class 1' }],
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const volunteers = await getVolunteersByClass('c1');

  assert.equal(volunteers.length, 1);
  assert.equal(volunteers[0].typeLabel, 'Volunteer');
});
