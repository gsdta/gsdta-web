/**
 * API helper for making direct API requests during UAT tests
 *
 * Use this for:
 * - Health checks
 * - Data setup/teardown
 * - API response verification
 */
export class ApiHelper {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request to the API
   */
  async get(
    path: string,
    options?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || 30000
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Make a POST request to the API
   */
  async post(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || 30000
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if the API health endpoint is responding
   */
  async checkHealth(): Promise<{ healthy: boolean; status: number }> {
    try {
      const response = await this.get('/api/v1/health');
      return {
        healthy: response.ok,
        status: response.status,
      };
    } catch (error) {
      return {
        healthy: false,
        status: 0,
      };
    }
  }

  /**
   * Wait for the API to be healthy with retries
   */
  async waitForHealthy(maxAttempts = 10, delayMs = 5000): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { healthy } = await this.checkHealth();
      if (healthy) {
        return true;
      }
      console.log(`Health check attempt ${attempt}/${maxAttempts} failed, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return false;
  }

  /**
   * Parse JSON response safely
   */
  async parseJson<T>(response: Response): Promise<T | null> {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }
}
