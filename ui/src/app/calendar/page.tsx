"use client";

import { useI18n } from "@/i18n/LanguageProvider";
import { useState, useMemo, useEffect, useCallback } from "react";
import { getPublicCalendarEvents } from "@/lib/calendar-api";
import type { CalendarEvent } from "@/lib/calendar-types";
import { EVENT_TYPE_COLORS } from "@/lib/calendar-types";
import { generateICS, downloadICS } from "@/lib/icsGenerator";

type ViewMode = "month" | "week" | "agenda";

export default function CalendarPage() {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch events for the entire academic year (roughly)
      const today = new Date();
      const startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]; // Jan 1
      const endDate = new Date(today.getFullYear() + 1, 11, 31).toISOString().split('T')[0]; // Dec 31 next year

      const result = await getPublicCalendarEvents(startDate, endDate, true); // expand recurring events
      setEvents(result.events as CalendarEvent[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Navigation functions
  const goToToday = () => setCurrentDate(new Date());

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  // Get week dates
  const getWeekDates = (date: Date) => {
    const week = [] as Date[];
    const first = date.getDate() - date.getDay(); // First day is Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(date);
      day.setDate(first + i);
      week.push(day);
    }
    return week;
  };

  // Get month calendar grid (including previous/next month days)
  const getMonthCalendarDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);

    const dates: Date[] = [];
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Go back to Sunday

    // Generate 6 weeks (42 days) to have a complete calendar grid
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      dates.push(day);
    }

    return dates;
  };

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const monthDates = useMemo(() => getMonthCalendarDates(currentDate), [currentDate]);

  // Convert API events to ICS format for download
  const handleDownloadICS = () => {
    // Convert CalendarEvent to the format expected by generateICS
    const icsEvents = events.map(event => ({
      date: event.date,
      gsdtaEvents: event.eventType === 'gsdta' ? event.title.en : null,
      indiaHolidays: event.eventType === 'holiday' ? event.title.en : null,
      longWeekend: null,
      sdusd: null,
      pusd: null,
      trimester: null,
      semester: null,
      week: null,
      gsdtaDates: null,
    }));
    const icsContent = generateICS(icsEvents);
    downloadICS(icsContent);
    setShowDownloadMenu(false);
  };

  const formatDateHeader = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === "week") {
      const weekStart = weekDates[0];
      const weekEnd = weekDates[6];
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return '';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Get event type label
  const getEventTypeLabel = (eventType: string): string => {
    const labels: Record<string, string> = {
      gsdta: 'GSDTA Event',
      holiday: 'Holiday',
      test: 'Test',
      meeting: 'Meeting',
      academic: 'Academic',
      sports: 'Sports',
      other: 'Event',
    };
    return labels[eventType] || 'Event';
  };

  // Get event background color based on type
  const getEventBgColor = (eventType: string): string => {
    const colors: Record<string, string> = {
      gsdta: 'bg-green-100 border-green-600 text-green-800',
      holiday: 'bg-red-100 border-red-600 text-red-800',
      test: 'bg-yellow-100 border-yellow-600 text-yellow-800',
      meeting: 'bg-blue-100 border-blue-600 text-blue-800',
      academic: 'bg-purple-100 border-purple-600 text-purple-800',
      sports: 'bg-cyan-100 border-cyan-600 text-cyan-800',
      other: 'bg-gray-100 border-gray-600 text-gray-800',
    };
    return colors[eventType] || 'bg-gray-100 border-gray-600 text-gray-800';
  };

  if (loading) {
    return (
      <section className="flex flex-col gap-4 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 data-testid="page-title" className="text-3xl font-bold text-gray-900">
            {t("nav.calendar")} 2025-26
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading calendar events...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col gap-4 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 data-testid="page-title" className="text-3xl font-bold text-gray-900">
            {t("nav.calendar")} 2025-26
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-center py-12">
            <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg mx-auto max-w-md">
              <p className="font-semibold mb-2">Failed to load calendar</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchEvents}
                className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 data-testid="page-title" className="text-3xl font-bold text-gray-900">
          {t("nav.calendar")} 2025-26
        </h1>

        {/* Download Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors text-sm font-medium shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t("calendar.download")}
          </button>

          {showDownloadMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDownloadMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                <div className="p-2">
                  <button
                    onClick={handleDownloadICS}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-md transition-colors flex items-start gap-3"
                  >
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-gray-900">{t("calendar.file.ics")}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{t("calendar.file.ics.desc")}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/docs/GSDTA Calendar-2025-26.xlsx";
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-md transition-colors flex items-start gap-3"
                  >
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-gray-900">{t("calendar.file.xlsx")}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{t("calendar.file.xlsx.desc")}</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        {/* Navigation Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {t("calendar.controls.today")}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevious}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label={t("calendar.controls.previous")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label={t("calendar.controls.next")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 min-w-[200px]">
            {formatDateHeader()}
          </h2>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("month")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "month"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("calendar.view.month")}
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "week"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("calendar.view.week")}
          </button>
          <button
            onClick={() => setViewMode("agenda")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "agenda"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("calendar.view.agenda")}
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {viewMode === "month" && (
          <div className="h-full flex flex-col">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="px-2 py-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
              {monthDates.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isTodayDate = isToday(date);
                const isCurrentMonthDate = isCurrentMonth(date);

                return (
                  <div
                    key={index}
                    className={`border-r border-b border-gray-200 last:border-r-0 p-2 min-h-[100px] overflow-y-auto ${
                      !isCurrentMonthDate ? 'bg-gray-50' : 'bg-white'
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isTodayDate
                        ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
                        : isCurrentMonthDate
                          ? 'text-gray-900'
                          : 'text-gray-400'
                    }`}>
                      {date.getDate()}
                    </div>

                    <div className="space-y-1">
                      {dayEvents.map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          data-event={event.eventType}
                          className={`text-xs px-1 py-0.5 rounded truncate border-l-2 ${getEventBgColor(event.eventType)}`}
                          title={`${event.title.en}${event.title.ta ? ` - ${event.title.ta}` : ''}`}
                        >
                          {event.title.en}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="h-full flex flex-col">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {weekDates.map((date, index) => {
                const isTodayDate = isToday(date);
                return (
                  <div key={index} className="px-2 py-3 text-center border-r border-gray-200 last:border-r-0">
                    <div className="text-xs text-gray-600">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-semibold ${
                      isTodayDate
                        ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1'
                        : 'text-gray-900 mt-1'
                    }`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 flex-1">
              {weekDates.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                return (
                  <div
                    key={index}
                    className="border-r border-gray-200 last:border-r-0 p-3 overflow-y-auto bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-2">
                      {dayEvents.map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          data-event={event.eventType}
                          className={`px-2 py-2 rounded text-sm border-l-4 ${getEventBgColor(event.eventType)}`}
                        >
                          <div className="font-semibold">{getEventTypeLabel(event.eventType)}</div>
                          <div className="text-xs mt-1">{event.title.en}</div>
                          {event.title.ta && (
                            <div className="text-xs mt-0.5 opacity-75">{event.title.ta}</div>
                          )}
                          {event.location && (
                            <div className="text-xs mt-1 opacity-60">{event.location}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "agenda" && (
          <div className="overflow-y-auto h-full">
            <div data-testid="agenda-events" className="divide-y divide-gray-200">
              {events.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No calendar events found.
                </div>
              ) : (
                events
                  .filter(event => event.date)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((event, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-24 text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short'
                            })}
                          </div>
                          {!event.allDay && event.startTime && (
                            <div className="text-xs text-gray-400 mt-1">
                              {event.startTime}
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className={`px-3 py-2 rounded border-l-4 ${getEventBgColor(event.eventType)}`}>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: EVENT_TYPE_COLORS[event.eventType] }}
                              />
                              <span className="font-semibold">{getEventTypeLabel(event.eventType)}</span>
                            </div>
                            <div className="text-sm mt-1">{event.title.en}</div>
                            {event.title.ta && (
                              <div className="text-sm opacity-75">{event.title.ta}</div>
                            )}
                            {event.description?.en && (
                              <div className="text-xs text-gray-600 mt-1">{event.description.en}</div>
                            )}
                            {event.location && (
                              <div className="text-xs text-gray-500 mt-1">
                                <span className="inline-block mr-1">📍</span>
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("common.legend")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-l-4 border-green-600 rounded"></div>
            <span className="text-gray-700">GSDTA</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-l-4 border-red-600 rounded"></div>
            <span className="text-gray-700">Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-600 rounded"></div>
            <span className="text-gray-700">Test</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-600 rounded"></div>
            <span className="text-gray-700">Meeting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border-l-4 border-purple-600 rounded"></div>
            <span className="text-gray-700">Academic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-cyan-100 border-l-4 border-cyan-600 rounded"></div>
            <span className="text-gray-700">Sports</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border-l-4 border-gray-600 rounded"></div>
            <span className="text-gray-700">Other</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <div className="text-2xl font-bold text-green-700">
            {events.filter(e => e.eventType === 'gsdta').length}
          </div>
          <div className="text-sm text-gray-600">GSDTA Events</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
          <div className="text-2xl font-bold text-red-700">
            {events.filter(e => e.eventType === 'holiday').length}
          </div>
          <div className="text-sm text-gray-600">Holidays</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">
            {events.filter(e => e.eventType === 'test').length}
          </div>
          <div className="text-sm text-gray-600">Tests</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <div className="text-2xl font-bold text-blue-700">
            {events.filter(e => !['gsdta', 'holiday', 'test'].includes(e.eventType)).length}
          </div>
          <div className="text-sm text-gray-600">Other Events</div>
        </div>
      </div>
    </section>
  );
}
