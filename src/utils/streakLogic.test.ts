/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocalDateString,
  parseLocalDate,
  getCalendarDayDiff,
  addDaysToDateString,
  calculateStreakStats,
  getWeeklyCalendarView,
  getMonthlyCalendarGrid,
} from './streakLogic';

test('getCalendarDayDiff handles regular consecutive days', () => {
  assert.equal(getCalendarDayDiff('2026-10-30', '2026-10-31'), 1);
  assert.equal(getCalendarDayDiff('2026-10-31', '2026-10-31'), 0);
  assert.equal(getCalendarDayDiff('2026-10-31', '2026-10-30'), -1);
  assert.equal(getCalendarDayDiff('2026-10-25', '2026-10-31'), 6);
});

test('getCalendarDayDiff handles month boundaries correctly', () => {
  // February non-leap year (2025)
  assert.equal(getCalendarDayDiff('2025-02-28', '2025-03-01'), 1);
  // February leap year (2024)
  assert.equal(getCalendarDayDiff('2024-02-28', '2024-02-29'), 1);
  assert.equal(getCalendarDayDiff('2024-02-29', '2024-03-01'), 1);
  assert.equal(getCalendarDayDiff('2024-02-28', '2024-03-01'), 2);
  // Month transition 31 -> 1
  assert.equal(getCalendarDayDiff('2026-03-31', '2026-04-01'), 1);
  // Month transition 30 -> 1
  assert.equal(getCalendarDayDiff('2026-04-30', '2026-05-01'), 1);
});

test('getCalendarDayDiff handles year boundaries correctly', () => {
  assert.equal(getCalendarDayDiff('2025-12-31', '2026-01-01'), 1);
  assert.equal(getCalendarDayDiff('2025-12-30', '2026-01-01'), 2);
});

test('addDaysToDateString correctly computes future and past dates across boundaries', () => {
  assert.equal(addDaysToDateString('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysToDateString('2026-01-01', -1), '2025-12-31');
  assert.equal(addDaysToDateString('2024-02-28', 1), '2024-02-29');
});

test('calculateStreakStats on empty activeDates returns 0 stats', () => {
  const stats = calculateStreakStats([], '2026-10-31');
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.longestStreak, 0);
  assert.equal(stats.totalActiveDays, 0);
  assert.equal(stats.isActiveToday, false);
  assert.equal(stats.lastActiveDate, null);
});

test('calculateStreakStats: active today gives streak of 1 for single day', () => {
  const stats = calculateStreakStats(['2026-10-31'], '2026-10-31');
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.longestStreak, 1);
  assert.equal(stats.totalActiveDays, 1);
  assert.equal(stats.isActiveToday, true);
});

test('calculateStreakStats: active yesterday maintains streak for today', () => {
  const stats = calculateStreakStats(['2026-10-30'], '2026-10-31');
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.longestStreak, 1);
  assert.equal(stats.totalActiveDays, 1);
  assert.equal(stats.isActiveToday, false);
});

test('calculateStreakStats: gap day resets current streak to 0, preserves longest', () => {
  // Active on Oct 28 and Oct 29, but today is Oct 31 (2 days gap)
  const stats = calculateStreakStats(['2026-10-28', '2026-10-29'], '2026-10-31');
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.longestStreak, 2);
  assert.equal(stats.totalActiveDays, 2);
  assert.equal(stats.isActiveToday, false);
});

test('calculateStreakStats: multiple activities on same day do NOT increase streak', () => {
  // If user does 4 tests today, streak is still 1
  const stats = calculateStreakStats(
    ['2026-10-31', '2026-10-31', '2026-10-31'],
    '2026-10-31'
  );
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.longestStreak, 1);
  assert.equal(stats.totalActiveDays, 1);
});

test('calculateStreakStats: consecutive multi-day streak across month boundary', () => {
  const dates = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
  const stats = calculateStreakStats(dates, '2026-10-02');
  assert.equal(stats.currentStreak, 4);
  assert.equal(stats.longestStreak, 4);
  assert.equal(stats.totalActiveDays, 4);
  assert.equal(stats.isActiveToday, true);
});

test('calculateStreakStats: consecutive multi-day streak across year boundary', () => {
  const dates = ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'];
  const stats = calculateStreakStats(dates, '2026-01-02');
  assert.equal(stats.currentStreak, 4);
  assert.equal(stats.longestStreak, 4);
  assert.equal(stats.totalActiveDays, 4);
});

test('calculateStreakStats: past streak longer than current streak', () => {
  // Past streak was 5 days, then broken, then currently 2 days
  const dates = [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05', // 5-day streak
    // gap
    '2026-10-30',
    '2026-10-31', // 2-day current streak
  ];
  const stats = calculateStreakStats(dates, '2026-10-31');
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.longestStreak, 5);
  assert.equal(stats.totalActiveDays, 7);
});

test('getWeeklyCalendarView generates 7 days starting from Monday', () => {
  const view = getWeeklyCalendarView(['2026-10-31'], '2026-10-31');
  assert.equal(view.length, 7);
  // Monday has dayOfWeek 1
  assert.equal(view[0].dayOfWeek, 1);
  // Sunday has dayOfWeek 0
  assert.equal(view[6].dayOfWeek, 0);
  const activeDay = view.find((d) => d.dateStr === '2026-10-31');
  assert.ok(activeDay);
  assert.equal(activeDay?.isActive, true);
  assert.equal(activeDay?.isToday, true);
});

test('getMonthlyCalendarGrid returns full grid for October 2026', () => {
  const grid = getMonthlyCalendarGrid(2026, 9, ['2026-10-15', '2026-10-31'], '2026-10-31');
  // Must be multiple of 7
  assert.equal(grid.length % 7, 0);
  assert.ok(grid.length >= 28 && grid.length <= 42);

  const oct15 = grid.find((d) => d.dateStr === '2026-10-15');
  assert.ok(oct15);
  assert.equal(oct15?.isActive, true);
  assert.equal(oct15?.isCurrentMonth, true);

  const oct31 = grid.find((d) => d.dateStr === '2026-10-31');
  assert.ok(oct31);
  assert.equal(oct31?.isToday, true);
  assert.equal(oct31?.isActive, true);
});
