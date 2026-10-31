/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'mixed' | 'competitive';

// 20 Dark Themes + 10 Light Themes from the Professional Website Color Palette Library
export type DarkTheme =
  | 'midnight-pro'
  | 'ocean-blue'
  | 'emerald-luxury'
  | 'black-orange'
  | 'graphite'
  | 'royal-purple'
  | 'cyber-neon'
  | 'navy-gold'
  | 'slate-teal'
  | 'electric-blue'
  | 'dracula'
  | 'nord'
  | 'monochrome'
  | 'indigo-night'
  | 'forest'
  | 'cyan-tech'
  | 'coffee'
  | 'lime-black'
  | 'crimson'
  | 'rose-charcoal';

export type LightTheme =
  | 'pure-minimal'
  | 'saas-indigo'
  | 'soft-cloud'
  | 'warm-paper'
  | 'clean-slate'
  | 'nordic-frost'
  | 'mint-fresh'
  | 'sunset-warm'
  | 'rose-gold'
  | 'corporate-trust';

export type ExamTheme = DarkTheme | LightTheme;

export type ExamMode = 'strict' | 'instant';

export interface ExamConfig {
  topic: string;
  questionCount: number;
  durationMinutes: number;
  positiveMarks: number;
  negativeMarks: number;
  difficulty: DifficultyLevel;
  shuffleOptions: boolean;
  instantFeedback: boolean;
  theme: ExamTheme;
}

export interface ClientQuestion {
  id: string;
  topic: string;
  difficulty: DifficultyLevel;
  question: string;
  options: string[];
}

export interface FullQuestion extends ClientQuestion {
  correctOptionIndex: number;
  explanation: string;
}

export interface ExamSession {
  examId: string;
  config: ExamConfig;
  questions: FullQuestion[];
  createdAt: number;
  isAiGenerated: boolean;
}

export interface CheckedAnswerResult {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  correctOptionIndex: number;
  explanation: string;
}

export interface ReviewedQuestion extends ClientQuestion {
  userSelectedOption?: number;
  isCorrect?: boolean;
  correctOptionIndex: number;
  explanation: string;
  flagged?: boolean;
}

export interface ExamResult {
  examId: string;
  topic: string;
  totalScore: number;
  maxMarks: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  timeTakenSeconds: number;
  totalQuestions: number;
  positiveMarks: number;
  negativeMarks: number;
  instantFeedback: boolean;
  difficulty: DifficultyLevel;
  dateAttempted: string;
  questions: ReviewedQuestion[];
}

export interface QuestionReport {
  examId: string;
  questionId: string;
  reason: 'ambiguous' | 'wrong_key' | 'calculation_error' | 'misleading_premise' | 'other';
  details: string;
  timestamp: string;
}

export interface UserStreakData {
  currentStreak: number;
  bestStreak: number;
  longestStreak?: number;
  lastActiveDate: string; // YYYY-MM-DD
  lastExamDate?: string; // YYYY-MM-DD
  activeDates: string[]; // List of YYYY-MM-DD
  examDates: string[]; // List of YYYY-MM-DD
  todayPracticed: boolean;
  totalDaysActive: number;
  totalActiveDays?: number;
  dailyGoal?: number;
  todayCompletedCount?: number;
  isDailyGoalMet?: boolean;
}

export interface UserProfile {
  id?: string;
  profileId?: string;
  profileName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  examCategories?: string[];
  examGoal?: string;
  dailyGoal?: number;
  geminiApiKey?: string;
  createdAt: string;
  updatedAt?: string;
  avatarUrl?: string;
  websiteInstructions?: string;
  extraInfo?: string;
  geminiKeyStatus?: 'configured' | 'invalid' | 'unavailable';
  streak?: UserStreakData;
}

export const EXAM_CATEGORIES = [
  'Competitive Examinations',
  'Placement Preparation',
  'Government Job Examinations',
  'NIMCET / MCA Entrance',
  'CUET PG',
  'Banking Examinations',
  'SSC Examinations',
  'Campus Recruitment',
  'Technical Interviews',
  'Other Examinations',
];


