/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ExamConfig, ExamResult, ClientQuestion, UserProfile, LocalAttemptRecord } from '../types/exam';
import { saveExamResult, getExamHistory } from '../utils/storage';
import { recordExamCompletionStreak } from '../utils/streak';
import { saveLocalAttempt, getAllLocalAttempts } from '../utils/localDatabase';

export function useExam(
  currentUser: UserProfile | null,
  activeConfig: ExamConfig | null,
  setActiveConfig: (config: ExamConfig | null) => void,
  setView: (view: 'setup' | 'loading' | 'exam' | 'results' | 'dashboard' | 'attempts' | 'onboarding' | 'streak') => void,
  setQuestions: (questions: ClientQuestion[]) => void,
  setCurrentExamId: (id: string | null) => void,
  setExamResult: (result: ExamResult | null) => void,
  setHistoryList: (history: ExamResult[]) => void,
  setLocalAttempts: (attempts: LocalAttemptRecord[]) => void,
  setErrorBanner: (error: string | null) => void,
  onApiKeyRequired?: (message?: string) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartExam = async (config: ExamConfig) => {
    setErrorBanner(null);

    setIsLoading(true);
    setActiveConfig(config);
    setView('loading');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.geminiApiKey) {
        headers['x-gemini-api-key'] = currentUser.geminiApiKey;
      }

      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...config,
          geminiApiKey: currentUser?.geminiApiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === 'API_KEY_REQUIRED' || errorData.error === 'API_KEY_INVALID') {
          onApiKeyRequired?.(errorData.message || 'Please insert your Gemini API key to generate high-quality AI exam questions.');
          setView('setup');
          return;
        }
        throw new Error(errorData.message || errorData.error || 'Failed to generate exam.');
      }

      const data = await response.json();
      setCurrentExamId(data.examId);
      setQuestions(data.questions);
      setView('exam');
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Network error generating exam. Please try again.');
      setView('setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitExam = async (answers: Record<string, number>, timeTakenSeconds: number, currentExamId: string | null) => {
    if (!currentExamId) return;

    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      const response = await fetch('/api/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: currentExamId,
          answers,
          timeTakenSeconds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit exam.');
      }

      const result: ExamResult = await response.json();
      setExamResult(result);
      saveExamResult(result);
      setHistoryList(getExamHistory());

      const profileIdentifier = currentUser?.profileId || currentUser?.email || 'anon_profile';

      const attemptRecord: LocalAttemptRecord = {
        attemptId: result.examId,
        profileId: profileIdentifier,
        testName: result.topic,
        subject: result.topic,
        completedAt: result.dateAttempted || new Date().toISOString(),
        score: result.totalScore,
        maxMarks: result.maxMarks,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctCount,
        incorrectAnswers: result.incorrectCount,
        unansweredQuestions: result.unansweredCount,
        percentage: Math.round((result.totalScore / Math.max(1, result.maxMarks)) * 100),
        accuracy: result.accuracy,
        timeTaken: result.timeTakenSeconds,
        questionResponses: result.questions,
        config: activeConfig!,
      };

      await saveLocalAttempt(attemptRecord);
      const allAttempts = await getAllLocalAttempts(profileIdentifier);
      setLocalAttempts(allAttempts);

      recordExamCompletionStreak(profileIdentifier, {
        testName: result.topic,
        subject: result.topic,
        score: result.totalScore,
        accuracy: result.accuracy,
      });

      setView('results');
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Error calculating scores. Please try submitting again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isLoading, isSubmitting, handleStartExam, handleSubmitExam };
}
