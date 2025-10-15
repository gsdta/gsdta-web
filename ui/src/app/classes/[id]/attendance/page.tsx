"use client";
import React, {useState, useEffect, useCallback} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Protected} from "@/components/Protected";
import {getClasses} from "@/lib/enrollment-api";
import {getClassRoster, getAttendance, saveAttendance} from "@/lib/attendance-api";
import type {Class} from "@/lib/enrollment-types";
import type {RosterStudent, AttendanceStatus} from "@/lib/attendance-types";

interface AttendanceRow {
    student: RosterStudent;
    status: AttendanceStatus;
    notes: string;
}

export default function AttendancePage() {
    const params = useParams();
    const classId = params.id as string;

    const [classData, setClassData] = useState<Class | null>(null);
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadAttendance = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [classes, roster, existingAttendance] = await Promise.all([
                getClasses(),
                getClassRoster(classId),
                getAttendance(classId, date),
            ]);

            const cls = classes.find((c) => c.id === classId);
            if (!cls) {
                setError("Class not found");
                return;
            }

            setClassData(cls);

            // Merge roster with existing attendance
            const rows: AttendanceRow[] = roster.map((student) => {
                const existing = existingAttendance.find((a) => a.studentId === student.id);
                return {
                    student,
                    status: existing?.status || "present",
                    notes: existing?.notes || "",
                };
            });

            setAttendanceRows(rows);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load attendance");
        } finally {
            setLoading(false);
        }
    }, [classId, date]);

    useEffect(() => {
        void loadAttendance();
    }, [loadAttendance]);

    const handleStatusChange = (index: number, status: AttendanceStatus) => {
        const newRows = [...attendanceRows];
        newRows[index].status = status;
        setAttendanceRows(newRows);
    };

    const handleNotesChange = (index: number, notes: string) => {
        const newRows = [...attendanceRows];
        newRows[index].notes = notes;
        setAttendanceRows(newRows);
    };

    const handleMarkAll = (status: AttendanceStatus) => {
        const newRows = attendanceRows.map((row) => ({...row, status}));
        setAttendanceRows(newRows);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const records = attendanceRows.map((row) => ({
                studentId: row.student.id,
                status: row.status,
                notes: row.notes || undefined,
            }));

            await saveAttendance(classId, date, records);
            setSuccessMessage("Attendance saved successfully!");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save attendance");
        } finally {
            setSaving(false);
        }
    };

    const handleExportCSV = () => {
        if (!classData || attendanceRows.length === 0) return;

        // Create CSV content
        const headers = ["Student ID", "First Name", "Last Name", "Status", "Notes"];
        const rows = attendanceRows.map((row) => [
            row.student.id,
            row.student.firstName,
            row.student.lastName,
            row.status,
            row.notes || "",
        ]);

        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");

        // Create and download file
        const blob = new Blob([csvContent], {type: "text/csv"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `attendance-${classData.name.replace(/\s+/g, "-")}-${date}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Protected roles={["teacher", "admin"]}>
            <div className="mx-auto max-w-6xl space-y-6">
                <div>
                    <Link
                        href={`/classes/${classId}`}
                        className="mb-2 inline-block text-sm text-blue-600 hover:underline"
                    >
                        ← Back to Class Details
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Attendance: {classData?.name || "Loading..."}
                    </h1>
                </div>

                {loading && <div className="text-gray-600">Loading...</div>}

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
                )}

                {successMessage && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                        {successMessage}
                    </div>
                )}

                {!loading && !error && classData && (
                    <>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="mt-1 block rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleMarkAll("present")}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Mark All Present
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMarkAll("absent")}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Mark All Absent
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportCSV}
                                    disabled={attendanceRows.length === 0}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {attendanceRows.length === 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                                <p className="text-gray-600">No students enrolled in this class.</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="sticky top-0 bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                Student
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                Notes
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                        {attendanceRows.map((row, index) => (
                                            <tr key={row.student.id}>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                    {row.student.firstName} {row.student.lastName}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex gap-2">
                                                        {(["present", "absent", "late", "excused"] as const).map((status) => (
                                                            <button
                                                                key={status}
                                                                type="button"
                                                                onClick={() => handleStatusChange(index, status)}
                                                                className={`rounded-md px-3 py-1 text-sm font-medium ${
                                                                    row.status === status
                                                                        ? status === "present"
                                                                            ? "bg-green-600 text-white"
                                                                            : status === "absent"
                                                                                ? "bg-red-600 text-white"
                                                                                : status === "late"
                                                                                    ? "bg-yellow-600 text-white"
                                                                                    : "bg-blue-600 text-white"
                                                                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                                }`}
                                                            >
                                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={row.notes}
                                                        onChange={(e) => handleNotesChange(index, e.target.value)}
                                                        placeholder="Optional notes..."
                                                        className="block w-full rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Save Attendance"}
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </Protected>
    );
}
