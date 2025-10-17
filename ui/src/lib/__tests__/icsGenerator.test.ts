import { generateICS } from '../icsGenerator';

describe('icsGenerator', () => {
  it('should generate valid ICS format with basic structure', () => {
    const events = [
      {
        week: 1,
        trimester: 'Week-0',
        semester: 'Week-0',
        date: '2025-08-15',
        sdusd: null,
        pusd: null,
        indiaHolidays: null,
        longWeekend: null,
        gsdtaDates: '2025-08-10',
        gsdtaEvents: 'Books & Bag distribution Sem 1'
      }
    ];

    const icsContent = generateICS(events);

    // Check for required ICS headers
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('END:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//GSDTA//Calendar 2025-26//EN');
  });

  it('should create GSDTA event with correct date', () => {
    const events = [
      {
        week: 1,
        trimester: 'Week-0',
        semester: 'Week-0',
        date: '2025-08-15',
        sdusd: null,
        pusd: null,
        indiaHolidays: null,
        longWeekend: null,
        gsdtaDates: '2025-08-10',
        gsdtaEvents: 'Books & Bag distribution Sem 1'
      }
    ];

    const icsContent = generateICS(events);

    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('SUMMARY:Books & Bag distribution Sem 1');
    expect(icsContent).toContain('DTSTART;VALUE=DATE:20250810'); // Uses gsdtaDates
    expect(icsContent).toContain('CATEGORIES:GSDTA Event');
  });

  it('should create India holiday event', () => {
    const events = [
      {
        week: 3,
        trimester: 'Week-2',
        semester: 'Week-2',
        date: '2025-08-29',
        sdusd: null,
        pusd: null,
        indiaHolidays: '08/26-27 Vinayaka chaturthi (Tues, wed)',
        longWeekend: null,
        gsdtaDates: null,
        gsdtaEvents: null
      }
    ];

    const icsContent = generateICS(events);

    expect(icsContent).toContain('SUMMARY:08/26-27 Vinayaka chaturthi (Tues\\, wed)');
    expect(icsContent).toContain('CATEGORIES:India Holiday');
  });

  it('should create school holiday events', () => {
    const events = [
      {
        week: 1,
        trimester: 'Week-0',
        semester: 'Week-0',
        date: '2025-08-15',
        sdusd: '08/11 - First day',
        pusd: '08/13 - First day',
        indiaHolidays: null,
        longWeekend: null,
        gsdtaDates: null,
        gsdtaEvents: null
      }
    ];

    const icsContent = generateICS(events);

    expect(icsContent).toContain('SUMMARY:SDUSD: 08/11 - First day');
    expect(icsContent).toContain('SUMMARY:PUSD: 08/13 - First day');
    expect(icsContent).toContain('CATEGORIES:School Holiday');
  });

  it('should create long weekend events', () => {
    const events = [
      {
        week: 3,
        trimester: 'Week-2',
        semester: 'Week-2',
        date: '2025-08-29',
        sdusd: null,
        pusd: null,
        indiaHolidays: null,
        longWeekend: '09/01 - Monday Labor day Holiday - BOTH',
        gsdtaDates: null,
        gsdtaEvents: null
      }
    ];

    const icsContent = generateICS(events);

    expect(icsContent).toContain('SUMMARY:09/01 - Monday Labor day Holiday - BOTH');
    expect(icsContent).toContain('CATEGORIES:Long Weekend');
  });

  it('should create test week events', () => {
    const events = [
      {
        week: 8,
        trimester: 'Week-7',
        semester: 'Week-7 (Mid-Term Test)',
        date: '2025-10-10',
        sdusd: null,
        pusd: null,
        indiaHolidays: null,
        longWeekend: null,
        gsdtaDates: null,
        gsdtaEvents: null
      }
    ];

    const icsContent = generateICS(events);

    expect(icsContent).toContain('SUMMARY:Week-7 (Mid-Term Test)');
    expect(icsContent).toContain('CATEGORIES:Academic');
  });

  it('should handle events with no date gracefully', () => {
    const events = [
      {
        week: null,
        trimester: null,
        semester: null,
        date: '',
        sdusd: null,
        pusd: null,
        indiaHolidays: null,
        longWeekend: null,
        gsdtaDates: null,
        gsdtaEvents: null
      }
    ];

    const icsContent = generateICS(events);

    // Should only have calendar headers, no events
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('END:VCALENDAR');
    expect(icsContent).not.toContain('BEGIN:VEVENT');
  });

  it('should escape special characters in text', () => {
    const events = [
      {
        week: 1,
        trimester: null,
        semester: null,
        date: '2025-08-15',
        sdusd: null,
        pusd: null,
        indiaHolidays: 'Holiday with, commas; and semicolons',
        longWeekend: null,
        gsdtaDates: null,
        gsdtaEvents: null
      }
    ];

    const icsContent = generateICS(events);

    // Commas and semicolons should be escaped
    expect(icsContent).toContain('Holiday with\\, commas\\; and semicolons');
  });
});

