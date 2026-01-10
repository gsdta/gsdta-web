'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdminWriteAccess } from '@/hooks/useAdminWriteAccess';
import {
  adminGetNewsPosts,
  adminDeleteNewsPost,
  adminPublishNewsPost,
  adminUnpublishNewsPost,
  type NewsPostFilters,
} from '@/lib/news-posts-api';
import type { NewsPost, NewsPostStatus, NewsPostCategory } from '@/types/newsPost';
import {
  NEWS_POST_STATUS_NAMES,
  NEWS_POST_STATUS_COLORS,
  NEWS_POST_CATEGORIES,
  NEWS_POST_CATEGORY_COLORS,
} from '@/types/newsPost';
import { TableRowActionMenu, useTableRowActions, type TableAction } from '@/components/TableRowActionMenu';

export default function AdminNewsPostsPage() {
  const { getIdToken } = useAuth();
  const canWrite = useAdminWriteAccess();
  const [items, setItems] = useState<NewsPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<NewsPostStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<NewsPostCategory | 'all'>('all');
  const { selectedItem, menuPosition, handleRowClick, closeMenu, isMenuOpen } = useTableRowActions<NewsPost>();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: NewsPostFilters = {
        limit: 50,
      };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (categoryFilter !== 'all') filters.category = categoryFilter;

      const result = await adminGetNewsPosts(getIdToken, filters);
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news posts');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handlePublish = async (item: NewsPost) => {
    try {
      await adminPublishNewsPost(getIdToken, item.id);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const handleUnpublish = async (item: NewsPost) => {
    try {
      await adminUnpublishNewsPost(getIdToken, item.id);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish');
    }
  };

  const handleDelete = async (item: NewsPost) => {
    if (!confirm(`Are you sure you want to delete "${item.title.en}"?`)) return;
    try {
      await adminDeleteNewsPost(getIdToken, item.id);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete news post');
    }
  };

  const getItemActions = (item: NewsPost): TableAction[] => {
    const actions: TableAction[] = [
      {
        label: 'Edit',
        onClick: () => {
          window.location.href = `/admin/news-posts/${item.id}`;
        },
        variant: 'default' as const,
        hidden: !canWrite,
      },
    ];

    // Add workflow actions based on status
    if (item.status === 'approved' || item.status === 'unpublished' || (item.status === 'draft' && item.authorRole === 'admin')) {
      actions.push({
        label: 'Publish',
        onClick: () => handlePublish(item),
        variant: 'success' as const,
        hidden: !canWrite,
      });
    }

    if (item.status === 'published') {
      actions.push({
        label: 'Unpublish',
        onClick: () => handleUnpublish(item),
        variant: 'warning' as const,
        hidden: !canWrite,
      });
    }

    if (item.status === 'pending_review') {
      actions.push({
        label: 'Review',
        onClick: () => {
          window.location.href = `/admin/news-posts/${item.id}`;
        },
        variant: 'default' as const,
        hidden: !canWrite,
      });
    }

    actions.push({
      label: 'Delete',
      onClick: () => handleDelete(item),
      variant: 'danger' as const,
      hidden: !canWrite,
    });

    return actions;
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

  // Count items by status for the filter tabs
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pendingReviewCount = statusCounts['pending_review'] || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">News Posts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage news articles with rich text and images
          </p>
        </div>
{canWrite && (
          <Link
            href="/admin/news-posts/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Create News Post
          </Link>
        )}
      </div>

      {/* Pending Review Alert */}
      {pendingReviewCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md flex items-center justify-between">
          <span>
            {pendingReviewCount} post{pendingReviewCount > 1 ? 's' : ''} pending review
          </span>
          <button
            onClick={() => setStatusFilter('pending_review')}
            className="text-sm font-medium text-yellow-700 hover:text-yellow-900"
          >
            View all
          </button>
        </div>
      )}

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
            onChange={(e) => setStatusFilter(e.target.value as NewsPostStatus | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as NewsPostCategory | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="school-news">School News</option>
            <option value="events">Events</option>
            <option value="announcements">Announcements</option>
            <option value="academic">Academic</option>
          </select>
        </div>
        <button
          onClick={() => fetchItems()}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
        <span className="text-sm text-gray-500">
          {items.length} of {total} item{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No news posts found.</p>
          {canWrite && (
            <Link
              href="/admin/news-posts/new"
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              Create your first news post
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={(e) => handleRowClick(e, item)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === 'Enter' && handleRowClick(e as unknown as React.MouseEvent, item)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.featuredImage && (
                        <img
                          src={item.featuredImage.url}
                          alt=""
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {item.title.en}
                        </div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">
                          {item.summary.en}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${NEWS_POST_CATEGORY_COLORS[item.category]}`}
                    >
                      {NEWS_POST_CATEGORIES[item.category].en}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{item.authorName}</div>
                    <div className="text-xs text-gray-500 capitalize">{item.authorRole}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${NEWS_POST_STATUS_COLORS[item.status]}`}
                    >
                      {NEWS_POST_STATUS_NAMES[item.status]}
                    </span>
                    {item.status === 'rejected' && item.rejectionReason && (
                      <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={item.rejectionReason}>
                        {item.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.publishedAt ? (
                      <div>
                        <div>Published</div>
                        <div className="text-xs">{formatDate(item.publishedAt)}</div>
                      </div>
                    ) : (
                      <div>
                        <div>Created</div>
                        <div className="text-xs">{formatDate(item.createdAt)}</div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
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
        <h3 className="text-sm font-medium text-blue-800 mb-2">News Post Workflow</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>Draft</strong>: Work in progress, not visible to public</li>
          <li><strong>Pending Review</strong>: Submitted by teacher, awaiting admin approval</li>
          <li><strong>Approved</strong>: Ready to publish</li>
          <li><strong>Published</strong>: Visible to public</li>
          <li><strong>Unpublished</strong>: Previously published, now hidden</li>
        </ul>
      </div>
    </div>
  );
}
