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
