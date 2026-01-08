import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Papa from 'papaparse';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { AuthError } from '@/lib/auth';
import { bulkCreateStudents } from '@/lib/firestoreStudents';
import type {
  CsvStudentRow,
  ValidatedStudentData,
  BulkImportRowError,
  BulkImportFieldError,
} from '@/types/bulkImport';
import {
  CSV_COLUMNS,
  parseGender,
  parseBoolean,
  isValidDateFormat,
  isValidEmail,
} from '@/types/bulkImport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CORS helpers
function isDev() {
  return process.env.NODE_ENV !== 'production';
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (isDev()) {
    if (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.match(/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
      return origin;
    }
    return null;
  }
  const prodAllowed = new Set<string>([
    'https://gsdta.com',
    'https://www.gsdta.com',
    'https://app.gsdta.com',
    'https://app.qa.gsdta.com',
  ]);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function jsonResponse(data: unknown, status: number, origin: string | null) {
  const res = NextResponse.json(data, { status });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonError(status: number, code: string, message: string, origin: string | null) {
  return jsonResponse({ success: false, code, message }, status, origin);
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// Request body schema
const bulkImportRequestSchema = z.object({
  csvData: z.string().min(1, 'CSV data is required'),
  dryRun: z.boolean().optional().default(false),
  createParents: z.boolean().optional().default(false),
});

/**
 * Validate a single CSV row and return validated data or errors
 */
function validateRow(
  row: CsvStudentRow,
  rowIndex: number
): { data: ValidatedStudentData } | { errors: BulkImportRowError } {
  const fieldErrors: BulkImportFieldError[] = [];

  // Required fields
  if (!row.firstName?.trim()) {
    fieldErrors.push({
      field: 'firstName',
      value: row.firstName || '',
      message: 'First name is required',
    });
  }

  if (!row.lastName?.trim()) {
    fieldErrors.push({
      field: 'lastName',
      value: row.lastName || '',
      message: 'Last name is required',
    });
  }

  if (!row.dateOfBirth?.trim()) {
    fieldErrors.push({
      field: 'dateOfBirth',
      value: row.dateOfBirth || '',
      message: 'Date of birth is required',
    });
  } else if (!isValidDateFormat(row.dateOfBirth.trim())) {
    fieldErrors.push({
      field: 'dateOfBirth',
      value: row.dateOfBirth,
      message: 'Date of birth must be in YYYY-MM-DD format',
    });
  }

  if (!row.parentEmail?.trim()) {
    fieldErrors.push({
      field: 'parentEmail',
      value: row.parentEmail || '',
      message: 'Parent email is required',
    });
  } else if (!isValidEmail(row.parentEmail.trim())) {
    fieldErrors.push({
      field: 'parentEmail',
      value: row.parentEmail,
      message: 'Invalid email format',
    });
  }

  // Validate optional gender if provided
  const gender = parseGender(row.gender);
  if (row.gender?.trim() && !gender) {
    fieldErrors.push({
      field: 'gender',
      value: row.gender,
      message: 'Gender must be Boy, Girl, Other, M, F, Male, or Female',
    });
  }

  // If there are errors, return them
  if (fieldErrors.length > 0) {
    return {
      errors: {
        row: rowIndex + 1, // 1-indexed for display
        errors: fieldErrors,
      },
    };
  }

  // Build validated data
  const validatedData: ValidatedStudentData = {
    firstName: row.firstName!.trim(),
    lastName: row.lastName!.trim(),
    dateOfBirth: row.dateOfBirth!.trim(),
    parentEmail: row.parentEmail!.trim().toLowerCase(),
    gender,
    grade: row.grade?.trim(),
    schoolName: row.schoolName?.trim(),
    schoolDistrict: row.schoolDistrict?.trim(),
    priorTamilLevel: row.priorTamilLevel?.trim(),
    enrollingGrade: row.enrollingGrade?.trim(),
    medicalNotes: row.medicalNotes?.trim(),
    photoConsent: parseBoolean(row.photoConsent),
  };

  // Build address if any field is provided
  if (row.street?.trim() || row.city?.trim() || row.zipCode?.trim()) {
    validatedData.address = {
      street: row.street?.trim(),
      city: row.city?.trim(),
      zipCode: row.zipCode?.trim(),
    };
  }

  // Build contacts if any field is provided
  const hasMotherContact = row.motherName?.trim() || row.motherEmail?.trim() || row.motherPhone?.trim();
  const hasFatherContact = row.fatherName?.trim() || row.fatherEmail?.trim() || row.fatherPhone?.trim();

  if (hasMotherContact || hasFatherContact) {
    validatedData.contacts = {};

    if (hasMotherContact) {
      validatedData.contacts.mother = {
        name: row.motherName?.trim(),
        email: row.motherEmail?.trim(),
        phone: row.motherPhone?.trim(),
        employer: row.motherEmployer?.trim(),
      };
    }

    if (hasFatherContact) {
      validatedData.contacts.father = {
        name: row.fatherName?.trim(),
        email: row.fatherEmail?.trim(),
        phone: row.fatherPhone?.trim(),
        employer: row.fatherEmployer?.trim(),
      };
    }
  }

  return { data: validatedData };
}

/**
 * @swagger
 * /api/v1/admin/students/bulk-import:
 *   post:
 *     summary: Bulk import students from CSV
 *     description: |
 *       Import multiple students from CSV data. Requires admin role.
 *
 *       Required CSV columns: firstName, lastName, dateOfBirth (YYYY-MM-DD), parentEmail
 *
 *       Optional columns: gender, grade, schoolName, schoolDistrict, priorTamilLevel,
 *       enrollingGrade, street, city, zipCode, motherName, motherEmail, motherPhone,
 *       motherEmployer, fatherName, fatherEmail, fatherPhone, fatherEmployer,
 *       medicalNotes, photoConsent
 *     tags:
 *       - Admin - Students
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - csvData
 *             properties:
 *               csvData:
 *                 type: string
 *                 description: Raw CSV content
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: If true, validate only without creating records
 *               createParents:
 *                 type: boolean
 *                 default: false
 *                 description: If true, create placeholder parent accounts for unknown emails
 *     responses:
 *       200:
 *         description: Import completed
 *       400:
 *         description: Invalid request or validation errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const authz = req.headers.get('authorization');

  try {
    // Require admin role
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Students');

    // Parse request body
    const body = await req.json();
    const parseResult = bulkImportRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return jsonError(
        400,
        'INVALID_REQUEST',
        parseResult.error.issues.map((e: { message: string }) => e.message).join(', '),
        origin
      );
    }

    const { csvData, dryRun, createParents } = parseResult.data;

    // Parse CSV
    const parseResponse = Papa.parse<CsvStudentRow>(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResponse.errors.length > 0) {
      const csvErrors = parseResponse.errors
        .slice(0, 5) // Limit to first 5 errors
        .map((e) => `Row ${e.row}: ${e.message}`)
        .join('; ');
      return jsonError(400, 'CSV_PARSE_ERROR', `CSV parsing failed: ${csvErrors}`, origin);
    }

    const rows = parseResponse.data;

    if (rows.length === 0) {
      return jsonError(400, 'EMPTY_CSV', 'CSV contains no data rows', origin);
    }

    // Validate column headers
    const headers = parseResponse.meta.fields || [];
    const missingRequired = CSV_COLUMNS.required.filter((col) => !headers.includes(col));

    if (missingRequired.length > 0) {
      return jsonError(
        400,
        'MISSING_COLUMNS',
        `Missing required columns: ${missingRequired.join(', ')}`,
        origin
      );
    }

    // Validate each row
    const validatedStudents: ValidatedStudentData[] = [];
    const validationErrors: BulkImportRowError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const result = validateRow(rows[i], i);
      if ('data' in result) {
        validatedStudents.push(result.data);
      } else {
        validationErrors.push(result.errors);
      }
    }

    // If dry run, return validation results only
    if (dryRun) {
      return jsonResponse(
        {
          success: true,
          dryRun: true,
          total: rows.length,
          valid: validatedStudents.length,
          invalid: validationErrors.length,
          errors: validationErrors,
          message: validationErrors.length === 0
            ? 'All rows are valid and ready for import'
            : `${validationErrors.length} row(s) have validation errors`,
        },
        200,
        origin
      );
    }

    // If there are validation errors, return them without importing
    if (validationErrors.length > 0) {
      return jsonResponse(
        {
          success: false,
          code: 'VALIDATION_ERRORS',
          message: `${validationErrors.length} row(s) have validation errors. Fix errors and retry.`,
          total: rows.length,
          valid: validatedStudents.length,
          invalid: validationErrors.length,
          errors: validationErrors,
        },
        400,
        origin
      );
    }

    // Perform bulk import
    const importResult = await bulkCreateStudents(validatedStudents, createParents);

    return jsonResponse(
      {
        ...importResult,
        allSucceeded: importResult.failed === 0,
        message:
          importResult.failed === 0
            ? `Successfully imported ${importResult.success} student(s)`
            : `Imported ${importResult.success} student(s), ${importResult.failed} failed`,
      },
      importResult.failed === 0 ? 200 : 207, // 207 Multi-Status for partial success
      origin
    );
  } catch (error) {
    console.error('Bulk import error:', error);

    if (error instanceof AuthError) {
      return jsonError(error.status, error.code, error.message, origin);
    }

    return jsonError(
      500,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      origin
    );
  }
}
