'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  adminGetNewsPost,
  adminUpdateNewsPost,
  adminDeleteNewsPost,
  adminReviewNewsPost,
  adminPublishNewsPost,
  adminUnpublishNewsPost,
} from '@/lib/news-posts-api';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';
import type { NewsPost, NewsPostFormData, NewsPostImage } from '@/types/newsPost';
import {
  NEWS_POST_CATEGORIES,
  NEWS_POST_CONSTANTS,
  NEWS_POST_STATUS_NAMES,
  NEWS_POST_STATUS_COLORS,
} from '@/types/newsPost';

function formatDateTimeLocal(isoString: string | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<NewsPost | null>(null);
  const [formData, setFormData] = useState<NewsPostFormData>({
    titleEn: '',
    titleTa: '',
    summaryEn: '',
    summaryTa: '',
    bodyEn: '',
    bodyTa: '',
    category: 'school-news',
    tags: [],
    featuredImage: undefined,
    images: [],
    priority: NEWS_POST_CONSTANTS.DEFAULT_PRIORITY,
    startDate: '',
    endDate: '',
    isPinned: false,
    metaDescriptionEn: '',
    metaDescriptionTa: '',
    metaKeywords: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'en' | 'ta'>('en');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Show success message from URL params
    if (searchParams.get('created') === 'true') {
      setSuccessMessage('News post created successfully!');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await adminGetNewsPost(getIdToken, id);
        setItem(data);
        setFormData({
          titleEn: data.title.en,
          titleTa: data.title.ta || '',
          summaryEn: data.summary.en,
          summaryTa: data.summary.ta || '',
          bodyEn: data.body.en,
          bodyTa: data.body.ta || '',
          category: data.category,
          tags: data.tags || [],
          featuredImage: data.featuredImage
            ? {
                url: data.featuredImage.url,
                thumbnailUrl: data.featuredImage.thumbnailUrl,
                alt: data.featuredImage.alt,
                caption: data.featuredImage.caption,
                order: data.featuredImage.order,
              }
            : undefined,
          images:
            data.images?.map((img) => ({
              url: img.url,
              thumbnailUrl: img.thumbnailUrl,
              alt: img.alt,
              caption: img.caption,
              order: img.order,
            })) || [],
          priority: data.priority,
          startDate: formatDateTimeLocal(data.startDate),
          endDate: formatDateTimeLocal(data.endDate),
          isPinned: data.isPinned || false,
          metaDescriptionEn: data.metaDescription?.en || '',
          metaDescriptionTa: data.metaDescription?.ta || '',
          metaKeywords: data.metaKeywords || [],
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load news post');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [getIdToken, id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (
      keyword &&
      keyword.length <= 50 &&
      formData.metaKeywords.length < NEWS_POST_CONSTANTS.MAX_META_KEYWORDS &&
      !formData.metaKeywords.includes(keyword)
    ) {
      setFormData((prev) => ({ ...prev, metaKeywords: [...prev.metaKeywords, keyword] }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      metaKeywords: prev.metaKeywords.filter((kw) => kw !== keywordToRemove),
    }));
  };

  const handleBodyChange = (lang: 'en' | 'ta', html: string) => {
    const field = lang === 'en' ? 'bodyEn' : 'bodyTa';
    setFormData((prev) => ({ ...prev, [field]: html }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFeaturedImageChange = (images: Omit<NewsPostImage, 'id'>[]) => {
    setFormData((prev) => ({
      ...prev,
      featuredImage: images[0] || undefined,
    }));
  };

  const handleGalleryImagesChange = (images: Omit<NewsPostImage, 'id'>[]) => {
    setFormData((prev) => ({ ...prev, images }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (
      tag &&
      tag.length <= NEWS_POST_CONSTANTS.MAX_TAG_LENGTH &&
      formData.tags.length < NEWS_POST_CONSTANTS.MAX_TAGS &&
      !formData.tags.includes(tag)
    ) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.titleEn.trim()) {
      newErrors.titleEn = 'English title is required';
    } else if (formData.titleEn.length > NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH) {
      newErrors.titleEn = `Title must be ${NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH} characters or less`;
    }

    if (formData.titleTa.length > NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH) {
      newErrors.titleTa = `Title must be ${NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH} characters or less`;
    }

    if (!formData.summaryEn.trim()) {
      newErrors.summaryEn = 'English summary is required';
    } else if (formData.summaryEn.length > NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH) {
      newErrors.summaryEn = `Summary must be ${NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH} characters or less`;
    }

    if (formData.summaryTa.length > NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH) {
      newErrors.summaryTa = `Summary must be ${NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH} characters or less`;
    }

    if (!formData.bodyEn.trim() || formData.bodyEn === '<p></p>') {
      newErrors.bodyEn = 'English body content is required';
    }

    if (
      formData.priority < NEWS_POST_CONSTANTS.MIN_PRIORITY ||
      formData.priority > NEWS_POST_CONSTANTS.MAX_PRIORITY
    ) {
      newErrors.priority = `Priority must be between ${NEWS_POST_CONSTANTS.MIN_PRIORITY} and ${NEWS_POST_CONSTANTS.MAX_PRIORITY}`;
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const updated = await adminUpdateNewsPost(getIdToken, id, formData);
      setItem(updated);
      setSuccessMessage('News post updated successfully!');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update news post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item?.title.en}"?`)) return;

    try {
      await adminDeleteNewsPost(getIdToken, id);
      router.push('/admin/news-posts?deleted=true');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete news post');
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitError(null);
      const updated = await adminReviewNewsPost(getIdToken, id, 'approve');
      setItem(updated);
      setSuccessMessage('News post approved!');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to approve news post');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    try {
      setSubmitError(null);
      const updated = await adminReviewNewsPost(getIdToken, id, 'reject', rejectionReason);
      setItem(updated);
      setShowRejectDialog(false);
      setRejectionReason('');
      setSuccessMessage('News post rejected and sent back to author.');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to reject news post');
    }
  };

  const handlePublish = async () => {
    try {
      setSubmitError(null);
      const updated = await adminPublishNewsPost(getIdToken, id);
      setItem(updated);
      setSuccessMessage('News post published!');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to publish news post');
    }
  };

  const handleUnpublish = async () => {
    try {
      setSubmitError(null);
      const updated = await adminUnpublishNewsPost(getIdToken, id);
      setItem(updated);
      setSuccessMessage('News post unpublished.');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to unpublish news post');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {loadError}
        </div>
        <Link href="/admin/news-posts" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          Back to News Posts
        </Link>
      </div>
    );
  }

  const canPublish =
    item?.status === 'approved' ||
    item?.status === 'unpublished' ||
    (item?.status === 'draft' && item?.authorRole === 'admin');
  const isPendingReview = item?.status === 'pending_review';
  const isPublished = item?.status === 'published';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/news-posts"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to News Posts
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">Edit News Post</h1>
          {item && (
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${NEWS_POST_STATUS_COLORS[item.status]}`}
            >
              {NEWS_POST_STATUS_NAMES[item.status]}
            </span>
          )}
        </div>
        {item?.authorName && (
          <p className="mt-1 text-sm text-gray-600">
            By {item.authorName} ({item.authorRole})
          </p>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Submit Error */}
      {submitError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {submitError}
        </div>
      )}

      {/* Rejection Reason (if rejected) */}
      {item?.status === 'rejected' && item.rejectionReason && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <strong>Rejection Reason:</strong> {item.rejectionReason}
        </div>
      )}

      {/* Workflow Actions */}
      {(isPendingReview || canPublish || isPublished) && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Workflow Actions</h3>
          <div className="flex flex-wrap gap-2">
            {isPendingReview && (
              <>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
              </>
            )}
            {canPublish && (
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Publish Now
              </button>
            )}
            {isPublished && (
              <button
                onClick={handleUnpublish}
                className="px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700"
              >
                Unpublish
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject News Post</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejection. This will be sent back to the author.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reason for rejection..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language Tabs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('en')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'en'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ta')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ta'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tamil (தமிழ்)
            </button>
          </div>

          {/* English Content */}
          <div className={activeTab === 'en' ? '' : 'hidden'}>
            {/* Title (English) */}
            <div className="mb-4">
              <label htmlFor="titleEn" className="block text-sm font-medium text-gray-700 mb-1">
                Title (English) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="titleEn"
                name="titleEn"
                value={formData.titleEn}
                onChange={handleInputChange}
                maxLength={NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.titleEn ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter news post title"
              />
              <div className="flex justify-between mt-1">
                {errors.titleEn ? (
                  <p className="text-sm text-red-600">{errors.titleEn}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500">
                  {formData.titleEn.length}/{NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH}
                </span>
              </div>
            </div>

            {/* Summary (English) */}
            <div className="mb-4">
              <label htmlFor="summaryEn" className="block text-sm font-medium text-gray-700 mb-1">
                Summary (English) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="summaryEn"
                name="summaryEn"
                value={formData.summaryEn}
                onChange={handleInputChange}
                rows={2}
                maxLength={NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.summaryEn ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Brief summary of the news post..."
              />
              <div className="flex justify-between mt-1">
                {errors.summaryEn ? (
                  <p className="text-sm text-red-600">{errors.summaryEn}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500">
                  {formData.summaryEn.length}/{NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH}
                </span>
              </div>
            </div>

            {/* Body (English) */}
            <div className="mb-4">
              <RichTextEditor
                label="Body (English) *"
                value={formData.bodyEn}
                onChange={(html) => handleBodyChange('en', html)}
                maxLength={NEWS_POST_CONSTANTS.MAX_BODY_LENGTH}
                placeholder="Write your article content..."
                error={errors.bodyEn}
              />
            </div>
          </div>

          {/* Tamil Content */}
          <div className={activeTab === 'ta' ? '' : 'hidden'}>
            {/* Title (Tamil) */}
            <div className="mb-4">
              <label htmlFor="titleTa" className="block text-sm font-medium text-gray-700 mb-1">
                Title (Tamil)
              </label>
              <input
                type="text"
                id="titleTa"
                name="titleTa"
                value={formData.titleTa}
                onChange={handleInputChange}
                maxLength={NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.titleTa ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="தலைப்பை உள்ளிடவும்"
              />
              <div className="flex justify-between mt-1">
                {errors.titleTa ? (
                  <p className="text-sm text-red-600">{errors.titleTa}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500">
                  {formData.titleTa.length}/{NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH}
                </span>
              </div>
            </div>

            {/* Summary (Tamil) */}
            <div className="mb-4">
              <label htmlFor="summaryTa" className="block text-sm font-medium text-gray-700 mb-1">
                Summary (Tamil)
              </label>
              <textarea
                id="summaryTa"
                name="summaryTa"
                value={formData.summaryTa}
                onChange={handleInputChange}
                rows={2}
                maxLength={NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.summaryTa ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="சுருக்கத்தை உள்ளிடவும்..."
              />
              <div className="flex justify-between mt-1">
                {errors.summaryTa ? (
                  <p className="text-sm text-red-600">{errors.summaryTa}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500">
                  {formData.summaryTa.length}/{NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH}
                </span>
              </div>
            </div>

            {/* Body (Tamil) */}
            <div className="mb-4">
              <RichTextEditor
                label="Body (Tamil)"
                value={formData.bodyTa}
                onChange={(html) => handleBodyChange('ta', html)}
                maxLength={NEWS_POST_CONSTANTS.MAX_BODY_LENGTH}
                placeholder="உள்ளடக்கத்தை எழுதுங்கள்..."
                error={errors.bodyTa}
              />
            </div>
          </div>
        </div>

        {/* Category and Tags */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Categorization</h2>

          {/* Category */}
          <div className="mb-4">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(NEWS_POST_CATEGORIES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.en}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags ({formData.tags.length}/{NEWS_POST_CONSTANTS.MAX_TAGS})
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                maxLength={NEWS_POST_CONSTANTS.MAX_TAG_LENGTH}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a tag..."
                disabled={formData.tags.length >= NEWS_POST_CONSTANTS.MAX_TAGS}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={formData.tags.length >= NEWS_POST_CONSTANTS.MAX_TAGS || !tagInput.trim()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Featured Image */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Featured Image</h2>
          <ImageUpload
            images={formData.featuredImage ? [formData.featuredImage] : []}
            onImagesChange={handleFeaturedImageChange}
            storageFolder="news-posts/featured"
            single
          />
        </div>

        {/* Gallery Images */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Gallery Images ({formData.images.length}/{NEWS_POST_CONSTANTS.MAX_IMAGES})
          </h2>
          <ImageUpload
            images={formData.images}
            onImagesChange={handleGalleryImagesChange}
            maxImages={NEWS_POST_CONSTANTS.MAX_IMAGES}
            storageFolder="news-posts/gallery"
          />
        </div>

        {/* Priority and Schedule */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Publishing Options</h2>

          {/* Pin to Top */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isPinned"
                checked={formData.isPinned}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Pin to Top</span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Pinned posts always appear at the top of the news list
            </p>
          </div>

          {/* Priority */}
          <div className="mb-4">
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority ({NEWS_POST_CONSTANTS.MIN_PRIORITY}-{NEWS_POST_CONSTANTS.MAX_PRIORITY})
            </label>
            <input
              type="number"
              id="priority"
              name="priority"
              min={NEWS_POST_CONSTANTS.MIN_PRIORITY}
              max={NEWS_POST_CONSTANTS.MAX_PRIORITY}
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
          <p className="mt-2 text-xs text-gray-500">
            Schedule when this post should be visible. Leave empty to show always when published.
          </p>
        </div>

        {/* SEO Metadata */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">SEO Metadata</h2>
          <p className="text-sm text-gray-500 mb-4">
            Optimize this post for search engines. These fields are optional but recommended.
          </p>

          {/* Meta Description (English) */}
          <div className="mb-4">
            <label htmlFor="metaDescriptionEn" className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description (English)
            </label>
            <textarea
              id="metaDescriptionEn"
              name="metaDescriptionEn"
              value={formData.metaDescriptionEn}
              onChange={handleInputChange}
              rows={2}
              maxLength={NEWS_POST_CONSTANTS.MAX_META_DESCRIPTION_LENGTH}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description for search engines..."
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">
                {formData.metaDescriptionEn.length}/{NEWS_POST_CONSTANTS.MAX_META_DESCRIPTION_LENGTH}
              </span>
            </div>
          </div>

          {/* Meta Description (Tamil) */}
          <div className="mb-4">
            <label htmlFor="metaDescriptionTa" className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description (Tamil)
            </label>
            <textarea
              id="metaDescriptionTa"
              name="metaDescriptionTa"
              value={formData.metaDescriptionTa}
              onChange={handleInputChange}
              rows={2}
              maxLength={NEWS_POST_CONSTANTS.MAX_META_DESCRIPTION_LENGTH}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="தேடுபொறிகளுக்கான சுருக்கமான விளக்கம்..."
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">
                {formData.metaDescriptionTa.length}/{NEWS_POST_CONSTANTS.MAX_META_DESCRIPTION_LENGTH}
              </span>
            </div>
          </div>

          {/* Meta Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords ({formData.metaKeywords.length}/{NEWS_POST_CONSTANTS.MAX_META_KEYWORDS})
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                maxLength={50}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a keyword..."
                disabled={formData.metaKeywords.length >= NEWS_POST_CONSTANTS.MAX_META_KEYWORDS}
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                disabled={formData.metaKeywords.length >= NEWS_POST_CONSTANTS.MAX_META_KEYWORDS || !keywordInput.trim()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {formData.metaKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.metaKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        {item && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Metadata</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>ID:</strong> {item.id}
              </p>
              <p>
                <strong>Slug:</strong> {item.slug}
              </p>
              <p>
                <strong>Views:</strong> {item.views ?? 0}
              </p>
              <p>
                <strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Updated:</strong> {new Date(item.updatedAt).toLocaleString()}
              </p>
              {item.publishedAt && (
                <p>
                  <strong>Published:</strong> {new Date(item.publishedAt).toLocaleString()}
                  {item.publishedByName && ` by ${item.publishedByName}`}
                </p>
              )}
              {item.reviewedAt && (
                <p>
                  <strong>Reviewed:</strong> {new Date(item.reviewedAt).toLocaleString()}
                  {item.reviewedByName && ` by ${item.reviewedByName}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-3">
            <Link
              href="/admin/news-posts"
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Preview
            </button>
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('en')}
                  className={`px-3 py-1 text-sm rounded ${
                    activeTab === 'en'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setActiveTab('ta')}
                  className={`px-3 py-1 text-sm rounded ${
                    activeTab === 'ta'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Tamil
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="ml-4 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Featured Image */}
              {formData.featuredImage && (
                <img
                  src={formData.featuredImage.url}
                  alt=""
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}

              {/* Category Badge */}
              <div className="mb-4">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {NEWS_POST_CATEGORIES[formData.category][activeTab]}
                </span>
                {formData.isPinned && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                    Pinned
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {activeTab === 'en' ? formData.titleEn || 'No title' : formData.titleTa || formData.titleEn || 'தலைப்பு இல்லை'}
              </h1>

              {/* Summary */}
              <p className="text-lg text-gray-600 mb-6">
                {activeTab === 'en' ? formData.summaryEn || 'No summary' : formData.summaryTa || formData.summaryEn || 'சுருக்கம் இல்லை'}
              </p>

              {/* Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Body Content */}
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{
                  __html: activeTab === 'en'
                    ? formData.bodyEn || '<p>No content</p>'
                    : formData.bodyTa || formData.bodyEn || '<p>உள்ளடக்கம் இல்லை</p>',
                }}
              />

              {/* Gallery Images */}
              {formData.images.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Gallery</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((img, index) => (
                      <img
                        key={index}
                        src={img.url}
                        alt=""
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
