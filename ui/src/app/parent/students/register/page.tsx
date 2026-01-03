'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createStudent } from '@/lib/student-api';
import {
  createStudentSchema,
  newStudentDefaults,
  tamilLevelOptions,
  genderOptions,
  COMMON_SCHOOL_DISTRICTS,
  type CreateStudentInput,
} from '@/lib/student-types';
import { z } from 'zod';

export default function RegisterStudentPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [formData, setFormData] = useState<CreateStudentInput>(newStudentDefaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle nested object changes (address, contacts)
  const handleNestedChange = (
    section: 'address' | 'contacts',
    field: string,
    value: string,
    parent?: 'mother' | 'father'
  ) => {
    setFormData((prev) => {
      if (section === 'address') {
        return {
          ...prev,
          address: {
            ...prev.address,
            [field]: value,
          },
        };
      } else if (section === 'contacts' && parent) {
        return {
          ...prev,
          contacts: {
            ...prev.contacts,
            [parent]: {
              ...prev.contacts?.[parent],
              [field]: value,
            },
          },
        };
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    // Validate form data
    try {
      createStudentSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            fieldErrors[issue.path.join('.')] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await createStudent(getIdToken, formData);
      router.push('/parent/students?registered=true');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to register student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/parent/students"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Students
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Register New Student</h1>
        <p className="mt-1 text-gray-600">
          Fill out the form below to register your child for GSDTA Tamil School.
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

        {/* Section 1: Student Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* DOB and Gender */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
              )}
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: School Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">School Information</h2>

          {/* Current School */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-1">
                Current School Name
              </label>
              <input
                type="text"
                id="schoolName"
                name="schoolName"
                value={formData.schoolName || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Poway Elementary"
              />
            </div>

            <div>
              <label htmlFor="schoolDistrict" className="block text-sm font-medium text-gray-700 mb-1">
                School District
              </label>
              <select
                id="schoolDistrict"
                name="schoolDistrict"
                value={formData.schoolDistrict || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select district</option>
                {COMMON_SCHOOL_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                Current Grade (Public School)
              </label>
              <input
                type="text"
                id="grade"
                name="grade"
                value={formData.grade || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 5th Grade, Kindergarten"
              />
            </div>

            <div>
              <label htmlFor="priorTamilLevel" className="block text-sm font-medium text-gray-700 mb-1">
                Prior Tamil Experience
              </label>
              <select
                id="priorTamilLevel"
                name="priorTamilLevel"
                value={formData.priorTamilLevel || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tamilLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Home Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Home Address</h2>

          <div className="mb-4">
            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              id="street"
              value={formData.address?.street || ''}
              onChange={(e) => handleNestedChange('address', 'street', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 12345 Main Street, Apt 101"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.address?.city || ''}
                onChange={(e) => handleNestedChange('address', 'city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., San Diego"
              />
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                id="zipCode"
                value={formData.address?.zipCode || ''}
                onChange={(e) => handleNestedChange('address', 'zipCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 92128"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Parent/Guardian Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h2>

          {/* Mother's Information */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3 pb-2 border-b">Mother&apos;s Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.contacts?.mother?.name || ''}
                  onChange={(e) => handleNestedChange('contacts', 'name', e.target.value, 'mother')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First Last"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.contacts?.mother?.email || ''}
                  onChange={(e) => handleNestedChange('contacts', 'email', e.target.value, 'mother')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.contacts?.mother?.phone || ''}
                  onChange={(e) => handleNestedChange('contacts', 'phone', e.target.value, 'mother')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(858) 555-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employer (Optional)
                </label>
                <input
                  type="text"
                  value={formData.contacts?.mother?.employer || ''}
                  onChange={(e) => handleNestedChange('contacts', 'employer', e.target.value, 'mother')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company name"
                />
              </div>
            </div>
          </div>

          {/* Father's Information */}
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-3 pb-2 border-b">Father&apos;s Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.contacts?.father?.name || ''}
                  onChange={(e) => handleNestedChange('contacts', 'name', e.target.value, 'father')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First Last"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.contacts?.father?.email || ''}
                  onChange={(e) => handleNestedChange('contacts', 'email', e.target.value, 'father')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.contacts?.father?.phone || ''}
                  onChange={(e) => handleNestedChange('contacts', 'phone', e.target.value, 'father')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(858) 555-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employer (Optional)
                </label>
                <input
                  type="text"
                  value={formData.contacts?.father?.employer || ''}
                  onChange={(e) => handleNestedChange('contacts', 'employer', e.target.value, 'father')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company name"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Additional Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

          {/* Medical Notes */}
          <div className="mb-4">
            <label htmlFor="medicalNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Medical Notes / Allergies
            </label>
            <textarea
              id="medicalNotes"
              name="medicalNotes"
              value={formData.medicalNotes || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any medical conditions, allergies, or special needs we should be aware of"
            />
          </div>

          {/* Photo Consent */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="photoConsent"
              name="photoConsent"
              checked={formData.photoConsent}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="photoConsent" className="text-sm text-gray-700">
              I consent to photos of my child being taken and used for school-related purposes
              (newsletters, website, social media, etc.)
            </label>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/parent/students"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
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
                Registering...
              </>
            ) : (
              'Register Student'
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. Your registration will be reviewed by an administrator</li>
          <li>2. Once approved, your child will be admitted to the school</li>
          <li>3. An administrator will then assign your child to a class</li>
          <li>4. You will see the status update on the Students page</li>
        </ul>
      </div>
    </div>
  );
}
