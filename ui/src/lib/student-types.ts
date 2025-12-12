import { z } from 'zod';

/**
 * Status workflow for students:
 * pending → admitted → active → inactive/withdrawn
 */
export type StudentStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'withdrawn';

/**
 * Schema for creating a new student (parent registration)
 */
export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  grade: z.string().max(50).optional(),
  schoolName: z.string().max(200).optional(),
  priorTamilLevel: z.string().max(50).optional(),
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
  grade: z.string().max(50).optional(),
  schoolName: z.string().max(200).optional(),
  priorTamilLevel: z.string().max(50).optional(),
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
  parentId?: string;
  parentEmail?: string;
  grade?: string;
  schoolName?: string;
  priorTamilLevel?: string;
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
  grade?: string;
  schoolName?: string;
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
  grade: '',
  schoolName: '',
  priorTamilLevel: '',
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
