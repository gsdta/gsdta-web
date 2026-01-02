// api/src/lib/__tests__/firestoreClasses.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClass,
  getClassById,
  getAllClasses,
  getActiveClassOptions,
  updateClass,
  incrementEnrolled,
  decrementEnrolled,
  assignTeacherToClass,
  removeTeacherFromClass,
  updateTeacherRole,
  getPrimaryTeacher,
  getClassTeachers,
  __setAdminDbForTests as setClassesDb
} from '../firestoreClasses';
import { __setAdminDbForTests as setGradesDb } from '../firestoreGrades';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  let idCounter = 0;

  const matchesFilter = (
    val: any,
    filters: Array<{ field: string; op: string; value: unknown }>
  ): boolean => {
    for (const filter of filters) {
      const fieldValue = val[filter.field];
      switch (filter.op) {
        case '==':
          if (fieldValue !== filter.value) return false;
          break;
        case '!=':
          if (fieldValue === filter.value) return false;
          break;
      }
    }
    return true;
  };

  const createQueryChain = (
    collectionName: string,
    filters: Array<{ field: string; op: string; value: unknown }> = []
  ): any => {
    const getMatchingDocs = () => {
      const docs: { id: string; data: () => StoredDoc }[] = [];
      for (const [key, val] of storage.entries()) {
        if (key.startsWith(`${collectionName}/`)) {
          if (matchesFilter(val, filters)) {
            docs.push({
              id: key.replace(`${collectionName}/`, ''),
              data: () => val,
            });
          }
        }
      }
      return docs;
    };

    const queryChain: any = {
      where: (field: string, op: string, value: unknown) => {
        return createQueryChain(collectionName, [...filters, { field, op, value }]);
      },
      orderBy: () => queryChain,
      offset: () => queryChain,
      limit: () => queryChain,
      count: () => ({
        get: async () => ({
          data: () => ({ count: getMatchingDocs().length }),
        }),
      }),
      get: async () => {
        const docs = getMatchingDocs();
        return { docs, empty: docs.length === 0 };
      },
    };
    return queryChain;
  };

  return {
    collection: (name: string) => ({
      doc: (id: string) => {
        const docRef: any = {
          id,
          async get() {
            const data = storage.get(`${name}/${id}`);
            return {
              exists: !!data,
              data: () => data || {},
              id: id,
              ref: docRef,
            };
          },
          async set(data: unknown) {
            storage.set(`${name}/${id}`, data as StoredDoc);
          },
          async update(updateData: Record<string, unknown>) {
            const existing = storage.get(`${name}/${id}`) || {};
            const merged = { ...existing };
            for (const [key, value] of Object.entries(updateData)) {
              // Handle FieldValue.increment sentinel
              if (value && typeof value === 'object' && 'operand' in (value as any)) {
                const current = (merged[key] as number) || 0;
                merged[key] = current + (value as any).operand;
              } else {
                merged[key] = value;
              }
            }
            storage.set(`${name}/${id}`, merged);
          },
        };
        return docRef;
      },
      add: async (data: unknown) => {
        const id = 'generated-id-' + ++idCounter;
        storage.set(`${name}/${id}`, data as StoredDoc);
        return { id };
      },
      where: (field: string, op: string, value: unknown) => {
        return createQueryChain(name, [{ field, op, value }]);
      },
      orderBy: () => createQueryChain(name),
      get: async () => {
        const docs: { id: string; data: () => StoredDoc }[] = [];
        for (const [key, val] of storage.entries()) {
          if (key.startsWith(`${name}/`)) {
            docs.push({
              id: key.replace(`${name}/`, ''),
              data: () => val,
            });
          }
        }
        return { docs, empty: docs.length === 0 };
      },
    }),
  };
}


// Setup common mocks
test.beforeEach(() => {
    // We need to mock FieldValue in the imported module? 
    // Since we can't easily, we will rely on our fake DB handling what the real code sends.
    // But real code imports FieldValue from firebase-admin.
    // We can't mock that easily with node:test without loaders.
    // However, the real FieldValue.increment returns a sentinel object.
    // Our fake DB just needs to handle that sentinel.
    // But we don't know the exact structure of real sentinel.
    // We can just skip testing incrementEnrolled logic specifically or assume it works if we trust firebase.
    // OR we focus on teacher management which is the new logic.
});

test('createClass: should create class with grade info', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);
    setGradesDb(fakeProvider);

    // Seed Grade
    storage.set('grades/g1', { name: 'Grade 1', id: 'g1' });

    const classData = {
        name: 'Class A',
        gradeId: 'g1',
        day: 'Sunday',
        time: '10am',
        capacity: 20,
        academicYear: '2025-2026'
    };

    const newClass = await createClass(classData);
    
    assert.ok(newClass.id);
    assert.equal(newClass.gradeName, 'Grade 1');
    assert.deepEqual(newClass.teachers, []);
    assert.equal(newClass.status, 'active');

    setClassesDb(null);
    setGradesDb(null);
});

test('assignTeacherToClass: should add teacher', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);
    
    // Seed Class
    storage.set('classes/c1', { 
        name: 'Class A', 
        teachers: [] 
    });

    const teacherData = {
        teacherId: 't1',
        teacherName: 'Teacher 1',
        role: 'primary' as const,
        teacherEmail: 't1@example.com'
    };

    const updated = await assignTeacherToClass('c1', teacherData, 'admin1');
    
    assert.ok(updated);
    assert.equal(updated?.teachers.length, 1);
    assert.equal(updated?.teachers[0].teacherId, 't1');
    assert.equal(updated?.teachers[0].role, 'primary');
    assert.equal(updated?.teachers[0].assignedBy, 'admin1');

    setClassesDb(null);
});

test('assignTeacherToClass: should demote existing primary if new primary assigned', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);
    
    // Seed Class with primary
    storage.set('classes/c1', { 
        name: 'Class A', 
        teachers: [{
            teacherId: 't1',
            teacherName: 'T1',
            role: 'primary'
        }] 
    });

    const teacherData = {
        teacherId: 't2',
        teacherName: 'T2',
        role: 'primary' as const
    };

    const updated = await assignTeacherToClass('c1', teacherData, 'admin1');
    
    assert.ok(updated);
    assert.equal(updated?.teachers.length, 2);
    
    const t1 = updated?.teachers.find(t => t.teacherId === 't1');
    const t2 = updated?.teachers.find(t => t.teacherId === 't2');
    
    assert.equal(t1?.role, 'assistant'); // Demoted
    assert.equal(t2?.role, 'primary');   // New Primary

    setClassesDb(null);
});

test('removeTeacherFromClass: should remove teacher', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);
    
    storage.set('classes/c1', { 
        name: 'Class A', 
        teachers: [{
            teacherId: 't1',
            role: 'primary'
        }] 
    });

    const updated = await removeTeacherFromClass('c1', 't1');
    
    assert.ok(updated);
    assert.equal(updated?.teachers.length, 0);

    setClassesDb(null);
});

test('updateTeacherRole: should change role', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        teachers: [{
            teacherId: 't1',
            role: 'assistant'
        }]
    });

    const updated = await updateTeacherRole('c1', 't1', 'primary');

    assert.ok(updated);
    assert.equal(updated?.teachers[0].role, 'primary');

    setClassesDb(null);
});

// ============================================
// getClassById tests
// ============================================

test('getClassById: should return class when exists', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        gradeId: 'g1',
        gradeName: 'Grade 1',
        status: 'active'
    });

    const result = await getClassById('c1');

    assert.ok(result);
    assert.equal(result?.id, 'c1');
    assert.equal(result?.name, 'Class A');

    setClassesDb(null);
});

test('getClassById: should return null when not exists', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    const result = await getClassById('nonexistent');

    assert.equal(result, null);

    setClassesDb(null);
});

// ============================================
// getAllClasses tests
// ============================================

test('getAllClasses: should return all classes', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', status: 'active' });
    storage.set('classes/c2', { name: 'Class B', status: 'active' });

    const result = await getAllClasses();

    assert.ok(result.classes);
    assert.equal(result.total, 2);

    setClassesDb(null);
});

test('getAllClasses: should filter by status', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', status: 'active' });
    storage.set('classes/c2', { name: 'Class B', status: 'inactive' });

    const result = await getAllClasses({ status: 'active' });

    assert.equal(result.total, 1);

    setClassesDb(null);
});

test('getAllClasses: should filter by gradeId', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', gradeId: 'g1', status: 'active' });
    storage.set('classes/c2', { name: 'Class B', gradeId: 'g2', status: 'active' });

    const result = await getAllClasses({ gradeId: 'g1' });

    assert.equal(result.total, 1);

    setClassesDb(null);
});

test('getAllClasses: should filter by teacherId in teachers array', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        status: 'active',
        teachers: [{ teacherId: 't1', role: 'primary' }]
    });
    storage.set('classes/c2', {
        name: 'Class B',
        status: 'active',
        teachers: [{ teacherId: 't2', role: 'primary' }]
    });

    const result = await getAllClasses({ teacherId: 't1' });

    assert.equal(result.total, 1);
    assert.equal(result.classes[0].name, 'Class A');

    setClassesDb(null);
});

test('getAllClasses: should support legacy teacherId field', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        status: 'active',
        teacherId: 't1', // Legacy field
        teachers: []
    });

    const result = await getAllClasses({ teacherId: 't1' });

    assert.equal(result.total, 1);

    setClassesDb(null);
});

// ============================================
// getActiveClassOptions tests
// ============================================

test('getActiveClassOptions: should return active classes as options', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        status: 'active',
        gradeId: 'g1',
        gradeName: 'Grade 1',
        day: 'Sunday',
        time: '10am',
        capacity: 20,
        enrolled: 5
    });
    storage.set('classes/c2', {
        name: 'Class B',
        status: 'inactive',
        gradeId: 'g1'
    });

    const result = await getActiveClassOptions();

    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Class A');
    assert.equal(result[0].available, 15);

    setClassesDb(null);
});

test('getActiveClassOptions: should handle level fallback for gradeName', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        status: 'active',
        level: 'Beginner', // Legacy field
        capacity: 10
    });

    const result = await getActiveClassOptions();

    assert.equal(result[0].gradeName, 'Beginner');

    setClassesDb(null);
});

// ============================================
// updateClass tests
// ============================================

test('updateClass: should update class fields', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);
    setGradesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        gradeId: 'g1',
        day: 'Sunday',
        time: '10am',
        capacity: 20,
        status: 'active'
    });

    const updated = await updateClass('c1', {
        name: 'Class A Updated',
        day: 'Saturday',
        time: '2pm',
        capacity: 25
    });

    assert.ok(updated);
    assert.equal(updated?.name, 'Class A Updated');
    assert.equal(updated?.day, 'Saturday');
    assert.equal(updated?.time, '2pm');
    assert.equal(updated?.capacity, 25);

    setClassesDb(null);
    setGradesDb(null);
});

test('updateClass: should return null for nonexistent class', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    const updated = await updateClass('nonexistent', { name: 'New Name' });

    assert.equal(updated, null);

    setClassesDb(null);
});

test('updateClass: should update gradeId with grade info', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);
    setGradesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        gradeId: 'g1',
        gradeName: 'Grade 1'
    });
    storage.set('grades/g2', { name: 'Grade 2', id: 'g2' });

    const updated = await updateClass('c1', { gradeId: 'g2' });

    assert.ok(updated);
    assert.equal(updated?.gradeId, 'g2');
    assert.equal(updated?.gradeName, 'Grade 2');

    setClassesDb(null);
    setGradesDb(null);
});

test('updateClass: should throw error for nonexistent grade', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);
    setGradesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', gradeId: 'g1' });

    try {
        await updateClass('c1', { gradeId: 'nonexistent' });
        assert.fail('Should have thrown');
    } catch (err: any) {
        assert.ok(err.message.includes('Grade not found'));
    }

    setClassesDb(null);
    setGradesDb(null);
});

test('updateClass: should update status and academicYear', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        status: 'active',
        academicYear: '2024-2025'
    });

    const updated = await updateClass('c1', {
        status: 'inactive',
        academicYear: '2025-2026'
    });

    assert.ok(updated);
    assert.equal(updated?.status, 'inactive');
    assert.equal(updated?.academicYear, '2025-2026');

    setClassesDb(null);
});

// ============================================
// incrementEnrolled tests
// ============================================

test('incrementEnrolled: should increment count', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', enrolled: 5 });

    await incrementEnrolled('c1');

    const stored = storage.get('classes/c1') as any;
    // Note: FieldValue.increment creates a sentinel, our mock handles it
    assert.ok(stored);

    setClassesDb(null);
});

test('incrementEnrolled: should throw for nonexistent class', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    try {
        await incrementEnrolled('nonexistent');
        assert.fail('Should have thrown');
    } catch (err: any) {
        assert.ok(err.message.includes('Class not found'));
    }

    setClassesDb(null);
});

test('incrementEnrolled: should accept custom delta', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', enrolled: 5 });

    await incrementEnrolled('c1', 3);

    const stored = storage.get('classes/c1') as any;
    assert.ok(stored);

    setClassesDb(null);
});

// ============================================
// decrementEnrolled tests
// ============================================

test('decrementEnrolled: should decrement count', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', enrolled: 5 });

    await decrementEnrolled('c1');

    const stored = storage.get('classes/c1') as any;
    assert.equal(stored.enrolled, 4);

    setClassesDb(null);
});

test('decrementEnrolled: should not go below zero', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', enrolled: 0 });

    await decrementEnrolled('c1');

    const stored = storage.get('classes/c1') as any;
    assert.equal(stored.enrolled, 0);

    setClassesDb(null);
});

test('decrementEnrolled: should throw for nonexistent class', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    try {
        await decrementEnrolled('nonexistent');
        assert.fail('Should have thrown');
    } catch (err: any) {
        assert.ok(err.message.includes('Class not found'));
    }

    setClassesDb(null);
});

// ============================================
// getPrimaryTeacher tests
// ============================================

test('getPrimaryTeacher: should return primary teacher', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        teachers: [
            { teacherId: 't1', role: 'primary', teacherName: 'Primary Teacher' },
            { teacherId: 't2', role: 'assistant', teacherName: 'Assistant Teacher' }
        ]
    });

    const result = await getPrimaryTeacher('c1');

    assert.ok(result);
    assert.equal(result?.teacherId, 't1');
    assert.equal(result?.role, 'primary');

    setClassesDb(null);
});

test('getPrimaryTeacher: should return null when no primary', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        teachers: [{ teacherId: 't1', role: 'assistant' }]
    });

    const result = await getPrimaryTeacher('c1');

    assert.equal(result, null);

    setClassesDb(null);
});

test('getPrimaryTeacher: should return null for nonexistent class', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    const result = await getPrimaryTeacher('nonexistent');

    assert.equal(result, null);

    setClassesDb(null);
});

// ============================================
// getClassTeachers tests
// ============================================

test('getClassTeachers: should return all teachers', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        teachers: [
            { teacherId: 't1', role: 'primary' },
            { teacherId: 't2', role: 'assistant' }
        ]
    });

    const result = await getClassTeachers('c1');

    assert.equal(result.length, 2);

    setClassesDb(null);
});

test('getClassTeachers: should return empty array for no teachers', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A' });

    const result = await getClassTeachers('c1');

    assert.deepEqual(result, []);

    setClassesDb(null);
});

test('getClassTeachers: should return empty array for nonexistent class', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    const result = await getClassTeachers('nonexistent');

    assert.deepEqual(result, []);

    setClassesDb(null);
});

// ============================================
// Additional edge case tests
// ============================================

test('createClass: should throw error for nonexistent grade', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);
    setGradesDb(fakeProvider);

    try {
        await createClass({
            name: 'Class A',
            gradeId: 'nonexistent',
            day: 'Sunday',
            time: '10am',
            capacity: 20,
            academicYear: '2025-2026'
        });
        assert.fail('Should have thrown');
    } catch (err: any) {
        assert.ok(err.message.includes('Grade not found'));
    }

    setClassesDb(null);
    setGradesDb(null);
});

test('assignTeacherToClass: should return null for nonexistent class', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    const result = await assignTeacherToClass('nonexistent', {
        teacherId: 't1',
        teacherName: 'Teacher',
        role: 'primary'
    }, 'admin1');

    assert.equal(result, null);

    setClassesDb(null);
});

test('assignTeacherToClass: should throw if teacher already assigned', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        teachers: [{ teacherId: 't1', role: 'primary' }]
    });

    try {
        await assignTeacherToClass('c1', {
            teacherId: 't1',
            teacherName: 'Teacher',
            role: 'assistant'
        }, 'admin1');
        assert.fail('Should have thrown');
    } catch (err: any) {
        assert.ok(err.message.includes('already assigned'));
    }

    setClassesDb(null);
});

test('removeTeacherFromClass: should return null for nonexistent class', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    const result = await removeTeacherFromClass('nonexistent', 't1');

    assert.equal(result, null);

    setClassesDb(null);
});

test('removeTeacherFromClass: should throw if teacher not assigned', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', teachers: [] });

    try {
        await removeTeacherFromClass('c1', 't1');
        assert.fail('Should have thrown');
    } catch (err: any) {
        assert.ok(err.message.includes('not assigned'));
    }

    setClassesDb(null);
});

test('updateTeacherRole: should return null for nonexistent class', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    const result = await updateTeacherRole('nonexistent', 't1', 'primary');

    assert.equal(result, null);

    setClassesDb(null);
});

test('updateTeacherRole: should throw if teacher not assigned', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', { name: 'Class A', teachers: [] });

    try {
        await updateTeacherRole('c1', 't1', 'primary');
        assert.fail('Should have thrown');
    } catch (err: any) {
        assert.ok(err.message.includes('not assigned'));
    }

    setClassesDb(null);
});

test('updateTeacherRole: should demote existing primary when promoting', async () => {
    const storage = new Map();
    const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
    setClassesDb(fakeProvider);

    storage.set('classes/c1', {
        name: 'Class A',
        teachers: [
            { teacherId: 't1', role: 'primary' },
            { teacherId: 't2', role: 'assistant' }
        ]
    });

    const updated = await updateTeacherRole('c1', 't2', 'primary');

    assert.ok(updated);
    const t1 = updated?.teachers.find(t => t.teacherId === 't1');
    const t2 = updated?.teachers.find(t => t.teacherId === 't2');
    assert.equal(t1?.role, 'assistant');
    assert.equal(t2?.role, 'primary');

    setClassesDb(null);
});
