/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ExamConfig,
  ExamSession,
  FullQuestion,
  ClientQuestion,
  CheckedAnswerResult,
  ExamResult,
  ReviewedQuestion,
  QuestionReport,
} from './src/types/exam';
import {
  calculateExamScore,
  calculateAccuracy,
  shuffleQuestionOptions,
  validateExamConfig,
} from './src/utils/scoring';
import { generateFallbackQuestions } from './src/server/mockReasoningData';
import { AuthService } from './src/server/authService';
import { validateGeminiKey } from './src/server/geminiValidation';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Authenticated session resolution middleware
app.use((req: Request, _res: Response, next) => {
  const token = req.cookies?.reasoniq_session ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (token) {
    const user = AuthService.getSessionUser(token);
    (req as any).user = user;
    (req as any).sessionToken = token;
  }
  next();
});

// Initialize GoogleGenAI SDK on server-side
const apiKey = process.env.GEMINI_API_KEY || '';
const hasGeminiKey = Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory exam session cache with TTL
const examSessions = new Map<string, ExamSession>();
const questionReports: QuestionReport[] = [];
// In-memory verified question pool for instant response and caching
const questionPool = new Map<string, FullQuestion[]>();

// Cleanup sessions older than 4 hours
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [id, session] of examSessions.entries()) {
    if (session.createdAt < cutoff) {
      examSessions.delete(id);
    }
  }
}, 15 * 60 * 1000);

// ==========================================
// Authentication Endpoints
// ==========================================

// 1. Step 1: Initiate Sign-Up (Validates fields, tests Gemini key, sends email OTP)
app.post('/api/auth/register/initiate', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await AuthService.initiateRegistration(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Registration failed.' });
  }
});

// 2. Resend Registration OTP (with 60-second cooldown)
app.post('/api/auth/register/resend-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await AuthService.resendRegistrationOtp(email);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to resend OTP.' });
  }
});

// 3. Step 2: Verify Registration OTP (creates verified user, stores encrypted key, issues session)
app.post('/api/auth/register/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const { user, sessionToken } = await AuthService.verifyRegistrationOtp(email, otp);

    res.cookie('reasoniq_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ success: true, user, sessionToken });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Verification failed.' });
  }
});

// 4. Returning User Login (Email + Password only)
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const { user, sessionToken } = await AuthService.login(email, password);

    res.cookie('reasoniq_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ success: true, user, sessionToken });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid email or password.' });
  }
});

// 5. Current Authenticated User Session
app.get('/api/auth/me', (req: Request, res: Response): void => {
  const user = (req as any).user;
  if (!user) {
    res.status(200).json({ authenticated: false, user: null });
    return;
  }
  res.json({ authenticated: true, user });
});

// 6. Logout
app.post('/api/auth/logout', (req: Request, res: Response): void => {
  const token = (req as any).sessionToken;
  if (token) {
    AuthService.logout(token);
  }
  res.clearCookie('reasoniq_session', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 7. Update User Profile
app.post('/api/auth/profile', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  try {
    const updated = await AuthService.updateProfile(user.id, req.body);
    res.json({ success: true, user: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update profile.' });
  }
});

// 8. Update Gemini API Key (validates with Google API before saving)
app.post('/api/auth/gemini-key', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  try {
    const { apiKey: newKey } = req.body;
    const result = await AuthService.updateGeminiKey(user.id, newKey);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update key.' });
  }
});

// 9. Test Gemini API Key (without saving)
app.post('/api/auth/test-gemini-key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey: testKey } = req.body;
    const result = await validateGeminiKey(testKey);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ isValid: false, message: error.message || 'Validation request failed.' });
  }
});

// 10. Change Password
app.post('/api/auth/change-password', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(user.id, currentPassword, newPassword);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to change password.' });
  }
});

// 11. Forgot Password - Request OTP
app.post('/api/auth/forgot-password/initiate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await AuthService.initiatePasswordReset(email);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to initiate password reset.' });
  }
});

// 12. Forgot Password - Complete with OTP and New Password
app.post('/api/auth/forgot-password/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await AuthService.completePasswordReset(email, otp, newPassword);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Password reset failed.' });
  }
});

// API Status & Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey,
    activeSessionsCount: examSessions.size,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Generate Exam using Gemini API or Fallback Bank
 */
app.post('/api/generate-exam', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionUser = (req as any).user;

    const config: ExamConfig = req.body;
    const validation = validateExamConfig(config);

    if (!validation.isValid) {
      res.status(400).json({
        error: 'Invalid configuration parameters',
        details: validation.errors,
      });
      return;
    }

    // Retrieve client-provided BYOK key or database key if session exists
    const rawClientKey = (req.headers['x-gemini-api-key'] as string) || (req.body as any)?.geminiApiKey;
    const clientProvidedKey = (typeof rawClientKey === 'string' && rawClientKey.trim().startsWith('AIza') && rawClientKey.trim().length >= 20)
      ? rawClientKey.trim()
      : null;

    const dbUserKey = sessionUser ? AuthService.getUserGeminiKey(sessionUser.id) : null;
    const validDbKey = (typeof dbUserKey === 'string' && dbUserKey.trim().startsWith('AIza') && dbUserKey.trim().length >= 20)
      ? dbUserKey.trim()
      : null;

    const activeAi = userApiKey
      ? new GoogleGenAI({
          apiKey: userApiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build-user' } },
        })
      : (hasGeminiKey ? ai : null);

    if (!activeAi) {
      res.status(500).json({
        error: 'AI_NOT_CONFIGURED',
        message: 'The AI generation engine is not configured on the server. Please contact the administrator.',
      });
      return;
    }

    const {
      topic,
      questionCount,
      difficulty,
      shuffleOptions,
      instantFeedback,
    } = config;

    const startTime = Date.now();
    let generatedQuestions: FullQuestion[] = [];
    let isAiGenerated = false;

    // Check pool for pre-cached questions for this topic & difficulty
    const poolKey = `${topic.toLowerCase().trim()}::${difficulty.toLowerCase().trim()}`;
    const cachedQuestions = questionPool.get(poolKey) || [];

    let neededFromAi = questionCount;

    // If cache already has sufficient high-quality questions, leverage up to half or all if pool is large
    if (cachedQuestions.length >= questionCount && Math.random() > 0.4) {
      const shuffled = [...cachedQuestions].sort(() => 0.5 - Math.random());
      generatedQuestions = shuffled.slice(0, questionCount);
      isAiGenerated = true;
      neededFromAi = 0;
    } else if (cachedQuestions.length > 0) {
      const takeFromCache = Math.min(Math.floor(questionCount / 2), cachedQuestions.length);
      const shuffled = [...cachedQuestions].sort(() => 0.5 - Math.random());
      generatedQuestions = shuffled.slice(0, takeFromCache);
      neededFromAi = questionCount - takeFromCache;
      isAiGenerated = true;
    }

    if (hasEffectiveKey && neededFromAi > 0) {
      try {
        const difficultyDescription =
          difficulty === 'competitive'
            ? 'Advanced competitive examination level standard with tricky premises and rigorous logic'
            : difficulty === 'hard'
            ? 'High-difficulty analytical reasoning challenging deductive traps'
            : difficulty === 'medium'
            ? 'Standard analytical reasoning with multi-step deductions'
            : difficulty === 'mixed'
            ? 'Varied difficulty spanning easy to competitive reasoning questions'
            : 'Clear, foundational analytical reasoning questions';

        // Parallel chunk generation: split needed questions into small concurrent batches of max 10
        const CHUNK_SIZE = 10;
        const chunkPromises: Promise<FullQuestion[]>[] = [];
        let remaining = neededFromAi;
        let chunkIndex = 0;

        while (remaining > 0) {
          const currentBatchCount = Math.min(remaining, CHUNK_SIZE);
          const cIdx = chunkIndex++;
          remaining -= currentBatchCount;

          const chunkPromise = (async (): Promise<FullQuestion[]> => {
            const prompt = `Generate exactly ${currentBatchCount} original multiple-choice reasoning questions on topic "${topic}".
Difficulty level: ${difficultyDescription}.

For each question:
1. Provide a precise, unambiguous question statement or premise.
2. Provide exactly 4 plausible options.
3. Solve independently and choose exactly one correct option index (0, 1, 2, or 3).
4. Provide a clear, concise 1-2 sentence logical explanation.
5. Provide subtopic and difficulty level.`;

            // Timeout promise: fail fast after 3.5s per chunk to guarantee instant response
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Chunk timeout after 3500ms`)), 3500)
            );

            const genPromise = (async () => {
              let response;
              try {
                // Primary ultra-fast model: gemini-2.5-flash
                response = await activeAi.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                  config: {
                    temperature: 0.7,
                    systemInstruction:
                      'You are a competitive reasoning exam question author. Every problem must be logically rigorous, unambiguous, and accurate. Keep explanations to 1-2 concise sentences.',
                    responseMimeType: 'application/json',
                    responseSchema: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          question: {
                            type: Type.STRING,
                            description: 'The complete question statement or scenario.',
                          },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'Array of exactly 4 unique options.',
                          },
                          correctOptionIndex: {
                            type: Type.INTEGER,
                            description: 'Zero-based index of correct option (0, 1, 2, or 3).',
                          },
                          explanation: {
                            type: Type.STRING,
                            description: 'Concise 1-2 sentence logical explanation.',
                          },
                          difficulty: {
                            type: Type.STRING,
                          },
                          subtopic: {
                            type: Type.STRING,
                          },
                        },
                        required: ['question', 'options', 'correctOptionIndex', 'explanation'],
                      },
                    },
                  },
                });
              } catch (primaryErr: any) {
                // If user key was invalid/unauthenticated (401), try default server AI if key is present and different
                if (userApiKey && hasGeminiKey && apiKey !== userApiKey) {
                  try {
                    response = await ai.models.generateContent({
                      model: 'gemini-2.5-flash',
                      contents: prompt,
                      config: {
                        temperature: 0.7,
                        systemInstruction:
                          'You are a competitive reasoning exam question author. Every problem must be logically rigorous, unambiguous, and accurate. Keep explanations to 1-2 concise sentences.',
                        responseMimeType: 'application/json',
                      },
                    });
                  } catch (serverErr: any) {
                    return [];
                  }
                } else {
                  return [];
                }
              }

              const rawText = response?.text?.trim() || '';
              let parsed: any[] = [];
              try {
                parsed = JSON.parse(rawText);
              } catch {
                const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                  parsed = JSON.parse(jsonMatch[0]);
                }
              }

              const batchResult: FullQuestion[] = [];
              if (Array.isArray(parsed) && parsed.length > 0) {
                for (let i = 0; i < parsed.length; i++) {
                  const item = parsed[i];
                  if (
                    item.question &&
                    Array.isArray(item.options) &&
                    item.options.length >= 4 &&
                    typeof item.correctOptionIndex === 'number' &&
                    item.correctOptionIndex >= 0 &&
                    item.correctOptionIndex < 4
                  ) {
                    batchResult.push({
                      id: `ai-q-${cIdx}-${i + 1}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
                      topic: item.subtopic || topic,
                      difficulty: (item.difficulty as any) || difficulty,
                      question: String(item.question).trim(),
                      options: item.options.slice(0, 4).map((opt: any) => String(opt).trim()),
                      correctOptionIndex: item.correctOptionIndex,
                      explanation: String(item.explanation || '').trim(),
                    });
                  }
                }
              }
              return batchResult;
            })();

            return Promise.race([genPromise, timeoutPromise]);
          })();

          chunkPromises.push(chunkPromise);
        }

        // Await all chunks concurrently
        const settled = await Promise.allSettled(chunkPromises);
        const newQuestions: FullQuestion[] = [];
        for (const res of settled) {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            newQuestions.push(...res.value);
          }
        }

        if (newQuestions.length > 0) {
          generatedQuestions = [...generatedQuestions, ...newQuestions];
          isAiGenerated = true;

          // Save new questions to pool for instant future access
          const existing = questionPool.get(poolKey) || [];
          const seen = new Set(existing.map((q) => q.question.toLowerCase().trim()));
          for (const nq of newQuestions) {
            if (!seen.has(nq.question.toLowerCase().trim())) {
              existing.push(nq);
              seen.add(nq.question.toLowerCase().trim());
            }
          }
          questionPool.set(poolKey, existing.slice(-50));
        }
      } catch (geminiError: any) {
        console.warn('Gemini exam generation batch warning, activating instant fallback:', geminiError?.message);
      }
    }

    if (generatedQuestions.length === 0) {
      res.status(400).json({
        error: 'API_KEY_INVALID',
        message: 'Could not generate questions with the provided Gemini API key. Please insert a valid key from Google AI Studio.',
      });
      return;
    }

    // Slice to exact count
    generatedQuestions = generatedQuestions.slice(0, questionCount);

    // Apply option shuffling if requested (preserves correctOptionIndex faithfully)
    if (shuffleOptions) {
      generatedQuestions = generatedQuestions.map((q) => shuffleQuestionOptions(q));
    }

    console.log(`Exam generated in ${Date.now() - startTime}ms (${generatedQuestions.length} questions, AI: ${isAiGenerated})`);

    // Create session
    const examId = `exam-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const session: ExamSession = {
      examId,
      config,
      questions: generatedQuestions,
      createdAt: Date.now(),
      isAiGenerated,
    };

    examSessions.set(examId, session);

    // Server-side answer-key protection:
    // If strict exam mode, DO NOT send correctOptionIndex or explanation to client!
    let clientQuestions: ClientQuestion[] | FullQuestion[];

    if (!instantFeedback) {
      clientQuestions = generatedQuestions.map((q) => ({
        id: q.id,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
      }));
    } else {
      // In instant practice mode, questions can either be sent or checked on the fly
      clientQuestions = generatedQuestions.map((q) => ({
        id: q.id,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
      }));
    }

    res.json({
      examId,
      config,
      totalQuestions: generatedQuestions.length,
      isAiGenerated,
      questions: clientQuestions,
    });
  } catch (error: any) {
    console.error('Error generating exam:', error);
    res.status(500).json({
      error: 'Failed to generate mock exam.',
      message: error?.message || 'Internal server error',
    });
  }
});

/**
 * Check single answer in Instant Feedback Practice Mode
 */
app.post('/api/check-answer', (req: Request, res: Response): void => {
  const { examId, questionId, selectedOptionIndex } = req.body;

  if (!examId || !questionId || typeof selectedOptionIndex !== 'number') {
    res.status(400).json({ error: 'Missing required parameters.' });
    return;
  }

  const session = examSessions.get(examId);
  if (!session) {
    res.status(404).json({ error: 'Exam session expired or not found.' });
    return;
  }

  const question = session.questions.find((q) => q.id === questionId);
  if (!question) {
    res.status(404).json({ error: 'Question not found in this exam.' });
    return;
  }

  const isCorrect = selectedOptionIndex === question.correctOptionIndex;

  const result: CheckedAnswerResult = {
    questionId,
    selectedOptionIndex,
    isCorrect,
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation,
  };

  res.json(result);
});

/**
 * Submit Entire Exam & Calculate Verified Scoring
 */
app.post('/api/submit-exam', (req: Request, res: Response): void => {
  const { examId, answers, timeTakenSeconds } = req.body;

  if (!examId || typeof answers !== 'object') {
    res.status(400).json({ error: 'Invalid submission data.' });
    return;
  }

  const session = examSessions.get(examId);
  if (!session) {
    res.status(404).json({ error: 'Exam session has expired. Please create a new exam.' });
    return;
  }

  const { questions, config } = session;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const reviewedQuestions: ReviewedQuestion[] = questions.map((q) => {
    const userSelected = answers[q.id];
    const isAnswered = typeof userSelected === 'number' && userSelected >= 0 && userSelected < 4;
    const isCorrect = isAnswered && userSelected === q.correctOptionIndex;

    if (!isAnswered) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    return {
      id: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      userSelectedOption: isAnswered ? userSelected : undefined,
      isCorrect: isAnswered ? isCorrect : undefined,
    };
  });

  const totalScore = calculateExamScore({
    correctCount,
    incorrectCount,
    positiveMarks: config.positiveMarks,
    negativeMarks: config.negativeMarks,
  });

  const maxMarks = Math.round(questions.length * config.positiveMarks * 100) / 100;
  const attemptedCount = correctCount + incorrectCount;
  const accuracy = calculateAccuracy(correctCount, attemptedCount);

  const result: ExamResult = {
    examId,
    topic: config.topic,
    totalScore,
    maxMarks,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracy,
    timeTakenSeconds: Number(timeTakenSeconds) || 0,
    totalQuestions: questions.length,
    positiveMarks: config.positiveMarks,
    negativeMarks: config.negativeMarks,
    instantFeedback: config.instantFeedback,
    difficulty: config.difficulty,
    dateAttempted: new Date().toISOString(),
    questions: reviewedQuestions,
  };

  res.json(result);
});

/**
 * Report a question for review / flagging
 */
app.post('/api/report-question', (req: Request, res: Response): void => {
  const { examId, questionId, reason, details } = req.body;

  if (!examId || !questionId || !reason) {
    res.status(400).json({ error: 'Missing report parameters.' });
    return;
  }

  const report: QuestionReport = {
    examId,
    questionId,
    reason,
    details: details || '',
    timestamp: new Date().toISOString(),
  };

  questionReports.push(report);
  res.json({ success: true, message: 'Question report received. Thank you for your feedback!' });
});

// Mount Vite or serve static assets
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReasonIQ Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ReasonIQ server:', err);
  process.exit(1);
});
