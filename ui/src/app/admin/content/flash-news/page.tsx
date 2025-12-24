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
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    text_en: '',
    text_ta: '',
    linkUrl: '',
    linkText_en: '',
    linkText_ta: '',
    isUrgent: false,
    priority: 10,
    startDate: '',
    endDate: '',
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
    
    if (!formData.text_en || !formData.text_ta) {
      alert('Please fill in both English and Tamil text');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        text: {
          en: formData.text_en,
          ta: formData.text_ta,
        },
        linkUrl: formData.linkUrl || undefined,
        linkText: formData.linkText_en || formData.linkText_ta ? {
          en: formData.linkText_en || 'Learn More',
          ta: formData.linkText_ta || 'மேலும் அறிக',
        } : undefined,
        isUrgent: formData.isUrgent,
        priority: formData.priority,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      };

      if (editingId) {
        // Update existing
        const data = await apiFetch<{ success: boolean }>(
          `/v1/admin/flash-news/${editingId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );

        if (data.success) {
          alert('Flash news updated successfully!');
        }
      } else {
        // Create new
        const data = await apiFetch<{ success: boolean }>(
          `/v1/admin/flash-news`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );

        if (data.success) {
          alert('Flash news created successfully!');
        }
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchFlashNews();
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
      linkUrl: '',
      linkText_en: '',
      linkText_ta: '',
      isUrgent: false,
      priority: 10,
      startDate: '',
      endDate: '',
    });
    setEditingId(null);
  }

  function startEdit(item: FlashNews) {
    setFormData({
      text_en: item.text.en,
      text_ta: item.text.ta,
      linkUrl: item.linkUrl || '',
      linkText_en: item.linkText?.en || '',
      linkText_ta: item.linkText?.ta || '',
      isUrgent: item.isUrgent,
      priority: item.priority,
      startDate: item.startDate ? item.startDate.split('T')[0] : '',
      endDate: item.endDate ? item.endDate.split('T')[0] : '',
    });
    setEditingId(item.id);
    setShowForm(true);
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
            Manage scrolling news items that appear in the marquee banner
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm && !editingId) {
              setShowForm(false);
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showForm && !editingId ? 'Cancel' : '+ Create New'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Flash News' : 'Create Flash News'}
          </h2>
          <form onSubmit={saveFlashNews} className="space-y-4">
            {/* Text - Bilingual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  News Text (English) *
                </label>
                <input
                  type="text"
                  value={formData.text_en}
                  onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
                  maxLength={200}
                  placeholder="New academic year begins January 15!"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{formData.text_en.length}/200 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  News Text (Tamil) *
                </label>
                <input
                  type="text"
                  value={formData.text_ta}
                  onChange={(e) => setFormData({ ...formData, text_ta: e.target.value })}
                  maxLength={300}
                  placeholder="புதிய கல்வியாண்டு ஜனவரி 15 அன்று தொடங்குகிறது!"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{formData.text_ta.length}/300 characters</p>
              </div>
            </div>

            {/* Link URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link URL (optional)
              </label>
              <input
                type="url"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://example.com/registration"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Link Text - Bilingual (only if URL provided) */}
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
                    placeholder="Learn More"
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
                    placeholder="மேலும் அறிக"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Options Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Urgent Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isUrgent"
                  checked={formData.isUrgent}
                  onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="isUrgent" className="ml-2 text-sm text-gray-700">
                  ⚠️ Mark as Urgent
                </label>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (higher = first)
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
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
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
                        {item.isUrgent && (
                          <span className="text-red-600">⚠️</span>
                        )}
                        <p className="text-base text-gray-900">
                          {item.text.en}
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Priority: {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Tamil: {item.text.ta}
                      </p>
                      {item.linkUrl && (
                        <p className="text-xs text-blue-600 mb-1">
                          🔗 {item.linkUrl}
                        </p>
                      )}
                      {(item.startDate || item.endDate) && (
                        <p className="text-xs text-gray-500">
                          {item.startDate && (
                            <>Start: {new Date(item.startDate).toLocaleDateString()}</>
                          )}
                          {item.startDate && item.endDate && ' • '}
                          {item.endDate && (
                            <>End: {new Date(item.endDate).toLocaleDateString()}</>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(item)}
                        className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                      >
                        Edit
                      </button>
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
          <strong>Note:</strong> Flash news items scroll across the top of the homepage.
          Active items within their date range are displayed automatically.
          Urgent items show with a warning icon and different styling.
        </p>
      </div>
    </div>
  );
}
