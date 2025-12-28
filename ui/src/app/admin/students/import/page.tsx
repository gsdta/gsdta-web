'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminBulkImportStudents, BulkImportResult, BulkImportRowError } from '@/lib/student-api';

type ImportStep = 'upload' | 'preview' | 'importing' | 'results';

const CSV_TEMPLATE_HEADERS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'parentEmail',
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
];

const REQUIRED_COLUMNS = ['firstName', 'lastName', 'dateOfBirth', 'parentEmail'];

export default function ImportStudentsPage() {
  const { getIdToken } = useAuth();
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [createParents, setCreateParents] = useState(false);
  const [validationResult, setValidationResult] = useState<BulkImportResult | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      setFileName(file.name);
      setError(null);

      // Parse for preview
      const lines = content.split('\n').filter((line) => line.trim());
      if (lines.length < 2) {
        setError('CSV must have at least a header row and one data row');
        return;
      }

      const headerRow = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      setHeaders(headerRow);

      // Check for required columns
      const missingColumns = REQUIRED_COLUMNS.filter((col) => !headerRow.includes(col));
      if (missingColumns.length > 0) {
        setError(`Missing required columns: ${missingColumns.join(', ')}`);
        return;
      }

      // Parse preview rows (up to 5)
      const dataRows = lines.slice(1, 6).map((line) => {
        // Simple CSV parsing (doesn't handle quoted commas, but good enough for preview)
        return line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
      });
      setPreviewRows(dataRows);

      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  const handleValidate = async () => {
    setIsValidating(true);
    setError(null);

    try {
      const result = await adminBulkImportStudents(getIdToken, {
        csvData,
        dryRun: true,
        createParents,
      });
      setValidationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setError(null);

    try {
      const result = await adminBulkImportStudents(getIdToken, {
        csvData,
        dryRun: false,
        createParents,
      });
      setImportResult(result);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('preview');
    }
  };

  const handleReset = () => {
    setCsvData('');
    setFileName('');
    setPreviewRows([]);
    setHeaders([]);
    setValidationResult(null);
    setImportResult(null);
    setError(null);
    setStep('upload');
  };

  const downloadTemplate = () => {
    const content = CSV_TEMPLATE_HEADERS.join(',') + '\n' +
      'John,Doe,2015-05-15,parent@example.com,Boy,5th Grade,Lincoln Elementary,Poway Unified,Beginner,grade-3,123 Main St,San Diego,92127,Jane Doe,jane@example.com,555-1234,Google,John Doe Sr,johnd@example.com,555-5678,Apple,None,yes';
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin/students" className="hover:text-gray-700">
            Students
          </Link>
          <span>/</span>
          <span>Import</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Import Students from CSV</h1>
        <p className="mt-2 text-gray-600">
          Upload a CSV file to bulk import students. Required columns: firstName, lastName, dateOfBirth (YYYY-MM-DD), parentEmail
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <button
              onClick={downloadTemplate}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Download CSV Template
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Select CSV File
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">or drag and drop</p>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">File Preview</h2>
                <p className="text-sm text-gray-500">{fileName} - {previewRows.length} rows shown</p>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Upload Different File
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header, idx) => (
                      <th
                        key={idx}
                        className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                          REQUIRED_COLUMNS.includes(header)
                            ? 'text-blue-700 bg-blue-50'
                            : 'text-gray-500'
                        }`}
                      >
                        {header}
                        {REQUIRED_COLUMNS.includes(header) && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                          {cell || <span className="text-gray-400">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import Options</h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={createParents}
                onChange={(e) => setCreateParents(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Create placeholder parent accounts for unknown emails
              </span>
            </label>
            <p className="mt-1 ml-6 text-xs text-gray-500">
              If unchecked, rows with unrecognized parent emails will fail.
            </p>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className={`rounded-lg border p-6 ${
              validationResult.invalid === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <h3 className="text-lg font-medium mb-2">
                {validationResult.invalid === 0 ? 'Validation Passed' : 'Validation Issues Found'}
              </h3>
              <p className="text-sm">
                {validationResult.valid} valid rows, {validationResult.invalid} invalid rows
              </p>
              {validationResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Errors:</h4>
                  <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {validationResult.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx} className="text-red-700">
                        Row {err.row}: {err.errors.map((e) => `${e.field}: ${e.message}`).join(', ')}
                      </li>
                    ))}
                    {validationResult.errors.length > 10 && (
                      <li className="text-gray-500">...and {validationResult.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </button>
            <button
              onClick={handleImport}
              disabled={!validationResult || (validationResult.invalid ?? 0) > 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import Students
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Importing students...</p>
          <p className="mt-2 text-sm text-gray-500">This may take a moment</p>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && importResult && (
        <div className="space-y-6">
          <div className={`rounded-lg border p-6 ${
            importResult.failed === 0
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <h2 className="text-xl font-medium mb-4">
              {importResult.failed === 0 ? 'Import Successful!' : 'Import Completed with Issues'}
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-gray-500">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{importResult.failed}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">{importResult.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </div>
            <p className="text-sm text-gray-600">{importResult.message}</p>
          </div>

          {/* Warnings */}
          {importResult.warnings.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Notices</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                {importResult.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Created Parents */}
          {importResult.createdParents.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Parent Accounts Created ({importResult.createdParents.length})
              </h3>
              <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                {importResult.createdParents.join(', ')}
              </div>
            </div>
          )}

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-red-700 mb-2">
                Failed Rows ({importResult.errors.length})
              </h3>
              <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row}: {err.errors.map((e) => `${e.field}: ${e.message}`).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Imported Students */}
          {importResult.students.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Imported Students ({importResult.students.length})
              </h3>
              <div className="overflow-x-auto max-h-60">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parent Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importResult.students.slice(0, 20).map((student) => (
                      <tr key={student.id}>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">{student.parentEmail}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importResult.students.length > 20 && (
                  <p className="text-sm text-gray-500 mt-2 px-3">
                    ...and {importResult.students.length - 20} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Import More
            </button>
            <Link
              href="/admin/students"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              View All Students
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
