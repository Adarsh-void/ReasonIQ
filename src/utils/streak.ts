/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserStreakData, ExamResult } from '../types/exam';
import {
  calculateStreakStats,
  getLocalDateString,
  getCalendarDayDiff,
  getWeeklyCalendarView,
  getMonthlyCalendarGrid,
  CalendarDayInfo,
} from './streakLogic';
import { recordLocalActivity } from './localDatabase';

const STORAGE_PREFIX = 'reasoniq_streak_';
const LEGACY_STREAK_KEY = 'reasoniq_current_streak';
const LEGACY_VISIT_KEY = 'reasoniq_last_visit_date';

export const STREAK_EVENT = 'reasoniq_streak_updated';

export { getLocalDateString, getCalendarDayDiff, getWeeklyCalendarView, getMonthlyCalendarGrid };
export const getDayDifference = getCalendarDayDiff;
export type { CalendarDayInfo };

function getStorageKey(userIdentifier?: string): string {
  if (userIdentifier && userIdentifier.trim()) {
    return `${STORAGE_PREFIX}${userIdentifier.trim().toLowerCase()}`;
  }
  return `${STORAGE_PREFIX}default`;
}

/**
 * Load streak data from localStorage and calculate exact mathematical stats.
 * Does NOT alter or record new activity.
 */
export function getStoredStreak(userIdentifier?: string): UserStreakData {
  const key = getStorageKey(userIdentifier);
  const today = getLocalDateString();

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: UserStreakData = JSON.parse(raw);
      const activeDates = Array.isArray(parsed.activeDates) ? parsed.activeDates : [];
      const examDates = Array.isArray(parsed.examDates) ? parsed.examDates : [];
      const stats = calculateStreakStats(activeDates, today);

      return {
        currentStreak: stats.currentStreak,
        bestStreak: activeDates.length > 0 ? Math.max(parsed.bestStreak ?? 0, stats.longestStreak ?? 0) : 0,
        longestStreak: activeDates.length > 0 ? Math.max(parsed.bestStreak ?? 0, stats.longestStreak ?? 0) : 0,
        lastActiveDate: stats.lastActiveDate || parsed.lastActiveDate || '',
        lastExamDate: parsed.lastExamDate,
        activeDates,
        examDates,
        todayPracticed: examDates.includes(today),
        totalDaysActive: stats.totalActiveDays,
        totalActiveDays: stats.totalActiveDays,
        dailyGoal: parsed.dailyGoal || 1,
        todayCompletedCount: parsed.todayCompletedCount || (examDates.includes(today) ? 1 : 0),
        isDailyGoalMet: parsed.isDailyGoalMet ?? (examDates.includes(today)),
      };
    }
  } catch (e) {
    console.warn('Failed to parse streak storage:', e);
  }

  // Fresh profile starts with 0 activity
  return {
    currentStreak: 0,
    bestStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    activeDates: [],
    examDates: [],
    todayPracticed: false,
    totalDaysActive: 0,
    totalActiveDays: 0,
    dailyGoal: 1,
    todayCompletedCount: 0,
    isDailyGoalMet: false,
  };
}

/**
 * Saves streak data to localStorage and broadcasts update event.
 */
export function saveStreak(data: UserStreakData, userIdentifier?: string): void {
  try {
    const key = getStorageKey(userIdentifier);
    localStorage.setItem(key, JSON.stringify(data));

    localStorage.setItem(LEGACY_STREAK_KEY, String(data.currentStreak));
    if (data.lastActiveDate) {
      localStorage.setItem(LEGACY_VISIT_KEY, data.lastActiveDate);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(STREAK_EVENT, {
          detail: { ...data, userIdentifier },
        })
      );
    }
  } catch (e) {
    console.error('Failed to save streak:', e);
  }
}

/**
 * Inspects daily streak without adding new activity on refresh/visit.
 * (Preserved function signature for backward-compatibility)
 */
export function recordDailyActivity(userIdentifier?: string): UserStreakData {
  return getStoredStreak(userIdentifier);
}

/**
 * Records a meaningful learning activity (completing an exam/practice session).
 * Updates streak math, adds to active dates, and logs to IndexedDB.
 */
export function recordExamCompletionStreak(
  userIdentifier?: string,
  metadata: {
    testName?: string;
    subject?: string;
    score?: number;
    accuracy?: number;
  } = {}
): { streakData: UserStreakData; wasExtendedToday: boolean } {
  const current = getStoredStreak(userIdentifier);
  const today = getLocalDateString();

  const wasAlreadyPracticedToday = current.examDates.includes(today);
  const wasExtendedToday = !wasAlreadyPracticedToday;

  const activeDatesSet = new Set(current.activeDates || []);
  const examDatesSet = new Set(current.examDates || []);

  activeDatesSet.add(today);
  examDatesSet.add(today);

  const activeDates = Array.from(activeDatesSet).sort();
  const examDates = Array.from(examDatesSet).sort();

  const stats = calculateStreakStats(activeDates, today);
  const todayCompletedCount = (current.todayCompletedCount || 0) + 1;
  const dailyGoal = current.dailyGoal || 1;

  const updated: UserStreakData = {
    currentStreak: stats.currentStreak,
    bestStreak: Math.max(current.bestStreak ?? 0, stats.longestStreak ?? 0),
    longestStreak: Math.max(current.bestStreak ?? 0, stats.longestStreak ?? 0),
    lastActiveDate: today,
    lastExamDate: today,
    activeDates,
    examDates,
    todayPracticed: true,
    totalDaysActive: stats.totalActiveDays,
    totalActiveDays: stats.totalActiveDays,
    dailyGoal,
    todayCompletedCount,
    isDailyGoalMet: todayCompletedCount >= dailyGoal,
  };

  saveStreak(updated, userIdentifier);

  // Also log to IndexedDB asynchronously
  const profileId = userIdentifier || 'anon_default';
  recordLocalActivity(profileId, 'exam_completion', {
    ...metadata,
    dateStr: today,
  }).catch((err) => console.warn('Could not record to IndexedDB:', err));

  return { streakData: updated, wasExtendedToday };
}

/**
 * Reconciles streak with existing exam history
 */
export function reconcileStreakWithHistory(
  history: (ExamResult | any)[],
  userIdentifier?: string
): UserStreakData {
  const current = getStoredStreak(userIdentifier);
  const today = getLocalDateString();
  const dailyGoal = current.dailyGoal || 1;

  const activeDatesSet = new Set<string>();
  const examDatesSet = new Set<string>();
  let todayCount = 0;

  if (Array.isArray(history) && history.length > 0) {
    history.forEach((h: any) => {
      const rawDate = h.completedAt || h.dateAttempted;
      if (rawDate) {
        const examDate = getLocalDateString(new Date(rawDate));
        activeDatesSet.add(examDate);
        examDatesSet.add(examDate);
        if (examDate === today) {
          todayCount++;
        }
      }
    });
  }

  const activeDates = Array.from(activeDatesSet).sort();
  const examDates = Array.from(examDatesSet).sort();
  const stats = calculateStreakStats(activeDates, today);

  const todayPracticed = examDates.includes(today);
  const isDailyGoalMet = todayCount >= dailyGoal;

  const updated: UserStreakData = {
    currentStreak: stats.currentStreak,
    bestStreak: activeDates.length > 0 ? Math.max(current.bestStreak ?? 0, stats.longestStreak ?? 0) : 0,
    longestStreak: activeDates.length > 0 ? Math.max(current.bestStreak ?? 0, stats.longestStreak ?? 0) : 0,
    activeDates,
    examDates,
    todayPracticed,
    totalDaysActive: stats.totalActiveDays,
    totalActiveDays: stats.totalActiveDays,
    dailyGoal,
    todayCompletedCount: todayCount,
    isDailyGoalMet,
    lastActiveDate: stats.lastActiveDate || '',
    lastExamDate: examDates[examDates.length - 1] || '',
  };

  saveStreak(updated, userIdentifier);
  return updated;
}

export interface WeekDayActivity {
  dayName: string;
  fullDayName: string;
  dateStr: string;
  isToday: boolean;
  isActive: boolean;
  isPracticed: boolean;
  isPast: boolean;
}

export function getWeeklyActivity(activeDates: string[], examDates: string[] = []): WeekDayActivity[] {
  const todayStr = getLocalDateString();
  const weekInfo = getWeeklyCalendarView(activeDates, todayStr);
  const examSet = new Set(examDates);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return weekInfo.map((item) => ({
    dayName: dayLabels[item.dayOfWeek],
    fullDayName: fullNames[item.dayOfWeek],
    dateStr: item.dateStr,
    isToday: item.isToday,
    isActive: item.isActive,
    isPracticed: examSet.has(item.dateStr) || item.isActive,
    isPast: !item.isFuture && !item.isToday,
  }));
}

export interface StreakMilestone {
  days: number;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, title: 'Novice Thinker', desc: '3 consecutive days of analytical training', icon: '🥉', unlocked: false },
  { days: 7, title: 'Weekly Champion', desc: '7 unbroken days of mental agility', icon: '🥈', unlocked: false },
  { days: 14, title: 'Logical Master', desc: '2 solid weeks of exam excellence', icon: '🥇', unlocked: false },
  { days: 30, title: 'Grandmaster', desc: '30-day streak of unstoppable dedication', icon: '👑', unlocked: false },
  { days: 100, title: 'Reasoning Legend', desc: '100 days of elite mastery', icon: '🔥', unlocked: false },
];

export function getMilestoneProgress(currentStreak: number): StreakMilestone[] {
  return STREAK_MILESTONES.map((m) => ({
    ...m,
    unlocked: currentStreak >= m.days,
  }));
}
