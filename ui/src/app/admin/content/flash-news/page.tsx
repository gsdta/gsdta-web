'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { FlashNews } from '@/types/flashNews';

interface FlashNewsResponse {
  success: boolean;
  data: {
    items: FlashNews[];
  };
}

export default function AdminFlashNewsPage() {
  const [items, setItems] = useState<FlashNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    text_en: '',
    text_ta: '',
    isUrgent: false,
    priority: 10,
    startDate: '',
    endDate: '',
    linkUrl: '',
    linkText_en: '',
    linkText_ta: '',
    backgroundColor: '',
    textColor: '',
  });

  useEffect(() => {
    fetchFlashNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function fetchFlashNews() {
    try {
      setLoading(true);
      setError(null);

      const data = await apiFetch<FlashNewsResponse>(
        `/v1/admin/flash-news?status=${filter}`,
        { method: 'GET' }
      );

      if (data.success) {
        setItems(data.data.items || []);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function saveFlashNews(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.text_en) {
      alert('Please fill in at least English text');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      alert('Please fill in start and end dates');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        text: {
          en: formData.text_en,
          ta: formData.text_ta || formData.text_en,
        },
        isUrgent: formData.isUrgent,
        priority: formData.priority,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        linkUrl: formData.linkUrl || undefined,
        linkText: formData.linkText_en ? {
          en: formData.linkText_en,
          ta: formData.linkText_ta || formData.linkText_en,
        } : undefined,
        backgroundColor: formData.backgroundColor || undefined,
        textColor: formData.textColor || undefined,
      };

      const data = await apiFetch<{ success: boolean }>(
        `/v1/admin/flash-news`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (data.success) {
        alert('Flash news created successfully!');
        setShowForm(false);
        resetForm();
        fetchFlashNews();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormData({
      text_en: '',
      text_ta: '',
      isUrgent: false,
      priority: 10,
      startDate: '',
      endDate: '',
      linkUrl: '',
      linkText_en: '',
      linkText_ta: '',
      backgroundColor: '',
      textColor: '',
    });
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const data = await apiFetch<{ success: boolean }>(
        `/v1/admin/flash-news/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !currentActive }),
        }
      );

      if (data.success) {
        fetchFlashNews();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this flash news?')) {
      return;
    }

    try {
      const data = await apiFetch<{ success: boolean }>(
        `/v1/admin/flash-news/${id}`,
        { method: 'DELETE' }
      );

      if (data.success) {
        fetchFlashNews();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flash News Management</h1>
          <p className="mt-1 text-gray-600">
            Manage scrolling announcements that appear on the homepage marquee
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Create New'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Flash News</h2>
          <form onSubmit={saveFlashNews} className="space-y-4">
            {/* Text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text (English) *
                </label>
                <input
                  type="text"
                  value={formData.text_en}
                  onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
                  maxLength={200}
                  placeholder="Keep it short for marquee display"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">{formData.text_en.length}/200 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text (Tamil)
                </label>
                <input
                  type="text"
                  value={formData.text_ta}
                  onChange={(e) => setFormData({ ...formData, text_ta: e.target.value })}
                  placeholder="Tamil translation (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Priority and Urgent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (higher shows first)
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isUrgent}
                    onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Mark as Urgent (shows warning icon, faster scroll)
                  </span>
                </label>
              </div>
            </div>

            {/* Link (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link URL (optional)
              </label>
              <input
                type="url"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formData.linkUrl && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Text (English)
                  </label>
                  <input
                    type="text"
                    value={formData.linkText_en}
                    onChange={(e) => setFormData({ ...formData, linkText_en: e.target.value })}
                    placeholder="Learn more"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Text (Tamil)
                  </label>
                  <input
                    type="text"
                    value={formData.linkText_ta}
                    onChange={(e) => setFormData({ ...formData, linkText_ta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Colors for urgent items */}
            {formData.isUrgent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background Color (hex)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.backgroundColor || '#dc2626'}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="h-10 w-14 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      placeholder="#dc2626"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Text Color (hex)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.textColor || '#ffffff'}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="h-10 w-14 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={formData.textColor}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Create Flash News'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === 'inactive'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Inactive
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading flash news...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* List */}
      {!loading && !error && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No flash news found</p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Create your first flash news →
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-lg font-medium text-gray-900">
                          {item.isUrgent && <span className="mr-1">⚠️</span>}
                          {item.text.en}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {item.isUrgent && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Urgent
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          Priority: {item.priority || 0}
                        </span>
                      </div>
                      {item.text.ta && item.text.ta !== item.text.en && (
                        <p className="text-sm text-gray-500 mb-2">
                          Tamil: {item.text.ta}
                        </p>
                      )}
                      {item.linkUrl && (
                        <p className="text-sm text-blue-600 mb-2">
                          Link: {item.linkUrl}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {item.startDate && (
                          <>Start: {new Date(item.startDate).toLocaleString()}</>
                        )}
                        {item.startDate && item.endDate && ' • '}
                        {item.endDate && (
                          <>End: {new Date(item.endDate).toLocaleString()}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => toggleActive(item.id, item.isActive)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {item.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Note */}
      <div className="mt-6 rounded-md bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Flash news items will scroll in the marquee on the homepage.
          Active items within their date range are displayed automatically, ordered by priority.
          Urgent items display with a warning icon and may have custom styling.
        </p>
      </div>
    </div>
  );
}
