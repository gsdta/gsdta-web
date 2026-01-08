'use client';

import { useState } from 'react';
import { TAMIL_GRADES, COMMON_SCHOOL_DISTRICTS } from '@/lib/student-types';
import type { AdminStudentsListParams } from '@/lib/student-api';

interface AdvancedSearchPanelProps {
  filters: AdminStudentsListParams;
  onFiltersChange: (filters: AdminStudentsListParams) => void;
  onClear: () => void;
}

export function AdvancedSearchPanel({ filters, onFiltersChange, onClear }: AdvancedSearchPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.enrollingGrade ||
    filters.schoolDistrict ||
    filters.unassigned ||
    filters.dateFrom ||
    filters.dateTo;

  const activeFilterCount = [
    filters.enrollingGrade,
    filters.schoolDistrict,
    filters.unassigned,
    filters.dateFrom || filters.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="font-medium text-gray-700">Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        {hasActiveFilters && !isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Quick Filters */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Filters</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFiltersChange({ ...filters, unassigned: !filters.unassigned })}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  filters.unassigned
                    ? 'bg-orange-100 border-orange-300 text-orange-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                Unassigned to Class
              </button>
            </div>
          </div>

          {/* Filter Grid */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Grade Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamil Grade</label>
              <select
                value={filters.enrollingGrade || ''}
                onChange={(e) => onFiltersChange({ ...filters, enrollingGrade: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Grades</option>
                {TAMIL_GRADES.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>

            {/* School District Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School District</label>
              <select
                value={filters.schoolDistrict || ''}
                onChange={(e) => onFiltersChange({ ...filters, schoolDistrict: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Districts</option>
                {COMMON_SCHOOL_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Field Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Filter</label>
              <select
                value={filters.dateField || ''}
                onChange={(e) => {
                  const dateField = e.target.value as 'createdAt' | 'admittedAt' | '';
                  if (!dateField) {
                    onFiltersChange({ ...filters, dateField: undefined, dateFrom: undefined, dateTo: undefined });
                  } else {
                    onFiltersChange({ ...filters, dateField });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">No Date Filter</option>
                <option value="createdAt">Registration Date</option>
                <option value="admittedAt">Admission Date</option>
              </select>
            </div>

            {/* Placeholder for alignment when date filter is inactive */}
            {!filters.dateField && <div className="hidden lg:block" />}
          </div>

          {/* Date Range Inputs (shown when date filter is active) */}
          {filters.dateField && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClear}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
