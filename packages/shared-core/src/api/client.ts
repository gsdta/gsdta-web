/**
 * Shared API Client
 *
 * Platform-agnostic HTTP client that uses the configured PlatformAdapter
 * for network requests and authentication.
 */

import { getPlatformAdapter, isPlatformInitialized } from "../platform";

/**
 * API Error with status code
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Options for API fetch
 */
export interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** If true, path is absolute URL (not joined with baseUrl) */
  rawUrl?: boolean;
  /** If true, skip auth token */
  skipAuth?: boolean;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

/**
 * Join path with base URL
 */
function joinUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return path;
  if (/^https?:/i.test(path)) return path;
  if (path.startsWith("/")) return `${baseUrl}${path}`;
  return `${baseUrl}/${path}`;
}

/**
 * Make an API request using the configured platform adapter.
 *
 * @param path - API endpoint path (e.g., '/v1/me/students/')
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws ApiError if response is not ok
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  if (!isPlatformInitialized()) {
    throw new Error(
      "Platform not initialized. Call initializePlatform() before making API requests."
    );
  }

  const platform = getPlatformAdapter();
  const { rawUrl, skipAuth, headers, ...rest } = options;

  // Build URL
  const url = rawUrl ? path : joinUrl(platform.network.baseUrl, path);

  // Build headers
  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Attach auth token if available and not skipped
  if (!skipAuth && !mergedHeaders["Authorization"]) {
    try {
      const token = await platform.auth.getToken();
      if (token) {
        mergedHeaders["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Ignore token errors; request proceeds without auth
    }
  }

  // Make request
  const res = await platform.network.fetch(url, {
    ...rest,
    headers: mergedHeaders,
    credentials: "include",
  });

  // Handle errors
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (data && typeof data === "object" && "message" in data) {
        const m = (data as Record<string, unknown>).message;
        if (typeof m === "string" && m.trim()) message = m;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(message, res.status);
  }

  // No content
  if (res.status === 204) {
    return undefined as T;
  }

  // Parse JSON
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as T;
  }
}

/**
 * Helper to ensure path has trailing slash (avoids 308 redirects)
 */
export function withTrailingSlash(path: string): string {
  if (path.includes("?")) {
    const [base, query] = path.split("?");
    return base.endsWith("/") ? path : `${base}/?${query}`;
  }
  return path.endsWith("/") ? path : `${path}/`;
}
