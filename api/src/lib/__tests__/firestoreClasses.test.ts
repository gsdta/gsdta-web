// api/src/lib/__tests__/firestoreClasses.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  createClass, 
  assignTeacherToClass, 
  removeTeacherFromClass, 
  updateTeacherRole,
  __setAdminDbForTests as setClassesDb
} from '../firestoreClasses';
import { __setAdminDbForTests as setGradesDb } from '../firestoreGrades';

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
                    const merged = { ...existing };
                    for (const [key, value] of Object.entries(updateData)) {
                        if (value && typeof value === 'object' && (value as any)._type === 'increment') {
                            const current = (merged[key] as number) || 0;
                            merged[key] = current + (value as any).value;
                        } else {
                            merged[key] = value;
                        }
                    }
                    storage.set(`${name}/${id}`, merged);
                }
            }
          };
        },
        async set(data: unknown) {
          storage.set(`${name}/${id}`, data as StoredDoc);
        },
      }),
      add: async (data: unknown) => {
          const id = 'generated-id-' + Math.random().toString(36).substr(2, 9);
          storage.set(`${name}/${id}`, data as StoredDoc);
          return { id };
      },
      // Mocking for queries if needed (omitted for now as we test specific logic)
      where: () => ({ orderBy: () => ({ get: async () => ({ docs: [] }) }) }) 
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
