"use client";
import React, {useState, useEffect} from "react";
import type {EnrollmentWithDetails} from "@/lib/enrollment-types";
import {getEnrollments} from "@/lib/enrollment-api";

export function EnrollmentStatus() {
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getEnrollments()
            .then((data) => {
                setEnrollments(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load enrollments");
                setLoading(false);
            });
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "accepted":
                return "bg-green-100 text-green-800";
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            case "waitlisted":
                return "bg-orange-100 text-orange-800";
            case "rejected":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    if (loading) {
        return <div className="text-gray-600">Loading enrollments...</div>;
    }

    if (error) {
        return <div className="text-red-600">Error: {error}</div>;
    }

    if (enrollments.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                <p className="text-gray-600">No enrollments yet. Apply for classes above!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Enrollments</h3>
            <div className="space-y-3">
                {enrollments.map((enrollment) => (
                    <div
                        key={enrollment.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                    {enrollment.student?.firstName} {enrollment.student?.lastName}
                                </h4>
                                <p className="text-sm text-gray-600">{enrollment.class?.name}</p>
                                <p className="text-xs text-gray-500">
                                    {enrollment.class?.day} • {enrollment.class?.time}
                                </p>
                                {enrollment.notes && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        <strong>Notes:</strong> {enrollment.notes}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-400">
                                    Applied: {new Date(enrollment.appliedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(enrollment.status)}`}
                >
                  {enrollment.status}
                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
