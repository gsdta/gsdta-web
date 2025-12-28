'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { adminGetCalendarEvents, adminUpdateCalendarEvent, adminDeleteCalendarEvent } from '@/lib/calendar-api';
import type { CalendarEvent, EventType, EventStatus, CalendarEventFilters } from '@/lib/calendar-types';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, RECURRENCE_LABELS } from '@/lib/calendar-types';
import { TableRowActionMenu, useTableRowActions, type TableAction } from '@/components/TableRowActionMenu';

export default function AdminCalendarPage() {
  const { getIdToken } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | 'all'>('all');
  const { selectedItem, menuPosition, handleRowClick, closeMenu, isMenuOpen } = useTableRowActions<CalendarEvent>();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: CalendarEventFilters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (eventTypeFilter !== 'all') filters.eventType = eventTypeFilter;
      filters.limit = 100;

      const result = await adminGetCalendarEvents(getIdToken, filters);
      setEvents(result.events);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, statusFilter, eventTypeFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleToggleStatus = async (event: CalendarEvent) => {
    try {
      const newStatus: EventStatus = event.status === 'active' ? 'inactive' : 'active';
      await adminUpdateCalendarEvent(getIdToken, event.id, { status: newStatus });
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`Are you sure you want to delete "${event.title.en}"?`)) return;
    try {
      await adminDeleteCalendarEvent(getIdToken, event.id);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const getEventActions = (event: CalendarEvent): TableAction[] => [
    {
      label: 'Edit',
      onClick: () => {
        window.location.href = `/admin/calendar/${event.id}/edit`;
      },
      variant: 'default' as const,
    },
    {
      label: event.status === 'active' ? 'Deactivate' : 'Activate',
      onClick: () => handleToggleStatus(event),
      variant: event.status === 'active' ? 'warning' : ('success' as const),
    },
    {
      label: 'Delete',
      onClick: () => handleDelete(event),
      variant: 'danger' as const,
    },
  ];

  const statusConfig = {
    active: { label: 'Active', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    inactive: { label: 'Inactive', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar Events</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage school calendar events, holidays, and GSDTA events
          </p>
        </div>
        <Link
          href="/admin/calendar/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add Event
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value as EventType | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Types</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, labels]) => (
              <option key={value} value={value}>
                {labels.en}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchEvents}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
        <span className="text-sm text-gray-500">
          {total} event{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No calendar events found.</p>
          <Link
            href="/admin/calendar/new"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            Add your first event
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurrence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr
                  key={event.id}
                  onClick={(e) => handleRowClick(e, event)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === 'Enter' && handleRowClick(e as unknown as React.MouseEvent, event)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{formatDate(event.date)}</div>
                    {event.endDate && event.endDate !== event.date && (
                      <div className="text-xs text-gray-500">to {formatDate(event.endDate)}</div>
                    )}
                    {!event.allDay && event.startTime && (
                      <div className="text-xs text-gray-500">{event.startTime} - {event.endTime}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div>{event.title.en}</div>
                    {event.title.ta && (
                      <div className="text-xs text-gray-500">{event.title.ta}</div>
                    )}
                    {event.location && (
                      <div className="text-xs text-gray-400">{event.location}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${EVENT_TYPE_COLORS[event.eventType]}20`,
                        color: EVENT_TYPE_COLORS[event.eventType]
                      }}
                    >
                      {EVENT_TYPE_LABELS[event.eventType].en}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {RECURRENCE_LABELS[event.recurrence]}
                    {event.recurrence !== 'none' && event.recurrenceEndDate && (
                      <div className="text-xs">until {formatDate(event.recurrenceEndDate)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig[event.status].bgColor} ${statusConfig[event.status].textColor}`}
                    >
                      {statusConfig[event.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Menu */}
      {isMenuOpen && selectedItem && menuPosition && (
        <TableRowActionMenu
          actions={getEventActions(selectedItem)}
          position={menuPosition}
          onClose={closeMenu}
        />
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">About Calendar Events</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>GSDTA events, holidays, tests, and other school events</li>
          <li>Supports recurring events (daily, weekly, monthly, yearly)</li>
          <li>Bilingual titles in English and Tamil</li>
          <li>Public events are visible on the school calendar</li>
        </ul>
      </div>
    </div>
  );
}
