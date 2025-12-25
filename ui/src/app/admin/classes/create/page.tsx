'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminCreateClass, type CreateClassInput } from '@/lib/class-api';
import { adminGetGradeOptions } from '@/lib/grade-api';
import type { GradeOption } from '@/lib/grade-types';

const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CreateClassPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(true);

  const [formData, setFormData] = useState<CreateClassInput>({
    name: '',
    gradeId: '',
    section: '',
    room: '',
    day: 'Saturday',
    time: '',
    capacity: 20,
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchGrades = useCallback(async () => {
    try {
      setLoadingGrades(true);
      const gradeOptions = await adminGetGradeOptions(getIdToken);
      setGrades(gradeOptions);
      // Set default grade if we have grades and none selected
      if (gradeOptions.length > 0 && !formData.gradeId) {
        setFormData((prev) => ({ ...prev, gradeId: gradeOptions[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    } finally {
      setLoadingGrades(false);
    }
  }, [getIdToken, formData.gradeId]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? parseInt(value, 10) : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }
    if (!formData.gradeId) {
      newErrors.gradeId = 'Grade is required';
    }
    if (!formData.day) {
      newErrors.day = 'Day is required';
    }
    if (!formData.time.trim()) {
      newErrors.time = 'Time is required';
    }
    if (!formData.capacity || formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await adminCreateClass(getIdToken, formData);
      router.push('/admin/classes?created=true');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create class');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/classes"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Classes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create New Class</h1>
        <p className="mt-1 text-gray-600">
          Set up a new Tamil class with schedule and capacity. Teachers can be assigned after creation.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Submit Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {submitError}
          </div>
        )}

        {/* Class Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Class Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., PS-1 Class A, Grade-5 Saturday"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Grade and Day */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gradeId" className="block text-sm font-medium text-gray-700 mb-1">
              Grade <span className="text-red-500">*</span>
            </label>
            {loadingGrades ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                Loading grades...
              </div>
            ) : grades.length === 0 ? (
              <div className="w-full px-3 py-2 border border-yellow-300 rounded-md bg-yellow-50 text-yellow-700 text-sm">
                No grades available.{' '}
                <Link href="/admin/grades" className="underline">
                  Seed grades first
                </Link>
              </div>
            ) : (
              <select
                id="gradeId"
                name="gradeId"
                value={formData.gradeId}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.gradeId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a grade</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name} - {grade.displayName}
                  </option>
                ))}
              </select>
            )}
            {errors.gradeId && <p className="mt-1 text-sm text-red-600">{errors.gradeId}</p>}
          </div>

          <div>
            <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">
              Day <span className="text-red-500">*</span>
            </label>
            <select
              id="day"
              name="day"
              value={formData.day}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.day ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            {errors.day && <p className="mt-1 text-sm text-red-600">{errors.day}</p>}
          </div>
        </div>

        {/* Section and Room */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
              Section (Optional)
            </label>
            <select
              id="section"
              name="section"
              value={formData.section || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No section</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div>
            <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-1">
              Room (Optional)
            </label>
            <input
              type="text"
              id="room"
              name="room"
              value={formData.room || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., B01, B02"
            />
          </div>
        </div>

        {/* Time and Capacity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.time ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 10:00 AM - 12:00 PM"
            />
            {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
          </div>

          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
              Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              min={1}
              max={100}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.capacity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
          </div>
        </div>

        {/* Academic Year */}
        <div>
          <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-1">
            Academic Year (Optional)
          </label>
          <input
            type="text"
            id="academicYear"
            name="academicYear"
            value={formData.academicYear}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 2024-2025"
          />
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Teachers can be assigned to this class after creation from the class edit page.
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link
            href="/admin/classes"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || loadingGrades || grades.length === 0}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </>
            ) : (
              'Create Class'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
