/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getLocalDateString,
  getDayDifference,
  getMilestoneProgress,
  getWeeklyActivity,
} from './streak.ts';

describe('Streak Calculation Utilities', () => {
  it('calculates calendar day differences accurately', () => {
    assert.strictEqual(getDayDifference('2026-10-20', '2026-10-20'), 0);
    assert.strictEqual(getDayDifference('2026-10-20', '2026-10-21'), 1);
    assert.strictEqual(getDayDifference('2026-10-19', '2026-10-21'), 2);
    assert.strictEqual(getDayDifference('2026-10-21', '2026-10-20'), -1);
    assert.strictEqual(getDayDifference('2026-02-28', '2026-03-01'), 1);
  });

  it('formats local date string as YYYY-MM-DD', () => {
    const fixedDate = new Date(2026, 9, 21); // Month is 0-indexed: 9 = October
    assert.strictEqual(getLocalDateString(fixedDate), '2026-10-21');
  });

  it('determines milestone unlocking correctly', () => {
    const milestones1 = getMilestoneProgress(1);
    assert.strictEqual(milestones1.every((m) => !m.unlocked), true);

    const milestones7 = getMilestoneProgress(7);
    const unlocked = milestones7.filter((m) => m.unlocked);
    assert.strictEqual(unlocked.length, 2); // 3 days & 7 days
    assert.strictEqual(unlocked[0].days, 3);
    assert.strictEqual(unlocked[1].days, 7);
  });

  it('generates 7-day weekly activity with Monday-to-Sunday layout', () => {
    const active = ['2026-10-20', '2026-10-21'];
    const exam = ['2026-10-21'];
    const week = getWeeklyActivity(active, exam);
    assert.strictEqual(week.length, 7);
    assert.strictEqual(week[0].dayName, 'M');
    assert.strictEqual(week[6].dayName, 'S');
  });
});
