import { 
  adminGetClasses, 
  adminGetClassOptions, 
  adminCreateClass, 
  adminUpdateClass 
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
});
