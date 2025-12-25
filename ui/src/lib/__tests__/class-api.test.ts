import {
  adminGetClasses,
  adminGetClassOptions,
  adminCreateClass,
  adminUpdateClass,
  getPrimaryTeacher,
  getAssistantTeachers,
  formatTeachersDisplay,
  type ClassTeacher,
  type CreateClassInput,
} from '../class-api';

const mockGetIdToken = jest.fn().mockResolvedValue('test-token');

describe('class-api', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    fetchSpy = global.fetch as jest.Mock;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('adminGetClasses', () => {
    test('CA-001: calls correct endpoint', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { classes: [] } }),
      });

      await adminGetClasses(mockGetIdToken);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/admin\/classes/),
        expect.any(Object)
      );
    });

    test('CA-002: passes status filter', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { classes: [] } }),
      });

      await adminGetClasses(mockGetIdToken, { status: 'active' });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      );
    });
  });

  describe('adminGetClassOptions', () => {
    test('CA-003: uses options=true', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { options: [] } }),
      });

      await adminGetClassOptions(mockGetIdToken);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('options=true'),
        expect.any(Object)
      );
    });
  });

  describe('adminCreateClass', () => {
    const mockClassData = {
      name: 'New Class',
      level: 'Beginner',
      day: 'Saturday',
      time: '10am',
      capacity: 20,
    };

    test('CA-004: calls POST', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { class: {} } }),
      });

      await adminCreateClass(mockGetIdToken, mockClassData);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockClassData),
        })
      );
    });
  });

  describe('adminUpdateClass', () => {
    test('CA-005: calls PATCH', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { class: {} } }),
      });

      await adminUpdateClass(mockGetIdToken, 'class-1', { status: 'inactive' });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/admin\/classes\/class-1/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'inactive' }),
        })
      );
    });
  });

  test('CA-006: Throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'API Error' }),
    });

    await expect(adminGetClasses(mockGetIdToken)).rejects.toThrow('API Error');
  });

  describe('adminCreateClass with section and room', () => {
    test('CA-007: includes section and room in request', async () => {
      const classData: CreateClassInput = {
        name: 'Grade 1 Section A',
        gradeId: 'grade-1',
        section: 'A',
        room: 'B01',
        day: 'Saturday',
        time: '10:00 AM - 12:00 PM',
        capacity: 25,
        academicYear: '2025-2026',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { class: classData } }),
      });

      await adminCreateClass(mockGetIdToken, classData);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(classData),
        })
      );
    });

    test('CA-008: section and room are optional', async () => {
      const classData: CreateClassInput = {
        name: 'Grade 1',
        gradeId: 'grade-1',
        day: 'Saturday',
        time: '10:00 AM',
        capacity: 20,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { class: classData } }),
      });

      await adminCreateClass(mockGetIdToken, classData);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(classData),
        })
      );
    });
  });

  describe('adminUpdateClass with section and room', () => {
    test('CA-009: can update section', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { class: {} } }),
      });

      await adminUpdateClass(mockGetIdToken, 'class-1', { section: 'B' });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/admin\/classes\/class-1/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ section: 'B' }),
        })
      );
    });

    test('CA-010: can update room', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { class: {} } }),
      });

      await adminUpdateClass(mockGetIdToken, 'class-1', { room: 'B03' });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/admin\/classes\/class-1/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ room: 'B03' }),
        })
      );
    });
  });
});

describe('Teacher Helper Functions', () => {
  const mockTeachers: ClassTeacher[] = [
    {
      teacherId: 'teacher-1',
      teacherName: 'Priya Sharma',
      teacherEmail: 'priya@example.com',
      role: 'primary',
      assignedAt: '2025-01-01T00:00:00Z',
      assignedBy: 'admin-1',
    },
    {
      teacherId: 'teacher-2',
      teacherName: 'Raj Kumar',
      teacherEmail: 'raj@example.com',
      role: 'assistant',
      assignedAt: '2025-01-02T00:00:00Z',
      assignedBy: 'admin-1',
    },
    {
      teacherId: 'teacher-3',
      teacherName: 'Anita Patel',
      teacherEmail: 'anita@example.com',
      role: 'assistant',
      assignedAt: '2025-01-03T00:00:00Z',
      assignedBy: 'admin-1',
    },
  ];

  describe('getPrimaryTeacher', () => {
    test('CA-011: returns primary teacher', () => {
      const primary = getPrimaryTeacher(mockTeachers);
      expect(primary).toBeDefined();
      expect(primary?.teacherName).toBe('Priya Sharma');
      expect(primary?.role).toBe('primary');
    });

    test('CA-012: returns undefined if no primary', () => {
      const assistantsOnly = mockTeachers.filter((t) => t.role === 'assistant');
      const primary = getPrimaryTeacher(assistantsOnly);
      expect(primary).toBeUndefined();
    });

    test('CA-013: returns undefined for empty array', () => {
      const primary = getPrimaryTeacher([]);
      expect(primary).toBeUndefined();
    });
  });

  describe('getAssistantTeachers', () => {
    test('CA-014: returns all assistant teachers', () => {
      const assistants = getAssistantTeachers(mockTeachers);
      expect(assistants).toHaveLength(2);
      expect(assistants[0].teacherName).toBe('Raj Kumar');
      expect(assistants[1].teacherName).toBe('Anita Patel');
    });

    test('CA-015: returns empty array if no assistants', () => {
      const primaryOnly = mockTeachers.filter((t) => t.role === 'primary');
      const assistants = getAssistantTeachers(primaryOnly);
      expect(assistants).toHaveLength(0);
    });

    test('CA-016: returns empty array for empty input', () => {
      const assistants = getAssistantTeachers([]);
      expect(assistants).toHaveLength(0);
    });
  });

  describe('formatTeachersDisplay', () => {
    test('CA-017: formats primary with assistants', () => {
      const display = formatTeachersDisplay(mockTeachers);
      expect(display).toBe('Priya Sharma + 2 assistants');
    });

    test('CA-018: formats primary only', () => {
      const primaryOnly = mockTeachers.filter((t) => t.role === 'primary');
      const display = formatTeachersDisplay(primaryOnly);
      expect(display).toBe('Priya Sharma');
    });

    test('CA-019: formats single assistant with primary', () => {
      const oneAssistant = [mockTeachers[0], mockTeachers[1]];
      const display = formatTeachersDisplay(oneAssistant);
      expect(display).toBe('Priya Sharma + 1 assistant');
    });

    test('CA-020: formats assistants only (no primary)', () => {
      const assistantsOnly = mockTeachers.filter((t) => t.role === 'assistant');
      const display = formatTeachersDisplay(assistantsOnly);
      expect(display).toBe('2 assistants (no primary)');
    });

    test('CA-021: returns message for empty array', () => {
      const display = formatTeachersDisplay([]);
      expect(display).toBe('No teachers assigned');
    });

    test('CA-022: handles undefined/null teachers', () => {
      const display = formatTeachersDisplay(undefined as unknown as ClassTeacher[]);
      expect(display).toBe('No teachers assigned');
    });
  });
});
