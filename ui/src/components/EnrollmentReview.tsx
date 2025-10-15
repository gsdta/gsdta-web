"use client";
import React, {useState, useEffect, useCallback} from "react";
import type {EnrollmentWithDetails} from "@/lib/enrollment-types";
import {getEnrollments, updateEnrollmentStatus} from "@/lib/enrollment-api";

export function EnrollmentReview() {
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("all");
    const [updating, setUpdating] = useState<string | null>(null);

    const loadEnrollments = useCallback(() => {
        setLoading(true);
        const params = filter !== "all" ? {status: filter} : undefined;
        getEnrollments(params)
            .then((data) => {
                setEnrollments(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load enrollments");
                setLoading(false);
            });
    }, [filter]);

    useEffect(() => {
        loadEnrollments();
    }, [loadEnrollments]);

    const handleStatusChange = async (enrollmentId: string, newStatus: string) => {
        setUpdating(enrollmentId);
        setError(null);

        try {
            await updateEnrollmentStatus(enrollmentId, newStatus);
            // Reload enrollments to get updated data
            loadEnrollments();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update enrollment");
        } finally {
            setUpdating(null);
        }
    };

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

    if (loading && enrollments.length === 0) {
        return <div className="text-gray-600">Loading enrollments...</div>;
    }

    return (
        <div className="space-y-6">
            {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Enrollment Applications</h2>
                <div>
                    <label htmlFor="status-filter" className="mr-2 text-sm font-medium text-gray-700">
                        Filter by status:
                    </label>
                    <select
                        id="status-filter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="waitlisted">Waitlisted</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {enrollments.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                    <p className="text-gray-600">No enrollments found.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Class
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Applied
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                        {enrollments.map((enrollment) => (
                            <tr key={enrollment.id}>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">
                                        {enrollment.student?.firstName} {enrollment.student?.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">ID: {enrollment.studentId}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{enrollment.class?.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {enrollment.class?.day} • {enrollment.class?.time}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Capacity: {enrollment.class?.enrolled}/{enrollment.class?.capacity}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    {new Date(enrollment.appliedAt).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                    <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(enrollment.status)}`}
                    >
                      {enrollment.status}
                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                    <div className="flex gap-2">
                                        {enrollment.status !== "accepted" && (
                                            <button
                                                onClick={() => handleStatusChange(enrollment.id, "accepted")}
                                                disabled={updating === enrollment.id}
                                                className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                title="Accept"
                                            >
                                                Accept
                                            </button>
                                        )}
                                        {enrollment.status !== "waitlisted" && (
                                            <button
                                                onClick={() => handleStatusChange(enrollment.id, "waitlisted")}
                                                disabled={updating === enrollment.id}
                                                className="rounded bg-orange-600 px-3 py-1 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                title="Waitlist"
                                            >
                                                Waitlist
                                            </button>
                                        )}
                                        {enrollment.status !== "rejected" && (
                                            <button
                                                onClick={() => handleStatusChange(enrollment.id, "rejected")}
                                                disabled={updating === enrollment.id}
                                                className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                title="Reject"
                                            >
                                                Reject
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
