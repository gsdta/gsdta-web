import { Timestamp } from 'firebase-admin/firestore';

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
 * Student address information
 */
export interface StudentAddress {
  street?: string;
  city?: string;
  zipCode?: string;
}

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
 * Full Student record as stored in Firestore
 */
export interface Student {
  id: string;

  // Core Info (parent provides)
  firstName: string;
  lastName: string;
  dateOfBirth: string;              // ISO format YYYY-MM-DD
  gender?: Gender;                  // Boy, Girl, Other

  // Parent Relationship
  parentId: string;                 // Parent's user UID
  parentEmail?: string;             // Denormalized for admin convenience

  // Extended Parent Contacts (for both parents)
  contacts?: StudentContacts;       // Mother and father contact info

  // Address
  address?: StudentAddress;         // Home address

  // Academic Info
  grade?: string;                   // e.g., "5th Grade" (public school grade)
  schoolName?: string;              // Regular school name
  schoolDistrict?: string;          // e.g., "Poway Unified School District"
  priorTamilLevel?: string;         // Previous Tamil learning level
  enrollingGrade?: string;          // Target Tamil school grade (e.g., "grade-3")

  // Class Assignment (admin sets)
  classId?: string;                 // Assigned class ID
  className?: string;               // Denormalized class name
  teacherId?: string;               // Primary teacher's user ID (denormalized)
  teacherName?: string;             // Primary teacher's name (denormalized)

  // Denormalized parent names for search
  motherName?: string;              // From contacts.mother.name (denormalized)
  fatherName?: string;              // From contacts.father.name (denormalized)

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
  gender?: Gender;
  grade?: string;
  schoolName?: string;
  schoolDistrict?: string;
  priorTamilLevel?: string;
  enrollingGrade?: string;
  address?: StudentAddress;
  contacts?: StudentContacts;
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
  gender?: Gender;
  grade?: string;
  schoolName?: string;
  schoolDistrict?: string;
  priorTamilLevel?: string;
  enrollingGrade?: string;
  address?: StudentAddress;
  contacts?: StudentContacts;
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
  gender?: Gender;
  grade?: string;
  schoolName?: string;
  schoolDistrict?: string;
  priorTamilLevel?: string;
  enrollingGrade?: string;
  address?: StudentAddress;
  contacts?: StudentContacts;
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
 * DTO for transferring a student to a different class
 */
export interface TransferClassDto {
  newClassId: string;
}

/**
 * Result of a class transfer operation
 */
export interface TransferClassResult {
  student: Student;
  previousClassId?: string;
  previousClassName?: string;
  newClassId: string;
  newClassName: string;
}

/**
 * Student list query filters
 */
export interface StudentListFilters {
  status?: StudentStatus | 'all';
  search?: string;                  // Search by name, parent email, parent names, or teacher name
  parentId?: string;                // Filter by parent
  classId?: string;                 // Filter by class
  teacherId?: string;               // Filter by teacher (primary teacher of assigned class)
  enrollingGrade?: string;          // Filter by Tamil school grade (e.g., "grade-3")
  schoolDistrict?: string;          // Filter by school district
  gender?: Gender;                  // Filter by gender
  unassigned?: boolean;             // Filter for students without a class assigned
  dateField?: 'createdAt' | 'admittedAt'; // Which date field to filter on
  dateFrom?: string;                // ISO date string for date range start
  dateTo?: string;                  // ISO date string for date range end
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
  gender?: Gender;
  grade?: string;
  schoolName?: string;
  schoolDistrict?: string;
  priorTamilLevel?: string;
  enrollingGrade?: string;
  classId?: string;
  className?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Common school districts in San Diego area
 * Used for dropdown suggestions
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
