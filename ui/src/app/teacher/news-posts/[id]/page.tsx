'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  teacherGetNewsPost,
  teacherUpdateNewsPost,
  teacherDeleteNewsPost,
  teacherSubmitNewsPost,
} from '@/lib/news-posts-api';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';
import type { NewsPost, NewsPostImage, NewsPostCategory } from '@/types/newsPost';
import {
  NEWS_POST_CATEGORIES,
  NEWS_POST_CONSTANTS,
  NEWS_POST_STATUS_NAMES,
  NEWS_POST_STATUS_COLORS,
} from '@/types/newsPost';

interface TeacherNewsPostFormData {
  titleEn: string;
  titleTa: string;
  summaryEn: string;
  summaryTa: string;
  bodyEn: string;
  bodyTa: string;
  category: NewsPostCategory;
  tags: string[];
  featuredImage?: Omit<NewsPostImage, 'id'>;
  images: Omit<NewsPostImage, 'id'>[];
}

export default function TeacherEditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<NewsPost | null>(null);
  const [formData, setFormData] = useState<TeacherNewsPostFormData>({
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'en' | 'ta'>('en');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      setSuccessMessage('News post created successfully!');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await teacherGetNewsPost(getIdToken, id);
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
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load news post');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [getIdToken, id]);

  const canEdit = item?.status === 'draft' || item?.status === 'rejected';

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
      const updated = await teacherUpdateNewsPost(getIdToken, id, {
        ...formData,
        priority: NEWS_POST_CONSTANTS.DEFAULT_PRIORITY,
        startDate: '',
        endDate: '',
        isPinned: false,
        metaDescriptionEn: '',
        metaDescriptionTa: '',
        metaKeywords: [],
      });
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
      await teacherDeleteNewsPost(getIdToken, id);
      router.push('/teacher/news-posts?deleted=true');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete news post');
    }
  };

  const handleSubmitForReview = async () => {
    try {
      setSubmitError(null);
      const updated = await teacherSubmitNewsPost(getIdToken, id);
      setItem(updated);
      setSuccessMessage('News post submitted for admin review!');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit for review');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {loadError}
        </div>
        <Link href="/teacher/news-posts" className="mt-4 inline-block text-green-600 hover:text-green-800">
          Back to My News Posts
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/teacher/news-posts"
          className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My News Posts
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {canEdit ? 'Edit' : 'View'} News Post
          </h1>
          {item && (
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${NEWS_POST_STATUS_COLORS[item.status]}`}
            >
              {NEWS_POST_STATUS_NAMES[item.status]}
            </span>
          )}
        </div>
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

      {/* Rejection Reason */}
      {item?.status === 'rejected' && item.rejectionReason && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <strong>Rejection Reason:</strong> {item.rejectionReason}
          <p className="mt-2 text-sm">Please address the feedback and resubmit for review.</p>
        </div>
      )}

      {/* Non-editable notice */}
      {!canEdit && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          This post is {item?.status === 'pending_review' ? 'pending review' : 'published'} and cannot be edited.
        </div>
      )}

      {/* Workflow Actions */}
      {canEdit && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSubmitForReview}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              Submit for Review
            </button>
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
                  ? 'border-green-500 text-green-600'
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
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tamil (தமிழ்)
            </button>
          </div>

          {/* English Content */}
          <div className={activeTab === 'en' ? '' : 'hidden'}>
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
                disabled={!canEdit}
                maxLength={NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.titleEn ? 'border-red-500' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-100' : ''}`}
                placeholder="Enter news post title"
              />
              <div className="flex justify-between mt-1">
                {errors.titleEn && <p className="text-sm text-red-600">{errors.titleEn}</p>}
                <span className="text-xs text-gray-500 ml-auto">
                  {formData.titleEn.length}/{NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="summaryEn" className="block text-sm font-medium text-gray-700 mb-1">
                Summary (English) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="summaryEn"
                name="summaryEn"
                value={formData.summaryEn}
                onChange={handleInputChange}
                disabled={!canEdit}
                rows={2}
                maxLength={NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.summaryEn ? 'border-red-500' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-100' : ''}`}
                placeholder="Brief summary..."
              />
              <div className="flex justify-between mt-1">
                {errors.summaryEn && <p className="text-sm text-red-600">{errors.summaryEn}</p>}
                <span className="text-xs text-gray-500 ml-auto">
                  {formData.summaryEn.length}/{NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <RichTextEditor
                label="Body (English) *"
                value={formData.bodyEn}
                onChange={(html) => handleBodyChange('en', html)}
                maxLength={NEWS_POST_CONSTANTS.MAX_BODY_LENGTH}
                placeholder="Write your article content..."
                error={errors.bodyEn}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Tamil Content */}
          <div className={activeTab === 'ta' ? '' : 'hidden'}>
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
                disabled={!canEdit}
                maxLength={NEWS_POST_CONSTANTS.MAX_TITLE_LENGTH}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300 ${!canEdit ? 'bg-gray-100' : ''}`}
                placeholder="தலைப்பை உள்ளிடவும்"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="summaryTa" className="block text-sm font-medium text-gray-700 mb-1">
                Summary (Tamil)
              </label>
              <textarea
                id="summaryTa"
                name="summaryTa"
                value={formData.summaryTa}
                onChange={handleInputChange}
                disabled={!canEdit}
                rows={2}
                maxLength={NEWS_POST_CONSTANTS.MAX_SUMMARY_LENGTH}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300 ${!canEdit ? 'bg-gray-100' : ''}`}
                placeholder="சுருக்கத்தை உள்ளிடவும்..."
              />
            </div>

            <div className="mb-4">
              <RichTextEditor
                label="Body (Tamil)"
                value={formData.bodyTa}
                onChange={(html) => handleBodyChange('ta', html)}
                maxLength={NEWS_POST_CONSTANTS.MAX_BODY_LENGTH}
                placeholder="உள்ளடக்கத்தை எழுதுங்கள்..."
                error={errors.bodyTa}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        {/* Category and Tags */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Categorization</h2>

          <div className="mb-4">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${!canEdit ? 'bg-gray-100' : ''}`}
            >
              {Object.entries(NEWS_POST_CATEGORIES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags ({formData.tags.length}/{NEWS_POST_CONSTANTS.MAX_TAGS})
            </label>
            {canEdit && (
              <div className="flex gap-2 mb-2">
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Add a tag..."
                  disabled={formData.tags.length >= NEWS_POST_CONSTANTS.MAX_TAGS}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={formData.tags.length >= NEWS_POST_CONSTANTS.MAX_TAGS || !tagInput.trim()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                  >
                    {tag}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        &times;
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        {canEdit ? (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Featured Image</h2>
              <ImageUpload
                images={formData.featuredImage ? [formData.featuredImage] : []}
                onImagesChange={handleFeaturedImageChange}
                storageFolder="news-posts/featured"
                single
              />
            </div>

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
          </>
        ) : (
          <>
            {formData.featuredImage && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Featured Image</h2>
                <img src={formData.featuredImage.url} alt="" className="w-full max-w-md rounded-lg" />
              </div>
            )}
            {formData.images.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Gallery Images</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.images.map((img, i) => (
                    <img key={i} src={img.url} alt="" className="w-full h-40 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Metadata */}
        {item && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Metadata</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}</p>
              <p><strong>Updated:</strong> {new Date(item.updatedAt).toLocaleString()}</p>
              {item.submittedAt && (
                <p><strong>Submitted for review:</strong> {new Date(item.submittedAt).toLocaleString()}</p>
              )}
              {item.publishedAt && (
                <p><strong>Published:</strong> {new Date(item.publishedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-between pt-4">
          {canEdit && item?.status === 'draft' && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
            >
              Delete
            </button>
          )}
          {!canEdit && <div />}
          <div className="flex gap-3">
            <Link
              href="/teacher/news-posts"
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {canEdit ? 'Cancel' : 'Back'}
            </Link>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Preview
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            )}
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
                  className={`px-3 py-1 text-sm rounded ${activeTab === 'en' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setActiveTab('ta')}
                  className={`px-3 py-1 text-sm rounded ${activeTab === 'ta' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Tamil
                </button>
                <button onClick={() => setShowPreview(false)} className="ml-4 text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {formData.featuredImage && (
                <img src={formData.featuredImage.url} alt="" className="w-full h-64 object-cover rounded-lg mb-6" />
              )}
              <div className="mb-4">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  {NEWS_POST_CATEGORIES[formData.category][activeTab]}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {activeTab === 'en' ? formData.titleEn || 'No title' : formData.titleTa || formData.titleEn || 'தலைப்பு இல்லை'}
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                {activeTab === 'en' ? formData.summaryEn || 'No summary' : formData.summaryTa || formData.summaryEn || 'சுருக்கம் இல்லை'}
              </p>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">#{tag}</span>
                  ))}
                </div>
              )}
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{
                  __html: activeTab === 'en'
                    ? formData.bodyEn || '<p>No content</p>'
                    : formData.bodyTa || formData.bodyEn || '<p>உள்ளடக்கம் இல்லை</p>',
                }}
              />
              {formData.images.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Gallery</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((img, index) => (
                      <img key={index} src={img.url} alt="" className="w-full h-40 object-cover rounded-lg" />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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
