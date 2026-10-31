/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns a date string formatted as YYYY-MM-DD in the user's local timezone.
 * Avoids UTC boundary bugs where UTC midnight differs from user's local calendar day.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a Date pinned to local noon (12:00:00).
 * Pinned to noon to avoid any Daylight Saving Time (DST) shift ±1 hour transitions.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

/**
 * Calculates the calendar day difference between dateStr1 and dateStr2 (date2 - date1).
 * E.g., 2026-01-01 minus 2025-12-31 = 1 day.
 */
export function getCalendarDayDiff(dateStr1: string, dateStr2: string): number {
  if (!dateStr1 || !dateStr2) return 999;
  const d1 = parseLocalDate(dateStr1);
  const d2 = parseLocalDate(dateStr2);
  const msDiff = d2.getTime() - d1.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Adds or subtracts days from a YYYY-MM-DD date string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  isActiveToday: boolean;
  lastActiveDate: string | null;
}

/**
 * Pure calculation of streak statistics based strictly on unique meaningful active dates.
 * A day is active ONLY if it exists in the activeDates list (i.e. user completed a test/session).
 * Opening/refreshing the app does NOT add to activeDates.
 */
export function calculateStreakStats(
  activeDates: string[],
  todayStr: string = getLocalDateString()
): StreakStats {
  if (!activeDates || activeDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      isActiveToday: false,
      lastActiveDate: null,
    };
  }

  // De-duplicate and sort dates in ascending chronological order
  const uniqueDates = Array.from(new Set(activeDates.filter(Boolean))).sort();
  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      isActiveToday: false,
      lastActiveDate: null,
    };
  }

  const dateSet = new Set(uniqueDates);
  const totalActiveDays = uniqueDates.length;
  const lastActiveDate = uniqueDates[uniqueDates.length - 1];
  const isActiveToday = dateSet.has(todayStr);

  // 1. Calculate Longest Streak in history
  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = getCalendarDayDiff(uniqueDates[i - 1], uniqueDates[i]);
    if (diff === 1) {
      currentRun += 1;
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
    } else if (diff > 1) {
      currentRun = 1;
    }
    // diff === 0 shouldn't occur due to Set, but handled gracefully
  }

  // 2. Calculate Current Streak
  // If active today: streak ends today and counts backwards.
  // If not active today, but active yesterday: streak ends yesterday and is still alive!
  // If neither today nor yesterday: streak is broken (0).
  const yesterdayStr = addDaysToDateString(todayStr, -1);
  let currentStreak = 0;

  if (isActiveToday) {
    currentStreak = 1;
    let checkDate = yesterdayStr;
    while (dateSet.has(checkDate)) {
      currentStreak += 1;
      checkDate = addDaysToDateString(checkDate, -1);
    }
  } else if (dateSet.has(yesterdayStr)) {
    // Yesterday was active, today is still in progress
    currentStreak = 1;
    let checkDate = addDaysToDateString(yesterdayStr, -1);
    while (dateSet.has(checkDate)) {
      currentStreak += 1;
      checkDate = addDaysToDateString(checkDate, -1);
    }
  } else {
    currentStreak = 0;
  }

  // Longest streak is at least as large as current streak
  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    totalActiveDays,
    isActiveToday,
    lastActiveDate,
  };
}

export interface CalendarDayInfo {
  dateStr: string;
  dayNumber: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  isToday: boolean;
  isActive: boolean;
  activityCount: number;
  isCurrentMonth: boolean;
  isFuture: boolean;
}

/**
 * Returns the weekly calendar view (Monday to Sunday) for the week containing todayStr.
 */
export function getWeeklyCalendarView(
  activeDates: string[],
  todayStr: string = getLocalDateString(),
  activityCountsByDate: Record<string, number> = {}
): CalendarDayInfo[] {
  const today = parseLocalDate(todayStr);
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday ...
  const distanceToMonday = (dayOfWeek + 6) % 7; // Monday = 0, Sunday = 6

  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);

  const activeSet = new Set(activeDates);
  const days: CalendarDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dateStr = getLocalDateString(cur);
    const diffFromToday = getCalendarDayDiff(todayStr, dateStr);

    days.push({
      dateStr,
      dayNumber: cur.getDate(),
      dayOfWeek: cur.getDay(),
      isToday: dateStr === todayStr,
      isActive: activeSet.has(dateStr),
      activityCount: activityCountsByDate[dateStr] || (activeSet.has(dateStr) ? 1 : 0),
      isCurrentMonth: cur.getMonth() === today.getMonth(),
      isFuture: diffFromToday > 0,
    });
  }

  return days;
}

/**
 * Returns full monthly calendar grid (including padding days) for a given year & month.
 * Month is 0-indexed (0 = Jan, 11 = Dec).
 */
export function getMonthlyCalendarGrid(
  year: number,
  month: number,
  activeDates: string[],
  todayStr: string = getLocalDateString(),
  activityCountsByDate: Record<string, number> = {}
): CalendarDayInfo[] {
  const activeSet = new Set(activeDates);
  const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0);
  const lastDayOfMonth = new Date(year, month + 1, 0, 12, 0, 0);

  // We want grid to start on Monday (0) to Sunday (6)
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const grid: CalendarDayInfo[] = [];

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0, 12, 0, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const cur = new Date(year, month - 1, dayNum, 12, 0, 0);
    const dateStr = getLocalDateString(cur);
    grid.push({
      dateStr,
      dayNumber: dayNum,
      dayOfWeek: cur.getDay(),
      isToday: dateStr === todayStr,
      isActive: activeSet.has(dateStr),
      activityCount: activityCountsByDate[dateStr] || (activeSet.has(dateStr) ? 1 : 0),
      isCurrentMonth: false,
      isFuture: getCalendarDayDiff(todayStr, dateStr) > 0,
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const cur = new Date(year, month, dayNum, 12, 0, 0);
    const dateStr = getLocalDateString(cur);
    grid.push({
      dateStr,
      dayNumber: dayNum,
      dayOfWeek: cur.getDay(),
      isToday: dateStr === todayStr,
      isActive: activeSet.has(dateStr),
      activityCount: activityCountsByDate[dateStr] || (activeSet.has(dateStr) ? 1 : 0),
      isCurrentMonth: true,
      isFuture: getCalendarDayDiff(todayStr, dateStr) > 0,
    });
  }

  // Next month padding days to complete full weeks (multiples of 7, up to 35 or 42)
  const remaining = (7 - (grid.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const cur = new Date(year, month + 1, dayNum, 12, 0, 0);
    const dateStr = getLocalDateString(cur);
    grid.push({
      dateStr,
      dayNumber: dayNum,
      dayOfWeek: cur.getDay(),
      isToday: dateStr === todayStr,
      isActive: activeSet.has(dateStr),
      activityCount: activityCountsByDate[dateStr] || (activeSet.has(dateStr) ? 1 : 0),
      isCurrentMonth: false,
      isFuture: getCalendarDayDiff(todayStr, dateStr) > 0,
    });
  }

  return grid;
}
