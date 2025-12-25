import { z } from 'zod';

/**
 * Status workflow for students:
 * pending → admitted → active → inactive/withdrawn
 */
export type StudentStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'withdrawn';

/**
 * Gender options for students
 */
export type Gender = 'Boy' | 'Girl' | 'Other';

/**
 * Parent/Guardian contact information
 */
export interface ParentContact {
  name?: string;
  email?: string;
  phone?: string;
  employer?: string;
}

/**
 * Both parents' contact information
 */
export interface StudentContacts {
  mother?: ParentContact;
  father?: ParentContact;
}

/**
 * Student address information
 */
export interface StudentAddress {
  street?: string;
  city?: string;
  zipCode?: string;
}

/**
 * Common school districts in San Diego area
 */
export const COMMON_SCHOOL_DISTRICTS = [
  'Poway Unified School District',
  'San Diego Unified School District',
  'San Dieguito Union High School District',
  'Carlsbad Unified School District',
  'Solana Beach School District',
  'Temecula Valley Unified School District',
  'Del Mar Union School District',
  'Encinitas Union School District',
  'Rancho Santa Fe School District',
  'Other',
] as const;

/**
 * Gender options for dropdown
 */
export const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'Boy', label: 'Boy' },
  { value: 'Girl', label: 'Girl' },
  { value: 'Other', label: 'Other / Prefer not to say' },
];

/**
 * Schema for parent contact
 */
const parentContactSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email().max(200).optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  employer: z.string().max(200).optional(),
}).optional();

/**
 * Schema for student address
 */
const addressSchema = z.object({
  street: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  zipCode: z.string().max(10).optional(),
}).optional();

/**
 * Schema for creating a new student (parent registration)
 */
export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  gender: z.enum(['Boy', 'Girl', 'Other']).optional(),
  grade: z.string().max(50).optional(),
  schoolName: z.string().max(200).optional(),
  schoolDistrict: z.string().max(200).optional(),
  priorTamilLevel: z.string().max(50).optional(),
  enrollingGrade: z.string().max(50).optional(),
  address: addressSchema,
  contacts: z.object({
    mother: parentContactSchema,
    father: parentContactSchema,
  }).optional(),
  medicalNotes: z.string().max(1000).optional(),
  photoConsent: z.boolean().default(false),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/**
 * Schema for updating a student (parent can update if pending/admitted)
 */
export const updateStudentSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['Boy', 'Girl', 'Other']).optional(),
  grade: z.string().max(50).optional(),
  schoolName: z.string().max(200).optional(),
  schoolDistrict: z.string().max(200).optional(),
  priorTamilLevel: z.string().max(50).optional(),
  enrollingGrade: z.string().max(50).optional(),
  address: addressSchema,
  contacts: z.object({
    mother: parentContactSchema,
    father: parentContactSchema,
  }).optional(),
  medicalNotes: z.string().max(1000).optional(),
  photoConsent: z.boolean().optional(),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

/**
 * Full student type as returned from the API
 */
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth: string;
  gender?: Gender;
  parentId?: string;
  parentEmail?: string;
  contacts?: StudentContacts;
  address?: StudentAddress;
  grade?: string;
  schoolName?: string;
  schoolDistrict?: string;
  priorTamilLevel?: string;
  enrollingGrade?: string;
  medicalNotes?: string;
  photoConsent: boolean;
  classId?: string;
  className?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  admittedAt?: string;
  admittedBy?: string;
  notes?: string;
}

/**
 * Simplified student view for list displays
 */
export interface StudentListItem {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth: string;
  gender?: Gender;
  grade?: string;
  schoolName?: string;
  schoolDistrict?: string;
  enrollingGrade?: string;
  classId?: string;
  className?: string;
  status: StudentStatus;
  createdAt: string;
}

/**
 * Student status counts for admin dashboard
 */
export interface StudentStatusCounts {
  pending: number;
  admitted: number;
  active: number;
  inactive: number;
  withdrawn: number;
}

/**
 * Default values for new student form
 */
export const newStudentDefaults: CreateStudentInput = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: undefined,
  grade: '',
  schoolName: '',
  schoolDistrict: '',
  priorTamilLevel: '',
  enrollingGrade: '',
  address: {
    street: '',
    city: '',
    zipCode: '',
  },
  contacts: {
    mother: {
      name: '',
      email: '',
      phone: '',
      employer: '',
    },
    father: {
      name: '',
      email: '',
      phone: '',
      employer: '',
    },
  },
  medicalNotes: '',
  photoConsent: false,
};

/**
 * Tamil proficiency level options for dropdown
 */
export const tamilLevelOptions = [
  { value: '', label: 'Select level (optional)' },
  { value: 'none', label: 'No prior experience' },
  { value: 'beginner', label: 'Beginner - Can read basic letters' },
  { value: 'intermediate', label: 'Intermediate - Can read and write simple sentences' },
  { value: 'advanced', label: 'Advanced - Can read and write fluently' },
];

/**
 * Status display configuration
 */
export const statusConfig: Record<StudentStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending Review', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  admitted: { label: 'Admitted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  active: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100' },
  inactive: { label: 'Inactive', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  withdrawn: { label: 'Withdrawn', color: 'text-red-700', bgColor: 'bg-red-100' },
};

// Backwards compatibility - keep old schema name
export const studentSchema = createStudentSchema;
