/**
 * Shared Firebase Auth Types
 *
 * Platform-agnostic auth interfaces that abstract away
 * Firebase Web SDK vs React Native Firebase differences.
 */

/**
 * Authentication provider types
 */
export type AuthProviderType = "google" | "password" | null;

/**
 * User role in the application
 */
export type Role = "admin" | "teacher" | "parent";

/**
 * Authenticated user information
 */
export interface AuthUser {
  /** User's unique identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** Currently active role */
  role: Role;
  /** All roles assigned to the user */
  roles: Role[];
  /** Whether the user's email is verified */
  emailVerified?: boolean;
  /** The auth provider used for sign-in */
  authProvider?: AuthProviderType;
}

/**
 * Auth state change callback
 */
export type AuthStateCallback = (user: AuthUser | null) => void;

/**
 * Platform-agnostic auth adapter interface
 *
 * This interface abstracts Firebase auth operations so that
 * both web and mobile can implement the same API.
 */
export interface AuthAdapter {
  /**
   * Get the currently authenticated user
   */
  getCurrentUser(): AuthUser | null;

  /**
   * Get the current user's ID token
   */
  getIdToken(forceRefresh?: boolean): Promise<string | null>;

  /**
   * Sign in with Google
   */
  signInWithGoogle(): Promise<void>;

  /**
   * Sign in with email and password
   */
  signInWithEmailPassword(email: string, password: string): Promise<void>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;

  /**
   * Send email verification to the current user
   */
  sendEmailVerification(): Promise<void>;

  /**
   * Subscribe to auth state changes
   * Returns an unsubscribe function
   */
  onAuthStateChanged(callback: AuthStateCallback): () => void;

  /**
   * Fetch user profile from the API
   * This is called after Firebase auth to get app-specific user data
   */
  fetchUserProfile(token: string): Promise<AuthUser | null>;
}

/**
 * Configuration for initializing the auth adapter
 */
export interface AuthConfig {
  /** Base URL for API calls */
  apiBaseUrl: string;
  /** Firebase configuration (platform-specific) */
  firebaseConfig?: Record<string, unknown>;
}

/**
 * Result from API /v1/me endpoint
 */
export interface MeApiResponse {
  uid: string;
  email: string;
  name?: string;
  roles: string[];
  emailVerified?: boolean;
}
