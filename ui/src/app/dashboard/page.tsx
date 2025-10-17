"use client";
import React from "react";
import {Protected} from "@/components/Protected";
import { useI18n } from "@/i18n/LanguageProvider";

export default function DashboardPage() {
    const { t } = useI18n();
    return (
        <Protected>
            <div className="prose">
                <h1>{t("dashboard.title")}</h1>
                <p>{t("dashboard.welcome")}</p>
            </div>
        </Protected>
    );
}
