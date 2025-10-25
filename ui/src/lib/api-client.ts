// Central API fetch helper that applies base URL and dev debug auth header.
// For real auth in future, replace the debug header logic with token/cookie logic.

const USE_MSW = process.env.NEXT_PUBLIC_USE_MSW !== "false";
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const BASE_URL = (!USE_MSW && !RAW_BASE) ? "/api" : RAW_BASE; // Fallback to /api when MSW off and no base
export const EFFECTIVE_BASE_URL = BASE_URL;

const DEBUG_ENV = process.env.NEXT_PUBLIC_DEBUG_USER || ""; // Optional build-time default
const DEBUG_STORAGE_KEY = "auth:debug-user"; // LocalStorage persistence for selected debug principal

// Optional bearer token provider (e.g., Firebase ID token)
export type TokenProvider = () => Promise<string | null> | string | null;
let authTokenProvider: TokenProvider | null = null;
export function setAuthTokenProvider(provider: TokenProvider | null) {
    authTokenProvider = provider;
}

function resolveDebugUser(): string | undefined {
    // Priority: stored selection > env-specified > undefined
    if (typeof window !== "undefined") {
        try {
            const stored = localStorage.getItem(DEBUG_STORAGE_KEY);
            if (stored) return stored;
        } catch {
        }
    }
    return DEBUG_ENV || undefined;
}

export function getCurrentDebugUser(): string | undefined {
    return resolveDebugUser();
}

export function setDebugUser(userSpec: string | null) {
    if (typeof window === "undefined") return;
    try {
        if (userSpec) localStorage.setItem(DEBUG_STORAGE_KEY, userSpec);
        else localStorage.removeItem(DEBUG_STORAGE_KEY);
    } catch {
    }
}

export interface ApiFetchOptions extends RequestInit {
    rawUrl?: boolean; // if true, input path is absolute and not joined with BASE_URL
}

function joinUrl(path: string): string {
    if (!BASE_URL) return path;
    if (/^https?:/i.test(path)) return path;
    if (path.startsWith("/")) return `${BASE_URL}${path}`;
    return `${BASE_URL}/${path}`;
}

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const {rawUrl, headers, ...rest} = options;
    const url = rawUrl ? path : joinUrl(path);

    const debugUser = !USE_MSW ? resolveDebugUser() : undefined; // Only attach when not mocking

    const mergedHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k, String(v)])),
    };
    if (debugUser && !mergedHeaders['X-Debug-User']) {
        mergedHeaders['X-Debug-User'] = debugUser;
    }

    // Attach bearer token if provided
    if (authTokenProvider && !mergedHeaders['Authorization']) {
        try {
            const token = await Promise.resolve(authTokenProvider());
            if (token) mergedHeaders['Authorization'] = `Bearer ${token}`;
        } catch {
            // ignore token errors; request proceeds without it
        }
    }

    const res = await fetch(url, {...rest, headers: mergedHeaders, credentials: 'include'});
    if (!res.ok) {
        let message = res.statusText;
        try {
            const data = await res.json();
            if (data && typeof data === 'object' && 'message' in data) {
                const m = (data as Record<string, unknown>).message;
                if (typeof m === 'string' && m.trim()) message = m;
            }
        } catch {
        }
        throw new ApiError(message, res.status);
    }
    // No content
    if (res.status === 204) return undefined as T;
    try {
        return (await res.json()) as T;
    } catch {
        return undefined as T;
    }
}
