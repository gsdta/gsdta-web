'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminCreateNewsPost } from '@/lib/news-posts-api';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';
import type { NewsPostFormData, NewsPostImage } from '@/types/newsPost';
import { NEWS_POST_CATEGORIES, NEWS_POST_CONSTANTS } from '@/types/newsPost';

const initialFormData: NewsPostFormData = {
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
};

export default function NewNewsPostPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [formData, setFormData] = useState<NewsPostFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'en' | 'ta'>('en');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

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

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const result = await adminCreateNewsPost(getIdToken, formData);
      router.push(`/admin/news-posts/${result.id}?created=true`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create news post');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create News Post</h1>
        <p className="mt-1 text-gray-600">
          Create a new article with rich text and images.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Submit Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {submitError}
          </div>
        )}

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

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/admin/news-posts"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
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
                Creating...
              </>
            ) : (
              'Create as Draft'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
