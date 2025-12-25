"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/i18n/LanguageProvider";
import { Protected } from "@/components/Protected";

export default function ChangePasswordPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const isGoogleUser = user?.authProvider === "google";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (newPassword.length < 8) {
            setError(t("password.change.error.weak"));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t("password.change.error.mismatch"));
            return;
        }

        setLoading(true);

        try {
            // Dynamic import Firebase to avoid bundling issues
            const { getFirebaseAuth } = await import("@/lib/firebase/client");
            const {
                reauthenticateWithCredential,
                EmailAuthProvider,
                updatePassword
            } = await import("firebase/auth");

            const auth = getFirebaseAuth();
            const firebaseUser = auth.currentUser;

            if (!firebaseUser || !firebaseUser.email) {
                setError(t("password.change.error.generic"));
                return;
            }

            // Re-authenticate user with current password
            const credential = EmailAuthProvider.credential(
                firebaseUser.email,
                currentPassword
            );

            try {
                await reauthenticateWithCredential(firebaseUser, credential);
            } catch {
                setError(t("password.change.error.wrong"));
                return;
            }

            // Update password
            await updatePassword(firebaseUser, newPassword);

            setSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Redirect after short delay
            setTimeout(() => {
                router.back();
            }, 2000);
        } catch {
            setError(t("password.change.error.generic"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Protected>
            <div className="max-w-md mx-auto">
                <h1 className="text-2xl font-bold mb-2">{t("password.change.title")}</h1>
                <p className="text-gray-600 mb-6">{t("password.change.subtitle")}</p>

                {isGoogleUser ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-800">{t("password.change.googleUser")}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-green-700 text-sm">{t("password.change.success")}</p>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="currentPassword"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("password.change.current")}
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="newPassword"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("password.change.new")}
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {t("password.change.confirm")}
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || success}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? "..." : t("password.change.submit")}
                        </button>
                    </form>
                )}
            </div>
        </Protected>
    );
}
