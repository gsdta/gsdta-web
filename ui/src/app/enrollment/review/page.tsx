"use client";
import React from "react";
import {Protected} from "@/components/Protected";
import {EnrollmentReview} from "@/components/EnrollmentReview";

export default function EnrollmentReviewPage() {
    return (
        <Protected roles={["admin"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Enrollment Management</h1>
                    <p className="mt-2 text-gray-600">
                        Review and manage enrollment applications from parents.
                    </p>
                </div>

                <EnrollmentReview/>
            </div>
        </Protected>
    );
}
