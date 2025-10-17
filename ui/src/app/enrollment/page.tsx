"use client";
import React, {useState} from "react";
import {Protected} from "@/components/Protected";
import {EnrollmentForm} from "@/components/EnrollmentForm";
import {EnrollmentStatus} from "@/components/EnrollmentStatus";
import { useI18n } from "@/i18n/LanguageProvider";

export default function EnrollmentPage() {
    const { t } = useI18n();
    const [refreshKey, setRefreshKey] = useState(0);

    const handleEnrollmentSuccess = () => {
        // Trigger a refresh of the enrollment status
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <Protected roles={["parent", "admin"]}>
            <div className="mx-auto max-w-4xl space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t("enrollment.title")}</h1>
                    <p className="mt-2 text-gray-600">
                        {t("enrollment.subtitle")}
                    </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">{t("enrollment.apply")}</h2>
                    <EnrollmentForm onSuccess={handleEnrollmentSuccess}/>
                </div>

                <div key={refreshKey}>
                    <EnrollmentStatus/>
                </div>
            </div>
        </Protected>
    );
}
