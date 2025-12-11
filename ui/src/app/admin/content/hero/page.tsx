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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hero Content Management</h1>
        <p className="mt-1 text-gray-600">
          Manage event banners that appear on the homepage
        </p>
      </div>

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
              No hero content found
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
          <strong>Note:</strong> Event banners override the default Thirukkural display when active
          and within the specified date range.
        </p>
      </div>
    </div>
  );
}
