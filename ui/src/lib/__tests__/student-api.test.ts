import { 
  createStudent, 
  getMyStudents, 
  adminGetStudents, 
  adminAdmitStudent, 
  adminAssignClass 
} from '../student-api';

const mockGetIdToken = jest.fn().mockResolvedValue('test-token');

describe('student-api', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    fetchSpy = global.fetch as jest.Mock;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('getMyStudents', () => {
    test('SA-001: calls correct endpoint', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { students: [] } }),
      });

      await getMyStudents(mockGetIdToken);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/me\/students\/?$/),
        expect.any(Object)
      );
    });

    test('SA-002: passes auth header', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { students: [] } }),
      });

      await getMyStudents(mockGetIdToken);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('createStudent', () => {
    const mockStudentData = {
      firstName: 'Test',
      lastName: 'Student',
      dateOfBirth: '2015-01-01',
    };

    test('SA-003: calls POST', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { student: {} } }),
      });

      await createStudent(mockGetIdToken, mockStudentData);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('SA-004: sends body as JSON', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { student: {} } }),
      });

      await createStudent(mockGetIdToken, mockStudentData);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(mockStudentData),
        })
      );
    });
  });

  describe('adminGetStudents', () => {
    test('SA-005: calls admin endpoint', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { students: [] } }),
      });

      await adminGetStudents(mockGetIdToken);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/admin\/students/),
        expect.any(Object)
      );
    });

    test('SA-006: passes status filter', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { students: [] } }),
      });

      await adminGetStudents(mockGetIdToken, { status: 'pending' });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      );
    });

    test('SA-010: passes gradeId filter', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { students: [] } }),
      });

      await adminGetStudents(mockGetIdToken, { gradeId: 'grade-1' });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('gradeId=grade-1'),
        expect.any(Object)
      );
    });

    test('SA-011: passes unassigned filter', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { students: [] } }),
      });

      await adminGetStudents(mockGetIdToken, { unassigned: true });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('unassigned=true'),
        expect.any(Object)
      );
    });

    test('SA-012: passes multiple filters combined', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { students: [] } }),
      });

      await adminGetStudents(mockGetIdToken, { 
        status: 'admitted', 
        gradeId: 'grade-2',
        unassigned: true 
      });

      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain('status=admitted');
      expect(calledUrl).toContain('gradeId=grade-2');
      expect(calledUrl).toContain('unassigned=true');
    });
  });

  describe('adminAdmitStudent', () => {
    test('SA-007: calls admit endpoint', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { student: {} } }),
      });

      await adminAdmitStudent(mockGetIdToken, '123');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/admin\/students\/123\/admit/),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('adminAssignClass', () => {
    test('SA-008: sends classId', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { student: {} } }),
      });

      await adminAssignClass(mockGetIdToken, '123', 'class-1');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ classId: 'class-1' }),
        })
      );
    });
  });

  test('SA-009: Throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'API Error' }),
    });

    await expect(getMyStudents(mockGetIdToken)).rejects.toThrow('API Error');
  });
});
