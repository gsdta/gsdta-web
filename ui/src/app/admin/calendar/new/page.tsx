'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminCreateCalendarEvent } from '@/lib/calendar-api';
import type { CreateCalendarEventInput, EventType, RecurrencePattern, EventVisibility } from '@/lib/calendar-types';
import { EVENT_TYPE_LABELS, RECURRENCE_LABELS, VISIBILITY_LABELS } from '@/lib/calendar-types';

const eventTypeOptions = Object.entries(EVENT_TYPE_LABELS).map(([value, labels]) => ({
  value: value as EventType,
  label: labels.en,
}));

const recurrenceOptions = Object.entries(RECURRENCE_LABELS).map(([value, label]) => ({
  value: value as RecurrencePattern,
  label,
}));

const visibilityOptions = Object.entries(VISIBILITY_LABELS).map(([value, label]) => ({
  value: value as EventVisibility,
  label,
}));

export default function NewCalendarEventPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [formData, setFormData] = useState<CreateCalendarEventInput>({
    title: { en: '', ta: '' },
    description: { en: '', ta: '' },
    date: '',
    endDate: '',
    allDay: true,
    startTime: '',
    endTime: '',
    eventType: 'gsdta',
    recurrence: 'none',
    recurrenceEndDate: '',
    visibility: ['public'],
    location: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => {
        const parentValue = prev[parent as keyof CreateCalendarEventInput];
        const currentObj = (typeof parentValue === 'object' && parentValue !== null && !Array.isArray(parentValue))
          ? parentValue as unknown as Record<string, string>
          : {};
        return {
          ...prev,
          [parent]: {
            ...currentObj,
            [child]: value,
          },
        };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleVisibilityChange = (visibility: EventVisibility) => {
    setFormData((prev) => {
      const current = prev.visibility || [];
      if (current.includes(visibility)) {
        return { ...prev, visibility: current.filter((v) => v !== visibility) };
      } else {
        return { ...prev, visibility: [...current, visibility] };
      }
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.en.trim()) {
      newErrors['title.en'] = 'English title is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.eventType) {
      newErrors.eventType = 'Event type is required';
    }
    if (!formData.allDay) {
      if (!formData.startTime) {
        newErrors.startTime = 'Start time is required for non-all-day events';
      }
      if (!formData.endTime) {
        newErrors.endTime = 'End time is required for non-all-day events';
      }
    }
    if (formData.recurrence !== 'none' && !formData.recurrenceEndDate) {
      newErrors.recurrenceEndDate = 'End date is required for recurring events';
    }
    if (!formData.visibility || formData.visibility.length === 0) {
      newErrors.visibility = 'At least one visibility option is required';
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
      // Clean up empty fields
      const eventData: CreateCalendarEventInput = {
        title: formData.title,
        date: formData.date,
        eventType: formData.eventType,
        allDay: formData.allDay,
        visibility: formData.visibility,
      };

      if (formData.description?.en) {
        eventData.description = formData.description;
      }
      if (formData.endDate) {
        eventData.endDate = formData.endDate;
      }
      if (!formData.allDay) {
        eventData.startTime = formData.startTime;
        eventData.endTime = formData.endTime;
      }
      if (formData.recurrence !== 'none') {
        eventData.recurrence = formData.recurrence;
        eventData.recurrenceEndDate = formData.recurrenceEndDate;
      }
      if (formData.location) {
        eventData.location = formData.location;
      }

      await adminCreateCalendarEvent(getIdToken, eventData);
      router.push('/admin/calendar?created=true');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/calendar"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Calendar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create New Event</h1>
        <p className="mt-1 text-gray-600">
          Add a new calendar event for the school.
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

        {/* Title (English) */}
        <div>
          <label htmlFor="title.en" className="block text-sm font-medium text-gray-700 mb-1">
            Title (English) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title.en"
            name="title.en"
            value={formData.title.en}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors['title.en'] ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Pongal Celebration"
          />
          {errors['title.en'] && <p className="mt-1 text-sm text-red-600">{errors['title.en']}</p>}
        </div>

        {/* Title (Tamil) */}
        <div>
          <label htmlFor="title.ta" className="block text-sm font-medium text-gray-700 mb-1">
            Title (Tamil)
          </label>
          <input
            type="text"
            id="title.ta"
            name="title.ta"
            value={formData.title.ta || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., பொங்கல் விழா"
          />
        </div>

        {/* Event Type and Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type <span className="text-red-500">*</span>
            </label>
            <select
              id="eventType"
              name="eventType"
              value={formData.eventType}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.eventType ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.eventType && <p className="mt-1 text-sm text-red-600">{errors.eventType}</p>}
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
          </div>
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            End Date (for multi-day events)
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate || ''}
            onChange={handleInputChange}
            min={formData.date}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* All Day Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allDay"
            name="allDay"
            checked={formData.allDay}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
            All Day Event
          </label>
        </div>

        {/* Time (if not all day) */}
        {!formData.allDay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime || ''}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>}
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime || ''}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>}
            </div>
          </div>
        )}

        {/* Recurrence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700 mb-1">
              Recurrence
            </label>
            <select
              id="recurrence"
              name="recurrence"
              value={formData.recurrence}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {recurrenceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {formData.recurrence !== 'none' && (
            <div>
              <label htmlFor="recurrenceEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                Recurrence End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="recurrenceEndDate"
                name="recurrenceEndDate"
                value={formData.recurrenceEndDate || ''}
                onChange={handleInputChange}
                min={formData.date}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.recurrenceEndDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.recurrenceEndDate && <p className="mt-1 text-sm text-red-600">{errors.recurrenceEndDate}</p>}
            </div>
          )}
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visibility <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {visibilityOptions.map((option) => (
              <label key={option.value} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.visibility?.includes(option.value) || false}
                  onChange={() => handleVisibilityChange(option.value)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          {errors.visibility && <p className="mt-1 text-sm text-red-600">{errors.visibility}</p>}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Main Hall"
          />
        </div>

        {/* Description (English) */}
        <div>
          <label htmlFor="description.en" className="block text-sm font-medium text-gray-700 mb-1">
            Description (English)
          </label>
          <textarea
            id="description.en"
            name="description.en"
            value={formData.description?.en || ''}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add event description..."
          />
        </div>

        {/* Description (Tamil) */}
        <div>
          <label htmlFor="description.ta" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Tamil)
          </label>
          <textarea
            id="description.ta"
            name="description.ta"
            value={formData.description?.ta || ''}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="நிகழ்வு விவரணை..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link
            href="/admin/calendar"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
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
              'Create Event'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
