/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScoreInput {
  correctCount: number;
  incorrectCount: number;
  positiveMarks: number;
  negativeMarks: number;
}

export interface ShufflableQuestion {
  options: string[];
  correctOptionIndex: number;
  [key: string]: any;
}

export interface ValidatableConfig {
  topic?: string;
  questionCount?: number;
  durationMinutes?: number;
  positiveMarks?: number;
  negativeMarks?: number;
}

/**
 * Calculates final exam score:
 * Final score = (correct answers * positive marks) - (incorrect answers * negative marks).
 * Unanswered questions get 0 marks.
 * Rounded to 2 decimal places to avoid floating-point drift.
 */
export function calculateExamScore(input: ScoreInput): number {
  const { correctCount, incorrectCount, positiveMarks, negativeMarks } = input;
  const rawPositive = Math.max(0, correctCount) * Math.max(0, positiveMarks);
  const rawNegative = Math.max(0, incorrectCount) * Math.max(0, negativeMarks);
  const total = rawPositive - rawNegative;
  return Math.round(total * 100) / 100;
}

/**
 * Calculates accuracy percentage based on attempted questions.
 * If 0 attempted, returns 0.
 */
export function calculateAccuracy(correctCount: number, attemptedCount: number): number {
  if (attemptedCount <= 0) return 0;
  const percentage = (correctCount / attemptedCount) * 100;
  return Math.round(percentage * 10) / 10;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds < 0 || isNaN(totalSeconds)) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Shuffles 4 options for a question while reliably updating the correctOptionIndex.
 */
export function shuffleQuestionOptions<T extends ShufflableQuestion>(question: T): T {
  const optionsWithIndices = question.options.map((option, originalIndex) => ({
    option,
    originalIndex,
  }));

  // Fisher-Yates shuffle
  for (let i = optionsWithIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = optionsWithIndices[i];
    optionsWithIndices[i] = optionsWithIndices[j];
    optionsWithIndices[j] = temp;
  }

  const newOptions = optionsWithIndices.map((item) => item.option);
  const newCorrectIndex = optionsWithIndices.findIndex(
    (item) => item.originalIndex === question.correctOptionIndex
  );

  return {
    ...question,
    options: newOptions,
    correctOptionIndex: newCorrectIndex !== -1 ? newCorrectIndex : 0,
  };
}

/**
 * Validates exam configuration inputs
 */
export function validateExamConfig(config: ValidatableConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.topic || config.topic.trim().length === 0) {
    errors.push('Topic is required.');
  } else if (config.topic.trim().length > 150) {
    errors.push('Topic must be 150 characters or less.');
  }

  if (
    typeof config.questionCount !== 'number' ||
    config.questionCount < 1 ||
    config.questionCount > 50
  ) {
    errors.push('Question count must be between 1 and 50.');
  }

  if (
    typeof config.durationMinutes !== 'number' ||
    config.durationMinutes < 1 ||
    config.durationMinutes > 180
  ) {
    errors.push('Exam duration must be between 1 and 180 minutes.');
  }

  if (
    typeof config.positiveMarks !== 'number' ||
    config.positiveMarks <= 0 ||
    config.positiveMarks > 10
  ) {
    errors.push('Positive marks must be between 0.5 and 10.');
  }

  if (
    typeof config.negativeMarks !== 'number' ||
    config.negativeMarks < 0 ||
    config.negativeMarks > 5
  ) {
    errors.push('Negative marks must be between 0 and 5.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
