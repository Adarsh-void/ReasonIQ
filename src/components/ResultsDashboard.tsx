/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExamResult, ReviewedQuestion } from '../types/exam';
import {
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  ArrowRight,
  Download,
  Copy,
  RotateCcw,
  Flag,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  BarChart3,
  HelpCircle,
  FileText,
  Flame,
  BookOpen,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatTime } from '../utils/scoring';
import { getExamHistory } from '../utils/storage';
import { useStreak } from '../hooks/useStreak';
import { ReportQuestionModal } from './ReportQuestionModal';
import { FormattedExplanation } from './FormattedExplanation';

interface ResultsDashboardProps {
  result: ExamResult;
  onRetake: () => void;
  onNewExam: () => void;
  onViewAllAttempts?: () => void;
  onViewDashboard?: () => void;
}

interface RadarDataPoint {
  subject: string;
  score: number;
  fullMark: number;
  correct: number;
  total: number;
  notAttempted: number;
}

/**
 * Computes reasoning sub-category proficiency for the Radar Chart.
 * Maps questions to core analytical reasoning dimensions:
 * 1. Logical Deduction
 * 2. Verbal & Critical
 * 3. Numerical & Patterns
 * 4. Analytical Arrangements
 * 5. Spatial & Directional
 */
function computeReasoningProficiency(questions: ReviewedQuestion[]): RadarDataPoint[] {
  const categories = [
    {
      id: 'Logical',
      label: 'Logical Deduction',
      keywords: ['syllogism', 'deduct', 'conclusion', 'premise', 'assumption', 'logical', 'valid'],
    },
    {
      id: 'Verbal',
      label: 'Verbal & Critical',
      keywords: ['analogy', 'critical', 'statement', 'flaw', 'argument', 'verbal', 'inference'],
    },
    {
      id: 'Numerical',
      label: 'Numerical & Patterns',
      keywords: ['number', 'series', 'coding', 'decode', 'math', 'digit', 'calculation', 'data'],
    },
    {
      id: 'Analytical',
      label: 'Analytical Puzzles',
      keywords: ['seating', 'blood', 'relation', 'arrangement', 'puzzle', 'order', 'ranking'],
    },
    {
      id: 'Spatial',
      label: 'Spatial & Direction',
      keywords: ['direction', 'sense', 'distance', 'turn', 'north', 'south', 'east', 'west', 'clock'],
    },
  ];

  return categories.map((cat, catIdx) => {
    // Find matching questions or distribute systematically
    const matching = questions.filter((q) => {
      const text = `${q.topic} ${q.question}`.toLowerCase();
      return cat.keywords.some((kw) => text.includes(kw));
    });

    // Fallback distribution if test was on one specific topic
    const assignedQuestions =
      matching.length > 0
        ? matching
        : questions.filter((_, idx) => idx % categories.length === catIdx);

    const total = assignedQuestions.length || 1;
    const correct = assignedQuestions.filter((q) => q.isCorrect === true).length;
    const notAttempted = assignedQuestions.filter((q) => q.userSelectedOption === undefined).length;
    const attempted = total - notAttempted;

    // Proficiency calculated as (correct / total) * 100, weighted with positive scoring
    let score = Math.round((correct / total) * 100);
    if (attempted === 0) {
      score = 0; // Not attempted gets zero proficiency
    }

    return {
      subject: cat.label,
      score: Math.min(100, Math.max(0, score)),
      fullMark: 100,
      correct,
      total,
      notAttempted,
    };
  });
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  onRetake,
  onNewExam,
  onViewAllAttempts,
  onViewDashboard,
}) => {
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'correct' | 'not_attempted'>('all');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<{ id: string; num: number } | null>(null);

  const { streakCount, streakData } = useStreak();

  const percentageScore = result.maxMarks > 0 ? Math.round((result.totalScore / result.maxMarks) * 100) : 0;
  const radarData = computeReasoningProficiency(result.questions);

  const history = getExamHistory();
  const trendData = [...history]
    .reverse()
    .slice(-10)
    .map((h, idx) => ({
      examNumber: `#${idx + 1}`,
      topic: h.topic,
      score: h.totalScore,
      maxMarks: h.maxMarks,
      percentage: h.maxMarks > 0 ? Math.round((h.totalScore / h.maxMarks) * 100) : 0,
      date: new Date(h.dateAttempted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }));

  // Grade classification
  let performanceTier = 'Needs Practice';
  let tierBadgeColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  if (percentageScore >= 90) {
    performanceTier = 'Mastery / Top 1%';
    tierBadgeColor = 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/30';
  } else if (percentageScore >= 75) {
    performanceTier = 'Distinction / Competitive Ready';
    tierBadgeColor = 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30';
  } else if (percentageScore >= 50) {
    performanceTier = 'Proficient / Above Average';
    tierBadgeColor = 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30 opacity-80';
  }

  // Filter questions
  const filteredQuestions = result.questions.map((q, idx) => ({ q, originalNum: idx + 1 })).filter(({ q }) => {
    if (filter === 'incorrect') return q.isCorrect === false;
    if (filter === 'correct') return q.isCorrect === true;
    if (filter === 'not_attempted') return q.userSelectedOption === undefined;
    return true;
  });

  // Copy scorecard summary to clipboard
  const handleCopySummary = () => {
    const text = `📊 ReasonIQ Mock Exam Scorecard
Topic: ${result.topic} (${result.difficulty.toUpperCase()})
Score: ${result.totalScore} / ${result.maxMarks} (${percentageScore}%)
Accuracy: ${result.accuracy}%
Breakdown: ${result.correctCount} Correct, ${result.incorrectCount} Incorrect, ${result.unansweredCount} Not Attempted
Time: ${formatTime(result.timeTakenSeconds)}
Generated via ReasonIQ Engine`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleExportPDF = () => {
    const originalTitle = document.title;
    document.title = `ReasonIQ_Scorecard_${result.topic.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Hero Score Banner */}
      <div
        className="rounded-3xl border p-6 sm:p-10 shadow-2xl mb-8 relative overflow-hidden transition-all text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${tierBadgeColor}`}
            >
              {performanceTier}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {new Date(result.dateAttempted).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--text-main)' }}>
            Exam Scorecard: <span style={{ color: 'var(--accent)' }}>{result.topic}</span>
          </h1>

          <p className="text-xs sm:text-sm max-w-xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Marking logic applied: <strong style={{ color: 'var(--text-main)' }}>+{result.positiveMarks}</strong> per correct deduction,{' '}
            <strong style={{ color: 'var(--text-main)' }}>-{result.negativeMarks}</strong> per wrong answer, zero for questions not attempted.
          </p>
        </div>

        {/* Big Score Dial */}
        <div
          className="p-6 rounded-2xl border text-center min-w-[200px]"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-muted)',
          }}
        >
          <span className="text-xs uppercase font-extrabold tracking-wider block mb-1" style={{ color: 'var(--text-faint)' }}>
            Net Verified Score
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono-numbers" style={{ color: 'var(--accent)' }}>
            {result.totalScore}
            <span className="text-base font-semibold text-neutral-400"> / {result.maxMarks}</span>
          </div>
          <span className="text-xs font-semibold mt-1 block" style={{ color: 'var(--text-muted)' }}>
            {percentageScore}% Aggregated
          </span>
        </div>
      </div>

      {/* Daily Streak Status Banner */}
      <div
        className="p-3.5 sm:p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300"
        style={{
          background: 'var(--accent-light)',
          borderColor: 'var(--accent-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--warning)]/10 border border-[var(--warning)]/30 flex items-center justify-center text-[var(--warning)] shrink-0">
            <Flame className="w-6 h-6 animate-bounce" style={{ animationDuration: '2s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base" style={{ color: 'var(--warning)' }}>
                {streakCount} Active Days!
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--warning)]/20 border border-[var(--warning)]/30" style={{ color: 'var(--warning)' }}>
                Today Secured 🔥
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Daily analytical streak synchronized across your sessions. Practice tomorrow to keep the flame alive!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <span
            className="text-xs font-bold font-mono-numbers px-3 py-1.5 rounded-xl border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-muted)',
              color: 'var(--text-main)',
            }}
          >
            Best: {streakData.bestStreak} active days
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div
          className="p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-[var(--success)]" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Accuracy</span>
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-[var(--success)]">
            {result.accuracy}%
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            On attempted problems
          </span>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Correct</span>
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-emerald-400">
            {result.correctCount} <span className="text-xs text-neutral-500">/ {result.totalQuestions}</span>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            +{result.correctCount * result.positiveMarks} marks gained
          </span>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Incorrect</span>
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-red-400">
            {result.incorrectCount}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            -{Math.round(result.incorrectCount * result.negativeMarks * 100) / 100} penalty lost
          </span>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-main)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Not Attempted</span>
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-amber-500">
            {result.unansweredCount}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            Time: {formatTime(result.timeTakenSeconds)}
          </span>
        </div>
      </div>

      {/* RADAR CHART SECTION: Reasoning Sub-Category Proficiency */}
      <div
        className="rounded-3xl border p-6 sm:p-8 shadow-xl mb-8"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-muted)' }}>
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                Reasoning Sub-Category Proficiency Radar
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Multi-dimensional cognitive analysis across core analytical aptitude sub-domains
            </p>
          </div>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border self-start sm:self-auto"
            style={{
              backgroundColor: 'var(--accent-light)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent)',
            }}
          >
            Aptitude Mastery Map
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Radar Chart (7 cols) */}
          <div className="md:col-span-7 h-72 sm:h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="var(--border-main)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: 'var(--text-faint)', fontSize: 10 }}
                />
                <Radar
                  name="Proficiency %"
                  dataKey="score"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.35}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as RadarDataPoint;
                      return (
                        <div
                          className="p-3 rounded-xl border shadow-xl text-xs"
                          style={{
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderColor: 'var(--border-main)',
                            color: 'var(--text-main)',
                          }}
                        >
                          <p className="font-bold mb-1" style={{ color: 'var(--accent)' }}>
                            {data.subject}
                          </p>
                          <p>Proficiency: <strong>{data.score}%</strong></p>
                          <p>Correct: {data.correct} of {data.total}</p>
                          <p style={{ color: 'var(--warning)' }}>Not Attempted: {data.notAttempted}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Sub-Category Performance Metrics Legend (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>
              Sub-Domain Performance Breakdown
            </h3>
            {radarData.map((item) => (
              <div
                key={item.subject}
                className="p-3 rounded-xl border flex items-center justify-between text-xs transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-muted)',
                }}
              >
                <div>
                  <span className="font-semibold block" style={{ color: 'var(--text-main)' }}>
                    {item.subject}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {item.correct} correct · {item.notAttempted > 0 ? `${item.notAttempted} not attempted` : '0 not attempted'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono-numbers text-sm" style={{ color: 'var(--accent)' }}>
                    {item.score}%
                  </span>
                  <span className="text-[10px] block" style={{ color: 'var(--text-faint)' }}>
                    {item.score >= 80 ? 'Proficient' : item.score >= 50 ? 'Moderate' : 'Needs Focus'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SCORE TREND LINE CHART SECTION */}
      <div
        className="rounded-3xl border p-6 sm:p-8 shadow-xl mb-8"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-muted)' }}>
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                Score Trend (Last 10 Exams)
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Visualize your score progression and improvement over time
            </p>
          </div>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border self-start sm:self-auto"
            style={{
              backgroundColor: 'var(--accent-light)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent)',
            }}
          >
            Performance Analytics
          </span>
        </div>

        {trendData.length === 0 ? (
          <div className="text-center py-12 text-xs" style={{ color: 'var(--text-muted)' }}>
            No exam history available yet. Complete more exams to track your improvement trend!
          </div>
        ) : (
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border-muted)"
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border-muted)"
                  domain={[0, 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div
                          className="p-3 rounded-xl border shadow-xl text-xs"
                          style={{
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderColor: 'var(--border-main)',
                            color: 'var(--text-main)',
                          }}
                        >
                          <p className="font-bold mb-1" style={{ color: 'var(--accent)' }}>
                            {data.topic}
                          </p>
                          <p>Score: <strong>{data.score}</strong> / {data.maxMarks} ({data.percentage}%)</p>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>Date: {data.date}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--accent)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--accent)', r: 4 }}
                  activeDot={{ r: 6, stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Action Bar (Download, Copy, Retake) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-light)',
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            }}
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-main)',
              color: 'var(--text-main)',
            }}
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Copied!' : 'Copy Summary'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {onViewAllAttempts && (
            <button
              onClick={onViewAllAttempts}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
            >
              <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span>Past Attempts</span>
            </button>
          )}

          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dashboard</span>
            </button>
          )}

          <button
            onClick={onRetake}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-main)',
              color: 'var(--text-main)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake</span>
          </button>

          <button
            onClick={onNewExam}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-contrast)',
            }}
          >
            <span>New Exam</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Question Review Section */}
      <div
        className="rounded-3xl border p-6 sm:p-8 shadow-xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        {/* Section Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b mb-6" style={{ borderColor: 'var(--border-muted)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
              Comprehensive Question Review & Explanations
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Step-by-step logical proof and deductions for every problem
            </p>
          </div>

          {/* Filter Pills with explicit "Not Attempted" */}
          <div
            className="grid grid-cols-2 sm:flex sm:items-center p-1 rounded-xl border text-xs font-semibold no-print gap-1"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-muted)',
            }}
          >
            {(['all', 'incorrect', 'correct', 'not_attempted'] as const).map((mode) => {
              const active = filter === mode;
              const count =
                mode === 'all'
                  ? result.questions.length
                  : mode === 'incorrect'
                  ? result.incorrectCount
                  : mode === 'correct'
                  ? result.correctCount
                  : result.unansweredCount;

              const label =
                mode === 'all'
                  ? 'All'
                  : mode === 'incorrect'
                  ? 'Incorrect'
                  : mode === 'correct'
                  ? 'Correct'
                  : 'Unattempted';

              return (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className="py-1.5 px-3 rounded-lg capitalize transition-colors flex items-center justify-center gap-1.5 text-center"
                  style={{
                    backgroundColor: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--accent-contrast)' : 'var(--text-muted)',
                  }}
                >
                  <span>{label}</span>
                  <span className="text-[10px] opacity-75 font-mono-numbers">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
              No questions found for this filter.
            </div>
          ) : (
            filteredQuestions.map(({ q, originalNum }) => {
              const isAnswered = q.userSelectedOption !== undefined;
              const isCorrect = q.isCorrect === true;
              const optionLetters = ['A', 'B', 'C', 'D'];

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-muted)',
                  }}
                >
                  {/* Question Tag Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs"
                        style={{
                          backgroundColor: isCorrect
                            ? 'rgba(16, 185, 129, 0.2)'
                            : !isAnswered
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                          color: isCorrect ? '#10b981' : !isAnswered ? '#f59e0b' : '#ef4444',
                        }}
                      >
                        {originalNum}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {q.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <span className="text-xs font-bold text-[var(--success)] flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Correct (+{result.positiveMarks})
                        </span>
                      ) : !isAnswered ? (
                        <span className="text-xs font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <HelpCircle className="w-3.5 h-3.5" /> Not Attempted (0.0)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[var(--danger)] flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect (-{result.negativeMarks})
                        </span>
                      )}

                      <button
                        onClick={() => setReportingQuestion({ id: q.id, num: originalNum })}
                        className="p-1 rounded text-neutral-400 hover:text-amber-400 no-print"
                        title="Flag or report this question"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Statement */}
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-line mb-4" style={{ color: 'var(--text-main)' }}>
                    {q.question}
                  </p>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {q.options.map((optText, optIdx) => {
                      const isCorrectOption = optIdx === q.correctOptionIndex;
                      const isUserChoice = optIdx === q.userSelectedOption;

                      let optBg = 'var(--bg-surface)';
                      let optBorder = 'var(--border-muted)';
                      let optTextColor = 'var(--text-muted)';

                      if (isCorrectOption) {
                        optBg = 'rgba(16, 185, 129, 0.12)';
                        optBorder = '#10b981';
                        optTextColor = '#10b981';
                      } else if (isUserChoice && !isCorrect) {
                        optBg = 'rgba(239, 68, 68, 0.12)';
                        optBorder = '#ef4444';
                        optTextColor = '#ef4444';
                      }

                      return (
                        <div
                          key={optIdx}
                          className="p-3 rounded-xl border flex items-start gap-2.5 text-xs font-medium"
                          style={{
                            backgroundColor: optBg,
                            borderColor: optBorder,
                            color: optTextColor,
                          }}
                        >
                          <span className="font-bold shrink-0">
                            {optionLetters[optIdx]}.
                          </span>
                          <span className="flex-1">{optText}</span>
                          {isCorrectOption && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)]">
                              (Correct Key)
                            </span>
                          )}
                          {isUserChoice && !isCorrectOption && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--danger)]">
                              (Your Choice)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Status Banner when Question was Not Attempted */}
                  {!isAnswered && (
                    <div
                      className="p-2.5 rounded-xl border mb-4 text-xs font-semibold flex items-center gap-2"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        borderColor: 'rgba(245, 158, 11, 0.25)',
                        color: 'var(--warning)',
                      }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Not Attempted: This question was skipped during the test and awarded 0.0 marks.</span>
                    </div>
                  )}

                  {/* Formatted Step-by-Step Logic & Proof */}
                  <FormattedExplanation explanation={q.explanation} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Flag / Report Modal */}
      {reportingQuestion && (
        <ReportQuestionModal
          isOpen={true}
          onClose={() => setReportingQuestion(null)}
          examId={result.examId}
          questionId={reportingQuestion.id}
          questionNumber={reportingQuestion.num}
        />
      )}
    </div>
  );
};
