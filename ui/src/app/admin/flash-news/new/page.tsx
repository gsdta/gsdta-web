'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminCreateFlashNews } from '@/lib/flash-news-api';
import type { FlashNewsFormData } from '@/types/flashNews';

export default function NewFlashNewsPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [formData, setFormData] = useState<FlashNewsFormData>({
    textEn: '',
    textTa: '',
    link: '',
    priority: 50,
    isActive: false,
    startDate: '',
    endDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.textEn.trim()) {
      newErrors.textEn = 'English text is required';
    }
    if (formData.textEn.length > 200) {
      newErrors.textEn = 'Text must be 200 characters or less';
    }
    if (formData.textTa.length > 200) {
      newErrors.textTa = 'Text must be 200 characters or less';
    }
    if (formData.link && !isValidUrl(formData.link)) {
      newErrors.link = 'Invalid URL format';
    }
    if (formData.priority < 1 || formData.priority > 100) {
      newErrors.priority = 'Priority must be between 1 and 100';
    }
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await adminCreateFlashNews(getIdToken, formData);
      router.push('/admin/flash-news?created=true');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create flash news');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/flash-news"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Flash News
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create Flash News</h1>
        <p className="mt-1 text-gray-600">
          Add a new scrolling announcement for the marquee.
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

        {/* Text (English) */}
        <div>
          <label htmlFor="textEn" className="block text-sm font-medium text-gray-700 mb-1">
            Text (English) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="textEn"
            name="textEn"
            value={formData.textEn}
            onChange={handleInputChange}
            rows={2}
            maxLength={200}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.textEn ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter announcement text..."
          />
          <div className="flex justify-between mt-1">
            {errors.textEn ? (
              <p className="text-sm text-red-600">{errors.textEn}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-500">{formData.textEn.length}/200</span>
          </div>
        </div>

        {/* Text (Tamil) */}
        <div>
          <label htmlFor="textTa" className="block text-sm font-medium text-gray-700 mb-1">
            Text (Tamil)
          </label>
          <textarea
            id="textTa"
            name="textTa"
            value={formData.textTa}
            onChange={handleInputChange}
            rows={2}
            maxLength={200}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.textTa ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="தமிழில் அறிவிப்பு..."
          />
          <div className="flex justify-between mt-1">
            {errors.textTa ? (
              <p className="text-sm text-red-600">{errors.textTa}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-500">{formData.textTa.length}/200</span>
          </div>
        </div>

        {/* Link */}
        <div>
          <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
            Link URL (optional)
          </label>
          <input
            type="url"
            id="link"
            name="link"
            value={formData.link}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.link ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://example.com"
          />
          {errors.link && <p className="mt-1 text-sm text-red-600">{errors.link}</p>}
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority (1-100)
          </label>
          <input
            type="number"
            id="priority"
            name="priority"
            min={1}
            max={100}
            value={formData.priority}
            onChange={handleInputChange}
            className={`w-32 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.priority ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <p className="mt-1 text-xs text-gray-500">Higher priority items appear first</p>
          {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority}</p>}
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date (optional)
            </label>
            <input
              type="datetime-local"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date (optional)
            </label>
            <input
              type="datetime-local"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              min={formData.startDate}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Active (visible on marquee)
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link
            href="/admin/flash-news"
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
              'Create Flash News'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
