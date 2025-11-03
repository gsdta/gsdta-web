"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EFFECTIVE_BASE_URL, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";

type VerifyResponse = {
  id: string;
  email: string;
  role: string; // "teacher"
  status: string; // "pending"
  expiresAt: string;
};

export default function AcceptInvitePage() {
  const search = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => (search.get("token") || "").trim(), [search]);

  const { user, loginWithGoogle, getIdToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [invite, setInvite] = useState<VerifyResponse | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setVerifyError(null);
      setInvite(null);
      if (!token) {
        setVerifyError("Missing invite token.");
        setLoading(false);
        return;
      }
      try {
        const base = EFFECTIVE_BASE_URL || "/api";
        const res = await apiFetch<VerifyResponse>(`${base}/v1/invites/verify?token=${encodeURIComponent(token)}`, { rawUrl: true });
        if (!cancelled) setInvite(res);
      } catch {
        if (!cancelled) setVerifyError("Invite not found or expired.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [token]);

  const needsGoogleSignIn = useMemo(() => {
    if (!invite) return false;
    if (!user) return true;
    // Must match invite email; backend will also enforce
    return !!user.email && user.email.toLowerCase() !== invite.email.toLowerCase();
  }, [user, invite]);

  async function onAccept() {
    setAcceptError(null);
    if (!invite) return;
    try {
      if (needsGoogleSignIn) {
        await loginWithGoogle();
      }
      const base = EFFECTIVE_BASE_URL || "/api";
      setAccepting(true);
      const tokenVal = await getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenVal) headers["Authorization"] = `Bearer ${tokenVal}`;
      await apiFetch(`${base}/v1/invites/accept`, {
        method: "POST",
        rawUrl: true,
        headers,
        body: JSON.stringify({ token }),
      });
      setAccepted(true);
      // Small delay then route to teacher dashboard
      setTimeout(() => router.replace("/teacher"), 800);
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') ? e.message : 'Failed to accept invite.';
      setAcceptError(msg);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Accept Teacher Invite</h1>
      {loading && <p data-testid="invite-loading">Validating invite…</p>}
      {!loading && verifyError && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{verifyError}</div>
      )}
      {!loading && invite && !accepted && (
        <div className="space-y-4">
          <div className="rounded border p-3">
            <p className="mb-1">Email: <strong data-testid="invite-email">{invite.email}</strong></p>
            <p className="mb-1">Role: <strong data-testid="invite-role">{invite.role}</strong></p>
            <p className="text-sm text-gray-600">Expires: {new Date(invite.expiresAt).toLocaleString()}</p>
          </div>
          {needsGoogleSignIn && (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-800">
              Please sign in with Google using the invited email ({invite.email}) to continue.
            </div>
          )}
          {acceptError && (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{acceptError}</div>
          )}
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={onAccept}
            disabled={accepting}
          >
            {accepting ? "Accepting…" : "Accept Invite"}
          </button>
        </div>
      )}
      {accepted && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-800">
          Invite accepted. Redirecting to your teacher dashboard…
        </div>
      )}
    </div>
  );
}
