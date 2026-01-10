'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdminWriteAccess } from '@/hooks/useAdminWriteAccess';
import { adminGetFlashNews, adminUpdateFlashNews, adminDeleteFlashNews, type FlashNewsFilters } from '@/lib/flash-news-api';
import type { FlashNews } from '@/types/flashNews';
import { TableRowActionMenu, useTableRowActions, type TableAction } from '@/components/TableRowActionMenu';

export default function AdminFlashNewsPage() {
  const { getIdToken } = useAuth();
  const canWrite = useAdminWriteAccess();
  const [items, setItems] = useState<FlashNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { selectedItem, menuPosition, handleRowClick, closeMenu, isMenuOpen } = useTableRowActions<FlashNews>();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: FlashNewsFilters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;

      const result = await adminGetFlashNews(getIdToken, filters);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch flash news');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggleStatus = async (item: FlashNews) => {
    try {
      await adminUpdateFlashNews(getIdToken, item.id, { isActive: !item.isActive });
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flash news');
    }
  };

  const handleDelete = async (item: FlashNews) => {
    if (!confirm(`Are you sure you want to delete "${item.text.en}"?`)) return;
    try {
      await adminDeleteFlashNews(getIdToken, item.id);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flash news');
    }
  };

  const getItemActions = (item: FlashNews): TableAction[] => [
    {
      label: 'Edit',
      onClick: () => {
        window.location.href = `/admin/flash-news/${item.id}`;
      },
      variant: 'default' as const,
      hidden: !canWrite,
    },
    {
      label: item.isActive ? 'Deactivate' : 'Activate',
      onClick: () => handleToggleStatus(item),
      variant: item.isActive ? 'warning' : ('success' as const),
      hidden: !canWrite,
    },
    {
      label: 'Delete',
      onClick: () => handleDelete(item),
      variant: 'danger' as const,
      hidden: !canWrite,
    },
  ];

  const statusConfig = {
    true: { label: 'Active', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    false: { label: 'Inactive', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isScheduled = (item: FlashNews) => {
    const now = new Date();
    if (item.startDate && new Date(item.startDate) > now) return 'scheduled';
    if (item.endDate && new Date(item.endDate) < now) return 'expired';
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flash News</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage scrolling news marquee announcements
          </p>
        </div>
{canWrite && (
          <Link
            href="/admin/flash-news/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Add Flash News
          </Link>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button
          onClick={() => fetchItems()}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
        <span className="text-sm text-gray-500">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No flash news items found.</p>
          {canWrite && (
            <Link
              href="/admin/flash-news/new"
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              Add your first flash news
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Text
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const scheduleStatus = isScheduled(item);
                return (
                  <tr
                    key={item.id}
                    onClick={(e) => handleRowClick(e, item)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleRowClick(e as unknown as React.MouseEvent, item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-medium">
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md truncate">{item.text.en}</div>
                      {item.text.ta && (
                        <div className="text-xs text-gray-500 max-w-md truncate">{item.text.ta}</div>
                      )}
                      {item.link && (
                        <div className="text-xs text-blue-500 mt-1 truncate max-w-md">
                          {item.link}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.startDate || item.endDate ? (
                        <div>
                          <div>{formatDate(item.startDate)} - {formatDate(item.endDate)}</div>
                          {scheduleStatus === 'scheduled' && (
                            <span className="text-xs text-yellow-600">Scheduled</span>
                          )}
                          {scheduleStatus === 'expired' && (
                            <span className="text-xs text-red-600">Expired</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Always</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig[String(item.isActive) as 'true' | 'false'].bgColor} ${statusConfig[String(item.isActive) as 'true' | 'false'].textColor}`}
                      >
                        {statusConfig[String(item.isActive) as 'true' | 'false'].label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Menu */}
      {isMenuOpen && selectedItem && menuPosition && (
        <TableRowActionMenu
          actions={getItemActions(selectedItem)}
          position={menuPosition}
          onClose={closeMenu}
        />
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">About Flash News</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Short announcements that scroll across the screen</li>
          <li>Higher priority items appear first (1-100)</li>
          <li>Bilingual support for English and Tamil</li>
          <li>Schedule items to appear during specific date ranges</li>
        </ul>
      </div>
    </div>
  );
}
