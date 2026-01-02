import {
  getTeacherDashboard,
  getTeacherClasses,
  getTeacherClass,
  getClassRoster,
  getClassAttendance,
  markClassAttendance,
  updateAttendanceRecord,
  getAttendanceRecord,
} from '../teacher-api';

// Mock the api-client module
jest.mock('../api-client', () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from '../api-client';
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('teacher-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTeacherDashboard', () => {
    test('TA-001: calls correct endpoint', async () => {
      const mockDashboard = {
        teacher: { uid: 'teacher-1', name: 'Teacher', email: 'teacher@test.com' },
        stats: { totalClasses: 3, totalStudents: 50, classesToday: 2 },
        todaysSchedule: [],
        classes: [],
        recentAttendance: [],
      };

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: mockDashboard,
      });

      const result = await getTeacherDashboard();

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/dashboard');
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('getTeacherClasses', () => {
    test('TA-002: calls correct endpoint and returns classes', async () => {
      const mockClasses = [
        { id: 'class-1', name: 'Class A', gradeId: 'kg', gradeName: 'KG', day: 'Saturday', time: '10am', capacity: 20, enrolled: 15, available: 5, teacherRole: 'primary', status: 'active' },
      ];

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { classes: mockClasses, total: 1 },
      });

      const result = await getTeacherClasses();

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/classes');
      expect(result).toEqual(mockClasses);
    });
  });

  describe('getTeacherClass', () => {
    test('TA-003: calls correct endpoint with classId', async () => {
      const mockClass = {
        id: 'class-1',
        name: 'Class A',
        gradeId: 'kg',
        gradeName: 'KG',
        day: 'Saturday',
        time: '10am',
        capacity: 20,
        enrolled: 15,
        available: 5,
        teacherRole: 'primary' as const,
        status: 'active',
      };

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { class: mockClass },
      });

      const result = await getTeacherClass('class-1');

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/classes/class-1');
      expect(result).toEqual(mockClass);
    });
  });

  describe('getClassRoster', () => {
    test('TA-004: calls correct endpoint without options', async () => {
      const mockRoster = {
        students: [],
        total: 0,
        class: { id: 'class-1', name: 'Class A', gradeName: 'KG', day: 'Saturday', time: '10am', teacherRole: 'primary' },
      };

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: mockRoster,
      });

      const result = await getClassRoster('class-1');

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/classes/class-1/roster');
      expect(result).toEqual(mockRoster);
    });

    test('TA-005: includes search parameter', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { students: [], total: 0, class: {} },
      });

      await getClassRoster('class-1', { search: 'John' });

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/classes/class-1/roster?search=John');
    });

    test('TA-006: includes status parameter', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { students: [], total: 0, class: {} },
      });

      await getClassRoster('class-1', { status: 'active' });

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/classes/class-1/roster?status=active');
    });

    test('TA-007: includes multiple parameters', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { students: [], total: 0, class: {} },
      });

      await getClassRoster('class-1', { search: 'Jane', status: 'active' });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/teacher/classes/class-1/roster?')
      );
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=Jane')
      );
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active')
      );
    });
  });

  describe('getClassAttendance', () => {
    test('TA-008: calls correct endpoint without options', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { records: [], total: 0, limit: 50, offset: 0 },
      });

      await getClassAttendance('class-1');

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/classes/class-1/attendance');
    });

    test('TA-009: includes date parameter', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { records: [], total: 0, limit: 50, offset: 0 },
      });

      await getClassAttendance('class-1', { date: '2025-01-15' });

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/classes/class-1/attendance?date=2025-01-15');
    });

    test('TA-010: includes date range parameters', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { records: [], total: 0, limit: 50, offset: 0 },
      });

      await getClassAttendance('class-1', { startDate: '2025-01-01', endDate: '2025-01-31' });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2025-01-01')
      );
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2025-01-31')
      );
    });

    test('TA-011: includes pagination parameters', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { records: [], total: 100, limit: 10, offset: 20 },
      });

      await getClassAttendance('class-1', { limit: 10, offset: 20 });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10')
      );
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20')
      );
    });
  });

  describe('markClassAttendance', () => {
    test('TA-012: sends POST with correct body', async () => {
      const mockRecords = [
        { studentId: 'student-1', status: 'present' as const },
        { studentId: 'student-2', status: 'absent' as const },
      ];

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { records: [], count: 2 },
      });

      await markClassAttendance('class-1', '2025-01-15', mockRecords);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/v1/teacher/classes/class-1/attendance',
        {
          method: 'POST',
          body: JSON.stringify({ date: '2025-01-15', records: mockRecords }),
        }
      );
    });

    test('TA-013: includes optional arrivalTime and notes', async () => {
      const mockRecords = [
        { studentId: 'student-1', status: 'late' as const, arrivalTime: '10:15', notes: 'Traffic' },
      ];

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { records: [], count: 1 },
      });

      await markClassAttendance('class-1', '2025-01-15', mockRecords);

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ date: '2025-01-15', records: mockRecords }),
        })
      );
    });
  });

  describe('updateAttendanceRecord', () => {
    test('TA-014: sends PUT with updates', async () => {
      const mockRecord = {
        id: 'record-1',
        studentId: 'student-1',
        studentName: 'John Doe',
        date: '2025-01-15',
        status: 'late' as const,
        recordedBy: 'teacher-1',
        recordedByName: 'Teacher',
        recordedAt: '2025-01-15T10:00:00Z',
      };

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { record: mockRecord },
      });

      const updates = { status: 'late' as const, notes: 'Was stuck in traffic' };
      const result = await updateAttendanceRecord('class-1', 'record-1', updates);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/v1/teacher/classes/class-1/attendance/record-1',
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );
      expect(result).toEqual(mockRecord);
    });

    test('TA-015: includes editReason in updates', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { record: {} },
      });

      await updateAttendanceRecord('class-1', 'record-1', {
        status: 'present',
        editReason: 'Correcting attendance error',
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ status: 'present', editReason: 'Correcting attendance error' }),
        })
      );
    });
  });

  describe('getAttendanceRecord', () => {
    test('TA-016: calls correct endpoint with classId and recordId', async () => {
      const mockRecord = {
        id: 'record-1',
        studentId: 'student-1',
        studentName: 'John Doe',
        date: '2025-01-15',
        status: 'present' as const,
        recordedBy: 'teacher-1',
        recordedByName: 'Teacher',
        recordedAt: '2025-01-15T10:00:00Z',
      };

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { record: mockRecord },
      });

      const result = await getAttendanceRecord('class-1', 'record-1');

      expect(mockApiFetch).toHaveBeenCalledWith('/v1/teacher/classes/class-1/attendance/record-1');
      expect(result).toEqual(mockRecord);
    });
  });
});
