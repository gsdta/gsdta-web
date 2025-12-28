import type { Gender, StudentStatus, StudentAddress, StudentContacts } from './student';

/**
 * CSV row structure for student import
 * Maps to flat CSV columns
 */
export interface CsvStudentRow {
  // Required fields
  firstName: string;
  lastName: string;
  dateOfBirth: string;        // YYYY-MM-DD format
  parentEmail: string;        // Parent's email to link student

  // Optional student info
  gender?: string;            // 'Boy', 'Girl', 'Other'
  grade?: string;             // Public school grade
  schoolName?: string;
  schoolDistrict?: string;
  priorTamilLevel?: string;
  enrollingGrade?: string;    // Target Tamil school grade

  // Optional address (flat columns)
  street?: string;
  city?: string;
  zipCode?: string;

  // Optional mother contact (flat columns)
  motherName?: string;
  motherEmail?: string;
  motherPhone?: string;
  motherEmployer?: string;

  // Optional father contact (flat columns)
  fatherName?: string;
  fatherEmail?: string;
  fatherPhone?: string;
  fatherEmployer?: string;

  // Optional other fields
  medicalNotes?: string;
  photoConsent?: string;      // 'yes', 'no', 'true', 'false', '1', '0'
}

/**
 * Validated and transformed student data ready for import
 */
export interface ValidatedStudentData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  parentEmail: string;
  gender?: Gender;
  grade?: string;
  schoolName?: string;
  schoolDistrict?: string;
  priorTamilLevel?: string;
  enrollingGrade?: string;
  address?: StudentAddress;
  contacts?: StudentContacts;
  medicalNotes?: string;
  photoConsent: boolean;
}

/**
 * Error for a specific field in a row
 */
export interface BulkImportFieldError {
  field: string;
  value: string;
  message: string;
}

/**
 * Error for a specific row in the import
 */
export interface BulkImportRowError {
  row: number;              // 1-indexed row number (matching CSV row)
  errors: BulkImportFieldError[];
}

/**
 * Successfully imported student record
 */
export interface ImportedStudent {
  id: string;
  firstName: string;
  lastName: string;
  parentEmail: string;
  parentId: string;
  status: StudentStatus;
}

/**
 * Result of bulk import operation
 */
export interface BulkImportResult {
  success: number;
  failed: number;
  total: number;
  students: ImportedStudent[];
  errors: BulkImportRowError[];
  warnings: string[];         // Non-fatal issues (e.g., "Parent account created")
  createdParents: string[];   // Emails of newly created parent accounts
}

/**
 * Request body for bulk import API
 */
export interface BulkImportRequest {
  csvData: string;            // Raw CSV content
  dryRun?: boolean;           // If true, validate only without creating records
  createParents?: boolean;    // If true, create parent accounts for unknown emails
}

/**
 * CSV column names (for template and validation)
 */
export const CSV_COLUMNS = {
  required: ['firstName', 'lastName', 'dateOfBirth', 'parentEmail'] as const,
  optional: [
    'gender',
    'grade',
    'schoolName',
    'schoolDistrict',
    'priorTamilLevel',
    'enrollingGrade',
    'street',
    'city',
    'zipCode',
    'motherName',
    'motherEmail',
    'motherPhone',
    'motherEmployer',
    'fatherName',
    'fatherEmail',
    'fatherPhone',
    'fatherEmployer',
    'medicalNotes',
    'photoConsent',
  ] as const,
} as const;

/**
 * All valid CSV column names
 */
export const ALL_CSV_COLUMNS = [...CSV_COLUMNS.required, ...CSV_COLUMNS.optional] as const;

export type CsvColumnName = (typeof ALL_CSV_COLUMNS)[number];

/**
 * Valid gender values in CSV (case-insensitive)
 */
export const VALID_GENDER_VALUES = ['boy', 'girl', 'other', 'm', 'f', 'male', 'female'] as const;

/**
 * Map CSV gender values to Gender type
 */
export function parseGender(value: string | undefined): Gender | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();
  if (lower === 'boy' || lower === 'm' || lower === 'male') return 'Boy';
  if (lower === 'girl' || lower === 'f' || lower === 'female') return 'Girl';
  if (lower === 'other') return 'Other';
  return undefined;
}

/**
 * Parse boolean-like values from CSV
 */
export function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return ['yes', 'true', '1', 'y'].includes(lower);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Validate email format
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
