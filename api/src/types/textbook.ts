import { Timestamp } from 'firebase-admin/firestore';

/**
 * Textbook type (textbook, homework, or combined)
 */
export type TextbookType = 'textbook' | 'homework' | 'combined';

/**
 * Textbook status
 */
export type TextbookStatus = 'active' | 'inactive';

/**
 * Full Textbook record as stored in Firestore
 */
export interface Textbook {
  id: string;

  // Reference to grade
  gradeId: string;                  // Reference to grades collection (e.g., "ps-1", "grade-5")
  gradeName?: string;               // Denormalized grade name

  // Textbook info
  itemNumber: string;               // e.g., "#910131"
  name: string;                     // e.g., "Mazhalai Textbook & HW First Semester"
  type: TextbookType;               // textbook, homework, or combined
  semester?: string;                // e.g., "First", "Second", "Third"

  // Physical properties
  pageCount: number;

  // Inventory
  copies: number;                   // Number of copies available
  unitCost?: number;                // Cost per unit

  // Academic year
  academicYear: string;             // e.g., "2025-2026"

  // Status
  status: TextbookStatus;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;               // Admin UID who created
}

/**
 * DTO for creating a new textbook
 */
export interface CreateTextbookDto {
  gradeId: string;
  itemNumber: string;
  name: string;
  type: TextbookType;
  semester?: string;
  pageCount: number;
  copies: number;
  unitCost?: number;
  academicYear: string;
}

/**
 * DTO for updating a textbook
 */
export interface UpdateTextbookDto {
  gradeId?: string;
  itemNumber?: string;
  name?: string;
  type?: TextbookType;
  semester?: string;
  pageCount?: number;
  copies?: number;
  unitCost?: number;
  academicYear?: string;
  status?: TextbookStatus;
}

/**
 * Textbook list query filters
 */
export interface TextbookListFilters {
  gradeId?: string;                 // Filter by grade
  type?: TextbookType;              // Filter by type
  academicYear?: string;            // Filter by academic year
  status?: TextbookStatus | 'all';
  limit?: number;
  offset?: number;
}

/**
 * Textbook list response
 */
export interface TextbookListResponse {
  textbooks: Textbook[];
  total: number;
}

/**
 * Textbook inventory update DTO
 */
export interface UpdateInventoryDto {
  copies: number;
  reason?: string;                  // Reason for inventory change
}

/**
 * Textbook assignment to a student (for tracking distribution)
 */
export interface TextbookAssignment {
  id: string;
  textbookId: string;
  textbookName: string;             // Denormalized
  studentId: string;
  studentName: string;              // Denormalized
  classId?: string;
  className?: string;               // Denormalized
  assignedAt: Timestamp;
  assignedBy: string;               // Admin/teacher UID
  returnedAt?: Timestamp;
  returnedTo?: string;              // Admin/teacher UID who received
  condition?: 'new' | 'good' | 'fair' | 'poor';
  notes?: string;
}
