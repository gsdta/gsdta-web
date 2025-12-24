/**
 * API Client for E2E Test Data Management
 *
 * This client is used to create test data via the API endpoints.
 * It authenticates as admin/teacher/parent and makes API calls.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'fake-api-key-for-emulator';
const FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

interface AuthToken {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
}

export class ApiClient {
  private authToken: string | null = null;
  private currentRole: 'admin' | 'teacher' | 'parent' | null = null;

  /**
   * Login via Firebase Auth Emulator REST API
   */
  async login(email: string, password: string): Promise<void> {
    const url = `http://${FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${error.error?.message || response.statusText}`);
    }

    const data: AuthToken = await response.json();
    this.authToken = data.idToken;
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin(): Promise<void> {
    await this.login('admin@test.com', 'admin123');
    this.currentRole = 'admin';
  }

  /**
   * Login as teacher user
   */
  async loginAsTeacher(): Promise<void> {
    await this.login('teacher@test.com', 'teacher123');
    this.currentRole = 'teacher';
  }

  /**
   * Login as parent user
   */
  async loginAsParent(): Promise<void> {
    await this.login('parent@test.com', 'parent123');
    this.currentRole = 'parent';
  }

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return this.authToken;
  }

  /**
   * Get current role
   */
  getRole(): 'admin' | 'teacher' | 'parent' | null {
    return this.currentRole;
  }

  /**
   * Make authenticated GET request
   */
  async get<T>(path: string): Promise<ApiResponse<T>> {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call login first.');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Make authenticated POST request
   */
  async post<T>(path: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call login first.');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.json();
  }

  /**
   * Make authenticated PATCH request
   */
  async patch<T>(path: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call login first.');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.json();
  }

  /**
   * Make authenticated DELETE request
   */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call login first.');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    return response.json();
  }

  /**
   * Clear auth state
   */
  logout(): void {
    this.authToken = null;
    this.currentRole = null;
  }
}

// Singleton instance for reuse across tests
let sharedClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!sharedClient) {
    sharedClient = new ApiClient();
  }
  return sharedClient;
}

export function resetApiClient(): void {
  if (sharedClient) {
    sharedClient.logout();
  }
  sharedClient = null;
}
