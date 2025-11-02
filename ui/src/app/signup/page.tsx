"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { Role } from "@/lib/auth-types";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "mock" as const;

function routeForRole(role: Role): string {
  switch (role) {
    case "admin": return "/admin";
    case "teacher": return "/teacher";
    default: return "/parent";
  }
}

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading, loginWithGoogle, loginWithEmailPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      // Redirect authenticated users to their dashboard
      router.replace(routeForRole(user.role));
    }
  }, [user, loading, router]);

  const onGoogle = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (AUTH_MODE === "firebase") {
        await loginWithGoogle();
        // User profile will be auto-created on first sign-in by API
      }
    } catch (e: unknown) {
      setErr((e as Error)?.message || "Sign-up failed");
    } finally {
      setBusy(false);
    }
  };

  const onEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    // Validation
    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }

    setBusy(true);
    setIsCreating(true);
    try {
      if (AUTH_MODE === "firebase") {
        // Import Firebase functions dynamically
        const { getFirebaseAuth } = await import("@/lib/firebase/client");
        const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification: sendVerification } = await import("firebase/auth");

        const auth = getFirebaseAuth();
        const credential = await createUserWithEmailAndPassword(auth, email, password);

        // Update display name
        if (name && credential.user) {
          await updateProfile(credential.user, { displayName: name });
        }

        // Send verification email
        if (credential.user) {
          await sendVerification(credential.user);
        }

        // Sign in with the new credentials
        await loginWithEmailPassword(email, password);

        // User will be redirected by the useEffect above
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setErr("An account with this email already exists. Please sign in instead.");
      } else if (code === "auth/weak-password") {
        setErr("Password is too weak. Please use a stronger password.");
      } else if (code === "auth/invalid-email") {
        setErr("Invalid email address");
      } else {
        setErr(err?.message || "Sign-up failed");
      }
    } finally {
      setBusy(false);
      setIsCreating(false);
    }
  };

  // Don't show form if user is already authenticated
  if (user && !loading) {
    return null;
  }

  return (
    <div className="prose max-w-md mx-auto py-8">
      <h1>Create Parent Account</h1>
      <p>Sign up to access GSDTA services and manage your child&apos;s enrollment.</p>

      <div className="not-prose space-y-4 mt-6">
        <button
          onClick={onGoogle}
          disabled={busy}
          className="border rounded px-4 py-2 w-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy && !isCreating ? "Signing up…" : "Continue with Google"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <form onSubmit={onEmailSignUp} className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Re-enter password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="border rounded px-4 py-2 w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy && isCreating ? "Creating account…" : "Sign Up with Email"}
          </button>
        </form>

        {err && (
          <div role="alert" className="text-red-600 text-sm p-3 bg-red-50 rounded">
            {err}
          </div>
        )}

        <div className="text-center text-sm text-gray-600 pt-4">
          Already have an account?{" "}
          <Link href="/signin" className="text-blue-600 hover:underline">
            Sign in here
          </Link>
        </div>

        <div className="text-xs text-gray-500 pt-2">
          <p>
            Note: For email/password signups, you will need to verify your email address
            before accessing protected areas.
          </p>
        </div>
      </div>
    </div>
  );
}

