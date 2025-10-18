"use client";

import { useI18n } from "@/i18n/LanguageProvider";
import { useState, useMemo } from "react";
import kgData from "@/data/calendar-kg1.json";
import gradesData from "@/data/calendar-grades2to8.json";
import { generateICS, downloadICS } from "@/lib/icsGenerator";

type ViewMode = "month" | "week" | "agenda";

type Event = {
  week: number | null;
  trimester: string | null;
  semester: string | null;
  date: string; // ISO YYYY-MM-DD
  sdusd: string | null;
  pusd: string | null;
  indiaHolidays: string | null;
  longWeekend: string | null;
  gsdtaDates: string | null;
  gsdtaEvents: string | null;
};

export default function CalendarPage() {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Helper: case-insensitive test detection per group
  const isTrimesterTest = (label?: string | null) => !!label && label.toLowerCase().includes("test");
  const isSemesterTest = (label?: string | null) => !!label && label.toLowerCase().includes("test");

  const normalize = (e: Partial<Event>): Event => ({
    week: e?.week ?? null,
    trimester: e?.trimester ?? null,
    semester: e?.semester ?? null,
    date: e?.date as string,
    sdusd: e?.sdusd ?? null,
    pusd: e?.pusd ?? null,
    indiaHolidays: e?.indiaHolidays ?? null,
    longWeekend: e?.longWeekend ?? null,
    gsdtaDates: e?.gsdtaDates ?? null,
    gsdtaEvents: e?.gsdtaEvents ?? null,
  });

  // Merge KG-1 (trimester) and Grades 2-8 (semester) data by date
  const mergedEvents = useMemo(() => {
    const map = new Map<string, Event>();

    const upsert = (raw: Partial<Event>) => {
      const e = normalize(raw);
      const key = e.date;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...e });
      } else {
        map.set(key, {
          // Prefer week from either if available
          week: existing.week ?? e.week ?? null,
          // Keep both labels where available
          trimester: existing.trimester ?? e.trimester ?? null,
          semester: existing.semester ?? e.semester ?? null,
          date: key,
          // Merge meta fields, prefer non-null values
          sdusd: existing.sdusd ?? e.sdusd ?? null,
          pusd: existing.pusd ?? e.pusd ?? null,
          indiaHolidays: existing.indiaHolidays ?? e.indiaHolidays ?? null,
          longWeekend: existing.longWeekend ?? e.longWeekend ?? null,
          gsdtaDates: existing.gsdtaDates ?? e.gsdtaDates ?? null,
          gsdtaEvents: existing.gsdtaEvents ?? e.gsdtaEvents ?? null,
        });
      }
    };

    kgData.events.forEach(upsert);
    gradesData.events.forEach(upsert);

    // Return sorted by date ascending
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, []);

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
    return mergedEvents.filter(event => event.date === dateStr);
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

  const handleDownloadICS = () => {
    const icsContent = generateICS(mergedEvents);
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
                const events = getEventsForDate(date);
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
                      {events.map((event, eventIndex) => (
                        <div key={eventIndex} className="text-xs">
                          {event.gsdtaEvents && (
                            <div data-event="gsdta" className="bg-green-100 text-green-800 px-1 py-0.5 rounded truncate border-l-2 border-green-600">
                              {event.gsdtaEvents}
                            </div>
                          )}
                          {event.indiaHolidays && (
                            <div data-event="holiday" className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded truncate border-l-2 border-purple-600">
                              {event.indiaHolidays}
                            </div>
                          )}
                          {event.longWeekend && (
                            <div data-event="weekend" className="bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded truncate border-l-2 border-indigo-600">
                              {event.longWeekend}
                            </div>
                          )}
                          {/* Test badges per group, case-insensitive */}
                          {isTrimesterTest(event.trimester) && (
                            <div data-event="test" className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded truncate border-l-2 border-yellow-600">
                              KG/1 Test Week
                            </div>
                          )}
                          {isSemesterTest(event.semester) && (
                            <div data-event="test" className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded truncate border-l-2 border-yellow-600">
                              Grades 2-8 Test Week
                            </div>
                          )}
                          {event.trimester && !event.gsdtaEvents && !event.indiaHolidays && !event.longWeekend && !isTrimesterTest(event.trimester) && (
                            <div data-event="trimester" className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded truncate text-[10px]">
                              KG-1: {event.trimester.replace('Trimester', 'T')}
                            </div>
                          )}
                          {event.semester && !event.gsdtaEvents && !event.indiaHolidays && !event.longWeekend && !isSemesterTest(event.semester) && (
                            <div data-event="semester" className="bg-teal-50 text-teal-700 px-1 py-0.5 rounded truncate text-[10px]">
                              2-8: {event.semester.replace('Semester', 'S')}
                            </div>
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
                const events = getEventsForDate(date);
                return (
                  <div
                    key={index}
                    className="border-r border-gray-200 last:border-r-0 p-3 overflow-y-auto bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-2">
                      {events.map((event, eventIndex) => (
                        <div key={eventIndex}>
                          {event.gsdtaEvents && (
                            <div data-event="gsdta" className="bg-green-100 text-green-800 px-2 py-2 rounded text-sm border-l-4 border-green-600">
                              <div className="font-semibold">{t("calendar.event.gsdta")}</div>
                              <div className="text-xs mt-1">{event.gsdtaEvents}</div>
                            </div>
                          )}
                          {event.indiaHolidays && (
                            <div data-event="holiday" className="bg-purple-100 text-purple-800 px-2 py-2 rounded text-sm border-l-4 border-purple-600">
                              <div className="font-semibold">{t("calendar.event.indiaHoliday")}</div>
                              <div className="text-xs mt-1">{event.indiaHolidays}</div>
                            </div>
                          )}
                          {event.longWeekend && (
                            <div data-event="weekend" className="bg-indigo-100 text-indigo-800 px-2 py-2 rounded text-sm border-l-4 border-indigo-600">
                              <div className="font-semibold">{t("calendar.event.longWeekend")}</div>
                              <div className="text-xs mt-1">{event.longWeekend}</div>
                            </div>
                          )}
                          {/* Test badges per group in week view */}
                          {isTrimesterTest(event.trimester) && (
                            <div data-event="test" className="bg-yellow-100 text-yellow-800 px-2 py-2 rounded text-sm border-l-4 border-yellow-600">
                              <div className="font-semibold">{t("calendar.event.kg1Test")}</div>
                              <div className="text-xs mt-1">{event.trimester}</div>
                            </div>
                          )}
                          {isSemesterTest(event.semester) && (
                            <div data-event="test" className="bg-yellow-100 text-yellow-800 px-2 py-2 rounded text-sm border-l-4 border-yellow-600">
                              <div className="font-semibold">{t("calendar.event.gradesTest")}</div>
                              <div className="text-xs mt-1">{event.semester}</div>
                            </div>
                          )}
                          {event.sdusd && (
                            <div className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs">
                              <strong>SDUSD:</strong> {event.sdusd}
                            </div>
                          )}
                          {event.pusd && (
                            <div className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs">
                              <strong>PUSD:</strong> {event.pusd}
                            </div>
                          )}
                          {event.trimester && !isTrimesterTest(event.trimester) && (
                            <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                              <strong>{t("calendar.label.kg1")}</strong> {event.trimester}
                            </div>
                          )}
                          {event.semester && !isSemesterTest(event.semester) && (
                            <div className="bg-teal-50 text-teal-700 px-2 py-1 rounded text-xs">
                              <strong>{t("calendar.label.grades")}</strong> {event.semester}
                            </div>
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
              {mergedEvents
                .filter(event => event.date)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((event, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-24 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'short'
                          })}
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        {event.gsdtaEvents && (
                          <div className="bg-green-100 text-green-800 px-3 py-2 rounded border-l-4 border-green-600">
                            <div className="font-semibold">{t("calendar.event.gsdta")}</div>
                            <div className="text-sm">{event.gsdtaEvents}</div>
                          </div>
                        )}
                        {event.indiaHolidays && (
                          <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded border-l-4 border-purple-600">
                            <div className="font-semibold">{t("calendar.event.indiaHoliday")}</div>
                            <div className="text-sm">{event.indiaHolidays}</div>
                          </div>
                        )}
                        {event.longWeekend && (
                          <div className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded border-l-4 border-indigo-600">
                            <div className="font-semibold">{t("calendar.event.longWeekend")}</div>
                            <div className="text-sm">{event.longWeekend}</div>
                          </div>
                        )}
                        {event.sdusd && (
                          <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm">
                            <strong>SDUSD:</strong> {event.sdusd}
                          </div>
                        )}
                        {event.pusd && (
                          <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm">
                            <strong>PUSD:</strong> {event.pusd}
                          </div>
                        )}
                        {(event.trimester || event.semester) && (
                          <div className="text-sm text-gray-600">
                            {event.trimester && <span className="mr-3">📚 {t("calendar.label.kg1")} {event.trimester}</span>}
                            {event.semester && <span>📖 {t("calendar.label.grades")} {event.semester}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("common.legend")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-l-4 border-green-600 rounded"></div>
            <span className="text-gray-700">{t("calendar.legend.events")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-600 rounded"></div>
            <span className="text-gray-700">{t("calendar.legend.tests")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border-l-4 border-purple-600 rounded"></div>
            <span className="text-gray-700">{t("calendar.legend.india")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-100 border-l-4 border-indigo-600 rounded"></div>
            <span className="text-gray-700">{t("calendar.legend.weekends")}</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <div className="text-2xl font-bold text-green-700">
            {mergedEvents.filter(e => e.gsdtaEvents).length}
          </div>
          <div className="text-sm text-gray-600">{t("calendar.legend.events")}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
          <div className="text-2xl font-bold text-purple-700">
            {mergedEvents.filter(e => e.indiaHolidays).length}
          </div>
          <div className="text-sm text-gray-600">{t("calendar.legend.india")}</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
          <div className="text-2xl font-bold text-indigo-700">
            {mergedEvents.filter(e => e.longWeekend).length}
          </div>
          <div className="text-sm text-gray-600">{t("calendar.legend.weekends")}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">
            {mergedEvents.filter(e =>
              isTrimesterTest(e.trimester) || isSemesterTest(e.semester)
            ).length}
          </div>
          <div className="text-sm text-gray-600">{t("calendar.stats.tests")}</div>
        </div>
      </div>
    </section>
  );
}
