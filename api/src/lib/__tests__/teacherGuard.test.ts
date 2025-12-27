// api/src/lib/__tests__/teacherGuard.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkTeacherAssignment,
  verifyTeacherAssignment,
  getTeacherClasses,
  isPrimaryTeacher,
} from '../teacherGuard';
import { __setAdminDbForTests as setClassesDb } from '../firestoreClasses';
import { AuthError } from '../auth';

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
                const merged = { ...existing, ...updateData };
                storage.set(`${name}/${id}`, merged);
              },
            },
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
      where: () => ({ orderBy: () => ({ get: async () => ({ docs: [] }) }) }),
    }),
  };
}

test('checkTeacherAssignment: returns true when teacher is assigned as primary', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setClassesDb(fakeProvider);

  // Seed class with teacher
  storage.set('classes/c1', {
    id: 'c1',
    name: 'Class A',
    teachers: [
      {
        teacherId: 't1',
        teacherName: 'Teacher 1',
        role: 'primary',
      },
    ],
  });

  const result = await checkTeacherAssignment('t1', 'c1');

  assert.equal(result.isAssigned, true);
  assert.equal(result.role, 'primary');
  assert.ok(result.classData);
  assert.equal(result.classData?.name, 'Class A');

  setClassesDb(null);
});

test('checkTeacherAssignment: returns true when teacher is assigned as assistant', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setClassesDb(fakeProvider);

  storage.set('classes/c1', {
    id: 'c1',
    name: 'Class A',
    teachers: [
      {
        teacherId: 't1',
        teacherName: 'Teacher 1',
        role: 'assistant',
      },
    ],
  });

  const result = await checkTeacherAssignment('t1', 'c1');

  assert.equal(result.isAssigned, true);
  assert.equal(result.role, 'assistant');

  setClassesDb(null);
});

test('checkTeacherAssignment: returns false when teacher is not assigned', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setClassesDb(fakeProvider);

  storage.set('classes/c1', {
    id: 'c1',
    name: 'Class A',
    teachers: [
      {
        teacherId: 't1',
        teacherName: 'Teacher 1',
        role: 'primary',
      },
    ],
  });

  const result = await checkTeacherAssignment('t2', 'c1');

  assert.equal(result.isAssigned, false);
  assert.equal(result.role, null);

  setClassesDb(null);
});

test('checkTeacherAssignment: returns false when class does not exist', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setClassesDb(fakeProvider);

  const result = await checkTeacherAssignment('t1', 'nonexistent');

  assert.equal(result.isAssigned, false);
  assert.equal(result.role, null);
  assert.equal(result.classData, null);

  setClassesDb(null);
});

test('checkTeacherAssignment: supports legacy teacherId field', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setClassesDb(fakeProvider);

  // Legacy class format without teachers array
  storage.set('classes/c1', {
    id: 'c1',
    name: 'Class A',
    teacherId: 't1',
    teachers: [], // Empty array
  });

  const result = await checkTeacherAssignment('t1', 'c1');

  assert.equal(result.isAssigned, true);
  assert.equal(result.role, 'primary');

  setClassesDb(null);
});

test('verifyTeacherAssignment: succeeds when teacher is assigned', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setClassesDb(fakeProvider);

  storage.set('classes/c1', {
    id: 'c1',
    name: 'Class A',
    teachers: [
      {
        teacherId: 't1',
        teacherName: 'Teacher 1',
        role: 'primary',
      },
    ],
  });

  const { classData, role } = await verifyTeacherAssignment('t1', 'c1');

  assert.equal(classData.name, 'Class A');
  assert.equal(role, 'primary');

  setClassesDb(null);
});

test('verifyTeacherAssignment: throws 404 when class not found', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setClassesDb(fakeProvider);

  try {
    await verifyTeacherAssignment('t1', 'nonexistent');
    assert.fail('Should have thrown AuthError');
  } catch (err) {
    assert.ok(err instanceof AuthError);
    assert.equal((err as AuthError).status, 404);
    assert.equal((err as AuthError).code, 'class/not-found');
  }

  setClassesDb(null);
});

test('verifyTeacherAssignment: throws 403 when teacher not assigned', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setClassesDb(fakeProvider);

  storage.set('classes/c1', {
    id: 'c1',
    name: 'Class A',
    teachers: [
      {
        teacherId: 't1',
        teacherName: 'Teacher 1',
        role: 'primary',
      },
    ],
  });

  try {
    await verifyTeacherAssignment('t2', 'c1');
    assert.fail('Should have thrown AuthError');
  } catch (err) {
    assert.ok(err instanceof AuthError);
    assert.equal((err as AuthError).status, 403);
    assert.equal((err as AuthError).code, 'auth/forbidden');
  }

  setClassesDb(null);
});

test('getTeacherClasses: returns classes where teacher is assigned', () => {
  const classes = [
    {
      id: 'c1',
      name: 'Class A',
      teachers: [{ teacherId: 't1', role: 'primary' }],
    },
    {
      id: 'c2',
      name: 'Class B',
      teachers: [{ teacherId: 't2', role: 'primary' }],
    },
    {
      id: 'c3',
      name: 'Class C',
      teachers: [
        { teacherId: 't2', role: 'primary' },
        { teacherId: 't1', role: 'assistant' },
      ],
    },
  ] as any;

  const result = getTeacherClasses('t1', classes);

  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'c1');
  assert.equal(result[0].teacherRole, 'primary');
  assert.equal(result[1].id, 'c3');
  assert.equal(result[1].teacherRole, 'assistant');
});

test('getTeacherClasses: supports legacy teacherId field', () => {
  const classes = [
    {
      id: 'c1',
      name: 'Class A',
      teacherId: 't1', // Legacy
      teachers: [],
    },
    {
      id: 'c2',
      name: 'Class B',
      teachers: [{ teacherId: 't2', role: 'primary' }],
    },
  ] as any;

  const result = getTeacherClasses('t1', classes);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'c1');
  assert.equal(result[0].teacherRole, 'primary'); // Legacy defaults to primary
});

test('isPrimaryTeacher: returns true for primary teacher', () => {
  const classData = {
    id: 'c1',
    name: 'Class A',
    teachers: [
      { teacherId: 't1', role: 'primary' },
      { teacherId: 't2', role: 'assistant' },
    ],
  } as any;

  assert.equal(isPrimaryTeacher('t1', classData), true);
  assert.equal(isPrimaryTeacher('t2', classData), false);
});

test('isPrimaryTeacher: supports legacy teacherId field', () => {
  const classData = {
    id: 'c1',
    name: 'Class A',
    teacherId: 't1',
    teachers: [],
  } as any;

  assert.equal(isPrimaryTeacher('t1', classData), true);
  assert.equal(isPrimaryTeacher('t2', classData), false);
});
