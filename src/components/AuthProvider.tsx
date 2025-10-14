"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Role, User } from "@/lib/auth-types";

declare global {
  interface Window {
    __mswReady?: Promise<void>;
  }
}

const STORAGE_KEY = "auth:user";

async function waitForMsw() {
  if (typeof window === "undefined") return;
  const maxWaitMs = 2000;
  const intervalMs = 50;
  let waited = 0;
  while (!window.__mswReady && waited < maxWaitMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    waited += intervalMs;
  }
  if (window.__mswReady) {
    try {
      await window.__mswReady;
    } catch {
      // ignore
    }
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasManualAuth = useRef(false);

  // Hydrate from sessionStorage synchronously on first render
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        setUser(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await waitForMsw();
        const res = await fetch("/auth/session", { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as { user: User };
          if (!cancelled && !hasManualAuth.current) {
            setUser(data.user);
            try {
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
            } catch {}
          }
        } else {
          if (!cancelled && !hasManualAuth.current) {
            setUser(null);
            try {
              sessionStorage.removeItem(STORAGE_KEY);
            } catch {}
          }
        }
      } catch {
        if (!cancelled && !hasManualAuth.current) {
          setUser(null);
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (role: Role) => {
    hasManualAuth.current = true;
    await waitForMsw();
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = (await res.json()) as { user: User };
      setUser(data.user);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      } catch {}
    } catch {
      const fallback = {
        id: "local",
        name: "Priya",
        email: "priya@example.com",
        role,
      } satisfies User;
      setUser(fallback);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      } catch {}
    }
  }, []);

  const logout = useCallback(async () => {
    hasManualAuth.current = true;
    await waitForMsw();
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const setRole = useCallback(async (role: Role) => {
    hasManualAuth.current = true;
    await waitForMsw();
    try {
      const res = await fetch("/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Role change failed");
      const data = (await res.json()) as { user: User };
      setUser(data.user);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      } catch {}
    } catch {
      setUser((u) => {
        const next = u ? { ...u, role } : u;
        try {
          if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, setRole }),
    [user, loading, login, logout, setRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
