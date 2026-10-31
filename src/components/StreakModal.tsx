/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserStreakData } from '../types/exam';
import {
  Flame,
  X,
  Trophy,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  Target,
} from 'lucide-react';
import {
  getWeeklyActivity,
  getMilestoneProgress,
  getMonthlyCalendarGrid,
  getLocalDateString,
} from '../utils/streak';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: UserStreakData;
  onStartPractice?: () => void;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  isOpen,
  onClose,
  streakData,
  onStartPractice,
}) => {
  const [calendarView, setCalendarView] = useState<'weekly' | 'monthly'>('weekly');
  
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--bg-app)]/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-main)',
          color: 'var(--text-main)',
        }}
      >
        {/* Top Header Background Banner */}
        <div
          className="relative px-6 pt-6 pb-4 border-b flex items-center justify-between"
          style={{
            borderColor: 'var(--border-muted)',
            background:
              'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(234, 88, 12, 0.03) 100%)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--warning)]/20 border border-[var(--warning)]/30 flex items-center justify-center text-[var(--warning)] shadow-inner">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-main)' }}>
                Daily Learning Streak
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Local persistent analytical habit tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border transition-colors hover:opacity-80 cursor-pointer"
            style={{
              borderColor: 'var(--border-muted)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-muted)',
            }}
            aria-label="Close Streak Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Main Streak Counter Hero */}
          <div
            className="p-5 rounded-2xl border text-center relative overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-main)',
            }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 text-white shadow-lg shadow-orange-500/20 mb-3">
              <Flame className="w-9 h-9 fill-current animate-bounce" style={{ animationDuration: '2s' }} />
            </div>
            <div className="text-4xl sm:text-5xl font-black font-mono-numbers tracking-tight mb-1" style={{ color: 'var(--text-main)' }}>
              {streakData.currentStreak}
            </div>
            <div className="text-xs uppercase tracking-wider font-bold text-[var(--warning)]">
              {streakData.currentStreak === 1 ? 'Consecutive Active Day' : 'Consecutive Active Days'}
            </div>
            <p className="text-xs max-w-xs mx-auto mt-1" style={{ color: 'var(--text-muted)' }}>
              {streakData.todayPracticed
                ? 'Streak secured for today! Complete another test to reinforce concepts.'
                : 'Complete a test today to advance your consecutive daily streak!'}
            </p>

            {/* Streak Metrics Pills */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-muted)' }}>
              <div className="text-center p-2 rounded-xl bg-[var(--bg-surface-elevated)]/40 border border-[var(--border-muted)]/30">
                <div className="text-[10px] uppercase font-bold text-[var(--text-faint)] flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-400" />
                  <span>Longest Streak</span>
                </div>
                <div className="text-lg font-black font-mono text-yellow-400 mt-0.5">
                  {streakData.longestStreak ?? streakData.bestStreak}{' '}
                  <span className="text-[10px] font-normal text-[var(--text-faint)]">days</span>
                </div>
              </div>

              <div className="text-center p-2 rounded-xl bg-[var(--bg-surface-elevated)]/40 border border-[var(--border-muted)]/30">
                <div className="text-[10px] uppercase font-bold text-[var(--text-faint)] flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 text-teal-400" />
                  <span>Total Active Days</span>
                </div>
                <div className="text-lg font-black font-mono text-teal-400 mt-0.5">
                  {streakData.totalActiveDays ?? streakData.totalDaysActive}{' '}
                  <span className="text-[10px] font-normal text-[var(--text-faint)]">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Learning Goal Progress Card */}
          <div
            className="p-4 rounded-2xl border space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: isGoalMet ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-main)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                <Target className="w-4 h-4 text-[var(--warning)]" />
                <span>Daily Practice Goal</span>
              </span>
              <span className={isGoalMet ? 'text-emerald-400' : 'text-orange-400'}>
                {todayCompleted} / {dailyGoal} Tests Completed
              </span>
            </div>

            <div className="w-full bg-[var(--bg-surface-elevated)] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isGoalMet ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                }`}
                style={{ width: `${Math.min(100, (todayCompleted / dailyGoal) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--text-faint)]">
              <span>{isGoalMet ? 'Daily goal achieved! 🎉' : 'Take a test to reach today’s goal.'}</span>
              <span className="font-semibold text-slate-300">
                {Math.round((todayCompleted / dailyGoal) * 100)}%
              </span>
            </div>
          </div>

          {/* Calendar Views Selector (Weekly vs Monthly) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Activity Calendar
              </span>

              {/* View Toggle */}
              <div
                className="flex items-center p-0.5 rounded-lg border text-[11px] font-semibold"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-muted)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCalendarView('weekly')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    calendarView === 'weekly' ? 'bg-[var(--warning)] text-white font-bold' : 'opacity-70'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView('monthly')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    calendarView === 'monthly' ? 'bg-[var(--warning)] text-white font-bold' : 'opacity-70'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Weekly Strip View */}
            {calendarView === 'weekly' && (
              <div
                className="p-4 rounded-2xl border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-main)',
                }}
              >
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {weeklyDays.map((day, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        day.isToday ? 'ring-2 ring-orange-500/80 shadow-md scale-102' : ''
                      }`}
                      style={{
                        backgroundColor: day.isPracticed || day.isActive
                          ? 'rgba(249, 115, 22, 0.15)'
                          : 'var(--bg-surface-elevated)',
                        borderColor: day.isPracticed || day.isActive
                          ? 'rgba(249, 115, 22, 0.5)'
                          : day.isToday
                          ? 'var(--accent)'
                          : 'var(--border-muted)',
                      }}
                    >
                      <span className="text-[10px] font-bold opacity-60">{day.dayName}</span>
                      <div className="w-6 h-6 flex items-center justify-center my-1">
                        {day.isPracticed || day.isActive ? (
                          <Flame className="w-4 h-4 text-[var(--warning)] fill-current animate-pulse" />
                        ) : day.isPast ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700 opacity-40" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono-numbers opacity-80">
                        {day.dateStr.split('-')[2]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Calendar Grid View */}
            {calendarView === 'monthly' && (
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-main)',
                }}
              >
                {/* Month Navigator */}
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-200">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg border hover:bg-[var(--bg-surface-elevated)] cursor-pointer"
                      style={{ borderColor: 'var(--border-muted)' }}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg border hover:bg-[var(--bg-surface-elevated)] cursor-pointer"
                      style={{ borderColor: 'var(--border-muted)' }}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Day Headers (Mon - Sun) */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[var(--text-faint)]">
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                  <span>S</span>
                </div>

                {/* Monthly Day Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {monthlyGrid.map((day, idx) => (
                    <div
                      key={idx}
                      className={`h-9 rounded-lg border flex flex-col items-center justify-center relative text-[11px] font-mono transition-all ${
                        day.isToday ? 'ring-1 ring-orange-500 font-black' : ''
                      } ${!day.isCurrentMonth ? 'opacity-25' : ''}`}
                      style={{
                        backgroundColor: day.isActive
                          ? 'rgba(249, 115, 22, 0.18)'
                          : 'var(--bg-surface-elevated)',
                        borderColor: day.isActive
                          ? 'rgba(249, 115, 22, 0.6)'
                          : 'var(--border-muted)',
                        color: day.isActive ? '#f97316' : 'var(--text-main)',
                      }}
                      title={`${day.dateStr}${day.isActive ? ' - Active learning completed!' : ''}`}
                    >
                      <span>{day.dayNumber}</span>
                      {day.isActive && (
                        <span className="w-1 h-1 rounded-full bg-[var(--warning)] absolute bottom-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Next Milestone Badge Card */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-main)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">Next Milestone</span>
              <span className="text-xs font-bold text-orange-400">
                {nextMilestone.days} Days Target
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-2xl">{nextMilestone.icon}</div>
              <div className="flex-1">
                <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  {nextMilestone.title}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {nextMilestone.desc}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-[var(--bg-surface-elevated)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--warning)] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-faint)]">
                <span>{streakData.currentStreak} Days Current</span>
                <span>{nextMilestone.days - streakData.currentStreak} days to unlock</span>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          {onStartPractice && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartPractice();
              }}
              className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
              }}
            >
              <span>Practice Today's Exam</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 mt-2 rounded-xl border border-[var(--border-muted)] text-xs font-bold text-[var(--text-faint)] hover:bg-[var(--bg-surface-elevated)] transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
