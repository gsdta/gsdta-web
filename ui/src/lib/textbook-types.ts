/**
 * Textbook types for the UI
 */

export type TextbookType = 'textbook' | 'homework' | 'combined';
export type TextbookStatus = 'active' | 'inactive';

export interface Textbook {
  id: string;
  gradeId: string;
  gradeName?: string;
  itemNumber: string;
  name: string;
  type: TextbookType;
  semester?: string;
  pageCount: number;
  copies: number;
  unitCost?: number;
  academicYear: string;
  status: TextbookStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateTextbookInput {
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

export interface UpdateTextbookInput {
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

export interface TextbookListFilters {
  gradeId?: string;
  type?: TextbookType;
  academicYear?: string;
  status?: TextbookStatus | 'all';
  limit?: number;
  offset?: number;
}

export interface TextbookListResponse {
  textbooks: Textbook[];
  total: number;
}

export const TEXTBOOK_TYPES: { value: TextbookType; label: string }[] = [
  { value: 'textbook', label: 'Textbook' },
  { value: 'homework', label: 'Homework' },
  { value: 'combined', label: 'Combined' },
];

export const SEMESTERS = ['First', 'Second', 'Third', 'Fourth'];

export const CURRENT_ACADEMIC_YEAR = '2025-2026';

export function getTextbookTypeLabel(type: TextbookType): string {
  return TEXTBOOK_TYPES.find((t) => t.value === type)?.label || type;
}
