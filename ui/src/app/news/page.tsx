'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/LanguageProvider';
import { getPublicNewsPosts } from '@/lib/news-posts-api';
import type { NewsPostPublic, NewsPostCategory } from '@/types/newsPost';
import { NEWS_POST_CATEGORIES, NEWS_POST_CATEGORY_COLORS } from '@/types/newsPost';

const ITEMS_PER_PAGE = 12;

export default function NewsPage() {
  const { lang } = useI18n();
  const [posts, setPosts] = useState<NewsPostPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<NewsPostCategory | 'all'>('all');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchPosts = useCallback(async (newOffset = 0, newCategory: NewsPostCategory | 'all' = category) => {
    try {
      setLoading(true);
      setError(null);
      const result = await getPublicNewsPosts({
        category: newCategory,
        limit: ITEMS_PER_PAGE,
        offset: newOffset,
      });
      setPosts(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setOffset(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchPosts(0, category);
  }, [category, fetchPosts]);

  const handleCategoryChange = (newCategory: NewsPostCategory | 'all') => {
    setCategory(newCategory);
    setOffset(0);
  };

  const handleLoadMore = () => {
    if (hasMore) {
      fetchPosts(offset + ITEMS_PER_PAGE);
    }
  };

  // Get text in current language with fallback to English
  const getText = (text: { en: string; ta: string }) => {
    if (lang === 'ta' && text.ta) {
      return text.ta;
    }
    return text.en;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const categoryButtons = [
    { key: 'all' as const, label: lang === 'ta' ? 'அனைத்தும்' : 'All' },
    ...Object.entries(NEWS_POST_CATEGORIES).map(([key, value]) => ({
      key: key as NewsPostCategory,
      label: getText(value),
    })),
  ];

  return (
    <section className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {lang === 'ta' ? 'செய்திகள்' : 'News'}
        </h1>
        <p className="mt-2 text-gray-600">
          {lang === 'ta'
            ? 'எங்கள் பள்ளியின் சமீபத்திய செய்திகள் மற்றும் அறிவிப்புகள்'
            : 'Latest news and announcements from our school'}
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categoryButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => handleCategoryChange(btn.key)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              category === btn.key
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && posts.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {lang === 'ta' ? 'செய்திகள் இல்லை' : 'No news posts found'}
          </p>
        </div>
      )}

      {/* News Grid */}
      {posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/news/${post.slug}`}
              className={`group bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                post.isPinned ? 'border-green-400 ring-1 ring-green-200' : 'border-gray-200'
              }`}
            >
              {/* Featured Image */}
              <div className="relative">
                {post.featuredImage ? (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img
                      src={post.featuredImage.url}
                      alt={getText(post.featuredImage.alt || post.title)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                    <span className="text-4xl text-green-600">
                      {post.category === 'events' && '📅'}
                      {post.category === 'school-news' && '📰'}
                      {post.category === 'announcements' && '📢'}
                      {post.category === 'academic' && '📚'}
                    </span>
                  </div>
                )}
                {/* Pinned Badge */}
                {post.isPinned && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954.993A2 2 0 0116.5 7.25V8.5a.5.5 0 01-.5.5h-1v4.758a2 2 0 01-.595 1.423l-3.358 3.358a1 1 0 01-1.414 0l-3.358-3.358A2 2 0 015.68 13.758V9H4.5a.5.5 0 01-.5-.5V7.25a2 2 0 011.546-1.934L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                    {lang === 'ta' ? 'பின்' : 'Pinned'}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Category Badge */}
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${NEWS_POST_CATEGORY_COLORS[post.category]}`}
                >
                  {getText(NEWS_POST_CATEGORIES[post.category])}
                </span>

                {/* Title */}
                <h2 className="mt-2 text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                  {getText(post.title)}
                </h2>

                {/* Summary */}
                <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                  {getText(post.summary)}
                </p>

                {/* Meta */}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>{post.authorName}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
          >
            {lang === 'ta' ? 'மேலும் காட்டு' : 'Load More'}
          </button>
        </div>
      )}

      {/* Loading More Indicator */}
      {loading && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      )}

      {/* Total Count */}
      {!loading && total > 0 && (
        <p className="text-center text-sm text-gray-500">
          {lang === 'ta'
            ? `${total} செய்திகளில் ${posts.length} காட்டப்படுகிறது`
            : `Showing ${posts.length} of ${total} news posts`}
        </p>
      )}
    </section>
  );
}
