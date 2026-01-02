// api/src/lib/__tests__/firestoreGrades.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGrade,
  getGradeById,
  getAllGrades,
  updateGrade,
  seedDefaultGrades,
  getActiveGradeOptions,
  areGradesSeeded,
  __setAdminDbForTests
} from '../firestoreGrades';
import { DEFAULT_GRADES } from '@/types/grade';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        async get() {
          const data = storage.get(`${name}/${id}`);
          return {
            exists: !!data,
            data: () => data || {},
            id: id,
            ref: {
                update: async (updateData: Record<string, unknown>) => {
                    const existing = storage.get(`${name}/${id}`) || {};
                    storage.set(`${name}/${id}`, { ...existing, ...updateData });
                }
            }
          };
        },
        async set(data: unknown) {
          storage.set(`${name}/${id}`, data as StoredDoc);
        },
      }),
      // Mocking query capabilities for getAllGrades
      where: (field: string, _op: string, value: any) => {
        return {
           orderBy: (orderField: string, _orderDir: string) => {
               return {
                   get: async () => {
                       const docs = [];
                       for (const [key, val] of storage.entries()) {
                           if (key.startsWith(`${name}/`)) {
                               if (val[field] === value) {
                                   docs.push({
                                       id: key.split('/')[1],
                                       data: () => val
                                   });
                               }
                           }
                       }
                       // Simple sort
                        docs.sort((a, b) => {
                            const valA = (a.data() as any)[orderField];
                            const valB = (b.data() as any)[orderField];
                            return valA - valB;
                        });
                       return { docs };
                   }
               }
           }
        }
      },
      orderBy: (orderField: string, _orderDir: string) => {
        return {
            get: async () => {
                const docs = [];
                for (const [key, val] of storage.entries()) {
                    if (key.startsWith(`${name}/`)) {
                        docs.push({
                            id: key.split('/')[1],
                            data: () => val
                        });
                    }
                }
                 // Simple sort
                 docs.sort((a, b) => {
                    const valA = (a.data() as any)[orderField];
                    const valB = (b.data() as any)[orderField];
                    return valA - valB;
                });
                return { docs };
            }
        }
      },

      limit: (n: number) => ({
          get: async () => {
              const docs = [];
              let count = 0;
              for (const [key, val] of storage.entries()) {
                  if (key.startsWith(`${name}/`) && count < n) {
                      docs.push({ id: key.split('/')[1], data: () => val });
                      count++;
                  }
              }
              return { empty: docs.length === 0, docs };
          }
      })
    }),
  };
}

test('createGrade: should create a new grade', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  const gradeData = {
    id: 'test-grade',
    name: 'Test Grade',
    displayName: 'Test Grade Display',
    displayOrder: 1,
  };

  const grade = await createGrade(gradeData, 'admin-123');
  
  assert.equal(grade.id, 'test-grade');
  assert.equal(grade.name, 'Test Grade');
  assert.equal(grade.createdBy, 'admin-123');
  
  const stored = storage.get('grades/test-grade');
  assert.ok(stored);
  assert.equal(stored.name, 'Test Grade');

  __setAdminDbForTests(null);
});

test('getGradeById: should return grade if exists', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  storage.set('grades/existing-grade', {
    name: 'Existing',
    displayName: 'Existing Grade',
    displayOrder: 2,
    status: 'active'
  });

  const grade = await getGradeById('existing-grade');
  assert.ok(grade);
  assert.equal(grade?.name, 'Existing');

  const notFound = await getGradeById('non-existent');
  assert.equal(notFound, null);

  __setAdminDbForTests(null);
});

test('updateGrade: should update grade fields', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
  __setAdminDbForTests(fakeProvider);

  storage.set('grades/update-grade', {
    name: 'Old Name',
    displayName: 'Old Display',
    displayOrder: 3,
    status: 'active'
  });

  const updated = await updateGrade('update-grade', {
      name: 'New Name',
      status: 'inactive'
  });

  assert.ok(updated);
  assert.equal(updated?.name, 'New Name');
  assert.equal(updated?.status, 'inactive');
  assert.equal(updated?.displayName, 'Old Display'); // Unchanged

  __setAdminDbForTests(null);
});

test('getAllGrades: should return all grades sorted', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
    __setAdminDbForTests(fakeProvider);
  
    storage.set('grades/g2', { displayOrder: 2, status: 'active', name: 'G2' });
    storage.set('grades/g1', { displayOrder: 1, status: 'active', name: 'G1' });
    storage.set('grades/g3', { displayOrder: 3, status: 'inactive', name: 'G3' });
  
    const result = await getAllGrades();
    assert.equal(result.total, 3);
    assert.equal(result.grades[0].id, 'g1');
    assert.equal(result.grades[1].id, 'g2');
    assert.equal(result.grades[2].id, 'g3');

    // Test filter
    const resultActive = await getAllGrades({ status: 'active' });
    assert.equal(resultActive.total, 2);
    assert.equal(resultActive.grades[0].id, 'g1');
    assert.equal(resultActive.grades[1].id, 'g2');
  
    __setAdminDbForTests(null);
});

test('seedDefaultGrades: should seed defaults if missing', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
    __setAdminDbForTests(fakeProvider);

    const { created, skipped } = await seedDefaultGrades('admin-seed');
    assert.equal(created, DEFAULT_GRADES.length);
    assert.equal(skipped, 0);

    // Run again
    const run2 = await seedDefaultGrades('admin-seed');
    assert.equal(run2.created, 0);
    assert.equal(run2.skipped, DEFAULT_GRADES.length);

    __setAdminDbForTests(null);
});

test('getActiveGradeOptions: should return only active grades as options', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
    __setAdminDbForTests(fakeProvider);

    storage.set('grades/g1', {
        name: 'Grade 1',
        displayName: 'First Grade',
        displayOrder: 1,
        status: 'active'
    });
    storage.set('grades/g2', {
        name: 'Grade 2',
        displayName: 'Second Grade',
        displayOrder: 2,
        status: 'active'
    });
    storage.set('grades/g3', {
        name: 'Grade 3',
        displayName: 'Third Grade',
        displayOrder: 3,
        status: 'inactive'  // Should be excluded
    });

    const options = await getActiveGradeOptions();

    assert.equal(options.length, 2);
    assert.equal(options[0].id, 'g1');
    assert.equal(options[0].name, 'Grade 1');
    assert.equal(options[0].displayName, 'First Grade');
    assert.equal(options[0].displayOrder, 1);
    assert.equal(options[1].id, 'g2');
    assert.equal(options[1].name, 'Grade 2');

    __setAdminDbForTests(null);
});

test('getActiveGradeOptions: should return empty array when no active grades', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
    __setAdminDbForTests(fakeProvider);

    storage.set('grades/g1', {
        name: 'Grade 1',
        displayName: 'First Grade',
        displayOrder: 1,
        status: 'inactive'
    });

    const options = await getActiveGradeOptions();
    assert.equal(options.length, 0);

    __setAdminDbForTests(null);
});

test('areGradesSeeded: should return true when grades exist', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
    __setAdminDbForTests(fakeProvider);

    storage.set('grades/g1', {
        name: 'Grade 1',
        displayName: 'First Grade',
        displayOrder: 1,
        status: 'active'
    });

    const seeded = await areGradesSeeded();
    assert.equal(seeded, true);

    __setAdminDbForTests(null);
});

test('areGradesSeeded: should return false when no grades exist', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as Parameters<typeof __setAdminDbForTests>[0];
    __setAdminDbForTests(fakeProvider);

    const seeded = await areGradesSeeded();
    assert.equal(seeded, false);

    __setAdminDbForTests(null);
});
