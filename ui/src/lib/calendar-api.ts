import {
  CalendarEvent,
  CalendarEventListResponse,
  CalendarEventFilters,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from './calendar-types';

type GetIdToken = () => Promise<string | null>;

const API_BASE = '/api/v1';

/**
 * Admin: Get all calendar events
 */
export async function adminGetCalendarEvents(
  getIdToken: GetIdToken,
  filters: CalendarEventFilters = {}
): Promise<CalendarEventListResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.eventType) params.set('eventType', filters.eventType);
  if (filters.status) params.set('status', filters.status);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset) params.set('offset', filters.offset.toString());

  const res = await fetch(`${API_BASE}/admin/calendar/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch calendar events');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Get a single calendar event
 */
export async function adminGetCalendarEvent(
  getIdToken: GetIdToken,
  id: string
): Promise<CalendarEvent> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/calendar/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch calendar event');
  }

  const data = await res.json();
  return data.data.event;
}

/**
 * Admin: Create a new calendar event
 */
export async function adminCreateCalendarEvent(
  getIdToken: GetIdToken,
  event: CreateCalendarEventInput
): Promise<CalendarEvent> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/calendar/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create calendar event');
  }

  const data = await res.json();
  return data.data.event;
}

/**
 * Admin: Update a calendar event
 */
export async function adminUpdateCalendarEvent(
  getIdToken: GetIdToken,
  id: string,
  event: UpdateCalendarEventInput
): Promise<CalendarEvent> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/calendar/${id}/`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update calendar event');
  }

  const data = await res.json();
  return data.data.event;
}

/**
 * Admin: Delete a calendar event
 */
export async function adminDeleteCalendarEvent(
  getIdToken: GetIdToken,
  id: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/calendar/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete calendar event');
  }
}

/**
 * Public: Get public calendar events (no auth required)
 */
export async function getPublicCalendarEvents(
  startDate?: string,
  endDate?: string,
  expand: boolean = false
): Promise<{ events: CalendarEvent[]; expanded: boolean }> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (expand) params.set('expand', 'true');

  const res = await fetch(`${API_BASE}/calendar/?${params.toString()}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch calendar events');
  }

  const data = await res.json();
  return data.data;
}
