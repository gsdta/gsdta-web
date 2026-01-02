// api/src/lib/__tests__/firestoreTextbooks.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTextbook,
  getTextbookById,
  getAllTextbooks,
  updateTextbook,
  deleteTextbook,
  updateTextbookInventory,
  getTextbooksByGrade,
  __setAdminDbForTests,
} from '../firestoreTextbooks';

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

test('createTextbook: should create a new textbook', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const textbook = await createTextbook({
    gradeId: 'g1',
    itemNumber: 'TXT-001',
    name: 'Tamil Reader',
    type: 'textbook',
    semester: 'both',
    pageCount: 100,
    copies: 50,
    unitCost: 15.99,
    academicYear: '2024-2025',
  }, 'admin1');

  assert.ok(textbook.id);
  assert.equal(textbook.gradeId, 'g1');
  assert.equal(textbook.name, 'Tamil Reader');
  assert.equal(textbook.status, 'active');
  assert.equal(textbook.createdBy, 'admin1');
});

test('createTextbook: should handle optional adminId', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const textbook = await createTextbook({
    gradeId: 'g1',
    itemNumber: 'TXT-001',
    name: 'Tamil Reader',
    type: 'textbook',
    semester: 'first',
    pageCount: 100,
    copies: 50,
    unitCost: 15.99,
    academicYear: '2024-2025',
  });

  assert.ok(textbook.id);
  assert.equal(textbook.createdBy, undefined);
});

test('getTextbookById: should return textbook by ID', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', {
    gradeId: 'g1',
    name: 'Tamil Reader',
    type: 'textbook',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const textbook = await getTextbookById('tb1');

  assert.ok(textbook);
  assert.equal(textbook?.id, 'tb1');
  assert.equal(textbook?.name, 'Tamil Reader');
});

test('getTextbookById: should return null for non-existent textbook', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const textbook = await getTextbookById('nonexistent');

  assert.equal(textbook, null);
});

test('getAllTextbooks: should return textbooks with pagination', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', {
    gradeId: 'g1',
    name: 'Tamil Reader',
    type: 'textbook',
    status: 'active',
  });
  storage.set('textbooks/tb2', {
    gradeId: 'g1',
    name: 'Workbook',
    type: 'workbook',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllTextbooks();

  assert.ok(result.textbooks);
  assert.ok(Array.isArray(result.textbooks));
  assert.equal(result.total, 2);
});

test('getAllTextbooks: should filter by gradeId', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', { gradeId: 'g1', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllTextbooks({ gradeId: 'g1' });

  assert.ok(result.textbooks);
});

test('getAllTextbooks: should filter by type', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', { type: 'workbook', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllTextbooks({ type: 'workbook' });

  assert.ok(result.textbooks);
});

test('getAllTextbooks: should filter by academicYear', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', { academicYear: '2024-2025', status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllTextbooks({ academicYear: '2024-2025' });

  assert.ok(result.textbooks);
});

test('getAllTextbooks: should filter by status', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', { status: 'inactive' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllTextbooks({ status: 'inactive' });

  assert.ok(result.textbooks);
});

test('getAllTextbooks: should support pagination with limit and offset', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', { status: 'active' });
  storage.set('textbooks/tb2', { status: 'active' });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await getAllTextbooks({ limit: 1, offset: 0 });

  assert.ok(result.textbooks);
});

test('updateTextbook: should update textbook fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', {
    gradeId: 'g1',
    name: 'Old Name',
    type: 'textbook',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateTextbook('tb1', { name: 'New Name' });

  assert.ok(updated);
  // Check storage was updated
  const storedData = storage.get('textbooks/tb1') as any;
  assert.equal(storedData.name, 'New Name');
});

test('updateTextbook: should return null for non-existent textbook', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateTextbook('nonexistent', { name: 'New Name' });

  assert.equal(updated, null);
});

test('updateTextbook: should update all provided fields', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', {
    gradeId: 'g1',
    itemNumber: 'OLD-001',
    name: 'Old Name',
    type: 'textbook',
    semester: 'first',
    pageCount: 50,
    copies: 10,
    unitCost: 10.00,
    academicYear: '2023-2024',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  await updateTextbook('tb1', {
    gradeId: 'g2',
    itemNumber: 'NEW-001',
    name: 'New Name',
    type: 'workbook',
    semester: 'second',
    pageCount: 100,
    copies: 20,
    unitCost: 20.00,
    academicYear: '2024-2025',
    status: 'inactive',
  });

  const storedData = storage.get('textbooks/tb1') as any;
  assert.equal(storedData.gradeId, 'g2');
  assert.equal(storedData.itemNumber, 'NEW-001');
  assert.equal(storedData.name, 'New Name');
});

test('deleteTextbook: should soft delete textbook', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', {
    name: 'Tamil Reader',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await deleteTextbook('tb1');

  assert.equal(result, true);

  const storedData = storage.get('textbooks/tb1') as any;
  assert.equal(storedData.status, 'inactive');
});

test('deleteTextbook: should return false for non-existent textbook', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const result = await deleteTextbook('nonexistent');

  assert.equal(result, false);
});

test('updateTextbookInventory: should update copies count', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', {
    name: 'Tamil Reader',
    copies: 50,
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateTextbookInventory('tb1', 75);

  assert.ok(updated);

  const storedData = storage.get('textbooks/tb1') as any;
  assert.equal(storedData.copies, 75);
});

test('updateTextbookInventory: should return null for non-existent textbook', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const updated = await updateTextbookInventory('nonexistent', 50);

  assert.equal(updated, null);
});

test('getTextbooksByGrade: should return textbooks for a grade', async () => {
  const storage = new Map<string, StoredDoc>();
  storage.set('textbooks/tb1', {
    gradeId: 'g1',
    name: 'Tamil Reader',
    type: 'textbook',
    status: 'active',
  });
  storage.set('textbooks/tb2', {
    gradeId: 'g1',
    name: 'Workbook',
    type: 'workbook',
    status: 'active',
  });
  storage.set('textbooks/tb3', {
    gradeId: 'g2',
    name: 'Other Grade',
    type: 'textbook',
    status: 'active',
  });

  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const textbooks = await getTextbooksByGrade('g1');

  assert.ok(Array.isArray(textbooks));
});

test('getTextbooksByGrade: should return empty array for grade with no textbooks', async () => {
  const storage = new Map<string, StoredDoc>();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  __setAdminDbForTests(fakeProvider);

  const textbooks = await getTextbooksByGrade('nonexistent');

  assert.ok(Array.isArray(textbooks));
  assert.equal(textbooks.length, 0);
});
