'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

type ProfileData = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: Address;
};

interface ProfileCompletionModalProps {
  initialData?: ProfileData;
  onComplete: () => void;
}

/**
 * Blocking modal that requires parents to complete their profile
 * before accessing any parent portal features.
 *
 * Required fields:
 * - First Name
 * - Last Name
 * - Phone (at least 10 digits)
 * - Address (street, city, state, zip)
 */
export default function ProfileCompletionModal({
  initialData,
  onComplete,
}: ProfileCompletionModalProps) {
  const { getIdToken } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    phone: initialData?.phone || '',
    street: initialData?.address?.street || '',
    city: initialData?.address?.city || '',
    state: initialData?.address?.state || '',
    zip: initialData?.address?.zip || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    // Phone must be at least 10 digits (strip non-digits for validation)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.phone = 'Phone number must be at least 10 digits';
    }
    if (!formData.street.trim()) {
      errors.street = 'Street address is required';
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }
    if (!formData.zip.trim()) {
      errors.zip = 'ZIP code is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const token = await getIdToken();
      if (!token) {
        setError('Authentication error. Please try again.');
        setSaving(false);
        return;
      }

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        phone: formData.phone.trim(),
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip: formData.zip.trim(),
        },
      };

      const res = await fetch('/api/v1/me/', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onComplete();
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to update profile. Please try again.');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
          <p className="text-green-100 text-sm mt-1">
            Please provide the required information to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
            All fields marked with <span className="text-red-500">*</span> are required to access the Parent Portal.
          </div>

          {/* Name Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:ring-green-500 focus:border-green-500 ${
                  fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="John"
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:ring-green-500 focus:border-green-500 ${
                  fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Doe"
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-md border px-3 py-2 focus:ring-green-500 focus:border-green-500 ${
                fieldErrors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="555-123-4567"
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">
              Address <span className="text-red-500">*</span>
            </h3>

            <div>
              <label htmlFor="street" className="block text-sm text-gray-600">
                Street Address
              </label>
              <input
                type="text"
                id="street"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:ring-green-500 focus:border-green-500 ${
                  fieldErrors.street ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="123 Main Street"
              />
              {fieldErrors.street && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.street}</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="city" className="block text-sm text-gray-600">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 focus:ring-green-500 focus:border-green-500 ${
                    fieldErrors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="San Diego"
                />
                {fieldErrors.city && (
                  <p className="mt-1 text-sm text-red-500">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="state" className="block text-sm text-gray-600">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 focus:ring-green-500 focus:border-green-500 ${
                    fieldErrors.state ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="CA"
                />
                {fieldErrors.state && (
                  <p className="mt-1 text-sm text-red-500">{fieldErrors.state}</p>
                )}
              </div>

              <div>
                <label htmlFor="zip" className="block text-sm text-gray-600">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 focus:ring-green-500 focus:border-green-500 ${
                    fieldErrors.zip ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="92101"
                />
                {fieldErrors.zip && (
                  <p className="mt-1 text-sm text-red-500">{fieldErrors.zip}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                </span>
              ) : (
                'Complete Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
