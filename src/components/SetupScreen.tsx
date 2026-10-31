/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExamConfig, DifficultyLevel, ExamTheme, UserProfile } from '../types/exam';
import { getTimeBasedGreeting } from '../utils/storage';
import {
  Sparkles,
  Clock,
  HelpCircle,
  Award,
  AlertCircle,
  Shuffle,
  Sliders,
  CheckCircle2,
  Zap,
  Target,
  ArrowRight,
  Search,
  Flame,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useStreak } from '../hooks/useStreak';

interface SetupScreenProps {
  onStartExam: (config: ExamConfig) => void;
  isLoading: boolean;
  currentTheme: ExamTheme;
  onThemeSelect: (theme: ExamTheme) => void;
  currentUser: UserProfile | null;
}

export interface TopicSuggestion {
  name: string;
  category: 'Logical' | 'Verbal' | 'Numerical' | 'Analytical' | 'Spatial' | 'Non-Verbal';
  desc: string;
}

export const ALL_REASONING_TOPICS: TopicSuggestion[] = [
  // 1. Analytical & Relational Reasoning
  { name: 'Blood Relations', category: 'Analytical', desc: 'Family trees, coded equations (A+B), maternal and paternal lineages' },
  { name: 'Blood Relations: Coded Equations', category: 'Analytical', desc: 'Symbolic equations (e.g., P × Q means P is brother of Q)' },
  { name: 'Blood Relations: Pointer Type', category: 'Analytical', desc: 'Pointing to a portrait/photograph deduction statements' },
  { name: 'Seating Arrangements: Linear', category: 'Analytical', desc: 'Single row, parallel rows, facing North and South' },
  { name: 'Seating Arrangements: Circular', category: 'Analytical', desc: 'Facing inward, outward, and alternating orientations' },
  { name: 'Seating Arrangements: Square & Polygon', category: 'Analytical', desc: 'Corner vs side positions with multi-variable constraints' },
  { name: 'Complex Floor & Box Puzzles', category: 'Analytical', desc: 'Multi-story buildings, stacked box orders, variable allocation' },
  { name: 'Scheduling & Calendar Puzzles', category: 'Analytical', desc: 'Days, months, time slot matrices, and event sequencing' },
  { name: 'Order and Ranking', category: 'Analytical', desc: 'Total members in row, position swaps, ranking from top/bottom' },
  { name: 'Matrix & Tabulation Puzzles', category: 'Analytical', desc: 'Cross-attribute matching (person, profession, city, color)' },

  // 2. Logical Deduction & Rules
  { name: 'Syllogisms', category: 'Logical', desc: 'Venn diagrams, some/all/no/some-not premises, possibility cases' },
  { name: 'Reverse Syllogisms', category: 'Logical', desc: 'Deriving the valid set of statements from given conclusions' },
  { name: 'Coded Inequalities', category: 'Logical', desc: 'Definite vs possible relationships with @, #, $, %, & symbols' },
  { name: 'Data Sufficiency: 2-Statement', category: 'Logical', desc: 'Deciding whether statement (1) or (2) alone or together suffice' },
  { name: 'Data Sufficiency: 3-Statement', category: 'Logical', desc: 'Advanced multi-statement sufficiency for competitive exams' },
  { name: 'Input-Output Machine', category: 'Logical', desc: 'Step-by-step algorithmic shifting of alphanumeric tokens' },
  { name: 'Venn Diagrams: Logical Intersections', category: 'Logical', desc: 'Finding common counts in overlapping geometric sets' },
  { name: 'Binary Logic: Truth Tellers & Liars', category: 'Logical', desc: 'Knights, knaves, and alternators resolving mutually exclusive claims' },
  { name: 'Deductive and Inductive Reasoning', category: 'Logical', desc: 'Universal axioms to specific instances versus empirical patterns' },
  { name: 'Classification and Odd One Out', category: 'Logical', desc: 'Identifying anomalous elements in verbal or conceptual clusters' },

  // 3. Verbal & Critical Reasoning
  { name: 'Statement & Assumption', category: 'Verbal', desc: 'Identifying implicit unstated premises required for validity' },
  { name: 'Statement & Conclusion', category: 'Verbal', desc: 'Direct factual inferences without unwarranted external assumptions' },
  { name: 'Statement & Argument: Strong vs Weak', category: 'Verbal', desc: 'Differentiating well-founded rationales from mere assertions' },
  { name: 'Statement & Course of Action', category: 'Verbal', desc: 'Pragmatic and administrative solutions to practical crises' },
  { name: 'Cause and Effect', category: 'Verbal', desc: 'Immediate cause, direct effect, common causes, or independent events' },
  { name: 'Critical Reasoning: Strengthen / Weaken', category: 'Verbal', desc: 'Evaluating evidence that bolsters or undermines an argument' },
  { name: 'Critical Reasoning: Flaw in Reasoning', category: 'Verbal', desc: 'Identifying logical fallacies, circular arguments, and correlation traps' },
  { name: 'Critical Reasoning: Paradox & Discrepancy', category: 'Verbal', desc: 'Resolving apparent conflicts between observed facts' },
  { name: 'Analogies: Semantic & Conceptual', category: 'Verbal', desc: 'Worker-tool, function, intensity, and hierarchical word pairs' },

  // 4. Numerical & Pattern Reasoning
  { name: 'Coding-Decoding', category: 'Numerical', desc: 'Alphabet position shifting, substitution, and matrix ciphering' },
  { name: 'Coding-Decoding: Alphanumeric & Symbols', category: 'Numerical', desc: 'Complex substitution tables, binary codes, conditional rules' },
  { name: 'Number Series & Difference Analysis', category: 'Numerical', desc: 'Arithmetic, geometric, quadratic differences, prime progressions' },
  { name: 'Alphabet Series & Letter Clustering', category: 'Numerical', desc: 'Skip steps, palindromic orders, repeated letter patterns' },
  { name: 'Missing Number in Matrix / Figure', category: 'Numerical', desc: 'Finding the hidden arithmetic formula in numeric grids' },
  { name: 'Data Interpretation: Tables & Matrices', category: 'Numerical', desc: 'Cross-tabulation, percentage change, and ratio evaluations' },
  { name: 'Data Interpretation: Graphs & Charts', category: 'Numerical', desc: 'Bar graphs, line charts, pie distributions, degree-to-percent' },
  { name: 'Cryptarithmetic & Alphametic Puzzles', category: 'Numerical', desc: 'Assigning digits 0-9 to unique letters in arithmetic equations' },

  // 5. Spatial, Directional & Non-Verbal
  { name: 'Direction Sense', category: 'Spatial', desc: 'Compass headings, successive turns, shadows at sunrise/sunset' },
  { name: 'Direction & Pythagorean Distance', category: 'Spatial', desc: 'Shortest aerial displacement vectors and coordinate math' },
  { name: 'Clock and Calendar Reasoning', category: 'Spatial', desc: 'Angle between hands, gains/losses, leap years, odd days' },
  { name: 'Cube and Dice Problems', category: 'Spatial', desc: 'Opposite faces, unfolded nets, multi-colored cube cuts' },
  { name: 'Non-Verbal: Mirror & Water Images', category: 'Non-Verbal', desc: 'Horizontal and vertical symmetry reflections of figures' },
  { name: 'Non-Verbal: Paper Folding and Cutting', category: 'Non-Verbal', desc: 'Visualizing hole punches upon unfolding paper matrices' },
  { name: 'Non-Verbal: Embedded Figures & Completion', category: 'Non-Verbal', desc: 'Spotting hidden geometry and completing 3×3 matrix patterns' },
];

const QUICK_PRESET_PILLS = [
  'Blood Relations',
  'Syllogisms',
  'Coding-Decoding',
  'Direction Sense',
  'Seating Arrangements',
  'Number Series',
  'Data Sufficiency',
  'Critical Reasoning',
  'Order and Ranking',
  'Statement & Assumption',
  'Cube and Dice Problems',
  'Clock and Calendar Reasoning',
];

const QUESTION_COUNT_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50];

const DIFFICULTY_CONFIGS: {
  id: DifficultyLevel;
  label: string;
  badge: string;
  description: string;
}[] = [
  {
    id: 'easy',
    label: 'Easy',
    badge: 'Foundational',
    description: 'Direct single-step deduction, clear clues.',
  },
  {
    id: 'medium',
    label: 'Medium',
    badge: 'Standard',
    description: 'Multi-step logic, standard campus & placement benchmark.',
  },
  {
    id: 'hard',
    label: 'Hard',
    badge: 'Advanced',
    description: 'Challenging conditions, distractor traps, multi-variable logic.',
  },
  {
    id: 'competitive',
    label: 'Competitive Exam',
    badge: 'Pro Tier',
    description: 'Rigorous CAT, GMAT, Bank PO, UPSC CSAT benchmark.',
  },
  {
    id: 'mixed',
    label: 'Mixed Difficulty',
    badge: 'Adaptive',
    description: 'Balanced mix from foundational to competitive questions.',
  },
];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  onStartExam,
  isLoading,
  currentTheme,
  currentUser,
}) => {
  const [topic, setTopic] = useState('Blood Relations');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [customQuestionCount, setCustomQuestionCount] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [positiveMarks, setPositiveMarks] = useState<number>(2);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  const { streakCount, streakData } = useStreak(currentUser?.email);

  // Dynamic filter as the user types and category filter
  const query = topic.toLowerCase().trim();
  const filteredSuggestions = ALL_REASONING_TOPICS.filter((item) => {
    if (selectedCategoryFilter !== 'All' && item.category !== selectedCategoryFilter) {
      return false;
    }
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query)
    );
  }).slice(0, 12);

  const handleSelectSuggestion = (suggested: TopicSuggestion) => {
    setTopic(suggested.name);
    setShowSuggestions(false);
    if (formError) setFormError(null);
  };

  const handleQuestionCountSelect = (count: number) => {
    setQuestionCount(count);
    setCustomQuestionCount('');
    setDurationMinutes(Math.max(5, Math.round(count * 1.5)));
  };

  const handleCustomQuestionCountChange = (val: string) => {
    setCustomQuestionCount(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 50) {
      setQuestionCount(num);
      setDurationMinutes(Math.max(5, Math.round(num * 1.5)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setFormError('Please enter a reasoning topic or choose from the suggestions.');
      return;
    }
    if (questionCount < 1 || questionCount > 50) {
      setFormError('Number of questions must be between 1 and 50.');
      return;
    }
    if (durationMinutes < 1 || durationMinutes > 180) {
      setFormError('Exam duration must be between 1 and 180 minutes.');
      return;
    }

    setFormError(null);
    onStartExam({
      topic: topic.trim(),
      questionCount,
      durationMinutes,
      positiveMarks,
      negativeMarks,
      difficulty,
      shuffleOptions,
      instantFeedback,
      theme: currentTheme,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      {/* Hero Headline */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        {currentUser && (
          <div className="mb-4 text-sm font-bold flex items-center justify-center gap-2 flex-wrap" style={{ color: 'var(--accent)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
            <span>{getTimeBasedGreeting(currentUser.firstName || currentUser.name.split(' ')[0])}</span>
            {currentUser.examGoal && (
              <span className="text-[11px] font-normal opacity-85 px-2.5 py-0.5 rounded-full border" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}>
                Goal: {currentUser.examGoal}
              </span>
            )}
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs"
              style={{
                borderColor: streakData.todayPracticed ? 'rgba(249, 115, 22, 0.4)' : 'var(--border-muted)',
                backgroundColor: streakData.todayPracticed ? 'rgba(249, 115, 22, 0.12)' : 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
              }}
              title={`Streak: ${streakCount} Day${streakCount === 1 ? '' : 's'}. ${
                streakData.todayPracticed
                  ? 'Daily exam completed! Streak secured.'
                  : 'Complete an exam today to maintain your streak!'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
              <span>{streakCount} active days</span>
              {streakData.todayPracticed && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse ml-0.5" />
              )}
            </span>
          </div>
        )}
        <h1
          className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight"
          style={{ color: 'var(--text-main)' }}
        >
          Master Any Reasoning <br className="hidden sm:block" />
          <span style={{ color: 'var(--accent)' }}>Analytical Ability Topic</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Search or enter any reasoning concept. Generate original, verified multiple-choice questions
          with live timers, detailed explanations, and performance radar charts.
        </p>
      </div>

      {/* Main Configuration Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border p-6 sm:p-8 shadow-xl transition-all"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        {/* Step 1: Topic Search & Input */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="topic-search-input"
              className="text-sm font-bold flex items-center gap-2"
              style={{ color: 'var(--text-main)' }}
            >
              <Target className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              1. Reasoning / Analytical Ability Topic
            </label>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Type any keyword to search or enter custom topic
            </span>
          </div>

          <div className="relative mb-3">
            <motion.div
              className="relative flex items-center rounded-2xl"
              whileHover={{ scale: 1.003, y: -1 }}
              animate={{ scale: isSearchFocused ? 1.008 : 1, y: isSearchFocused ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <motion.div
                animate={{ scale: showSuggestions ? [1, 1.15, 1] : 1, rotate: showSuggestions ? [0, 5, 0] : 0 }}
                transition={{ duration: 0.3 }}
                className="absolute left-3.5 pointer-events-none flex items-center"
              >
                <Search
                  className="w-4 h-4"
                  style={{ color: 'var(--accent)' }}
                />
              </motion.div>
              <input
                id="topic-search-input"
                type="text"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setShowSuggestions(true);
                  if (formError) setFormError(null);
                }}
                onFocus={() => {
                  setShowSuggestions(true);
                  setIsSearchFocused(true);
                }}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="e.g. Type 'bl' for Blood Relations, 'syl' for Syllogisms, 'cod' for Coding..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: showSuggestions ? 'var(--accent)' : 'var(--border-main)',
                  color: 'var(--text-main)',
                  boxShadow: showSuggestions ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 2px var(--accent)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                }}
                maxLength={120}
                required
                autoComplete="off"
              />
            </motion.div>

            {/* Suggestions Autocomplete Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowSuggestions(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-0 right-0 top-full mt-2 rounded-2xl border shadow-2xl p-2 z-30 max-h-72 overflow-y-auto"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                  }}
                >
                  <div className="px-3 py-2 border-b flex items-center justify-between text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-faint)' }}>
                    <span>Filter by Logic Type</span>
                    <span>{filteredSuggestions.length} topics</span>
                  </div>
                  <div className="px-2 py-2 flex flex-wrap gap-1.5 border-b mb-2" style={{ borderColor: 'var(--border-muted)' }}>
                    {['All', 'Analytical', 'Logical', 'Verbal', 'Numerical', 'Spatial', 'Non-Verbal'].map((cat) => {
                      const isActive = selectedCategoryFilter === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategoryFilter(cat);
                          }}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border"
                          style={{
                            backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-surface)',
                            borderColor: isActive ? 'var(--accent)' : 'var(--border-muted)',
                            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-1">
                    {filteredSuggestions.length === 0 ? (
                      <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        No reasoning topics found matching &quot;{topic}&quot; in category &quot;{selectedCategoryFilter}&quot;.
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategoryFilter('All');
                          }}
                          className="block mx-auto mt-2 text-xs font-bold underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          Reset Category Filter
                        </button>
                      </div>
                    ) : (
                      filteredSuggestions.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full p-2.5 rounded-xl text-left flex items-start justify-between gap-3 transition-colors hover:bg-[var(--accent-light)] group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-bold group-hover:text-[var(--accent)]"
                                style={{ color: 'var(--text-main)' }}
                              >
                                {item.name}
                              </span>
                              <span
                                className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border"
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  borderColor: 'var(--border-muted)',
                                  color: 'var(--accent)',
                                }}
                              >
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                              {item.desc}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent)] shrink-0 mt-1" />
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </div>

          {/* Quick Preset Pills */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {QUICK_PRESET_PILLS.map((item) => {
              const isSelected = topic.toLowerCase() === item.toLowerCase();
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => {
                    setTopic(item);
                    setShowSuggestions(false);
                    if (formError) setFormError(null);
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-surface-elevated)',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-muted)',
                    color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid for Parameters */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-6 border-t"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          {/* Question Count */}
          <div>
            <label className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--text-main)' }}>
              <HelpCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              2. Number of Questions
            </label>
            <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2 mb-3">
              {QUESTION_COUNT_PRESETS.map((count) => {
                const isSelected = questionCount === count && !customQuestionCount;
                return (
                  <button
                    type="button"
                    key={count}
                    onClick={() => handleQuestionCountSelect(count)}
                    className="py-2 px-1 sm:px-2 rounded-xl text-xs font-bold border transition-all text-center"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                      color: isSelected ? 'var(--accent-contrast)' : 'var(--text-main)',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border-main)',
                    }}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Custom:</span>
              <input
                type="number"
                min={1}
                max={50}
                placeholder="1 - 50"
                value={customQuestionCount}
                onChange={(e) => handleCustomQuestionCountChange(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-xl border text-xs font-semibold text-center focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: customQuestionCount ? 'var(--accent)' : 'var(--border-main)',
                  color: 'var(--text-main)',
                }}
              />
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>questions</span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                3. Exam Duration
              </label>
              <span
                className="font-mono-numbers text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {durationMinutes} min ({Math.round((durationMinutes * 60) / questionCount)}s / Q)
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={120}
              step={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full h-2 rounded-lg cursor-pointer accent-[var(--accent)] mb-2"
            />
            <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-faint)' }}>
              <span>5m Sprint</span>
              <span>15m Standard</span>
              <span>30m Thorough</span>
              <span>60m Full Mock</span>
            </div>
          </div>

          {/* Marking Scheme */}
          <div>
            <label className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--text-main)' }}>
              <Award className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              4. Marking Scheme
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs block mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Correct Answer:
                </span>
                <select
                  value={positiveMarks}
                  onChange={(e) => setPositiveMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                >
                  <option value={1}>+1.0 Mark</option>
                  <option value={2}>+2.0 Marks (Standard)</option>
                  <option value={3}>+3.0 Marks (CAT / GMAT)</option>
                  <option value={4}>+4.0 Marks (JEE / CSAT)</option>
                </select>
              </div>

              <div>
                <span className="text-xs block mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Incorrect Penalty:
                </span>
                <select
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                >
                  <option value={0}>0.0 (No Negative Marking)</option>
                  <option value={0.25}>-0.25 (1/4th Penalty)</option>
                  <option value={0.33}>-0.33 (1/3rd Penalty)</option>
                  <option value={0.5}>-0.5 (1/2 Penalty)</option>
                  <option value={1}>-1.0 (Full Penalty)</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
              * Unanswered questions always award 0 marks.
            </p>
          </div>

          {/* Difficulty Tier */}
          <div>
            <label className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--text-main)' }}>
              <Sliders className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              5. Difficulty Tier
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DIFFICULTY_CONFIGS.map((tier) => {
                const isSelected = difficulty === tier.id;
                return (
                  <button
                    type="button"
                    key={tier.id}
                    onClick={() => setDifficulty(tier.id)}
                    className="p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-surface-elevated)',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border-main)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-main)' }}
                      >
                        {tier.label}
                      </span>
                      <span
                        className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: isSelected ? 'var(--accent)' : 'var(--border-muted)',
                          color: isSelected ? 'var(--accent-contrast)' : 'var(--text-faint)',
                        }}
                      >
                        {tier.badge}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                      {tier.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 6: Mode Toggles & Options */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Exam Mode Toggle */}
            <div
              onClick={() => setInstantFeedback(!instantFeedback)}
              className="p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all hover:opacity-95"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: instantFeedback ? 'var(--accent)' : 'var(--border-main)',
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center mt-0.5 border shrink-0"
                style={{
                  backgroundColor: instantFeedback ? 'var(--accent)' : 'transparent',
                  borderColor: instantFeedback ? 'var(--accent)' : 'var(--border-main)',
                  color: 'var(--accent-contrast)',
                }}
              >
                {instantFeedback && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                    Instant Feedback Practice Mode
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-semibold"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                  >
                    Study
                  </span>
                </div>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                  Reveal answers and step-by-step logic immediately upon checking each question.
                  Leave unchecked for simulated mock exam where answers stay hidden until submission.
                </p>
              </div>
            </div>

            {/* Shuffle Options */}
            <div
              onClick={() => setShuffleOptions(!shuffleOptions)}
              className="p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all hover:opacity-95"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: shuffleOptions ? 'var(--accent)' : 'var(--border-main)',
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center mt-0.5 border shrink-0"
                style={{
                  backgroundColor: shuffleOptions ? 'var(--accent)' : 'transparent',
                  borderColor: shuffleOptions ? 'var(--accent)' : 'var(--border-main)',
                  color: 'var(--accent-contrast)',
                }}
              >
                {shuffleOptions && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                    Randomize Option Positions
                  </span>
                  <Shuffle className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                </div>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                  Shuffles answer options (A, B, C, D) while maintaining accurate answer keys to prevent position bias.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Error Message */}
        {formError && (
          <div
            className="mt-6 p-3 rounded-xl border flex items-center gap-3 text-xs"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Submit Action CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Max Marks: <strong style={{ color: 'var(--text-main)' }}>{questionCount * positiveMarks}</strong> ·
            Duration: <strong style={{ color: 'var(--text-main)' }}>{durationMinutes} min</strong> ·
            Negative: <strong style={{ color: 'var(--text-main)' }}>{negativeMarks > 0 ? `-${negativeMarks}` : 'None'}</strong>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg disabled:opacity-50 hover:opacity-95"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'Generating Questions...' : 'Generate & Begin Mock Exam'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
