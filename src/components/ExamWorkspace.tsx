/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ClientQuestion,
  ExamConfig,
  CheckedAnswerResult,
} from '../types/exam';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Send,
  Flag,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Eye,
  Sliders,
  Filter,
  X,
  Grid,
} from 'lucide-react';
import { formatTime } from '../utils/scoring';
import { SubmitConfirmModal } from './SubmitConfirmModal';
import { ReportQuestionModal } from './ReportQuestionModal';
import { FormattedExplanation } from './FormattedExplanation';

interface ExamWorkspaceProps {
  examId: string;
  config: ExamConfig;
  questions: ClientQuestion[];
  onSubmitExam: (answers: Record<string, number>, timeTakenSeconds: number) => void;
  isSubmitting: boolean;
}

export const ExamWorkspace: React.FC<ExamWorkspaceProps> = ({
  examId,
  config,
  questions,
  onSubmitExam,
  isSubmitting,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  // Instant feedback tracking: map questionId -> CheckedAnswerResult
  const [instantCheckedAnswers, setInstantCheckedAnswers] = useState<
    Record<string, CheckedAnswerResult>
  >({});
  const [checkingAnswerId, setCheckingAnswerId] = useState<string | null>(null);

  // Modals & Drawers
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);

  // Timer state
  const totalDurationSeconds = config.durationMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalDurationSeconds);
  const [paletteFilter, setPaletteFilter] = useState<'all' | 'answered' | 'unanswered' | 'marked'>('all');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmitted = useRef(false);

  // Countdowns
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true;
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAutoSubmit = () => {
    const timeSpent = totalDurationSeconds - 0;
    onSubmitExam(answers, timeSpent);
  };

  const handleManualSubmitConfirm = () => {
    setIsSubmitModalOpen(false);
    const timeSpent = totalDurationSeconds - secondsRemaining;
    onSubmitExam(answers, timeSpent);
  };

  const currentQ = questions[currentIndex];
  const currentSelectedOption = currentQ ? answers[currentQ.id] : undefined;
  const isCurrentMarked = currentQ ? Boolean(markedForReview[currentQ.id]) : false;
  const currentCheckedResult = currentQ ? instantCheckedAnswers[currentQ.id] : undefined;
  const isCurrentChecked = Boolean(currentCheckedResult);

  // Select Option
  const handleSelectOption = (optionIndex: number) => {
    if (!currentQ) return;
    // In instant mode, if already checked, cannot change
    if (config.instantFeedback && isCurrentChecked) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  // Clear Response
  const handleClearResponse = () => {
    if (!currentQ) return;
    if (config.instantFeedback && isCurrentChecked) return;

    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  // Toggle Mark for Review
  const handleToggleMark = () => {
    if (!currentQ) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  // Desktop & Laptop Keyboard Shortcuts Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitModalOpen || isReportModalOpen || isMobilePaletteOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const optIndex = parseInt(e.key, 10) - 1;
        if (currentQ && (!config.instantFeedback || !isCurrentChecked)) {
          setAnswers((prev) => ({ ...prev, [currentQ.id]: optIndex }));
        }
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (currentQ) {
          setMarkedForReview((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
        }
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (currentQ && (!config.instantFeedback || !isCurrentChecked)) {
          setAnswers((prev) => {
            const copy = { ...prev };
            delete copy[currentQ.id];
            return copy;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questions.length, isSubmitModalOpen, isReportModalOpen, isMobilePaletteOpen, currentQ, isCurrentChecked]);

  // Instant Feedback: Check Answer
  const handleCheckAnswer = async () => {
    if (!currentQ || currentSelectedOption === undefined || isCurrentChecked) return;

    setCheckingAnswerId(currentQ.id);
    try {
      const response = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          questionId: currentQ.id,
          selectedOptionIndex: currentSelectedOption,
        }),
      });

      if (!response.ok) {
        throw new Error('Could not check answer.');
      }

      const result: CheckedAnswerResult = await response.json();
      setInstantCheckedAnswers((prev) => ({
        ...prev,
        [currentQ.id]: result,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAnswerId(null);
    }
  };

  // Calculate status counts
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  // Timer warning condition: < 2 minutes or < 15% of time remaining
  const isTimerCritical = secondsRemaining <= 120 || secondsRemaining <= totalDurationSeconds * 0.1;

  // Question navigation filters
  const filteredQuestionIndices = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q, idx }) => {
      const isAns = answers[q.id] !== undefined;
      const isMkd = Boolean(markedForReview[q.id]);
      if (paletteFilter === 'answered') return isAns;
      if (paletteFilter === 'unanswered') return !isAns;
      if (paletteFilter === 'marked') return isMkd;
      return true;
    });

  // Reusable Question Palette Box
  const renderPaletteBox = (isModalDrawer = false) => (
    <div
      className={`rounded-2xl border ${isModalDrawer ? 'p-4' : 'p-4 sm:p-5 shadow-xl'} flex flex-col h-full`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-main)',
      }}
    >
      {/* Palette Header & Filter Tabs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Filter className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Question Palette
          </h3>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            {answeredCount}/{questions.length} answered
          </span>
        </div>

        {/* Filter Tabs */}
        <div
          className="grid grid-cols-4 gap-1 p-1 rounded-xl border text-[11px] font-semibold text-center"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-muted)',
          }}
        >
          {(['all', 'answered', 'unanswered', 'marked'] as const).map((filter) => {
            const isFilterActive = paletteFilter === filter;
            const label = filter === 'unanswered' ? 'Unattempted' : filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setPaletteFilter(filter)}
                className="py-1 px-0.5 rounded-lg capitalize transition-colors text-[10.5px] truncate"
                style={{
                  backgroundColor: isFilterActive ? 'var(--accent)' : 'transparent',
                  color: isFilterActive ? 'var(--accent-contrast)' : 'var(--text-muted)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions Grid Numbers */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2 overflow-y-auto max-h-[340px] sm:max-h-[380px] p-1">
        {filteredQuestionIndices.map(({ q, idx }) => {
          const isCurrent = idx === currentIndex;
          const isAns = answers[q.id] !== undefined;
          const isMkd = Boolean(markedForReview[q.id]);

          let btnBg = 'var(--bg-surface-elevated)';
          let btnBorder = 'var(--border-muted)';
          let btnColor = 'var(--text-muted)';

          if (isMkd) {
            btnBg = 'var(--accent-light)';
            btnBorder = 'var(--accent)';
            btnColor = 'var(--accent)';
          } else if (isAns) {
            btnBg = 'rgba(16, 185, 129, 0.15)';
            btnBorder = 'var(--success)';
            btnColor = 'var(--success)';
          }

          if (isCurrent) {
            btnBorder = 'var(--accent)';
            btnColor = 'var(--accent)';
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                if (isModalDrawer) setIsMobilePaletteOpen(false);
              }}
              className="h-10 rounded-xl border text-xs font-mono-numbers font-bold flex items-center justify-center relative transition-all transform active:scale-95"
              style={{
                backgroundColor: btnBg,
                borderColor: btnBorder,
                color: btnColor,
                boxShadow: isCurrent ? '0 0 0 2px var(--accent)' : undefined,
              }}
              title={`Question ${idx + 1}`}
            >
              <span>{idx + 1}</span>
              {isMkd && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 absolute top-1 right-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Palette Legend */}
      <div
        className="mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-[11px]"
        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)]/20 border border-emerald-500 shrink-0" />
          <span className="truncate">Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500/20 border border-purple-500 shrink-0" />
          <span className="truncate">Marked ({markedCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700 shrink-0" />
          <span className="truncate">Unattempted ({questions.length - answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 shrink-0" style={{ borderColor: 'var(--accent)' }} />
          <span className="truncate">Current</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6 animate-in fade-in duration-200">
      {/* Top HUD: Sticky Exam Status & Live Timer */}
      <div
        className="rounded-2xl border p-3 sm:p-4 mb-3 sm:mb-5 shadow-md flex items-center justify-between gap-2 sm:gap-4 transition-colors sticky top-16 z-30"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        {/* Left: Exam Details & Progress */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider truncate max-w-[130px] sm:max-w-xs" style={{ color: 'var(--accent)' }}>
                {config.topic}
              </span>
              <span
                className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0"
                style={{
                  backgroundColor: 'var(--accent-light)',
                  borderColor: 'var(--accent-border)',
                  color: 'var(--accent)',
                }}
              >
                {config.instantFeedback ? 'Practice' : 'Strict'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <span>Q <strong style={{ color: 'var(--text-main)' }}>{currentIndex + 1}</strong> of {questions.length}</span>
              <span>·</span>
              <span className="hidden xs:inline">{answeredCount} Answered</span>
              {markedCount > 0 && (
                <>
                  <span className="hidden xs:inline">·</span>
                  <span className="text-purple-400">{markedCount} Marked</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Progress Bar (Desktop & Tablet) */}
        <div className="hidden lg:flex items-center gap-3 w-40 xl:w-48">
          <div className="flex-1 h-2 rounded-full overflow-hidden bg-neutral-800">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--accent)',
              }}
            />
          </div>
          <span className="text-xs font-mono-numbers font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
            {progressPercent}%
          </span>
        </div>

        {/* Right: Palette Toggle (Mobile), Timer & Submit Action */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Palette Button on Mobile */}
          <button
            type="button"
            onClick={() => setIsMobilePaletteOpen(true)}
            className="md:hidden px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-muted)',
              color: 'var(--text-main)',
            }}
            title="Open Question Palette"
          >
            <Grid className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[11px]">Grid</span>
          </button>

          {/* Countdown Clock */}
          <div
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono-numbers font-extrabold text-xs sm:text-base ${
              isTimerCritical ? 'animate-pulse text-[var(--danger)] border-red-500/50 bg-[var(--danger)]/10' : ''
            }`}
            style={{
              backgroundColor: isTimerCritical ? undefined : 'var(--bg-surface-elevated)',
              borderColor: isTimerCritical ? undefined : 'var(--border-main)',
              color: isTimerCritical ? undefined : 'var(--text-main)',
            }}
          >
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isTimerCritical ? 'text-[var(--danger)]' : 'text-[var(--accent)]'}`} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            disabled={isSubmitting}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Submit</span>
          </button>
        </div>
      </div>

      {/* Horizontal Quick Jump Bar for Phone & Small Screens */}
      <div
        className="md:hidden rounded-2xl border p-2 mb-3 sm:mb-4 flex items-center gap-1.5 overflow-x-auto shadow-xs"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <span className="text-[10px] uppercase font-bold px-1.5 py-1 text-[var(--accent)] shrink-0">
          Jump:
        </span>
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAns = answers[q.id] !== undefined;
          const isMkd = Boolean(markedForReview[q.id]);

          let chipBg = 'var(--bg-surface-elevated)';
          let chipBorder = 'var(--border-muted)';
          let chipColor = 'var(--text-muted)';

          if (isMkd) {
            chipBg = 'rgba(168, 85, 247, 0.2)';
            chipBorder = '#a855f7';
            chipColor = '#c084fc';
          } else if (isAns) {
            chipBg = 'rgba(16, 185, 129, 0.2)';
            chipBorder = '#10b981';
            chipColor = '#34d399';
          }

          if (isCurrent) {
            chipBorder = 'var(--accent)';
            chipColor = 'var(--accent)';
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className="w-8 h-8 rounded-lg border text-xs font-mono-numbers font-bold flex items-center justify-center shrink-0 relative transition-transform active:scale-90"
              style={{
                backgroundColor: chipBg,
                borderColor: chipBorder,
                color: chipColor,
                boxShadow: isCurrent ? '0 0 0 2px var(--accent)' : undefined,
              }}
              title={`Question ${idx + 1}`}
            >
              <span>{idx + 1}</span>
              {isMkd && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 absolute top-0.5 right-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Examination Workspace: Question Display + Sidebar Palette */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column (8 cols laptop, 7 cols tablet): Question Card */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-4">
          <div
            className="rounded-2xl border p-6 sm:p-8 shadow-xl flex-1 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-main)',
            }}
          >
            {/* Question Header */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-muted)' }}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                    }}
                  >
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {currentQ.topic}
                  </span>
                  <span
                    className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-muted)',
                      color: 'var(--text-faint)',
                    }}
                  >
                    {currentQ.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="p-1.5 rounded-lg text-xs text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                    title="Report ambiguity or defect in this question"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Report Question</span>
                  </button>
                </div>
              </div>

              {/* Question Statement */}
              <div className="mb-6">
                <h2
                  className="text-base sm:text-lg font-medium leading-relaxed whitespace-pre-line"
                  style={{ color: 'var(--text-main)' }}
                >
                  {currentQ.question}
                </h2>
              </div>

              {/* Options List */}
              <div className="space-y-3 mb-6">
                {currentQ.options.map((optionText, optIndex) => {
                  const isSelected = currentSelectedOption === optIndex;
                  const optionLetters = ['A', 'B', 'C', 'D'];

                  // If instant mode checked
                  const isCheckedCorrect = isCurrentChecked && optIndex === currentCheckedResult?.correctOptionIndex;
                  const isCheckedWrong = isCurrentChecked && isSelected && !currentCheckedResult?.isCorrect;

                  let optionBg = 'var(--bg-surface-elevated)';
                  let optionBorder = 'var(--border-main)';
                  let textColor = 'var(--text-main)';

                  if (isCheckedCorrect) {
                    optionBg = 'rgba(16, 185, 129, 0.15)';
                    optionBorder = '#10b981';
                    textColor = '#10b981';
                  } else if (isCheckedWrong) {
                    optionBg = 'rgba(239, 68, 68, 0.15)';
                    optionBorder = '#ef4444';
                    textColor = '#ef4444';
                  } else if (isSelected) {
                    optionBg = 'var(--accent-light)';
                    optionBorder = 'var(--accent)';
                    textColor = 'var(--accent)';
                  }

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() => handleSelectOption(optIndex)}
                      disabled={config.instantFeedback && isCurrentChecked}
                      className="w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer hover:border-[var(--accent)] group disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: optionBg,
                        borderColor: optionBorder,
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 font-bold text-xs transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border-main)',
                          color: isSelected ? 'var(--accent-contrast)' : 'var(--text-faint)',
                        }}
                      >
                        {optionLetters[optIndex]}
                      </div>
                      <span className="text-sm font-medium flex-1 pt-0.5" style={{ color: textColor }}>
                        {optionText}
                      </span>
                      {isCheckedCorrect && <CheckCircle className="w-5 h-5 text-[var(--success)] shrink-0" />}
                      {isCheckedWrong && <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Instant Feedback Explanation Banner */}
              {config.instantFeedback && (
                <div className="mb-6">
                  {!isCurrentChecked ? (
                    <button
                      onClick={handleCheckAnswer}
                      disabled={currentSelectedOption === undefined || checkingAnswerId === currentQ.id}
                      className="px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--accent)',
                        color: 'var(--accent)',
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      <span>{checkingAnswerId === currentQ.id ? 'Checking...' : 'Check Answer & View Explanation'}</span>
                    </button>
                  ) : (
                    <div
                      className="p-4 rounded-xl border animate-in fade-in"
                      style={{
                        backgroundColor: currentCheckedResult?.isCorrect
                          ? 'rgba(16, 185, 129, 0.08)'
                          : 'rgba(239, 68, 68, 0.08)',
                        borderColor: currentCheckedResult?.isCorrect ? '#10b981' : '#ef4444',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2 font-bold text-xs">
                        {currentCheckedResult?.isCorrect ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                            <span className="text-[var(--success)]">Correct! Option {['A', 'B', 'C', 'D'][currentCheckedResult.correctOptionIndex]} is right.</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-[var(--danger)]" />
                            <span className="text-[var(--danger)]">Incorrect. The correct choice is Option {currentCheckedResult ? ['A', 'B', 'C', 'D'][currentCheckedResult.correctOptionIndex] : ''}.</span>
                          </>
                        )}
                      </div>
                      <FormattedExplanation explanation={currentCheckedResult?.explanation || ''} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Question Actions Toolbar */}
            <div
              className="pt-4 border-t flex flex-wrap items-center justify-between gap-2 sm:gap-3 mt-4"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMark}
                  className={`px-2.5 sm:px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    isCurrentMarked
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                      : 'text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: isCurrentMarked ? undefined : 'var(--bg-surface-elevated)',
                    borderColor: isCurrentMarked ? undefined : 'var(--border-main)',
                  }}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{isCurrentMarked ? 'Marked' : 'Mark for Review'}</span>
                  <span className="xs:hidden">{isCurrentMarked ? 'Marked' : 'Mark'}</span>
                </button>

                {currentSelectedOption !== undefined && (!config.instantFeedback || !isCurrentChecked) && (
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="px-2.5 sm:px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}

                {/* Desktop keyboard hint */}
                <span className="hidden xl:inline text-[11px] font-mono-numbers ml-2" style={{ color: 'var(--text-faint)' }}>
                  Keys: ←/→ Navigate · 1-4 Options · M Mark · C Clear
                </span>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-3 sm:px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden xs:inline">Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 bg-emerald-600 text-white hover:bg-[var(--success)]"
                  >
                    <span>Finish Exam</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Question Palette Navigator (Side-by-side on tablet & laptop) */}
        <div className="hidden md:flex md:col-span-5 lg:col-span-4 flex flex-col gap-4">
          {renderPaletteBox(false)}
        </div>
      </div>

      {/* Inline Question Palette on Mobile (scroll down to view) */}
      <div className="md:hidden mt-4">
        {renderPaletteBox(false)}
      </div>

      {/* Mobile Drawer/Modal Overlay for Palette */}
      {isMobilePaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobilePaletteOpen(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border p-4 sm:p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-main)',
            }}
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b" style={{ borderColor: 'var(--border-muted)' }}>
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                  Question Navigation Palette
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePaletteOpen(false)}
                className="p-1.5 rounded-xl border text-neutral-400 hover:text-white"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-muted)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderPaletteBox(true)}
          </div>
        </div>
      )}

      {/* Confirmation & Reporting Modals */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleManualSubmitConfirm}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        markedCount={markedCount}
        secondsRemaining={secondsRemaining}
        isSubmitting={isSubmitting}
      />

      {currentQ && (
        <ReportQuestionModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          examId={examId}
          questionId={currentQ.id}
          questionNumber={currentIndex + 1}
        />
      )}
    </div>
  );
};
