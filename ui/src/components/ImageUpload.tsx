'use client';

import { useState, useCallback, useRef } from 'react';
import { getFirebaseStorage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import type { NewsPostImage, BilingualText } from '@/types/newsPost';

interface ImageUploadProps {
  images: Omit<NewsPostImage, 'id'>[];
  onImagesChange: (images: Omit<NewsPostImage, 'id'>[]) => void;
  maxImages?: number;
  storageFolder: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  single?: boolean; // For featured image (single image mode)
}

interface UploadingImage {
  file: File;
  progress: number;
  preview: string;
}

export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
  storageFolder,
  disabled = false,
  label,
  error,
  single = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState<UploadingImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveMaxImages = single ? 1 : maxImages;

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      return await imageCompression(file, options);
    } catch {
      console.warn('Image compression failed, using original');
      return file;
    }
  };

  const uploadImage = async (file: File): Promise<Omit<NewsPostImage, 'id'>> => {
    const storage = getFirebaseStorage();
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${storageFolder}/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, path);

    // Compress image before upload
    const compressedFile = await compressImage(file);

    // Upload to Firebase Storage
    await uploadBytes(storageRef, compressedFile);

    // Get download URL
    const url = await getDownloadURL(storageRef);

    return {
      url,
      order: images.length,
      alt: { en: '', ta: '' },
      caption: { en: '', ta: '' },
    };
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;

      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((file) => file.type.startsWith('image/'));

      if (validFiles.length === 0) return;

      // Limit number of files
      const remainingSlots = effectiveMaxImages - images.length;
      const filesToUpload = validFiles.slice(0, remainingSlots);

      if (filesToUpload.length === 0) {
        alert(`Maximum ${effectiveMaxImages} image${effectiveMaxImages > 1 ? 's' : ''} allowed`);
        return;
      }

      // Create preview entries
      const newUploading: UploadingImage[] = filesToUpload.map((file) => ({
        file,
        progress: 0,
        preview: URL.createObjectURL(file),
      }));

      setUploading((prev) => [...prev, ...newUploading]);

      // Upload each file
      const uploadPromises = filesToUpload.map(async (file, index) => {
        try {
          const uploadedImage = await uploadImage(file);

          // Update progress
          setUploading((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, progress: 100 } : u
            )
          );

          return uploadedImage;
        } catch (err) {
          console.error('Upload failed:', err);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((r): r is Omit<NewsPostImage, 'id'> => r !== null);

      // Update images list
      if (single) {
        onImagesChange(successfulUploads.slice(0, 1));
      } else {
        onImagesChange([...images, ...successfulUploads]);
      }

      // Clean up previews and uploading state
      newUploading.forEach((u) => URL.revokeObjectURL(u.preview));
      setUploading((prev) =>
        prev.filter((u) => !filesToUpload.includes(u.file))
      );
    },
    [disabled, effectiveMaxImages, images, onImagesChange, single, storageFolder]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFiles]
  );

  const removeImage = useCallback(
    async (index: number) => {
      const imageToRemove = images[index];

      // Try to delete from storage (best effort)
      try {
        const storage = getFirebaseStorage();
        // Extract path from URL
        const url = new URL(imageToRemove.url);
        const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
        if (pathMatch) {
          const path = decodeURIComponent(pathMatch[1]);
          const storageRef = ref(storage, path);
          await deleteObject(storageRef);
        }
      } catch {
        // Ignore deletion errors - image might already be deleted
      }

      const newImages = images.filter((_, i) => i !== index);
      // Reorder remaining images
      const reorderedImages = newImages.map((img, i) => ({ ...img, order: i }));
      onImagesChange(reorderedImages);
    },
    [images, onImagesChange]
  );

  const moveImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= images.length) return;

      const newImages = [...images];
      const [moved] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, moved);

      // Update order values
      const reorderedImages = newImages.map((img, i) => ({ ...img, order: i }));
      onImagesChange(reorderedImages);
    },
    [images, onImagesChange]
  );

  const updateImageMeta = useCallback(
    (index: number, field: 'alt' | 'caption', lang: 'en' | 'ta', value: string) => {
      const newImages = images.map((img, i) => {
        if (i !== index) return img;
        return {
          ...img,
          [field]: {
            ...(img[field] || { en: '', ta: '' }),
            [lang]: value,
          },
        };
      });
      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  const canAddMore = images.length < effectiveMaxImages && uploading.length === 0;

  return (
    <div className="image-upload">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Drop zone */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            {single ? 'Click or drag to upload image' : 'Click or drag images here'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {single
              ? 'PNG, JPG, GIF up to 10MB'
              : `PNG, JPG, GIF up to 10MB each (${images.length}/${effectiveMaxImages})`}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={!single}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {/* Uploading previews */}
      {uploading.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {uploading.map((item, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={item.preview}
                alt="Uploading..."
                className="w-full h-full object-cover rounded-lg opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded images */}
      {images.length > 0 && (
        <div className={`mt-4 ${single ? '' : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'}`}>
          {images.map((image, index) => (
            <div
              key={image.url}
              className={`relative ${single ? 'max-w-xs' : ''} group`}
            >
              <div className="aspect-square relative">
                <img
                  src={image.url}
                  alt={image.alt?.en || `Image ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!single && index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, index - 1)}
                      className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100"
                      title="Move left"
                      disabled={disabled}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                      </svg>
                    </button>
                  )}
                  {!single && index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, index + 1)}
                      className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100"
                      title="Move right"
                      disabled={disabled}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1.5 bg-red-500 text-white rounded-full shadow hover:bg-red-600"
                    title="Remove"
                    disabled={disabled}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Alt text input (collapsed by default) */}
              {!single && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                    Image details
                  </summary>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Alt text (English)"
                      value={image.alt?.en || ''}
                      onChange={(e) => updateImageMeta(index, 'alt', 'en', e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded"
                      disabled={disabled}
                    />
                    <input
                      type="text"
                      placeholder="Alt text (Tamil)"
                      value={image.alt?.ta || ''}
                      onChange={(e) => updateImageMeta(index, 'alt', 'ta', e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded"
                      disabled={disabled}
                    />
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default ImageUpload;
