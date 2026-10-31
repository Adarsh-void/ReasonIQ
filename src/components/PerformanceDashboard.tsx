/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  Flame,
  Trophy,
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Award,
  Zap,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { LocalAttemptRecord } from '../utils/localDatabase';
import { UserStreakData, ExamConfig } from '../types/exam';

interface PerformanceDashboardProps {
  attempts: LocalAttemptRecord[];
  streakData: UserStreakData;
  onStartExamWithTopic: (topic: string) => void;
  onViewAttempts: () => void;
  onOpenStreakModal: () => void;
  onGoToPractice: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  attempts,
  streakData,
  onStartExamWithTopic,
  onViewAttempts,
  onOpenStreakModal,
  onGoToPractice,
}) => {
  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalTests = attempts.length;
    if (totalTests === 0) {
      return {
        totalTests: 0,
        avgScore: 0,
        highestScore: 0,
        avgAccuracy: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
      };
    }

    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const avgScore = Math.round((totalScore / totalTests) * 10) / 10;
    const highestScore = Math.max(...attempts.map((a) => a.score));
    const totalQuestions = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    const totalCorrect = attempts.reduce((sum, a) => sum + a.correctAnswers, 0);
    const totalIncorrect = attempts.reduce((sum, a) => sum + a.incorrectAnswers, 0);
    const avgAccuracy =
      totalQuestions > 0 ? Math.round((totalCorrect / Math.max(1, totalCorrect + totalIncorrect)) * 100) : 0;

    return {
      totalTests,
      avgScore,
      highestScore,
      avgAccuracy,
      totalQuestions,
      totalCorrect,
      totalIncorrect,
    };
  }, [attempts]);

  // Subject-wise performance breakdown
  const subjectPerformance = useMemo(() => {
    const map = new Map<
      string,
      {
        subject: string;
        testsCount: number;
        totalScore: number;
        maxMarks: number;
        totalCorrect: number;
        totalAttempted: number;
        latestDate: string;
      }
    >();

    attempts.forEach((a) => {
      const sub = a.subject || a.testName || 'General Reasoning';
      const existing = map.get(sub) || {
        subject: sub,
        testsCount: 0,
        totalScore: 0,
        maxMarks: 0,
        totalCorrect: 0,
        totalAttempted: 0,
        latestDate: a.completedAt,
      };

      existing.testsCount += 1;
      existing.totalScore += a.score;
      existing.maxMarks += a.maxMarks || 20;
      existing.totalCorrect += a.correctAnswers;
      existing.totalAttempted += a.correctAnswers + a.incorrectAnswers;
      if (new Date(a.completedAt) > new Date(existing.latestDate)) {
        existing.latestDate = a.completedAt;
      }

      map.set(sub, existing);
    });

    return Array.from(map.values())
      .map((item) => {
        const accuracy =
          item.totalAttempted > 0
            ? Math.round((item.totalCorrect / item.totalAttempted) * 100)
            : 0;
        const avgScore = Math.round((item.totalScore / item.testsCount) * 10) / 10;
        return {
          ...item,
          accuracy,
          avgScore,
        };
      })
      .sort((a, b) => b.testsCount - a.testsCount);
  }, [attempts]);

  // Weak subjects requiring improvement (accuracy < 65% or lowest accuracy)
  const weakSubjects = useMemo(() => {
    return subjectPerformance
      .filter((s) => s.accuracy < 65 || s.avgScore < 10)
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [subjectPerformance]);

  // Strong subjects (accuracy >= 75%)
  const strongSubjects = useMemo(() => {
    return subjectPerformance
      .filter((s) => s.accuracy >= 75)
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [subjectPerformance]);

  // Chronological score history for Progress Over Time chart (oldest to newest)
  const chronologicalAttempts = useMemo(() => {
    return [...attempts].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
  }, [attempts]);

  // SVG Chart Dimensions & Points
  const chartPoints = useMemo(() => {
    if (chronologicalAttempts.length < 2) return null;
    const width = 640;
    const height = 180;
    const padding = 24;

    const scores = chronologicalAttempts.map((a) => a.score);
    const minScore = Math.min(0, ...scores);
    const maxScore = Math.max(10, ...scores);
    const scoreRange = Math.max(1, maxScore - minScore);

    const points = chronologicalAttempts.map((item, idx) => {
      const x = padding + (idx / (chronologicalAttempts.length - 1)) * (width - padding * 2);
      const y = height - padding - ((item.score - minScore) / scoreRange) * (height - padding * 2);
      return {
        x,
        y,
        score: item.score,
        testName: item.testName,
        date: new Date(item.completedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      };
    });

    const pathString = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaString = `${pathString} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { points, pathString, areaString, width, height, minScore, maxScore };
  }, [chronologicalAttempts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-muted)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
            }}
          >
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
              Performance & Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Comprehensive metrics, streak consistency, score trajectories, and subject mastery on this device.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewAttempts}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-main)',
              color: 'var(--text-main)',
            }}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Past Attempts</span>
          </button>

          <button
            type="button"
            onClick={onGoToPractice}
            className="px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Practice Now</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid (7 Key Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* 1. Total Tests */}
        <div
          className="p-4 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center justify-between text-[var(--text-faint)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Completed</span>
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono-numbers" style={{ color: 'var(--text-main)' }}>
              {metrics.totalTests}
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-0.5">Tests taken</div>
          </div>
        </div>

        {/* 2. Average Score */}
        <div
          className="p-4 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center justify-between text-[var(--text-faint)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Avg Score</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono-numbers text-emerald-400">
              {metrics.avgScore}
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-0.5">Points / test</div>
          </div>
        </div>

        {/* 3. Highest Score */}
        <div
          className="p-4 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center justify-between text-[var(--text-faint)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">High Score</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono-numbers text-amber-400">
              {metrics.highestScore}
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-0.5">Personal best</div>
          </div>
        </div>

        {/* 4. Accuracy */}
        <div
          className="p-4 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center justify-between text-[var(--text-faint)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Accuracy</span>
            <Target className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono-numbers text-blue-400">
              {metrics.avgAccuracy}%
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-0.5">Correct ratio</div>
          </div>
        </div>

        {/* 5. Current Streak */}
        <button
          type="button"
          onClick={onOpenStreakModal}
          className="p-4 rounded-2xl border flex flex-col justify-between text-left transition-all hover:scale-102 cursor-pointer group"
          style={{
            backgroundColor: streakData.todayPracticed ? 'rgba(249, 115, 22, 0.12)' : 'var(--bg-surface)',
            borderColor: streakData.todayPracticed ? 'rgba(249, 115, 22, 0.4)' : 'var(--border-main)',
          }}
        >
          <div className="flex items-center justify-between text-[var(--text-faint)]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400">Current Streak</span>
            <Flame className="w-3.5 h-3.5 text-[var(--warning)] animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono-numbers text-[var(--warning)]">
              {streakData.currentStreak} <span className="text-xs font-normal opacity-80">days</span>
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
              {streakData.todayPracticed ? 'Active today ✓' : 'Practice today!'}
            </div>
          </div>
        </button>

        {/* 6. Longest Streak */}
        <div
          className="p-4 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center justify-between text-[var(--text-faint)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Longest Streak</span>
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono-numbers text-yellow-400">
              {Number(streakData.longestStreak) || 0} <span className="text-xs font-normal opacity-80">days</span>
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-0.5">Unbroken record</div>
          </div>
        </div>

        {/* 7. Total Learning Days */}
        <div
          className="p-4 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center justify-between text-[var(--text-faint)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Learning Days</span>
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono-numbers text-teal-400">
              {Number(streakData.totalActiveDays ?? streakData.totalDaysActive) || 0}
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-0.5">Total active days</div>
          </div>
        </div>
      </div>

      {/* Progress Over Time & Daily Goal Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Progress Over Time Visualization */}
        <div
          className="lg:col-span-2 p-5 sm:p-6 rounded-3xl border space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Score Trajectory Over Time</span>
              </h2>
              <p className="text-xs text-[var(--text-faint)]">
                Chronological score progression across completed tests
              </p>
            </div>

            {chronologicalAttempts.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-surface-elevated)] text-slate-300">
                {chronologicalAttempts.length} Data Points
              </span>
            )}
          </div>

          {chartPoints ? (
            <div className="w-full overflow-x-auto pt-2">
              <svg viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`} className="w-full h-44 overflow-visible">
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="24" y1="24" x2="616" y2="24" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                <line x1="24" y1="90" x2="616" y2="90" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                <line x1="24" y1="156" x2="616" y2="156" stroke="currentColor" strokeOpacity="0.1" />

                {/* Area under curve */}
                <path d={chartPoints.areaString} fill="url(#scoreGradient)" />

                {/* Stroke line */}
                <path
                  d={chartPoints.pathString}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data point dots */}
                {chartPoints.points.map((pt, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      className="fill-emerald-400 stroke-slate-900 stroke-2 transition-all group-hover:r-6"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 8}
                      textAnchor="middle"
                      className="text-[10px] font-mono font-bold fill-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {pt.score} pts
                    </text>
                  </g>
                ))}
              </svg>

              <div className="flex justify-between text-[11px] text-[var(--text-faint)] px-2 pt-1 border-t border-[var(--border-muted)]">
                <span>First Attempt ({chartPoints.points[0]?.date})</span>
                <span>Latest Attempt ({chartPoints.points[chartPoints.points.length - 1]?.date})</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-surface-elevated)] flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Your growth journey starts here</p>
              <p className="text-xs text-[var(--text-faint)] mt-1 max-w-[240px]">
                Complete at least 2 tests to visualize your score trajectory and learning progress.
              </p>
              <button
                onClick={onGoToPractice}
                className="mt-5 px-4 py-2 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-xs font-bold transition-all cursor-pointer"
              >
                Start Your First Test
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Daily Goal & Streak Health Card */}
        <div
          className="p-5 sm:p-6 rounded-3xl border flex flex-col justify-between space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                <span>Daily Practice Goal</span>
              </span>
              <button
                type="button"
                onClick={onOpenStreakModal}
                className="text-[11px] font-semibold text-indigo-400 hover:underline cursor-pointer"
              >
                Calendar View
              </button>
            </div>

            <h3 className="text-xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
              {streakData.todayCompletedCount || 0} / {streakData.dailyGoal || 1} Tests Today
            </h3>
            <p className="text-xs text-[var(--text-faint)] mt-1">
              {streakData.todayPracticed
                ? 'Great work! You have completed today’s active training.'
                : 'Complete a test today to advance your streak.'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--bg-surface-elevated)] h-2.5 rounded-full overflow-hidden mt-4">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((streakData.todayCompletedCount || 0) / Math.max(1, streakData.dailyGoal || 1)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-xs text-orange-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
            <div className="leading-relaxed text-[11px]">
              A day counts as active only when you complete an exam. Multiple tests on the same day reinforce mastery without duplicating streak days.
            </div>
          </div>
        </div>
      </div>

      {/* Weak Subjects Requiring Improvement Section */}
      <div
        className="p-5 sm:p-6 rounded-3xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: weakSubjects.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-main)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold" style={{ color: 'var(--text-main)' }}>
                Weak Subjects Requiring Improvement
              </h2>
              <p className="text-xs text-[var(--text-faint)]">
                Topics where your accuracy is below 65% or score averages indicate logical traps
              </p>
            </div>
          </div>
        </div>

        {weakSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${attempts.length === 0 ? 'bg-[var(--bg-surface-elevated)] border-[var(--border-main)]' : 'bg-[var(--success)]/5 border-emerald-500/20'}`}>
               {attempts.length === 0 ? (
                 <AlertTriangle className="w-5 h-5 text-[var(--text-muted)]" />
               ) : (
                 <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
               )}
               <p className="text-xs font-medium" style={{ color: attempts.length === 0 ? 'var(--text-muted)' : 'var(--text-main)' }}>
                 {attempts.length === 0 
                   ? 'No weak subjects identified yet. Analysis requires test data.' 
                   : 'Outstanding! All subjects meet our proficiency standards.'}
               </p>
            </div>
            {attempts.length === 0 && (
              <button
                onClick={onGoToPractice}
                className="px-5 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold shadow-lg hover:brightness-110 transition-all cursor-pointer"
              >
                Start Diagnostic Test
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {weakSubjects.map((item) => (
              <div
                key={item.subject}
                className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                      Low Accuracy: {item.accuracy}%
                    </span>
                    <span className="text-[10px] text-[var(--text-faint)]">{item.testsCount} tests</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mt-1">{item.subject}</h4>
                  <p className="text-[11px] text-[var(--text-faint)] mt-0.5">
                    Avg score: <strong className="text-slate-200">{item.avgScore} pts</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onStartExamWithTopic(item.subject)}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Strengthen Topic Now</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject-Wise Performance Breakdown */}
      <div
        className="p-5 sm:p-6 rounded-3xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold" style={{ color: 'var(--text-main)' }}>
            Subject-Wise Performance Breakdown
          </h2>
          <span className="text-xs text-[var(--text-faint)]">{subjectPerformance.length} Subjects Evaluated</span>
        </div>

        {subjectPerformance.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface-elevated)] flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 opacity-20" />
            </div>
            <p className="text-xs text-[var(--text-faint)] max-w-[200px]">
              No subject records yet. Complete tests to build your subject mastery profile.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-[var(--text-faint)] font-semibold uppercase text-[10px]" style={{ borderColor: 'var(--border-muted)' }}>
                  <th className="pb-3 pl-1">Subject / Topic</th>
                  <th className="pb-3 text-center">Tests</th>
                  <th className="pb-3 text-center">Avg Score</th>
                  <th className="pb-3 text-center">Accuracy</th>
                  <th className="pb-3 text-center">Proficiency</th>
                  <th className="pb-3 text-right pr-1">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {subjectPerformance.map((row) => (
                  <tr key={row.subject} className="hover:bg-[var(--bg-surface-elevated)]/30 transition-colors">
                    <td className="py-3 pl-1 font-bold text-slate-200">{row.subject}</td>
                    <td className="py-3 text-center font-mono text-slate-300">{row.testsCount}</td>
                    <td className="py-3 text-center font-mono font-bold text-slate-100">{row.avgScore}</td>
                    <td className="py-3 text-center font-mono font-bold">
                      <span
                        className={
                          row.accuracy >= 75
                            ? 'text-emerald-400'
                            : row.accuracy >= 60
                            ? 'text-blue-400'
                            : 'text-rose-400'
                        }
                      >
                        {row.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.accuracy >= 75
                            ? 'bg-[var(--success)]/10 text-emerald-400 border border-emerald-500/20'
                            : row.accuracy >= 60
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {row.accuracy >= 75 ? 'Mastery' : row.accuracy >= 60 ? 'Proficient' : 'Needs Work'}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-1">
                      <button
                        type="button"
                        onClick={() => onStartExamWithTopic(row.subject)}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                      >
                        Practice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
