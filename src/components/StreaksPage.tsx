/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserStreakData } from '../types/exam';
import {
  Flame,
  Trophy,
  Calendar,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import {
  getWeeklyActivity,
  getMilestoneProgress,
  getMonthlyCalendarGrid,
  getLocalDateString,
} from '../utils/streak';

interface StreaksPageProps {
  streakData: UserStreakData;
  onStartPractice?: () => void;
}

export const StreaksPage: React.FC<StreaksPageProps> = ({
  streakData,
  onStartPractice,
}) => {
  const [calendarView, setCalendarView] = useState<'weekly' | 'monthly'>('weekly');
  
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const weeklyDays = getWeeklyActivity(streakData.activeDates, streakData.examDates);
  const monthlyGrid = getMonthlyCalendarGrid(
    currentYear,
    currentMonth,
    streakData.activeDates,
    getLocalDateString()
  );

  const milestones = getMilestoneProgress(streakData.currentStreak);
  const nextMilestone = milestones.find((m) => !m.unlocked) || milestones[milestones.length - 1];

  const prevMilestoneDays = milestones
    .filter((m) => m.unlocked)
    .reduce((max, m) => Math.max(max, m.days), 0);
  const milestoneTarget = nextMilestone.days;
  const progressPercent = Math.min(
    100,
    Math.round(
      ((streakData.currentStreak - prevMilestoneDays) /
        Math.max(1, milestoneTarget - prevMilestoneDays)) *
        100
    )
  );

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const dailyGoal = streakData.dailyGoal || 1;
  const todayCompleted = streakData.todayCompletedCount || (streakData.todayPracticed ? 1 : 0);
  const isGoalMet = streakData.isDailyGoalMet || streakData.todayPracticed;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[var(--warning)]/20 border border-[var(--warning)]/30 flex items-center justify-center text-[var(--warning)]">
          <Flame className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-main)' }}>Daily Learning Streak</h1>
          <p className="text-[var(--text-faint)]">Track your consistent learning habits</p>
        </div>
      </div>
      
      {/* (Rest of the content from StreakModal...) */}
      <div className="p-5 rounded-3xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-main)' }}>
        <div className="text-center">
            <div className="text-6xl font-black font-mono-numbers tracking-tight mb-2" style={{ color: 'var(--text-main)' }}>
              {streakData.currentStreak}
            </div>
            <div className="text-sm uppercase tracking-wider font-bold text-[var(--warning)]">
              {streakData.currentStreak === 1 ? 'Consecutive Active Day' : 'Consecutive Active Days'}
            </div>
        </div>
      </div>

       {/* Daily Learning Goal Progress Card */}
        <div
            className="p-4 rounded-3xl border space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: isGoalMet ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-main)',
            }}
          >
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                <Target className="w-4 h-4 text-[var(--warning)]" />
                <span>Daily Practice Goal</span>
              </span>
              <span className={isGoalMet ? 'text-emerald-400' : 'text-orange-400'}>
                {todayCompleted} / {dailyGoal} Tests Completed
              </span>
            </div>
            {/* ... */}
          </div>
    </div>
  );
};
