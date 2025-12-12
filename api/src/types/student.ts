import { Timestamp } from 'firebase-admin/firestore';

/**
 * Status workflow for students:
 * pending → admitted → active → inactive/withdrawn
 */
export type StudentStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'withdrawn';

/**
 * Full Student record as stored in Firestore
 */
export interface Student {
  id: string;

  // Core Info (parent provides)
  firstName: string;
  lastName: string;
  dateOfBirth: string;              // ISO format YYYY-MM-DD

  // Parent Relationship
  parentId: string;                 // Parent's user UID
  parentEmail?: string;             // Denormalized for admin convenience

  // Academic Info
  grade?: string;                   // e.g., "5th Grade"
  schoolName?: string;              // Regular school name
  priorTamilLevel?: string;         // Previous Tamil learning level

  // Class Assignment (admin sets)
  classId?: string;                 // Assigned class ID
  className?: string;               // Denormalized class name

  // Medical/Safety
  medicalNotes?: string;
  photoConsent: boolean;

  // Status Management
  status: StudentStatus;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  admittedAt?: Timestamp;           // When admin admitted
  admittedBy?: string;              // Admin UID who admitted

  // Notes (admin only)
  notes?: string;
}

/**
 * DTO for creating a new student (parent registration)
 */
export interface CreateStudentDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;              // ISO format YYYY-MM-DD
  grade?: string;
  schoolName?: string;
  priorTamilLevel?: string;
  medicalNotes?: string;
  photoConsent?: boolean;
}

/**
 * DTO for updating a student (parent can update if pending/admitted)
 */
export interface UpdateStudentDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  grade?: string;
  schoolName?: string;
  priorTamilLevel?: string;
  medicalNotes?: string;
  photoConsent?: boolean;
}

/**
 * DTO for admin updating a student
 */
export interface AdminUpdateStudentDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  grade?: string;
  schoolName?: string;
  priorTamilLevel?: string;
  medicalNotes?: string;
  photoConsent?: boolean;
  status?: StudentStatus;
  classId?: string;
  className?: string;
  notes?: string;
}

/**
 * DTO for assigning a class to a student
 */
export interface AssignClassDto {
  classId: string;
  className: string;
}

/**
 * Student list query filters
 */
export interface StudentListFilters {
  status?: StudentStatus | 'all';
  search?: string;                  // Search by name
  parentId?: string;                // Filter by parent
  classId?: string;                 // Filter by class
  limit?: number;
  offset?: number;
}

/**
 * Student list response with pagination
 */
export interface StudentListResponse {
  students: Student[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Simplified student view for parent's student list
 */
export interface LinkedStudentView {
  id: string;
  firstName: string;
  lastName: string;
  name: string;                     // Computed: firstName + lastName
  dateOfBirth: string;
  grade?: string;
  schoolName?: string;
  priorTamilLevel?: string;
  classId?: string;
  className?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}
