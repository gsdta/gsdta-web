// Utility to generate ICS (iCalendar) file format from calendar events

interface CalendarEvent {
  week: number | null;
  trimester: string | null;
  semester: string | null;
  date: string;
  sdusd: string | null;
  pusd: string | null;
  indiaHolidays: string | null;
  longWeekend: string | null;
  gsdtaDates: string | null;
  gsdtaEvents: string | null;
}

function formatDateForICS(dateString: string): string {
  // Parse date as UTC to avoid timezone issues
  const parts = dateString.split('-');
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  return `${year}${month}${day}`;
}

function formatDateTimeForICS(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICS(events: CalendarEvent[]): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GSDTA//Calendar 2025-26//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:GSDTA Calendar 2025-26',
    'X-WR-TIMEZONE:America/Los_Angeles',
    'X-WR-CALDESC:GSDTA Academic Calendar for 2025-26'
  ];

  events.forEach((event, index) => {
    if (!event.date) return;

    const eventDate = formatDateForICS(event.date);
    const uid = `gsdta-${eventDate}-${index}@gsdta.org`;
    const timestamp = formatDateTimeForICS(now);

    // GSDTA Events
    if (event.gsdtaEvents) {
      const actualDate = event.gsdtaDates ? formatDateForICS(event.gsdtaDates) : eventDate;
      const description = [
        event.gsdtaEvents,
        event.trimester ? `Trimester: ${event.trimester}` : '',
        event.semester ? `Semester: ${event.semester}` : ''
      ].filter(Boolean).join('\\n');

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}-gsdta`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${actualDate}`,
        `SUMMARY:${escapeICSText(event.gsdtaEvents)}`,
        `DESCRIPTION:${escapeICSText(description)}`,
        'CATEGORIES:GSDTA Event',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      );
    }

    // India Holidays
    if (event.indiaHolidays) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}-india`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${eventDate}`,
        `SUMMARY:${escapeICSText(event.indiaHolidays)}`,
        'DESCRIPTION:India Holiday',
        'CATEGORIES:India Holiday',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      );
    }

    // Long Weekends
    if (event.longWeekend) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}-weekend`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${eventDate}`,
        `SUMMARY:${escapeICSText(event.longWeekend)}`,
        'DESCRIPTION:Long Weekend',
        'CATEGORIES:Long Weekend',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      );
    }

    // School Holidays - SDUSD
    if (event.sdusd) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}-sdusd`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${eventDate}`,
        `SUMMARY:SDUSD: ${escapeICSText(event.sdusd)}`,
        'DESCRIPTION:San Diego Unified School District',
        'CATEGORIES:School Holiday',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      );
    }

    // School Holidays - PUSD
    if (event.pusd) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}-pusd`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${eventDate}`,
        `SUMMARY:PUSD: ${escapeICSText(event.pusd)}`,
        'DESCRIPTION:Poway Unified School District',
        'CATEGORIES:School Holiday',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      );
    }

    // Test/Revision Weeks
    if (event.trimester?.includes('Test') || event.semester?.includes('Test') ||
        event.trimester?.includes('Revision') || event.semester?.includes('Revision')) {
      const summary = event.trimester?.includes('Test') || event.trimester?.includes('Revision')
        ? event.trimester
        : event.semester;

      if (summary) {
        lines.push(
          'BEGIN:VEVENT',
          `UID:${uid}-test`,
          `DTSTAMP:${timestamp}`,
          `DTSTART;VALUE=DATE:${eventDate}`,
          `SUMMARY:${escapeICSText(summary)}`,
          `DESCRIPTION:Week ${event.week || 'N/A'}`,
          'CATEGORIES:Academic',
          'STATUS:CONFIRMED',
          'TRANSP:TRANSPARENT',
          'END:VEVENT'
        );
      }
    }
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(icsContent: string, filename: string = 'gsdta-calendar-2025-26.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
