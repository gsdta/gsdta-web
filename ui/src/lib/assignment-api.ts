/**
 * Assignments & Gradebook API client
 */
import { apiFetch } from './api-client';

// Types
export type AssignmentType = 'homework' | 'quiz' | 'test' | 'project' | 'classwork' | 'participation';
export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface Assignment {
  id: string;
  classId: string;
  className: string;
  title: string;
  description?: string;
  type: AssignmentType;
  status: AssignmentStatus;
  maxPoints: number;
  weight?: number;
  assignedDate: string;
  dueDate: string;
  createdBy: string;
  createdByName: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  type: AssignmentType;
  maxPoints: number;
  weight?: number;
  assignedDate: string;
  dueDate: string;
  status?: AssignmentStatus;
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  type?: AssignmentType;
  maxPoints?: number;
  weight?: number;
  assignedDate?: string;
  dueDate?: string;
  status?: AssignmentStatus;
}

export interface StudentGrade {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  pointsEarned: number;
  maxPoints: number;
  percentage: number;
  letterGrade: string;
  feedback?: string;
  gradedBy: string;
  gradedByName: string;
  gradedAt: string;
  lastEditedBy?: string;
  lastEditedByName?: string;
  lastEditedAt?: string;
}

export interface GradeInput {
  studentId: string;
  pointsEarned: number;
  feedback?: string;
}

export interface GradesResponse {
  grades: StudentGrade[];
  stats: {
    gradedCount: number;
    totalStudents: number;
    averageScore: number;
    averagePercentage: number;
    highScore: number;
    lowScore: number;
  };
}

export interface GradebookAssignment {
  id: string;
  title: string;
  type: AssignmentType;
  maxPoints: number;
  dueDate: string;
}

export interface GradebookStudent {
  studentId: string;
  studentName: string;
  grades: Record<string, StudentGrade | null>;
  averagePercentage: number;
  letterGrade: string;
  totalPoints: number;
  maxPoints: number;
}

export interface GradebookResponse {
  classId: string;
  className: string;
  assignments: GradebookAssignment[];
  students: GradebookStudent[];
  classAverage: number;
}

// Assignment type labels for display
export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  homework: 'Homework',
  quiz: 'Quiz',
  test: 'Test',
  project: 'Project',
  classwork: 'Classwork',
  participation: 'Participation',
};

// Assignment status labels and colors for display
export const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  published: { label: 'Published', color: 'text-green-600', bgColor: 'bg-green-100' },
  closed: { label: 'Closed', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// API Functions

/**
 * Get all assignments for a class
 */
export async function getAssignments(
  classId: string,
  options?: { status?: AssignmentStatus }
): Promise<Assignment[]> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  const queryString = params.toString();

  const response = await apiFetch<{ success: boolean; data: { assignments: Assignment[] } }>(
    `/v1/teacher/classes/${classId}/assignments${queryString ? `?${queryString}` : ''}`
  );
  return response.data.assignments;
}

/**
 * Get a single assignment by ID
 */
export async function getAssignment(classId: string, assignmentId: string): Promise<Assignment> {
  const response = await apiFetch<{ success: boolean; data: { assignment: Assignment } }>(
    `/v1/teacher/classes/${classId}/assignments/${assignmentId}`
  );
  return response.data.assignment;
}

/**
 * Create a new assignment
 */
export async function createAssignment(
  classId: string,
  data: CreateAssignmentInput
): Promise<Assignment> {
  const response = await apiFetch<{ success: boolean; data: { assignment: Assignment } }>(
    `/v1/teacher/classes/${classId}/assignments`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  return response.data.assignment;
}

/**
 * Update an existing assignment
 */
export async function updateAssignment(
  classId: string,
  assignmentId: string,
  data: UpdateAssignmentInput
): Promise<Assignment> {
  const response = await apiFetch<{ success: boolean; data: { assignment: Assignment } }>(
    `/v1/teacher/classes/${classId}/assignments/${assignmentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
  return response.data.assignment;
}

/**
 * Delete an assignment (soft delete)
 */
export async function deleteAssignment(classId: string, assignmentId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(
    `/v1/teacher/classes/${classId}/assignments/${assignmentId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Get grades for an assignment
 */
export async function getAssignmentGrades(
  classId: string,
  assignmentId: string
): Promise<GradesResponse> {
  const response = await apiFetch<{ success: boolean; data: GradesResponse }>(
    `/v1/teacher/classes/${classId}/assignments/${assignmentId}/grades`
  );
  return response.data;
}

/**
 * Save grades for an assignment (bulk create/update)
 */
export async function saveGrades(
  classId: string,
  assignmentId: string,
  grades: GradeInput[]
): Promise<{ grades: StudentGrade[]; count: number }> {
  const response = await apiFetch<{ success: boolean; data: { grades: StudentGrade[]; count: number } }>(
    `/v1/teacher/classes/${classId}/assignments/${assignmentId}/grades`,
    {
      method: 'POST',
      body: JSON.stringify({ grades }),
    }
  );
  return response.data;
}

/**
 * Get gradebook for a class
 */
export async function getGradebook(classId: string): Promise<GradebookResponse> {
  const response = await apiFetch<{ success: boolean; data: GradebookResponse }>(
    `/v1/teacher/classes/${classId}/gradebook`
  );
  return response.data;
}

/**
 * Calculate letter grade from percentage
 */
export function calculateLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Format date for display (YYYY-MM-DD to readable format)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
