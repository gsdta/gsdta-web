/**
 * Volunteer types for the UI
 */

export type VolunteerType = 'high_school' | 'parent' | 'community';
export type VolunteerStatus = 'active' | 'inactive';

export interface VolunteerClassAssignment {
  classId: string;
  className: string;
  gradeId: string;
  gradeName?: string;
  assignedAt: string;
  assignedBy: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface HoursLogEntry {
  date: string;
  hours: number;
  classId?: string;
  notes?: string;
  verifiedBy?: string;
}

export interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  type: VolunteerType;
  school?: string;
  gradeLevel?: string;
  parentId?: string;
  studentIds?: string[];
  classAssignments: VolunteerClassAssignment[];
  availableDays?: string[];
  availableTimes?: string[];
  status: VolunteerStatus;
  academicYear: string;
  emergencyContact?: EmergencyContact;
  notes?: string;
  totalHours?: number;
  hoursLog?: HoursLogEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateVolunteerInput {
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
  emergencyContact?: EmergencyContact;
  notes?: string;
}

export interface UpdateVolunteerInput {
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
  emergencyContact?: EmergencyContact;
  status?: VolunteerStatus;
  notes?: string;
}

export interface VolunteerListFilters {
  type?: VolunteerType;
  status?: VolunteerStatus | 'all';
  classId?: string;
  academicYear?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface VolunteerListResponse {
  volunteers: Volunteer[];
  total: number;
}

export const VOLUNTEER_TYPES: { value: VolunteerType; label: string }[] = [
  { value: 'high_school', label: 'High School Volunteer' },
  { value: 'parent', label: 'Parent Volunteer' },
  { value: 'community', label: 'Community Volunteer' },
];

export const GRADE_LEVELS = ['9th', '10th', '11th', '12th'];

export const DAYS_OF_WEEK = ['Saturday', 'Sunday'];

export const CURRENT_ACADEMIC_YEAR = '2025-2026';

export function getVolunteerTypeLabel(type: VolunteerType): string {
  return VOLUNTEER_TYPES.find((t) => t.value === type)?.label || type;
}
