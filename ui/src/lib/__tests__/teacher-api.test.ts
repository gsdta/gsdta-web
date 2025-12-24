/**
 * Unit tests for teacher API helper functions
 * 
 * Tests client-side helper functions used by teacher components.
 */

import {
  getTodayDateString,
  formatDateDisplay,
  getStatusColorClass,
  getStatusButtonClass,
  type AttendanceStatus,
} from '../teacher-api';

describe('getTodayDateString', () => {
  it('should return date in YYYY-MM-DD format', () => {
    const result = getTodayDateString();
    
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  
  it('should return today\'s date', () => {
    const result = getTodayDateString();
    const today = new Date();
    const expected = today.toISOString().split('T')[0];
    
    expect(result).toBe(expected);
  });
});

describe('formatDateDisplay', () => {
  it('should format date string to readable format', () => {
    const result = formatDateDisplay('2024-12-22');
    
    // Should contain month, day, year
    expect(result).toContain('2024');
    expect(result).toContain('22');
    // Should be readable (has weekday and month name)
    expect(result.length).toBeGreaterThan(15);
  });
  
  it('should handle different valid dates', () => {
    const dates = ['2024-01-01', '2024-06-15', '2024-12-31'];
    
    dates.forEach(date => {
      const result = formatDateDisplay(date);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});

describe('getStatusColorClass', () => {
  it('should return correct color for present', () => {
    const result = getStatusColorClass('present');
    
    expect(result).toContain('green');
  });
  
  it('should return correct color for absent', () => {
    const result = getStatusColorClass('absent');
    
    expect(result).toContain('red');
  });
  
  it('should return correct color for late', () => {
    const result = getStatusColorClass('late');
    
    expect(result).toContain('yellow');
  });
  
  it('should return correct color for excused', () => {
    const result = getStatusColorClass('excused');
    
    expect(result).toContain('blue');
  });
  
  it('should handle invalid status gracefully', () => {
    const result = getStatusColorClass('invalid' as AttendanceStatus);
    
    expect(result).toContain('gray');
  });
  
  it('should include Tailwind classes', () => {
    const statuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
    
    statuses.forEach(status => {
      const result = getStatusColorClass(status);
      
      // Should have bg, text, and border classes
      expect(result).toMatch(/bg-\w+-\d+/);
      expect(result).toMatch(/text-\w+-\d+/);
      expect(result).toMatch(/border-\w+-\d+/);
    });
  });
});

describe('getStatusButtonClass', () => {
  it('should return active styles when isActive is true', () => {
    const result = getStatusButtonClass('present', true);
    
    expect(result).toContain('bg-green-500');
    expect(result).toContain('text-white');
  });
  
  it('should return inactive styles when isActive is false', () => {
    const result = getStatusButtonClass('present', false);
    
    expect(result).toContain('bg-gray-50');
    expect(result).toContain('text-gray-500');
  });
  
  it('should include base button styles', () => {
    const result = getStatusButtonClass('present', true);
    
    expect(result).toContain('px-3');
    expect(result).toContain('py-1');
    expect(result).toContain('rounded-md');
    expect(result).toContain('border');
  });
  
  it('should differentiate between status colors when active', () => {
    const present = getStatusButtonClass('present', true);
    const absent = getStatusButtonClass('absent', true);
    const late = getStatusButtonClass('late', true);
    const excused = getStatusButtonClass('excused', true);
    
    expect(present).toContain('green');
    expect(absent).toContain('red');
    expect(late).toContain('yellow');
    expect(excused).toContain('blue');
  });
  
  it('should use same inactive style regardless of status', () => {
    const statuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
    
    const inactiveClasses = statuses.map(status => 
      getStatusButtonClass(status, false)
    );
    
    // All inactive buttons should have same classes
    const uniqueClasses = new Set(inactiveClasses);
    expect(uniqueClasses.size).toBe(1);
  });
});

describe('Attendance status type safety', () => {
  it('should only allow valid attendance statuses', () => {
    const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
    
    expect(validStatuses).toHaveLength(4);
    
    // TypeScript should prevent invalid values at compile time
    // This test documents the expected values
    expect(validStatuses).toContain('present');
    expect(validStatuses).toContain('absent');
    expect(validStatuses).toContain('late');
    expect(validStatuses).toContain('excused');
  });
});

describe('Date string format consistency', () => {
  it('should produce ISO 8601 date format (YYYY-MM-DD)', () => {
    const dateStr = getTodayDateString();
    
    // Should be exactly 10 characters
    expect(dateStr).toHaveLength(10);
    
    // Should match YYYY-MM-DD pattern
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    // Should be parseable by Date constructor
    const parsedDate = new Date(dateStr);
    expect(parsedDate.toString()).not.toBe('Invalid Date');
  });
});

describe('Color class naming conventions', () => {
  it('should use consistent Tailwind color intensity', () => {
    const statuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
    
    statuses.forEach(status => {
      const colorClass = getStatusColorClass(status);
      
      // Should use 100 for background, 800 for text, 300 for border
      expect(colorClass).toMatch(/bg-\w+-100/);
      expect(colorClass).toMatch(/text-\w+-800/);
      expect(colorClass).toMatch(/border-\w+-300/);
    });
  });
  
  it('should use consistent button color intensity when active', () => {
    const statuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
    
    statuses.forEach(status => {
      const buttonClass = getStatusButtonClass(status, true);
      
      // Should use 500 for background, 600 for border
      expect(buttonClass).toMatch(/bg-\w+-500/);
      expect(buttonClass).toMatch(/border-\w+-600/);
    });
  });
});
