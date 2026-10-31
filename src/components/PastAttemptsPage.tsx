/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  History,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Eye,
  BookOpen,
  ArrowRight,
  ChevronRight,
  X,
  Target,
  FileQuestion,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { ExamConfig, ExamResult } from '../types/exam';
import { LocalAttemptRecord } from '../utils/localDatabase';
import { formatTime } from '../utils/scoring';
import { FormattedExplanation } from './FormattedExplanation';

interface PastAttemptsPageProps {
  attempts: LocalAttemptRecord[];
  onOpenAttempt?: (attempt: LocalAttemptRecord) => void;
  onRetryTest: (config: ExamConfig) => void;
  onStartNewExam: () => void;
  onDeleteAttempt?: (attemptId: string) => void;
}

export const PastAttemptsPage: React.FC<PastAttemptsPageProps> = ({
  attempts,
  onRetryTest,
  onStartNewExam,
  onDeleteAttempt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'score-desc' | 'score-asc' | 'accuracy-desc'>('date-desc');
  const [selectedAttemptForReview, setSelectedAttemptForReview] = useState<LocalAttemptRecord | null>(null);
  const [attemptToDelete, setAttemptToDelete] = useState<string | null>(null);

  // Extract unique subjects from attempts
  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    attempts.forEach((a) => {
      if (a.subject) set.add(a.subject);
      else if (a.testName) set.add(a.testName);
    });
    return Array.from(set).sort();
  }, [attempts]);

  // Filter & Sort logic
  const filteredAttempts = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return attempts
      .filter((item) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesName = item.testName.toLowerCase().includes(q);
          const matchesSub = item.subject.toLowerCase().includes(q);
          if (!matchesName && !matchesSub) return false;
        }

        // Subject filter
        if (selectedSubject !== 'all') {
          if (item.subject !== selectedSubject && item.testName !== selectedSubject) {
            return false;
          }
        }

        // Date filter
        if (dateFilter !== 'all') {
          const itemDate = new Date(item.completedAt);
          if (dateFilter === 'today') {
            if (item.completedAt.slice(0, 10) !== todayStr) return false;
          } else if (dateFilter === '7days') {
            if (itemDate < sevenDaysAgo) return false;
          } else if (dateFilter === '30days') {
            if (itemDate < thirtyDaysAgo) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
        }
        if (sortBy === 'score-desc') {
          return b.score - a.score;
        }
        if (sortBy === 'score-asc') {
          return a.score - b.score;
        }
        if (sortBy === 'accuracy-desc') {
          return b.accuracy - a.accuracy;
        }
        return 0;
      });
  }, [attempts, searchTerm, selectedSubject, dateFilter, sortBy]);

  // Overall Statistics
  const stats = useMemo(() => {
    if (attempts.length === 0) {
      return { total: 0, avgScore: 0, highestScore: 0, avgAccuracy: 0 };
    }
    const total = attempts.length;
    const highestScore = Math.max(...attempts.map((a) => a.score));
    const avgScore = Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / total);
    const avgAccuracy = Math.round(attempts.reduce((sum, a) => sum + a.accuracy, 0) / total);
    return { total, avgScore, highestScore, avgAccuracy };
  }, [attempts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-muted)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
            }}
          >
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
              Past Attempts History
            </h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Complete record of all test submissions, answers, scores, and explanations stored locally on this device.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartNewExam}
          className="px-4 py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-contrast)',
          }}
        >
          <span>Start New Test</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          className="p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Total Attempts</div>
          <div className="text-2xl sm:text-3xl font-black font-mono-numbers mt-1" style={{ color: 'var(--text-main)' }}>
            {stats.total}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Saved in Local IndexedDB</div>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Average Score</div>
          <div className="text-2xl sm:text-3xl font-black font-mono-numbers mt-1 text-[var(--success)]">
            {stats.avgScore} <span className="text-xs font-normal text-[var(--text-faint)]">pts</span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Across all tests</div>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Highest Score</div>
          <div className="text-2xl sm:text-3xl font-black font-mono-numbers mt-1 text-blue-500">
            {stats.highestScore} <span className="text-xs font-normal text-[var(--text-faint)]">pts</span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Personal best score</div>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Average Accuracy</div>
          <div className="text-2xl sm:text-3xl font-black font-mono-numbers mt-1 text-amber-500">
            {stats.avgAccuracy}%
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Precision rate</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-faint)] pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by test name or subject..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-[var(--text-faint)] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full py-2 px-2.5 text-xs rounded-xl border outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
            >
              <option value="all">All Subjects ({attempts.length})</option>
              {uniqueSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full py-2 px-2.5 text-xs rounded-xl border outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-2.5 text-xs rounded-xl border outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
            >
              <option value="date-desc">Date: Newest First</option>
              <option value="date-asc">Date: Oldest First</option>
              <option value="score-desc">Score: Highest First</option>
              <option value="score-asc">Score: Lowest First</option>
              <option value="accuracy-desc">Accuracy: Highest First</option>
            </select>
          </div>
        </div>

        {/* Active filter count indicator */}
        <div className="flex items-center justify-between text-[11px] pt-1" style={{ color: 'var(--text-muted)' }}>
          <span>
            Showing <strong style={{ color: 'var(--text-main)' }}>{filteredAttempts.length}</strong> of{' '}
            {attempts.length} attempts
          </span>
          {(searchTerm || selectedSubject !== 'all' || dateFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedSubject('all');
                setDateFilter('all');
              }}
              className="text-indigo-400 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Attempts List */}
      {filteredAttempts.length === 0 ? (
        <div
          className="text-center py-16 rounded-3xl border p-8"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
            No matching attempts found
          </h3>
          <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: 'var(--text-muted)' }}>
            {attempts.length === 0
              ? 'Complete a test or practice session to start tracking your learning attempts here.'
              : 'Try clearing your search term or adjusting filters to see other attempts.'}
          </p>
          {attempts.length === 0 && (
            <button
              type="button"
              onClick={onStartNewExam}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
              }}
            >
              Take Your First Test
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAttempts.map((item) => {
            const formattedDate = new Date(item.completedAt).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <motion.div
                key={item.attemptId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-5 rounded-2xl border transition-all hover:border-[var(--accent)]/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-main)',
                }}
              >
                {/* Left: Info & Topic */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'var(--accent-light)',
                        color: 'var(--accent)',
                      }}
                    >
                      {item.subject}
                    </span>
                    <span className="text-xs flex items-center gap-1 text-[var(--text-faint)]">
                      <Clock className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--text-main)' }}>
                    {item.testName}
                  </h3>

                  {/* Badges / Stats pills */}
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                    <span className="flex items-center gap-1 font-semibold text-[var(--success)]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{item.correctAnswers} Correct</span>
                    </span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="flex items-center gap-1 font-semibold text-rose-500">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{item.incorrectAnswers} Incorrect</span>
                    </span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="flex items-center gap-1 font-semibold text-[var(--text-faint)]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{item.unansweredQuestions} Unanswered</span>
                    </span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="text-[var(--text-faint)]">
                      Time: <strong style={{ color: 'var(--text-main)' }}>{formatTime(item.timeTaken)}</strong>
                    </span>
                  </div>
                </div>

                {/* Middle: Score & Percentage */}
                <div className="flex items-center gap-4 shrink-0 md:px-4 md:border-l md:border-r" style={{ borderColor: 'var(--border-muted)' }}>
                  <div className="text-left md:text-right">
                    <div className="text-lg sm:text-xl font-black font-mono-numbers" style={{ color: 'var(--text-main)' }}>
                      {item.score} <span className="text-xs font-normal opacity-60">/ {item.maxMarks}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-[var(--text-faint)]">Score Obtained</div>
                  </div>

                  <div
                    className="px-3 py-1.5 rounded-xl font-black font-mono text-xs flex items-center justify-center border"
                    style={{
                      backgroundColor:
                        item.accuracy >= 75
                          ? 'rgba(16, 185, 129, 0.12)'
                          : item.accuracy >= 50
                          ? 'rgba(59, 130, 246, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                      borderColor:
                        item.accuracy >= 75
                          ? 'rgba(16, 185, 129, 0.3)'
                          : item.accuracy >= 50
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)',
                      color:
                        item.accuracy >= 75
                          ? '#10b981'
                          : item.accuracy >= 50
                          ? '#3b82f6'
                          : '#ef4444',
                    }}
                  >
                    {item.accuracy}%
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedAttemptForReview(item)}
                    className="px-3 py-2 rounded-xl border text-xs font-bold transition-all hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-main)',
                    }}
                    title="Review Questions & Detailed Explanations"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    <span>Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRetryTest(item.config)}
                    className="px-3 py-2 rounded-xl border text-xs font-bold transition-all hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--accent-light)',
                      borderColor: 'var(--accent)',
                      color: 'var(--accent)',
                    }}
                    title="Retry this exam topic"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Test</span>
                  </button>

                  {onDeleteAttempt && (
                    <button
                      type="button"
                      onClick={() => setAttemptToDelete(item.attemptId)}
                      className="p-2 rounded-xl border text-xs font-bold transition-all hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--text-faint)] hover:text-rose-500 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-main)',
                      }}
                      title="Delete this test attempt record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Question-Wise Answer Review Modal */}
      <AnimatePresence>
        {selectedAttemptForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-[var(--bg-app)]/75 backdrop-blur-sm"
              onClick={() => setSelectedAttemptForReview(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[88vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col z-10"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-muted)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'var(--accent-light)',
                        color: 'var(--accent)',
                      }}
                    >
                      {selectedAttemptForReview.subject}
                    </span>
                    <span className="text-xs text-[var(--text-faint)]">
                      {new Date(selectedAttemptForReview.completedAt).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                    {selectedAttemptForReview.testName} - Answer Review
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRetryTest(selectedAttemptForReview.config)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAttemptForReview(null)}
                    className="p-1.5 rounded-xl border hover:opacity-80 cursor-pointer"
                    style={{
                      borderColor: 'var(--border-muted)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Questions Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
                {selectedAttemptForReview.questionResponses && selectedAttemptForReview.questionResponses.length > 0 ? (
                  selectedAttemptForReview.questionResponses.map((q, idx) => {
                    const isAnswered = typeof q.userSelectedOption === 'number';
                    const isCorrect = q.isCorrect;

                    return (
                      <div
                        key={q.id || idx}
                        className="p-4 sm:p-5 rounded-2xl border space-y-3.5"
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderColor: isCorrect
                            ? 'rgba(16, 185, 129, 0.4)'
                            : isAnswered
                            ? 'rgba(239, 68, 68, 0.4)'
                            : 'var(--border-main)',
                        }}
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-[var(--bg-surface-elevated)] text-[var(--text-main)] border border-[var(--border-muted)]">
                              Q{idx + 1}
                            </span>
                            <span className="text-[11px] font-semibold text-[var(--text-faint)] capitalize">
                              {q.difficulty} Level
                            </span>
                          </div>

                          <div className="shrink-0">
                            {isCorrect ? (
                              <span className="px-2.5 py-1 rounded-full bg-[var(--success)]/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Correct (+{selectedAttemptForReview.config?.positiveMarks || 2})</span>
                              </span>
                            ) : isAnswered ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Incorrect (-{selectedAttemptForReview.config?.negativeMarks || 0.5})</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/30 text-[var(--text-faint)] text-xs font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Unanswered (0)</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Question Text */}
                        <p className="text-xs sm:text-sm font-semibold leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-main)' }}>
                          {q.question}
                        </p>

                        {/* Options List */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, optIdx) => {
                            const isUserChoice = q.userSelectedOption === optIdx;
                            const isCorrectOpt = q.correctOptionIndex === optIdx;

                            let optBg = 'var(--bg-surface)';
                            let optBorder = 'var(--border-muted)';
                            let optColor = 'var(--text-main)';

                            if (isCorrectOpt) {
                              optBg = 'rgba(16, 185, 129, 0.12)';
                              optBorder = '#10b981';
                              optColor = '#10b981';
                            } else if (isUserChoice && !isCorrect) {
                              optBg = 'rgba(239, 68, 68, 0.12)';
                              optBorder = '#ef4444';
                              optColor = '#ef4444';
                            }

                            return (
                              <div
                                key={optIdx}
                                className="p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2"
                                style={{
                                  backgroundColor: optBg,
                                  borderColor: optBorder,
                                  color: optColor,
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] border border-[var(--border-muted)]">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="leading-tight">{opt}</span>
                                </div>

                                {isCorrectOpt && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">
                                    Correct Answer
                                  </span>
                                )}
                                {isUserChoice && !isCorrectOpt && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 shrink-0">
                                    Your Choice
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div
                            className="p-3.5 rounded-xl border mt-2"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-muted)',
                            }}
                          >
                            <FormattedExplanation explanation={q.explanation} />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-[var(--text-faint)] text-xs">
                    Detailed question-wise responses were not stored for this older attempt.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Attempt Confirmation Modal */}
      <AnimatePresence>
        {attemptToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm"
              onClick={() => setAttemptToDelete(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm rounded-3xl border border-rose-500/40 p-6 shadow-2xl z-10 space-y-4 text-center"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-black text-rose-500">Delete Attempt?</h3>
                <p className="text-xs text-[var(--text-faint)] mt-1">
                  This test attempt record will be permanently deleted from your local storage.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAttemptToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
                  style={{
                    borderColor: 'var(--border-muted)',
                    color: 'var(--text-main)',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (attemptToDelete && onDeleteAttempt) {
                      onDeleteAttempt(attemptToDelete);
                    }
                    setAttemptToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
