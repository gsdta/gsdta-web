'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  teacherGetMyNewsPosts,
  teacherDeleteNewsPost,
  teacherSubmitNewsPost,
} from '@/lib/news-posts-api';
import type { NewsPost, NewsPostStatus } from '@/types/newsPost';
import {
  NEWS_POST_STATUS_NAMES,
  NEWS_POST_STATUS_COLORS,
  NEWS_POST_CATEGORIES,
  NEWS_POST_CATEGORY_COLORS,
} from '@/types/newsPost';
import { TableRowActionMenu, useTableRowActions, type TableAction } from '@/components/TableRowActionMenu';

export default function TeacherNewsPostsPage() {
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<NewsPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<NewsPostStatus | 'all'>('all');
  const { selectedItem, menuPosition, handleRowClick, closeMenu, isMenuOpen } = useTableRowActions<NewsPost>();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await teacherGetMyNewsPosts(getIdToken, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news posts');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmitForReview = async (item: NewsPost) => {
    try {
      await teacherSubmitNewsPost(getIdToken, item.id);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit for review');
    }
  };

  const handleDelete = async (item: NewsPost) => {
    if (!confirm(`Are you sure you want to delete "${item.title.en}"?`)) return;
    try {
      await teacherDeleteNewsPost(getIdToken, item.id);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete news post');
    }
  };

  const getItemActions = (item: NewsPost): TableAction[] => {
    const actions: TableAction[] = [];

    // Edit is only available for draft or rejected posts
    if (item.status === 'draft' || item.status === 'rejected') {
      actions.push({
        label: 'Edit',
        onClick: () => {
          window.location.href = `/teacher/news-posts/${item.id}`;
        },
        variant: 'default' as const,
      });
    } else {
      actions.push({
        label: 'View',
        onClick: () => {
          window.location.href = `/teacher/news-posts/${item.id}`;
        },
        variant: 'default' as const,
      });
    }

    // Submit for review is only available for draft or rejected posts
    if (item.status === 'draft' || item.status === 'rejected') {
      actions.push({
        label: 'Submit for Review',
        onClick: () => handleSubmitForReview(item),
        variant: 'success' as const,
      });
    }

    // Delete is only available for draft posts
    if (item.status === 'draft') {
      actions.push({
        label: 'Delete',
        onClick: () => handleDelete(item),
        variant: 'danger' as const,
      });
    }

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

  // Count items by status for the filter
  const pendingReviewCount = items.filter(i => i.status === 'pending_review').length;
  const rejectedCount = items.filter(i => i.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My News Posts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage your news submissions
          </p>
        </div>
        <Link
          href="/teacher/news-posts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
        >
          Create News Post
        </Link>
      </div>

      {/* Rejected Alert */}
      {rejectedCount > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center justify-between">
          <span>
            {rejectedCount} post{rejectedCount > 1 ? 's' : ''} need{rejectedCount === 1 ? 's' : ''} revision
          </span>
          <button
            onClick={() => setStatusFilter('rejected')}
            className="text-sm font-medium text-red-700 hover:text-red-900"
          >
            View
          </button>
        </div>
      )}

      {/* Pending Review Info */}
      {pendingReviewCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
          <span>
            {pendingReviewCount} post{pendingReviewCount > 1 ? 's' : ''} awaiting admin review
          </span>
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
            className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="published">Published</option>
          </select>
        </div>
        <button
          onClick={() => fetchItems()}
          className="text-sm text-green-600 hover:text-green-800"
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No news posts found.</p>
          <Link
            href="/teacher/news-posts/new"
            className="mt-4 inline-block text-green-600 hover:text-green-800"
          >
            Create your first news post
          </Link>
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
                  className="hover:bg-green-50 cursor-pointer transition-colors"
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-green-800 mb-2">News Post Workflow</h3>
        <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
          <li><strong>Draft</strong>: Work in progress, only you can see</li>
          <li><strong>Pending Review</strong>: Submitted for admin approval</li>
          <li><strong>Approved</strong>: Admin approved, waiting to be published</li>
          <li><strong>Rejected</strong>: Admin requested changes (see feedback)</li>
          <li><strong>Published</strong>: Visible to public</li>
        </ul>
      </div>
    </div>
  );
}
