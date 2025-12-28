import { z } from 'zod';

// Address schema for profile
export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(1, 'ZIP code is required'),
  country: z.string().optional(),
});

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
});

// Profile update payload schema
export const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: addressSchema.optional(),
  preferredLanguage: z.enum(['en', 'ta']).optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
});

// TypeScript types derived from schemas
export type Address = z.infer<typeof addressSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;

// User profile type (response from API)
export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  status: string;
  phone?: string;
  address?: Address;
  preferredLanguage?: 'en' | 'ta';
  notificationPreferences?: NotificationPreferences;
  emailVerified?: boolean;
};

// Linked student type
export type LinkedStudent = {
  id: string;
  name: string;
  grade?: string;
  schoolName?: string;
  enrollmentDate?: string;
  status: string;
};

// API response types
export type ProfileResponse = UserProfile;

export type StudentsResponse = {
  success: boolean;
  data: {
    students: LinkedStudent[];
  };
};

// Profile completion validation schema
// Required fields for a complete parent profile
export const requiredProfileFieldsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: addressSchema,
});

/**
 * Check if a parent profile has all required fields completed.
 * Required: firstName, lastName, phone, and full address (street, city, state, zip)
 */
export function isProfileComplete(profile: Partial<UserProfile>): boolean {
  const result = requiredProfileFieldsSchema.safeParse({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    address: profile.address,
  });
  return result.success;
}

/**
 * Get list of missing required fields for profile completion
 */
export function getMissingProfileFields(profile: Partial<UserProfile>): string[] {
  const missing: string[] = [];

  if (!profile.firstName || profile.firstName.trim().length === 0) {
    missing.push('firstName');
  }
  if (!profile.lastName || profile.lastName.trim().length === 0) {
    missing.push('lastName');
  }
  if (!profile.phone || profile.phone.trim().length < 10) {
    missing.push('phone');
  }
  if (!profile.address?.street || profile.address.street.trim().length === 0) {
    missing.push('address.street');
  }
  if (!profile.address?.city || profile.address.city.trim().length === 0) {
    missing.push('address.city');
  }
  if (!profile.address?.state || profile.address.state.trim().length === 0) {
    missing.push('address.state');
  }
  if (!profile.address?.zip || profile.address.zip.trim().length === 0) {
    missing.push('address.zip');
  }

  return missing;
}
