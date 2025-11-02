"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { Role } from "@/lib/auth-types";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "mock" as const;
const SKIP_EMAIL_VERIFICATION = process.env.NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION === "true";

function routeForRole(role: Role): string {
  switch (role) {
    case "admin": return "/admin";
    case "teacher": return "/teacher";
    default: return "/parent";
  }
}

export default function SignInPage() {
  const router = useRouter();
  const { user, loading, loginWithGoogle, loginWithEmailPassword, sendEmailVerification, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const isUnverified = AUTH_MODE === "firebase" && !SKIP_EMAIL_VERIFICATION && !!user && user.emailVerified === false;

  useEffect(() => {
    if (user && !loading) {
      // In Firebase mode, do not redirect if email is not verified (unless skipping verification)
      if (AUTH_MODE === "firebase" && !SKIP_EMAIL_VERIFICATION && user.emailVerified === false) return;
      router.replace(routeForRole(user.role));
    }
  }, [user, loading, router]);

  const onGoogle = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (AUTH_MODE === "firebase") await loginWithGoogle();
      else await login("parent"); // fallback to mock
    } catch (e) {
      setErr((e as Error).message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (AUTH_MODE === "firebase") await loginWithEmailPassword(email, password);
      else await login("parent");
    } catch (e) {
      setErr((e as Error).message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const onResendVerification = async () => {
    setErr(null);
    setVerificationSent(false);
    setBusy(true);
    try {
      await sendEmailVerification();
      setVerificationSent(true);
    } catch (e) {
      setErr((e as Error).message || "Failed to send verification email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="prose max-w-md mx-auto">
      <h1>Sign in</h1>
      <p>Please sign in to continue.</p>

      {isUnverified && (
        <div role="alert" className="not-prose p-3 border rounded bg-yellow-50 text-yellow-900 mb-4">
          <p className="font-medium">Verify your email to continue</p>
          <p className="text-sm">We sent a verification link to your email address. Please verify your email and then return here to access protected pages.</p>
          {verificationSent && (
            <p className="text-sm mt-2 text-green-700 font-medium">✓ Verification email sent! Check your inbox.</p>
          )}
          <div className="mt-3 flex gap-3 text-sm">
            <button onClick={onResendVerification} disabled={busy} className="underline hover:no-underline">
              {busy ? "Sending..." : "Resend verification email"}
            </button>
            <span>•</span>
            <button onClick={() => logout()} className="underline hover:no-underline">Sign out</button>
          </div>
        </div>
      )}

      <div className="not-prose space-y-4">
        <button onClick={onGoogle} disabled={busy} className="border rounded px-3 py-2 w-full">
          {busy ? "Signing in…" : "Continue with Google"}
        </button>

        <div className="text-center text-sm text-gray-500">or</div>

        <form onSubmit={onEmail} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   className="w-full border rounded px-2 py-1" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   className="w-full border rounded px-2 py-1" required />
          </div>
          <button type="submit" disabled={busy} className="border rounded px-3 py-2 w-full">
            {busy ? "Signing in…" : "Sign in with Email"}
          </button>
        </form>

        {err && <div role="alert" className="text-red-600 text-sm">{err}</div>}
      </div>
    </div>
  );
}

