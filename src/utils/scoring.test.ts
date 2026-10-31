import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExamScore,
  calculateAccuracy,
  formatTime,
  shuffleQuestionOptions,
  validateExamConfig,
} from './scoring.ts';


test('calculateExamScore computes positive marks only with zero wrong', () => {
  const score = calculateExamScore({
    correctCount: 10,
    incorrectCount: 0,
    positiveMarks: 2,
    negativeMarks: 0.5,
  });
  assert.equal(score, 20);
});

test('calculateExamScore applies negative marking accurately with decimals', () => {
  // 8 correct * 2 = 16. 2 incorrect * 0.33 = 0.66. Result: 15.34
  const score = calculateExamScore({
    correctCount: 8,
    incorrectCount: 2,
    positiveMarks: 2,
    negativeMarks: 0.33,
  });
  assert.equal(score, 15.34);
});

test('calculateExamScore gives zero for 0 correct and zero incorrect (all unanswered)', () => {
  const score = calculateExamScore({
    correctCount: 0,
    incorrectCount: 0,
    positiveMarks: 3,
    negativeMarks: 1,
  });
  assert.equal(score, 0);
});

test('calculateExamScore allows negative net scores when incorrect penalties exceed correct marks', () => {
  const score = calculateExamScore({
    correctCount: 1,
    incorrectCount: 5,
    positiveMarks: 1,
    negativeMarks: 0.5,
  });
  // 1*1 - 5*0.5 = 1 - 2.5 = -1.5
  assert.equal(score, -1.5);
});

test('calculateAccuracy returns correct percentage and handles zero attempts', () => {
  assert.equal(calculateAccuracy(0, 0), 0);
  assert.equal(calculateAccuracy(15, 20), 75);
  assert.equal(calculateAccuracy(7, 9), 77.8);
});

test('formatTime correctly formats MM:SS and HH:MM:SS', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(3599), '59:59');
  assert.equal(formatTime(3600), '01:00:00');
  assert.equal(formatTime(3665), '01:01:05');
});

interface TestQuestion {
  id: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

test('shuffleQuestionOptions maintains the correct answer text at new index', () => {
  const originalQuestion: TestQuestion = {
    id: 'q1',
    topic: 'Coding-Decoding',
    difficulty: 'medium',
    question: 'If CAT is 24, what is DOG?',
    options: ['25', '26', '27', '28'],
    correctOptionIndex: 1, // '26'
    explanation: 'D(4)+O(15)+G(7) = 26',
  };

  const expectedCorrectText = originalQuestion.options[originalQuestion.correctOptionIndex];

  // Run multiple times to verify shuffle preservation
  for (let i = 0; i < 10; i++) {
    const shuffled = shuffleQuestionOptions(originalQuestion);
    assert.equal(shuffled.options.length, 4);
    assert.equal(shuffled.options[shuffled.correctOptionIndex], expectedCorrectText);
  }
});

test('validateExamConfig validates constraints', () => {
  const valid = validateExamConfig({
    topic: 'Blood Relations',
    questionCount: 10,
    durationMinutes: 15,
    positiveMarks: 1,
    negativeMarks: 0.25,
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);

  const invalid = validateExamConfig({
    topic: '',
    questionCount: 99,
    durationMinutes: 0,
    positiveMarks: 0,
    negativeMarks: -1,
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.length >= 4);
});
