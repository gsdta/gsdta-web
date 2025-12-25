import { Timestamp } from 'firebase-admin/firestore';

/**
 * Volunteer status
 */
export type VolunteerStatus = 'active' | 'inactive';

/**
 * Volunteer type
 * - high_school: High school student volunteers (HV)
 * - parent: Parent volunteers
 * - community: Community volunteers
 */
export type VolunteerType = 'high_school' | 'parent' | 'community';

/**
 * Class assignment for a volunteer
 */
export interface VolunteerClassAssignment {
  classId: string;
  className: string;                // Denormalized
  gradeId: string;
  gradeName?: string;               // Denormalized
  assignedAt: Timestamp;
  assignedBy: string;               // Admin UID
}

/**
 * Full Volunteer record as stored in Firestore
 * Tracks high school volunteers (HV) and other helper volunteers
 * Separate from the main teacher/assistant teacher roles
 */
export interface Volunteer {
  id: string;

  // Personal Info
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;

  // Volunteer Type
  type: VolunteerType;

  // For high school volunteers
  school?: string;                  // Their high school name
  gradeLevel?: string;              // e.g., "9th", "10th", "11th", "12th"

  // For parent volunteers
  parentId?: string;                // Link to parent user if they have an account
  studentIds?: string[];            // Their children's student IDs

  // Class assignments (can assist in multiple classes)
  classAssignments: VolunteerClassAssignment[];

  // Availability
  availableDays?: string[];         // e.g., ["Saturday"]
  availableTimes?: string[];        // e.g., ["10:00 AM - 12:00 PM"]

  // Status
  status: VolunteerStatus;
  academicYear: string;             // e.g., "2025-2026"

  // Emergency contact (for high school volunteers)
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;           // e.g., "Parent", "Guardian"
  };

  // Notes
  notes?: string;

  // Community service hours tracking (for high school volunteers)
  totalHours?: number;
  hoursLog?: Array<{
    date: string;                   // ISO date
    hours: number;
    classId?: string;
    notes?: string;
    verifiedBy?: string;            // Teacher/admin who verified
  }>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;               // Admin UID who created
}

/**
 * DTO for creating a new volunteer
 */
export interface CreateVolunteerDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  type: VolunteerType;
  school?: string;
  gradeLevel?: string;
  parentId?: string;
  studentIds?: string[];
  availableDays?: string[];
  availableTimes?: string[];
  academicYear: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
}

/**
 * DTO for updating a volunteer
 */
export interface UpdateVolunteerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  type?: VolunteerType;
  school?: string;
  gradeLevel?: string;
  parentId?: string;
  studentIds?: string[];
  availableDays?: string[];
  availableTimes?: string[];
  academicYear?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  status?: VolunteerStatus;
  notes?: string;
}

/**
 * DTO for assigning a volunteer to a class
 */
export interface AssignVolunteerToClassDto {
  classId: string;
}

/**
 * DTO for logging volunteer hours
 */
export interface LogVolunteerHoursDto {
  date: string;                     // ISO date
  hours: number;
  classId?: string;
  notes?: string;
}

/**
 * Volunteer list query filters
 */
export interface VolunteerListFilters {
  type?: VolunteerType;
  status?: VolunteerStatus | 'all';
  classId?: string;                 // Filter by assigned class
  academicYear?: string;
  search?: string;                  // Search by name
  limit?: number;
  offset?: number;
}

/**
 * Volunteer list response
 */
export interface VolunteerListResponse {
  volunteers: Volunteer[];
  total: number;
}

/**
 * Simplified volunteer view for class rosters
 */
export interface VolunteerView {
  id: string;
  firstName: string;
  lastName: string;
  name: string;                     // Computed: firstName + lastName
  type: VolunteerType;
  typeLabel: string;                // Human-readable type (e.g., "High School Volunteer")
  email?: string;
  phone?: string;
  status: VolunteerStatus;
}
