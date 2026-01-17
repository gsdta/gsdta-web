'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/LanguageProvider';
import { getPublicNewsPost, recordNewsPostView } from '@/lib/news-posts-api';
import type { NewsPostPublic } from '@/types/newsPost';
import { NEWS_POST_CATEGORIES, NEWS_POST_CATEGORY_COLORS } from '@/types/newsPost';

export default function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { lang } = useI18n();
  const [post, setPost] = useState<NewsPostPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewRecorded = useRef(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicNewsPost(slug);
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  // Record view once when post is loaded
  useEffect(() => {
    if (post && !viewRecorded.current) {
      viewRecorded.current = true;
      recordNewsPostView(slug).catch(() => {
        // Silently fail - view tracking is non-critical
      });
    }
  }, [post, slug]);

  // Update document title and meta tags
  useEffect(() => {
    if (post) {
      const title = lang === 'ta' && post.title.ta ? post.title.ta : post.title.en;
      document.title = `${title} | GSDTA News`;

      // Update meta description if available
      const description = post.metaDescription
        ? (lang === 'ta' && post.metaDescription.ta ? post.metaDescription.ta : post.metaDescription.en)
        : (lang === 'ta' && post.summary.ta ? post.summary.ta : post.summary.en);

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);

      // Update meta keywords if available
      if (post.metaKeywords && post.metaKeywords.length > 0) {
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', post.metaKeywords.join(', '));
      }
    }
  }, [post, lang]);

  // Get text in current language with fallback to English
  const getText = (text: { en: string; ta: string } | undefined) => {
    if (!text) return '';
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <section className="max-w-4xl mx-auto">
        <Link
          href="/news"
          className="inline-flex items-center text-green-600 hover:text-green-800 mb-6"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {lang === 'ta' ? 'செய்திகளுக்குத் திரும்பு' : 'Back to News'}
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error || (lang === 'ta' ? 'கட்டுரை கிடைக்கவில்லை' : 'Article not found')}
        </div>
      </section>
    );
  }

  return (
    <article className="max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/news"
        className="inline-flex items-center text-green-600 hover:text-green-800 mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {lang === 'ta' ? 'செய்திகளுக்குத் திரும்பு' : 'Back to News'}
      </Link>

      {/* Category Badge */}
      <span
        className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${NEWS_POST_CATEGORY_COLORS[post.category]}`}
      >
        {getText(NEWS_POST_CATEGORIES[post.category])}
      </span>

      {/* Title */}
      <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
        {getText(post.title)}
      </h1>

      {/* Meta */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(post.publishedAt)}
        </span>
        <span className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {post.authorName}
        </span>
        {post.views !== undefined && post.views > 0 && (
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {post.views.toLocaleString()} {lang === 'ta' ? 'பார்வைகள்' : 'views'}
          </span>
        )}
      </div>

      {/* Featured Image */}
      {post.featuredImage && (
        <div className="mt-6 rounded-lg overflow-hidden">
          <img
            src={post.featuredImage.url}
            alt={getText(post.featuredImage.alt || post.title)}
            className="w-full h-auto object-cover"
          />
          {post.featuredImage.caption && (
            <p className="mt-2 text-sm text-gray-500 italic">
              {getText(post.featuredImage.caption)}
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 text-lg text-gray-700 font-medium leading-relaxed border-l-4 border-green-500 pl-4">
        {getText(post.summary)}
      </div>

      {/* Body Content */}
      <div
        className="mt-8 prose prose-lg prose-green max-w-none
          prose-headings:text-gray-900
          prose-p:text-gray-700
          prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900
          prose-ul:text-gray-700
          prose-ol:text-gray-700
          prose-li:text-gray-700
          prose-blockquote:border-green-500 prose-blockquote:text-gray-600
          prose-img:rounded-lg
        "
        dangerouslySetInnerHTML={{ __html: getText(post.body) }}
      />

      {/* Gallery Images */}
      {post.images && post.images.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {lang === 'ta' ? 'படங்கள்' : 'Gallery'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {post.images.map((image) => (
              <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden">
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={getText(image.alt)}
                  className="w-full h-full object-cover"
                />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                    {getText(image.caption)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {lang === 'ta' ? 'குறிச்சொற்கள்' : 'Tags'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Back to News Link */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <Link
          href="/news"
          className="inline-flex items-center text-green-600 hover:text-green-800 font-medium"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {lang === 'ta' ? 'அனைத்து செய்திகளையும் காண்க' : 'View All News'}
        </Link>
      </div>
    </article>
  );
}
