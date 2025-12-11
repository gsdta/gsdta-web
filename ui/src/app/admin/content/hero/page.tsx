'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { HeroContent } from '@/types/heroContent';

interface HeroContentResponse {
  success: boolean;
  data: {
    items: HeroContent[];
  };
}

export default function AdminHeroContentPage() {
  const [items, setItems] = useState<HeroContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title_en: '',
    title_ta: '',
    subtitle_en: '',
    subtitle_ta: '',
    description_en: '',
    description_ta: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    priority: 10,
  });

  useEffect(() => {
    fetchHeroContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function fetchHeroContent() {
    try {
      setLoading(true);
      setError(null);

      const data = await apiFetch<HeroContentResponse>(
        `/v1/admin/hero-content?status=${filter}`,
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

  async function saveHeroContent(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.title_en || !formData.subtitle_en) {
      alert('Please fill in at least English title and subtitle');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        type: 'event',
        title: {
          en: formData.title_en,
          ta: formData.title_ta || formData.title_en,
        },
        subtitle: {
          en: formData.subtitle_en,
          ta: formData.subtitle_ta || formData.subtitle_en,
        },
        description: formData.description_en || formData.description_ta ? {
          en: formData.description_en || '',
          ta: formData.description_ta || '',
        } : undefined,
        imageUrl: formData.imageUrl || undefined,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        priority: formData.priority,
        isActive: true,
      };

      const data = await apiFetch<{ success: boolean }>(
        `/v1/admin/hero-content`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (data.success) {
        alert('Hero content created successfully!');
        setShowForm(false);
        resetForm();
        fetchHeroContent();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormData({
      title_en: '',
      title_ta: '',
      subtitle_en: '',
      subtitle_ta: '',
      description_en: '',
      description_ta: '',
      imageUrl: '',
      startDate: '',
      endDate: '',
      priority: 10,
    });
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const data = await apiFetch<{ success: boolean }>(
        `/v1/admin/hero-content/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !currentActive }),
        }
      );

      if (data.success) {
        fetchHeroContent();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this hero content?')) {
      return;
    }

    try {
      const data = await apiFetch<{ success: boolean }>(
        `/v1/admin/hero-content/${id}`,
        { method: 'DELETE' }
      );

      if (data.success) {
        fetchHeroContent();
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
          <h1 className="text-2xl font-bold text-gray-900">Hero Content Management</h1>
          <p className="mt-1 text-gray-600">
            Manage event banners that appear on the homepage
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
          <h2 className="text-lg font-semibold mb-4">Create Event Banner</h2>
          <form onSubmit={saveHeroContent} className="space-y-4">
            {/* Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (Tamil)
                </label>
                <input
                  type="text"
                  value={formData.title_ta}
                  onChange={(e) => setFormData({ ...formData, title_ta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle (English) *
                </label>
                <input
                  type="text"
                  value={formData.subtitle_en}
                  onChange={(e) => setFormData({ ...formData, subtitle_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle (Tamil)
                </label>
                <input
                  type="text"
                  value={formData.subtitle_ta}
                  onChange={(e) => setFormData({ ...formData, subtitle_ta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (English)
                </label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Tamil)
                </label>
                <textarea
                  value={formData.description_ta}
                  onChange={(e) => setFormData({ ...formData, description_ta: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
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
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Priority */}
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

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Create Banner'}
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
          <p className="mt-4 text-gray-600">Loading hero content...</p>
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
              <p>No hero content found</p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Create your first event banner →
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.title.en}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-sm text-gray-500">
                          Priority: {item.priority || 0}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {item.subtitle.en}
                      </p>
                      {item.title.ta && (
                        <p className="text-sm text-gray-500 mb-1">
                          Tamil: {item.title.ta}
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
          <strong>Note:</strong> Event banners will alternate with Thirukkural on the homepage carousel.
          Active banners within their date range are displayed automatically.
        </p>
      </div>
    </div>
  );
}
