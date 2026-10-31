/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { UserStreakData } from '../types/exam';
import {
  getStoredStreak,
  recordExamCompletionStreak,
  STREAK_EVENT,
} from '../utils/streak';

export function useStreak(userIdentifier?: string) {
  const [streakData, setStreakData] = useState<UserStreakData>(() =>
    getStoredStreak(userIdentifier)
  );

  const refreshStreak = useCallback(() => {
    // Only reads and sanitizes; does NOT log new activity
    const updated = getStoredStreak(userIdentifier);
    setStreakData(updated);
  }, [userIdentifier]);

  useEffect(() => {
    refreshStreak();

    // Listen to custom event for in-tab sync across components
    const handleCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent<UserStreakData & { userIdentifier?: string }>;
      if (customEvent.detail) {
        if (!userIdentifier || !customEvent.detail.userIdentifier || customEvent.detail.userIdentifier === userIdentifier) {
          setStreakData(customEvent.detail);
        }
      } else {
        setStreakData(getStoredStreak(userIdentifier));
      }
    };

    // Cross-tab sync via standard storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('reasoniq_streak')) {
        setStreakData(getStoredStreak(userIdentifier));
      }
    };

    window.addEventListener(STREAK_EVENT, handleCustomSync);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(STREAK_EVENT, handleCustomSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userIdentifier, refreshStreak]);

  const completeExam = useCallback(
    (metadata?: { testName?: string; subject?: string; score?: number; accuracy?: number }) => {
      const res = recordExamCompletionStreak(userIdentifier, metadata);
      setStreakData(res.streakData);
      return res;
    },
    [userIdentifier]
  );

  return {
    streakData,
    streakCount: streakData.currentStreak,
    bestStreak: streakData.bestStreak,
    longestStreak: streakData.longestStreak ?? 0,
    totalActiveDays: Number(streakData.totalActiveDays ?? streakData.totalDaysActive) || 0,
    todayPracticed: streakData.todayPracticed,
    dailyGoal: streakData.dailyGoal || 1,
    todayCompletedCount: streakData.todayCompletedCount || 0,
    isDailyGoalMet: streakData.isDailyGoalMet || false,
    refreshStreak,
    completeExam,
  };
}
