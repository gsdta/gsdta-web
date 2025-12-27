// api/src/lib/__tests__/firestoreAttendance.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAttendanceRecords,
  getAttendanceById,
  updateAttendanceRecord,
  getAttendanceSummary,
  attendanceExistsForDate,
  __setAdminDbForTests as setAttendanceDb,
} from '../firestoreAttendance';
import { __setAdminDbForTests as setClassesDb } from '../firestoreClasses';
import { __setAdminDbForTests as setStudentsDb } from '../firestoreStudents';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  let docCounter = 0;
  return {
    collection: (name: string) => ({
      doc: (id?: string) => {
        const docId = id || `auto-${++docCounter}`;
        return {
          id: docId,
          async get() {
            const data = storage.get(`${name}/${docId}`);
            return {
              exists: !!data,
              data: () => data || {},
              id: docId,
              ref: {
                update: async (updateData: Record<string, unknown>) => {
                  const existing = storage.get(`${name}/${docId}`) || {};
                  const merged = { ...existing, ...updateData };
                  storage.set(`${name}/${docId}`, merged);
                },
              },
            };
          },
          async set(data: unknown) {
            storage.set(`${name}/${docId}`, data as StoredDoc);
          },
        };
      },
      add: async (data: unknown) => {
        const id = `generated-${++docCounter}`;
        storage.set(`${name}/${id}`, data as StoredDoc);
        return { id };
      },
      where: (field: string, _op: string, value: unknown) => {
        const whereChain = {
          where: (_f: string, _o: string, _v: unknown) => whereChain,
          orderBy: () => ({
            offset: () => ({
              limit: () => ({
                get: async () => {
                  const docs: { id: string; data: () => StoredDoc }[] = [];
                  for (const [key, val] of storage.entries()) {
                    if (key.startsWith(`${name}/`)) {
                      let match = true;
                      // Simple field matching for tests
                      if (field && (val as any)[field] !== value) match = false;
                      if (match) {
                        docs.push({
                          id: key.replace(`${name}/`, ''),
                          data: () => val,
                        });
                      }
                    }
                  }
                  return { docs };
                },
              }),
            }),
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
              return { docs };
            },
            count: () => ({
              get: async () => ({
                data: () => ({ count: 0 }),
              }),
            }),
          }),
          get: async () => {
            const docs: { id: string; data: () => StoredDoc }[] = [];
            for (const [key, val] of storage.entries()) {
              if (key.startsWith(`${name}/`)) {
                let match = true;
                if (field && (val as any)[field] !== value) match = false;
                if (match) {
                  docs.push({
                    id: key.replace(`${name}/`, ''),
                    data: () => val,
                  });
                }
              }
            }
            return { docs };
          },
          count: () => ({
            get: async () => ({
              data: () => ({ count: 0 }),
            }),
          }),
        };
        return whereChain;
      },
    }),
    batch: () => {
      const ops: Array<{ type: 'set' | 'update'; ref: any; data: any }> = [];
      return {
        set: (ref: any, data: any) => {
          ops.push({ type: 'set', ref, data });
        },
        update: (ref: any, data: any) => {
          ops.push({ type: 'update', ref, data });
        },
        commit: async () => {
          for (const op of ops) {
            if (op.type === 'set') {
              await op.ref.set(op.data);
            }
          }
        },
      };
    },
  };
}

test('createAttendanceRecords: should create multiple attendance records', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);
  setStudentsDb(fakeProvider);

  // Seed class
  storage.set('classes/c1', {
    id: 'c1',
    name: 'Class A',
    teachers: [{ teacherId: 't1', role: 'primary' }],
  });

  // Seed students
  storage.set('students/s1', {
    id: 's1',
    firstName: 'John',
    lastName: 'Doe',
    classId: 'c1',
  });
  storage.set('students/s2', {
    id: 's2',
    firstName: 'Jane',
    lastName: 'Smith',
    classId: 'c1',
  });

  const records = [
    { studentId: 's1', status: 'present' as const },
    { studentId: 's2', status: 'late' as const, arrivalTime: '10:15 AM', notes: 'Traffic' },
  ];

  const created = await createAttendanceRecords('c1', '2025-01-15', records, 't1', 'Teacher 1');

  assert.equal(created.length, 2);
  assert.equal(created[0].classId, 'c1');
  assert.equal(created[0].className, 'Class A');
  assert.equal(created[0].date, '2025-01-15');
  assert.equal(created[0].studentName, 'John Doe');
  assert.equal(created[0].status, 'present');
  assert.equal(created[0].recordedBy, 't1');
  assert.equal(created[0].docStatus, 'active');

  assert.equal(created[1].studentName, 'Jane Smith');
  assert.equal(created[1].status, 'late');
  assert.equal(created[1].arrivalTime, '10:15 AM');
  assert.equal(created[1].notes, 'Traffic');

  setAttendanceDb(null);
  setClassesDb(null);
  setStudentsDb(null);
});

test('createAttendanceRecords: throws error if class not found', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  try {
    await createAttendanceRecords('nonexistent', '2025-01-15', [], 't1', 'Teacher 1');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err.message.includes('Class not found'));
  }

  setAttendanceDb(null);
  setClassesDb(null);
});

test('getAttendanceById: returns record when exists', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    id: 'a1',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-15',
    studentId: 's1',
    studentName: 'John Doe',
    status: 'present',
    docStatus: 'active',
  });

  const record = await getAttendanceById('a1');

  assert.ok(record);
  assert.equal(record?.id, 'a1');
  assert.equal(record?.status, 'present');

  setAttendanceDb(null);
});

test('getAttendanceById: returns null for deleted records', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    id: 'a1',
    docStatus: 'deleted',
  });

  const record = await getAttendanceById('a1');

  assert.equal(record, null);

  setAttendanceDb(null);
});

test('getAttendanceById: returns null when not exists', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  const record = await getAttendanceById('nonexistent');

  assert.equal(record, null);

  setAttendanceDb(null);
});

test('updateAttendanceRecord: updates status and tracks history', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  // Create a record from today
  const today = new Date().toISOString().split('T')[0];
  storage.set('attendance/a1', {
    id: 'a1',
    classId: 'c1',
    date: today,
    studentId: 's1',
    status: 'absent',
    docStatus: 'active',
  });

  const updated = await updateAttendanceRecord(
    'a1',
    { status: 'excused', editReason: 'Doctor note provided' },
    't1',
    'Teacher 1'
  );

  assert.ok(updated);
  assert.equal(updated?.status, 'excused');
  assert.equal(updated?.lastEditedBy, 't1');
  assert.ok(updated?.editHistory);
  assert.equal(updated?.editHistory?.length, 1);
  assert.equal(updated?.editHistory?.[0].previousStatus, 'absent');
  assert.equal(updated?.editHistory?.[0].newStatus, 'excused');
  assert.equal(updated?.editHistory?.[0].reason, 'Doctor note provided');

  setAttendanceDb(null);
});

test('updateAttendanceRecord: throws error for records older than 7 days', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  // Create a record from 10 days ago
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 10);
  const dateStr = oldDate.toISOString().split('T')[0];

  storage.set('attendance/a1', {
    id: 'a1',
    classId: 'c1',
    date: dateStr,
    status: 'absent',
    docStatus: 'active',
  });

  try {
    await updateAttendanceRecord('a1', { status: 'excused' }, 't1', 'Teacher 1');
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err.message.includes('older than 7 days'));
  }

  setAttendanceDb(null);
});

test('updateAttendanceRecord: returns null for nonexistent record', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  const updated = await updateAttendanceRecord('nonexistent', { status: 'present' }, 't1', 'T1');

  assert.equal(updated, null);

  setAttendanceDb(null);
});

test('getAttendanceSummary: calculates summary correctly', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { id: 'c1', name: 'Class A' });

  // Create attendance records
  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'late',
    docStatus: 'active',
  });
  storage.set('attendance/a4', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a5', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'excused',
    docStatus: 'active',
  });

  const summary = await getAttendanceSummary('c1', '2025-01-15');

  assert.ok(summary);
  assert.equal(summary?.date, '2025-01-15');
  assert.equal(summary?.classId, 'c1');
  assert.equal(summary?.className, 'Class A');
  assert.equal(summary?.present, 2);
  assert.equal(summary?.late, 1);
  assert.equal(summary?.absent, 1);
  assert.equal(summary?.excused, 1);
  assert.equal(summary?.total, 5);
  // Attendance rate: (present + late) / total * 100 = (2 + 1) / 5 * 100 = 60%
  assert.equal(summary?.attendanceRate, 60);

  setAttendanceDb(null);
  setClassesDb(null);
});

test('attendanceExistsForDate: returns true when records exist', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    docStatus: 'active',
  });

  const exists = await attendanceExistsForDate('c1', '2025-01-15');

  assert.equal(exists, true);

  setAttendanceDb(null);
});

test('attendanceExistsForDate: returns false when no records', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  const exists = await attendanceExistsForDate('c1', '2025-01-15');

  assert.equal(exists, false);

  setAttendanceDb(null);
});
