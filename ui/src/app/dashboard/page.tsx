"use client";
import React, { useEffect } from "react";
import {Protected} from "@/components/Protected";
import { useI18n } from "@/i18n/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import type { Role } from "@/lib/auth-types";
import { useRouter } from "next/navigation";

function routeForRole(role: Role): string {
    switch (role) {
        case "admin": return "/admin";
        case "teacher": return "/teacher";
        default: return "/parent";
    }
}

export default function DashboardPage() {
    const { t } = useI18n();
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) router.replace(routeForRole(user.role));
    }, [user, router]);

    return (
        <Protected>
            <div className="prose">
                <h1>{t("dashboard.title")}</h1>
                <p>{t("dashboard.welcome")}</p>
            </div>
        </Protected>
    );
}
