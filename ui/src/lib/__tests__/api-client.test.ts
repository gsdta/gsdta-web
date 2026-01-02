import {
  apiFetch,
  ApiError,
  setAuthTokenProvider,
  getCurrentDebugUser,
  setDebugUser,
  EFFECTIVE_BASE_URL,
} from '../api-client';

describe('api-client', () => {
  let fetchSpy: jest.SpyInstance;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    fetchSpy = global.fetch as jest.Mock;
    // Clear any debug user
    setDebugUser(null);
    setAuthTokenProvider(null);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('apiFetch', () => {
    test('AC-001: makes fetch call with correct URL', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await apiFetch('/v1/test');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v1/test'),
        expect.any(Object)
      );
    });

    test('AC-002: includes Content-Type header', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('/v1/test');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('AC-003: includes credentials', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('/v1/test');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    test('AC-004: throws ApiError on non-ok response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Resource not found' }),
      });

      try {
        await apiFetch('/v1/test');
        fail('Expected ApiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Resource not found');
        expect((error as ApiError).status).toBe(404);
      }
    });

    test('AC-005: uses statusText when json message not available', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      await expect(apiFetch('/v1/test')).rejects.toThrow('Internal Server Error');
    });

    test('AC-006: handles json parse error gracefully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => { throw new Error('Parse error'); },
      });

      await expect(apiFetch('/v1/test')).rejects.toThrow('Server Error');
    });

    test('AC-007: returns undefined for 204 No Content', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => { throw new Error('No content'); },
      });

      const result = await apiFetch('/v1/test');
      expect(result).toBeUndefined();
    });

    test('AC-008: handles json parse error on success gracefully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Parse error'); },
      });

      const result = await apiFetch('/v1/test');
      expect(result).toBeUndefined();
    });

    test('AC-009: uses rawUrl when specified', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('https://example.com/api', { rawUrl: true });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.any(Object)
      );
    });

    test('AC-010: merges custom headers', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('/v1/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    test('AC-011: passes through fetch options', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('/v1/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });
  });

  describe('ApiError', () => {
    test('AC-012: has correct status property', () => {
      const error = new ApiError('Not found', 404);
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
    });

    test('AC-013: is instance of Error', () => {
      const error = new ApiError('Error', 500);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('setAuthTokenProvider', () => {
    test('AC-014: adds Authorization header when token provider set', async () => {
      setAuthTokenProvider(async () => 'test-token-123');

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('/v1/test');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
          }),
        })
      );
    });

    test('AC-015: handles null token gracefully', async () => {
      setAuthTokenProvider(async () => null);

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('/v1/test');

      const callHeaders = fetchSpy.mock.calls[0][1].headers;
      expect(callHeaders['Authorization']).toBeUndefined();
    });

    test('AC-016: handles token provider error gracefully', async () => {
      setAuthTokenProvider(async () => { throw new Error('Token error'); });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      // Should not throw, continues without token
      const result = await apiFetch('/v1/test');
      expect(result).toEqual({ success: true });
    });

    test('AC-017: does not override existing Authorization header', async () => {
      setAuthTokenProvider(async () => 'provider-token');

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('/v1/test', {
        headers: { 'Authorization': 'Bearer custom-token' },
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer custom-token',
          }),
        })
      );
    });
  });

  describe('Debug user functions', () => {
    test('AC-018: getCurrentDebugUser returns undefined by default', () => {
      const user = getCurrentDebugUser();
      expect(user).toBeUndefined();
    });

    test('AC-019: setDebugUser stores and retrieves user', () => {
      setDebugUser('test-user@example.com');
      const user = getCurrentDebugUser();
      expect(user).toBe('test-user@example.com');
    });

    test('AC-020: setDebugUser with null clears user', () => {
      setDebugUser('test-user@example.com');
      setDebugUser(null);
      const user = getCurrentDebugUser();
      expect(user).toBeUndefined();
    });
  });

  describe('URL joining', () => {
    test('AC-021: handles absolute URLs', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('https://external.com/api');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://external.com/api',
        expect.any(Object)
      );
    });

    test('AC-022: handles paths starting with slash', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch('/v1/users');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v1/users'),
        expect.any(Object)
      );
    });
  });

  describe('EFFECTIVE_BASE_URL', () => {
    test('AC-023: exports EFFECTIVE_BASE_URL', () => {
      expect(typeof EFFECTIVE_BASE_URL).toBe('string');
    });
  });
});
