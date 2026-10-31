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
  ArrowLeft,
} from 'lucide-react';
import {
  getWeeklyActivity,
  getMilestoneProgress,
  getMonthlyCalendarGrid,
  getLocalDateString,
} from '../utils/streak';

interface StreakPageProps {
  streakData: UserStreakData;
  onGoBack: () => void;
}

export const StreakPage: React.FC<StreakPageProps> = ({
  streakData,
  onGoBack,
}) => {
  const [calendarView, setCalendarView] = useState<'weekly' | 'monthly'>('weekly');
  
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

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
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-4">
        <button
          onClick={onGoBack}
          className="p-2 rounded-xl border cursor-pointer hover:opacity-80"
          style={{
            borderColor: 'var(--border-muted)',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-muted)',
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>Daily Learning Streak</h2>
      </div>

      {/* Main Streak Counter Hero */}
      <div
        className="p-8 rounded-3xl border text-center relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--warning)]/10 text-[var(--warning)] shadow-inner mb-4">
          <Flame className="w-12 h-12 fill-current animate-bounce" style={{ animationDuration: '2s' }} />
        </div>
        <div className="text-6xl font-black font-mono-numbers tracking-tight mb-2" style={{ color: 'var(--text-main)' }}>
          {streakData.currentStreak}
        </div>
        <div className="text-sm uppercase tracking-wider font-bold text-[var(--warning)]">
          {streakData.currentStreak === 1 ? 'Consecutive Active Day' : 'Consecutive Active Days'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="p-6 rounded-3xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-faint)]">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Longest Streak
          </div>
          <div className="text-3xl font-black font-mono text-yellow-400 mt-2">
            {Number(streakData.longestStreak) || 0} <span className="text-sm font-normal opacity-70">days</span>
          </div>
        </div>
        <div
          className="p-6 rounded-3xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-faint)]">
            <Calendar className="w-4 h-4 text-teal-400" />
            Total Active Days
          </div>
          <div className="text-3xl font-black font-mono text-teal-400 mt-2">
            {Number(streakData.totalActiveDays ?? streakData.totalDaysActive) || 0} <span className="text-sm font-normal opacity-70">days</span>
          </div>
        </div>
      </div>

      {/* Activity Calendar Section */}
      <div
        className="p-6 rounded-3xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Activity Calendar</h3>
          <div
            className="flex items-center p-1 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-muted)',
            }}
          >
            <button
              onClick={() => setCalendarView('weekly')}
              className={`px-4 py-1.5 rounded-lg cursor-pointer ${calendarView === 'weekly' ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'text-[var(--text-faint)]'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setCalendarView('monthly')}
              className={`px-4 py-1.5 rounded-lg cursor-pointer ${calendarView === 'monthly' ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'text-[var(--text-faint)]'}`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Calendar Content */}
        {calendarView === 'weekly' && (
          <div className="grid grid-cols-7 gap-2">
             {weeklyDays.map((day, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center p-3 rounded-xl border"
                  style={{
                    backgroundColor: day.isPracticed || day.isActive ? 'rgba(249, 115, 22, 0.15)' : 'var(--bg-surface-elevated)',
                    borderColor: day.isPracticed || day.isActive ? 'rgba(249, 115, 22, 0.5)' : 'var(--border-muted)',
                  }}
                >
                   <span className="text-xs text-[var(--text-faint)]">{day.dayName}</span>
                   <span className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>{day.dateStr.split('-')[2]}</span>
                   {day.isPracticed || day.isActive ? <Flame className="w-5 h-5 text-[var(--warning)] mt-1" /> : <div className="w-5 h-5 mt-1" />}
                </div>
             ))}
          </div>
        )}
        
        {calendarView === 'monthly' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                {monthNames[currentMonth]} {currentYear}
              </h4>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg border hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg border hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-[var(--text-muted)] py-1">
                  {d}
                </div>
              ))}
              {monthlyGrid.map((day, idx) => (
                <div
                  key={idx}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-[11px] font-bold transition-all ${
                    !day.isCurrentMonth ? 'opacity-20' : ''
                  }`}
                  style={{
                    backgroundColor: day.isActive ? 'rgba(249, 115, 22, 0.15)' : 'var(--bg-surface-elevated)',
                    borderColor: day.isToday ? 'var(--accent)' : day.isActive ? 'rgba(249, 115, 22, 0.4)' : 'var(--border-muted)',
                    color: day.isActive ? 'rgb(249, 115, 22)' : 'var(--text-main)',
                  }}
                  title={day.dateStr}
                >
                  {day.dayNumber}
                  {day.isActive && <div className="w-1 h-1 rounded-full bg-[var(--warning)] mt-0.5" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
