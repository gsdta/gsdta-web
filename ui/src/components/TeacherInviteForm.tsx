"use client";
import React, { useState } from "react";
import { apiFetch, EFFECTIVE_BASE_URL } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";

type InviteResponse = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: string;
};

export function TeacherInviteForm() {
  const { getIdToken } = useAuth();
  const [email, setEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<InviteResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const base = EFFECTIVE_BASE_URL || "/api";
      const response = await apiFetch<InviteResponse>(`${base}/v1/invites`, {
        method: "POST",
        rawUrl: true,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          role: "teacher",
          expiresInHours,
        }),
      });

      setSuccess(response);
      setEmail("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Failed to create invite";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inviteLink = success
    ? `${window.location.origin}/invite/accept?token=${success.token}`
    : "";

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border">
      <h2 className="text-xl font-semibold mb-4">Create Teacher Invite</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Teacher Email *
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@example.com"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="expires" className="block text-sm font-medium mb-1">
            Expires In (Hours)
          </label>
          <input
            id="expires"
            type="number"
            min="1"
            max="720"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Default: 72 hours (3 days). Max: 720 hours (30 days).
          </p>
        </div>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded border border-green-300 bg-green-50 p-4 space-y-3">
            <p className="text-green-800 font-semibold">
              ✓ Invite created for {success.email}
            </p>
            <div>
              <label className="block text-sm font-medium text-green-800 mb-1">
                Invite Link:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 border rounded bg-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
            </div>
            <p className="text-xs text-green-700">
              Expires: {new Date(success.expiresAt).toLocaleString()}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Invite"}
        </button>
      </form>
    </div>
  );
}
