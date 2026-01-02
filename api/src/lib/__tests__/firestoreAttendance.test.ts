// api/src/lib/__tests__/firestoreAttendance.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAttendanceRecords,
  getAttendanceById,
  getAttendanceByClassAndDate,
  getAttendanceRecords,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getAttendanceSummary,
  getAttendanceHistory,
  getStudentAttendanceSummary,
  attendanceExistsForDate,
  deleteAttendanceForDate,
  getAttendanceAnalytics,
  getClassComparison,
  getChronicAbsentees,
  exportAttendanceRecords,
  __setAdminDbForTests as setAttendanceDb,
} from '../firestoreAttendance';
import { __setAdminDbForTests as setClassesDb } from '../firestoreClasses';
import { __setAdminDbForTests as setStudentsDb } from '../firestoreStudents';

type StoredDoc = Record<string, unknown>;

function makeFakeDb(storage: Map<string, StoredDoc> = new Map()) {
  let docCounter = 0;

  // Helper to check if a value matches a filter
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
        case '>=':
          if (fieldValue < filter.value) return false;
          break;
        case '<=':
          if (fieldValue > filter.value) return false;
          break;
      }
    }
    return true;
  };

  const createQueryChain = (
    collectionName: string,
    filters: Array<{ field: string; op: string; value: unknown }> = []
  ) => {
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
      offset: (n: number) => {
        const offsetChain = { ...queryChain };
        offsetChain._offset = n;
        return offsetChain;
      },
      limit: (n: number) => {
        const limitChain = { ...queryChain };
        limitChain._limit = n;
        return limitChain;
      },
      count: () => ({
        get: async () => ({
          data: () => ({ count: getMatchingDocs().length }),
        }),
      }),
      get: async () => {
        let docs = getMatchingDocs();
        if (queryChain._offset) {
          docs = docs.slice(queryChain._offset);
        }
        if (queryChain._limit) {
          docs = docs.slice(0, queryChain._limit);
        }
        return { docs, empty: docs.length === 0 };
      },
    };
    return queryChain;
  };

  return {
    collection: (name: string) => ({
      doc: (id?: string) => {
        const docId = id || `auto-${++docCounter}`;
        const docRef = {
          id: docId,
          async get() {
            const data = storage.get(`${name}/${docId}`);
            return {
              exists: !!data,
              data: () => data || {},
              id: docId,
              ref: docRef,
            };
          },
          async set(data: unknown) {
            storage.set(`${name}/${docId}`, data as StoredDoc);
          },
          async update(updateData: Record<string, unknown>) {
            const existing = storage.get(`${name}/${docId}`) || {};
            storage.set(`${name}/${docId}`, { ...existing, ...updateData });
          },
        };
        return docRef;
      },
      add: async (data: unknown) => {
        const id = `generated-${++docCounter}`;
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
            } else if (op.type === 'update') {
              await op.ref.update(op.data);
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

// ============================================
// getAttendanceByClassAndDate tests
// ============================================

test('getAttendanceByClassAndDate: returns records for class and date', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    studentId: 's1',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-15',
    studentId: 's2',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    date: '2025-01-16', // Different date
    studentId: 's1',
    status: 'present',
    docStatus: 'active',
  });

  const records = await getAttendanceByClassAndDate('c1', '2025-01-15');

  assert.equal(records.length, 2);
  assert.ok(records.every((r) => r.date === '2025-01-15'));

  setAttendanceDb(null);
});

test('getAttendanceByClassAndDate: excludes deleted records', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'deleted',
  });

  const records = await getAttendanceByClassAndDate('c1', '2025-01-15');

  assert.equal(records.length, 1);

  setAttendanceDb(null);
});

// ============================================
// getAttendanceRecords tests
// ============================================

test('getAttendanceRecords: returns paginated records with default filters', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-16',
    status: 'absent',
    docStatus: 'active',
  });

  const result = await getAttendanceRecords({});

  assert.ok(result.records);
  assert.ok(Array.isArray(result.records));
  assert.equal(result.total, 2);
  assert.equal(result.limit, 50);
  assert.equal(result.offset, 0);

  setAttendanceDb(null);
});

test('getAttendanceRecords: filters by classId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', { classId: 'c1', docStatus: 'active', date: '2025-01-15' });
  storage.set('attendance/a2', { classId: 'c2', docStatus: 'active', date: '2025-01-15' });

  const result = await getAttendanceRecords({ classId: 'c1' });

  assert.equal(result.total, 1);

  setAttendanceDb(null);
});

test('getAttendanceRecords: filters by studentId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', { studentId: 's1', docStatus: 'active', date: '2025-01-15' });
  storage.set('attendance/a2', { studentId: 's2', docStatus: 'active', date: '2025-01-15' });

  const result = await getAttendanceRecords({ studentId: 's1' });

  assert.equal(result.total, 1);

  setAttendanceDb(null);
});

test('getAttendanceRecords: filters by date', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', { date: '2025-01-15', docStatus: 'active' });
  storage.set('attendance/a2', { date: '2025-01-16', docStatus: 'active' });

  const result = await getAttendanceRecords({ date: '2025-01-15' });

  assert.equal(result.total, 1);

  setAttendanceDb(null);
});

test('getAttendanceRecords: filters by date range', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', { date: '2025-01-10', docStatus: 'active' });
  storage.set('attendance/a2', { date: '2025-01-15', docStatus: 'active' });
  storage.set('attendance/a3', { date: '2025-01-20', docStatus: 'active' });

  const result = await getAttendanceRecords({
    startDate: '2025-01-12',
    endDate: '2025-01-18',
  });

  assert.equal(result.total, 1);

  setAttendanceDb(null);
});

test('getAttendanceRecords: filters by startDate only', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', { date: '2025-01-10', docStatus: 'active' });
  storage.set('attendance/a2', { date: '2025-01-15', docStatus: 'active' });

  const result = await getAttendanceRecords({ startDate: '2025-01-12' });

  assert.equal(result.total, 1);

  setAttendanceDb(null);
});

test('getAttendanceRecords: filters by endDate only', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', { date: '2025-01-10', docStatus: 'active' });
  storage.set('attendance/a2', { date: '2025-01-20', docStatus: 'active' });

  const result = await getAttendanceRecords({ endDate: '2025-01-15' });

  assert.equal(result.total, 1);

  setAttendanceDb(null);
});

test('getAttendanceRecords: filters by status', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', { status: 'present', docStatus: 'active', date: '2025-01-15' });
  storage.set('attendance/a2', { status: 'absent', docStatus: 'active', date: '2025-01-15' });

  const result = await getAttendanceRecords({ status: 'present' });

  assert.equal(result.total, 1);

  setAttendanceDb(null);
});

test('getAttendanceRecords: filters by recordedBy', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', { recordedBy: 't1', docStatus: 'active', date: '2025-01-15' });
  storage.set('attendance/a2', { recordedBy: 't2', docStatus: 'active', date: '2025-01-15' });

  const result = await getAttendanceRecords({ recordedBy: 't1' });

  assert.equal(result.total, 1);

  setAttendanceDb(null);
});

// ============================================
// deleteAttendanceRecord tests
// ============================================

test('deleteAttendanceRecord: soft deletes a record', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    status: 'present',
    docStatus: 'active',
  });

  const result = await deleteAttendanceRecord('a1');

  assert.equal(result, true);

  const stored = storage.get('attendance/a1') as any;
  assert.equal(stored.docStatus, 'deleted');

  setAttendanceDb(null);
});

test('deleteAttendanceRecord: returns false for nonexistent record', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  const result = await deleteAttendanceRecord('nonexistent');

  assert.equal(result, false);

  setAttendanceDb(null);
});

// ============================================
// updateAttendanceRecord additional tests
// ============================================

test('updateAttendanceRecord: returns null for deleted record', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  const today = new Date().toISOString().split('T')[0];
  storage.set('attendance/a1', {
    date: today,
    status: 'present',
    docStatus: 'deleted',
  });

  const result = await updateAttendanceRecord('a1', { status: 'absent' }, 't1', 'T1');

  assert.equal(result, null);

  setAttendanceDb(null);
});

test('updateAttendanceRecord: updates arrivalTime and notes without changing status', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  const today = new Date().toISOString().split('T')[0];
  storage.set('attendance/a1', {
    date: today,
    status: 'late',
    arrivalTime: '10:00 AM',
    notes: 'Original',
    docStatus: 'active',
  });

  await updateAttendanceRecord(
    'a1',
    { arrivalTime: '10:30 AM', notes: 'Updated notes' },
    't1',
    'Teacher 1'
  );

  const stored = storage.get('attendance/a1') as any;
  assert.equal(stored.arrivalTime, '10:30 AM');
  assert.equal(stored.notes, 'Updated notes');
  assert.equal(stored.status, 'late'); // Status unchanged

  setAttendanceDb(null);
});

// ============================================
// getAttendanceSummary additional tests
// ============================================

test('getAttendanceSummary: returns null when no records', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { id: 'c1', name: 'Class A' });

  const summary = await getAttendanceSummary('c1', '2025-01-15');

  assert.equal(summary, null);

  setAttendanceDb(null);
  setClassesDb(null);
});

test('getAttendanceSummary: returns null when class not found', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  // Add attendance record but no class
  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });

  const summary = await getAttendanceSummary('c1', '2025-01-15');

  assert.equal(summary, null);

  setAttendanceDb(null);
  setClassesDb(null);
});

// ============================================
// getAttendanceHistory tests
// ============================================

test('getAttendanceHistory: returns attendance grouped by date', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { id: 'c1', name: 'Class A' });

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    date: '2025-01-16',
    status: 'late',
    docStatus: 'active',
  });

  const history = await getAttendanceHistory('c1');

  assert.ok(Array.isArray(history));
  assert.ok(history.length >= 1);

  setAttendanceDb(null);
  setClassesDb(null);
});

test('getAttendanceHistory: respects date range filters', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { id: 'c1', name: 'Class A' });
  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-10',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });

  const history = await getAttendanceHistory('c1', '2025-01-12', '2025-01-20');

  assert.ok(Array.isArray(history));

  setAttendanceDb(null);
  setClassesDb(null);
});

test('getAttendanceHistory: respects limit parameter', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { id: 'c1', name: 'Class A' });

  for (let i = 1; i <= 5; i++) {
    storage.set(`attendance/a${i}`, {
      classId: 'c1',
      date: `2025-01-${10 + i}`,
      status: 'present',
      docStatus: 'active',
    });
  }

  const history = await getAttendanceHistory('c1', undefined, undefined, 3);

  assert.ok(history.length <= 3);

  setAttendanceDb(null);
  setClassesDb(null);
});

// ============================================
// getStudentAttendanceSummary tests
// ============================================

test('getStudentAttendanceSummary: calculates student summary correctly', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setStudentsDb(fakeProvider);

  storage.set('students/s1', {
    firstName: 'John',
    lastName: 'Doe',
  });

  storage.set('attendance/a1', {
    studentId: 's1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    studentId: 's1',
    date: '2025-01-16',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    studentId: 's1',
    date: '2025-01-17',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a4', {
    studentId: 's1',
    date: '2025-01-18',
    status: 'late',
    docStatus: 'active',
  });
  storage.set('attendance/a5', {
    studentId: 's1',
    date: '2025-01-19',
    status: 'excused',
    docStatus: 'active',
  });

  const summary = await getStudentAttendanceSummary('s1');

  assert.ok(summary);
  assert.equal(summary?.studentId, 's1');
  assert.equal(summary?.studentName, 'John Doe');
  assert.equal(summary?.totalSessions, 5);
  assert.equal(summary?.present, 2);
  assert.equal(summary?.absent, 1);
  assert.equal(summary?.late, 1);
  assert.equal(summary?.excused, 1);
  // Attendance rate: (present + late) / total = 3 / 5 = 60%
  assert.equal(summary?.attendanceRate, 60);

  setAttendanceDb(null);
  setStudentsDb(null);
});

test('getStudentAttendanceSummary: returns null for nonexistent student', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setStudentsDb(fakeProvider);

  const summary = await getStudentAttendanceSummary('nonexistent');

  assert.equal(summary, null);

  setAttendanceDb(null);
  setStudentsDb(null);
});

test('getStudentAttendanceSummary: handles zero attendance rate', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setStudentsDb(fakeProvider);

  storage.set('students/s1', { firstName: 'Jane', lastName: 'Smith' });

  // No attendance records
  const summary = await getStudentAttendanceSummary('s1');

  assert.ok(summary);
  assert.equal(summary?.totalSessions, 0);
  assert.equal(summary?.attendanceRate, 0);

  setAttendanceDb(null);
  setStudentsDb(null);
});

// ============================================
// deleteAttendanceForDate tests
// ============================================

test('deleteAttendanceForDate: soft deletes all records for date', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    date: '2025-01-16', // Different date
    status: 'present',
    docStatus: 'active',
  });

  const count = await deleteAttendanceForDate('c1', '2025-01-15');

  assert.equal(count, 2);

  const stored1 = storage.get('attendance/a1') as any;
  const stored2 = storage.get('attendance/a2') as any;
  const stored3 = storage.get('attendance/a3') as any;

  assert.equal(stored1.docStatus, 'deleted');
  assert.equal(stored2.docStatus, 'deleted');
  assert.equal(stored3.docStatus, 'active'); // Should not be affected

  setAttendanceDb(null);
});

test('deleteAttendanceForDate: returns 0 when no records exist', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  const count = await deleteAttendanceForDate('c1', '2025-01-15');

  assert.equal(count, 0);

  setAttendanceDb(null);
});

// ============================================
// getAttendanceAnalytics tests
// ============================================

test('getAttendanceAnalytics: calculates analytics for date range', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    date: '2025-01-16',
    status: 'late',
    docStatus: 'active',
  });
  storage.set('attendance/a4', {
    classId: 'c1',
    date: '2025-01-16',
    status: 'excused',
    docStatus: 'active',
  });

  const analytics = await getAttendanceAnalytics({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
  });

  assert.ok(analytics);
  assert.equal(analytics.totalStudentRecords, 4);
  assert.equal(analytics.totalSessions, 2); // 2 unique dates
  assert.equal(analytics.overallStats.present, 1);
  assert.equal(analytics.overallStats.absent, 1);
  assert.equal(analytics.overallStats.late, 1);
  assert.equal(analytics.overallStats.excused, 1);
  // Attendance rate: (present + late) / total = 2 / 4 = 50%
  assert.equal(analytics.overallStats.attendanceRate, 50);
  assert.ok(Array.isArray(analytics.trendData));

  setAttendanceDb(null);
});

test('getAttendanceAnalytics: filters by classId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c2',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });

  const analytics = await getAttendanceAnalytics({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    classId: 'c1',
  });

  assert.equal(analytics.totalStudentRecords, 1);

  setAttendanceDb(null);
});

test('getAttendanceAnalytics: filters by gradeId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { gradeId: 'g1', status: 'active' });
  storage.set('classes/c2', { gradeId: 'g2', status: 'active' });

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c2',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });

  const analytics = await getAttendanceAnalytics({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    gradeId: 'g1',
  });

  assert.equal(analytics.totalStudentRecords, 1);

  setAttendanceDb(null);
  setClassesDb(null);
});

test('getAttendanceAnalytics: handles empty result', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  const analytics = await getAttendanceAnalytics({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
  });

  assert.equal(analytics.totalStudentRecords, 0);
  assert.equal(analytics.totalSessions, 0);
  assert.equal(analytics.overallStats.attendanceRate, 0);

  setAttendanceDb(null);
});

// ============================================
// getClassComparison tests
// ============================================

test('getClassComparison: compares attendance across classes', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { name: 'Class A', gradeId: 'g1', status: 'active' });
  storage.set('classes/c2', { name: 'Class B', gradeId: 'g1', status: 'active' });

  // Class A: 2 present, 1 absent = 67% rate
  storage.set('attendance/a1', {
    classId: 'c1',
    studentId: 's1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    studentId: 's2',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    studentId: 's3',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });

  // Class B: 1 present, 2 absent = 33% rate
  storage.set('attendance/a4', {
    classId: 'c2',
    studentId: 's4',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a5', {
    classId: 'c2',
    studentId: 's5',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a6', {
    classId: 'c2',
    studentId: 's6',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });

  const comparisons = await getClassComparison({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
  });

  assert.ok(Array.isArray(comparisons));
  assert.equal(comparisons.length, 2);

  // Should be sorted by attendance rate ascending (worst first)
  assert.equal(comparisons[0].className, 'Class B');
  assert.equal(comparisons[0].stats.attendanceRate, 33);
  assert.equal(comparisons[1].className, 'Class A');
  assert.equal(comparisons[1].stats.attendanceRate, 67);

  setAttendanceDb(null);
  setClassesDb(null);
});

test('getClassComparison: filters by gradeId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { name: 'Class A', gradeId: 'g1', status: 'active' });
  storage.set('classes/c2', { name: 'Class B', gradeId: 'g2', status: 'active' });

  storage.set('attendance/a1', {
    classId: 'c1',
    studentId: 's1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c2',
    studentId: 's2',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });

  const comparisons = await getClassComparison({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    gradeId: 'g1',
  });

  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].className, 'Class A');

  setAttendanceDb(null);
  setClassesDb(null);
});

test('getClassComparison: skips classes with no attendance', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { name: 'Class A', status: 'active' });
  storage.set('classes/c2', { name: 'Class B', status: 'active' });

  // Only Class A has attendance
  storage.set('attendance/a1', {
    classId: 'c1',
    studentId: 's1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });

  const comparisons = await getClassComparison({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
  });

  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].className, 'Class A');

  setAttendanceDb(null);
  setClassesDb(null);
});

// ============================================
// getChronicAbsentees tests
// ============================================

test('getChronicAbsentees: identifies students below threshold', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  // Student 1: 1 present, 4 absent = 20% rate (chronic absentee at 90% threshold)
  for (let i = 1; i <= 5; i++) {
    storage.set(`attendance/s1-a${i}`, {
      studentId: 's1',
      studentName: 'John Chronic',
      classId: 'c1',
      className: 'Class A',
      date: `2025-01-${10 + i}`,
      status: i === 1 ? 'present' : 'absent',
      docStatus: 'active',
    });
  }

  // Student 2: 5 present = 100% rate (not chronic)
  for (let i = 1; i <= 5; i++) {
    storage.set(`attendance/s2-a${i}`, {
      studentId: 's2',
      studentName: 'Jane Good',
      classId: 'c1',
      className: 'Class A',
      date: `2025-01-${10 + i}`,
      status: 'present',
      docStatus: 'active',
    });
  }

  const result = await getChronicAbsentees({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    threshold: 90, // 90% threshold
  });

  assert.ok(result.absentees);
  assert.equal(result.total, 1);
  assert.equal(result.absentees[0].studentId, 's1');
  assert.equal(result.absentees[0].attendanceRate, 20);

  setAttendanceDb(null);
});

test('getChronicAbsentees: filters by classId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  // Chronic absentee in Class A
  storage.set('attendance/a1', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });

  // Chronic absentee in Class B
  storage.set('attendance/a2', {
    studentId: 's2',
    studentName: 'Jane',
    classId: 'c2',
    className: 'Class B',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });

  const result = await getChronicAbsentees({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    classId: 'c1',
    threshold: 50,
  });

  assert.equal(result.total, 1);
  assert.equal(result.absentees[0].classId, 'c1');

  setAttendanceDb(null);
});

test('getChronicAbsentees: filters by gradeId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { gradeId: 'g1', status: 'active' });
  storage.set('classes/c2', { gradeId: 'g2', status: 'active' });

  storage.set('attendance/a1', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    studentId: 's2',
    studentName: 'Jane',
    classId: 'c2',
    className: 'Class B',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });

  const result = await getChronicAbsentees({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    gradeId: 'g1',
    threshold: 50,
  });

  assert.equal(result.total, 1);
  assert.equal(result.absentees[0].studentId, 's1');

  setAttendanceDb(null);
  setClassesDb(null);
});

test('getChronicAbsentees: paginates results', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  // Create 5 chronic absentees
  for (let i = 1; i <= 5; i++) {
    storage.set(`attendance/a${i}`, {
      studentId: `s${i}`,
      studentName: `Student ${i}`,
      classId: 'c1',
      className: 'Class A',
      date: '2025-01-15',
      status: 'absent',
      docStatus: 'active',
    });
  }

  const result = await getChronicAbsentees({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    threshold: 50,
    limit: 2,
    offset: 0,
  });

  assert.equal(result.total, 5);
  assert.equal(result.absentees.length, 2);

  setAttendanceDb(null);
});

test('getChronicAbsentees: tracks lastAttendedDate correctly', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-10',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-20',
    status: 'absent',
    docStatus: 'active',
  });

  const result = await getChronicAbsentees({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    threshold: 50,
  });

  assert.equal(result.absentees[0].lastAttendedDate, '2025-01-10');

  setAttendanceDb(null);
});

test('getChronicAbsentees: handles late as attended', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  // 2 late, 2 absent = 50% rate
  storage.set('attendance/a1', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-15',
    status: 'late',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-16',
    status: 'late',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-17',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a4', {
    studentId: 's1',
    studentName: 'John',
    classId: 'c1',
    className: 'Class A',
    date: '2025-01-18',
    status: 'absent',
    docStatus: 'active',
  });

  const result = await getChronicAbsentees({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    threshold: 60, // 60% threshold
  });

  assert.equal(result.absentees.length, 1);
  assert.equal(result.absentees[0].attendanceRate, 50);
  assert.equal(result.absentees[0].late, 2);

  setAttendanceDb(null);
});

test('getChronicAbsentees: handles excused absences', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  // Student with excused absences
  storage.set('attendance/a1', {
    classId: 'c1',
    className: 'Class A',
    studentId: 's1',
    studentName: 'John Doe',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    className: 'Class A',
    studentId: 's1',
    studentName: 'John Doe',
    date: '2025-01-16',
    status: 'excused',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    className: 'Class A',
    studentId: 's1',
    studentName: 'John Doe',
    date: '2025-01-17',
    status: 'excused',
    docStatus: 'active',
  });
  storage.set('attendance/a4', {
    classId: 'c1',
    className: 'Class A',
    studentId: 's1',
    studentName: 'John Doe',
    date: '2025-01-18',
    status: 'absent',
    docStatus: 'active',
  });

  const result = await getChronicAbsentees({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    threshold: 50, // 50% threshold
  });

  // 1 present, 2 excused, 1 absent = 25% attendance rate
  assert.equal(result.absentees.length, 1);
  assert.equal(result.absentees[0].excused, 2);

  setAttendanceDb(null);
});

test('getClassComparison: handles all attendance statuses', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);

  storage.set('classes/c1', { name: 'Class A', gradeId: 'g1', status: 'active' });

  // Mix of all status types
  storage.set('attendance/a1', {
    classId: 'c1',
    studentId: 's1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    studentId: 's2',
    date: '2025-01-15',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    studentId: 's3',
    date: '2025-01-15',
    status: 'late',
    docStatus: 'active',
  });
  storage.set('attendance/a4', {
    classId: 'c1',
    studentId: 's4',
    date: '2025-01-15',
    status: 'excused',
    docStatus: 'active',
  });

  const comparisons = await getClassComparison({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
  });

  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].stats.present, 1);
  assert.equal(comparisons[0].stats.absent, 1);
  assert.equal(comparisons[0].stats.late, 1);
  assert.equal(comparisons[0].stats.excused, 1);
  // Attendance rate: (present + late) / total = 2 / 4 = 50%
  assert.equal(comparisons[0].stats.attendanceRate, 50);

  setAttendanceDb(null);
  setClassesDb(null);
});

// ============================================
// exportAttendanceRecords tests
// ============================================

test('exportAttendanceRecords: exports records for date range', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c1',
    date: '2025-01-16',
    status: 'absent',
    docStatus: 'active',
  });
  storage.set('attendance/a3', {
    classId: 'c1',
    date: '2025-02-01', // Outside range
    status: 'present',
    docStatus: 'active',
  });

  const records = await exportAttendanceRecords({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
  });

  assert.ok(Array.isArray(records));
  assert.equal(records.length, 2);

  setAttendanceDb(null);
});

test('exportAttendanceRecords: filters by classId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    classId: 'c1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    classId: 'c2',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });

  const records = await exportAttendanceRecords({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    classId: 'c1',
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].classId, 'c1');

  setAttendanceDb(null);
});

test('exportAttendanceRecords: filters by studentId', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    studentId: 's1',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    studentId: 's2',
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });

  const records = await exportAttendanceRecords({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
    studentId: 's1',
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].studentId, 's1');

  setAttendanceDb(null);
});

test('exportAttendanceRecords: excludes deleted records', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);

  storage.set('attendance/a1', {
    date: '2025-01-15',
    status: 'present',
    docStatus: 'active',
  });
  storage.set('attendance/a2', {
    date: '2025-01-15',
    status: 'present',
    docStatus: 'deleted',
  });

  const records = await exportAttendanceRecords({
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
  });

  assert.equal(records.length, 1);

  setAttendanceDb(null);
});

// ============================================
// createAttendanceRecords additional tests
// ============================================

test('createAttendanceRecords: throws error if student not found', async () => {
  const storage = new Map();
  const fakeProvider = (() => makeFakeDb(storage)) as unknown as any;
  setAttendanceDb(fakeProvider);
  setClassesDb(fakeProvider);
  setStudentsDb(fakeProvider);

  storage.set('classes/c1', { id: 'c1', name: 'Class A' });
  // No students

  try {
    await createAttendanceRecords(
      'c1',
      '2025-01-15',
      [{ studentId: 'nonexistent', status: 'present' as const }],
      't1',
      'Teacher 1'
    );
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err.message.includes('Student not found'));
  }

  setAttendanceDb(null);
  setClassesDb(null);
  setStudentsDb(null);
});
