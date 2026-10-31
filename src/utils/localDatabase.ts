/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExamConfig, ReviewedQuestion } from '../types/exam';
import {
  calculateStreakStats,
  getLocalDateString,
  StreakStats,
} from './streakLogic';

export const DB_NAME = 'ReasonIQ_LocalDB';
export const DB_VERSION = 1;

export interface LocalProfile {
  profileId: string;
  profileName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl: string;
  encryptedGeminiApiKey?: string;
  geminiApiKey?: string;
  examCategories: string[];
  dailyGoal: number; // e.g. 1, 2, 3, 5 tests per day
  createdAt: string;
  updatedAt: string;
}

export interface LocalStreakRecord {
  id: string;
  profileId: string;
  activityDate: string; // YYYY-MM-DD (local date)
  activityType: 'exam_completion' | 'practice_session';
  timestamp: string; // ISO
  testName?: string;
  subject?: string;
  score?: number;
  accuracy?: number;
}

export interface LocalAttemptRecord {
  attemptId: string;
  profileId: string;
  testName: string;
  subject: string;
  completedAt: string; // ISO string
  score: number; // Obtained marks
  maxMarks: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  percentage: number;
  accuracy: number;
  timeTaken: number; // seconds
  questionResponses: ReviewedQuestion[];
  config: ExamConfig;
}

export interface LocalStreakSummary extends StreakStats {
  dailyGoal: number;
  todayCompletedCount: number;
  isDailyGoalMet: boolean;
  activeDates: string[];
  activityCountsByDate: Record<string, number>;
  recentActivities: LocalStreakRecord[];
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and returns the IndexedDB singleton connection.
 */
export function initLocalDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Profiles Store
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'profileId' });
      }

      // 2. Streaks Store
      if (!db.objectStoreNames.contains('streaks')) {
        const streakStore = db.createObjectStore('streaks', { keyPath: 'id' });
        streakStore.createIndex('by_profileId', 'profileId', { unique: false });
        streakStore.createIndex('by_activityDate', 'activityDate', { unique: false });
        streakStore.createIndex('by_profile_date', ['profileId', 'activityDate'], { unique: false });
      }

      // 3. Attempts Store
      if (!db.objectStoreNames.contains('attempts')) {
        const attemptStore = db.createObjectStore('attempts', { keyPath: 'attemptId' });
        attemptStore.createIndex('by_profileId', 'profileId', { unique: false });
        attemptStore.createIndex('by_completedAt', 'completedAt', { unique: false });
        attemptStore.createIndex('by_subject', 'subject', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// ==========================================
// Profile Operations
// ==========================================

export async function getLocalProfile(): Promise<LocalProfile | null> {
  try {
    const db = await initLocalDatabase();
    return new Promise<LocalProfile | null>((resolve, reject) => {
      const transaction = db.transaction('profiles', 'readonly');
      const store = transaction.objectStore('profiles');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          resolve(cursor.value as LocalProfile);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB getLocalProfile fallback to localStorage:', e);
    const cached = localStorage.getItem('reasoniq_local_profile_v2');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return null;
  }
}

export async function saveLocalProfile(profile: LocalProfile): Promise<void> {
  // Always mirror in localStorage for instant synchronous reads on first render
  try {
    localStorage.setItem('reasoniq_local_profile_v2', JSON.stringify(profile));
  } catch {}

  try {
    const db = await initLocalDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('profiles', 'readwrite');
      const store = transaction.objectStore('profiles');
      const request = store.put(profile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save profile to IndexedDB:', e);
  }
}

/**
 * Permanently deletes the profile and all associated streaks, attempts,
 * and test records from IndexedDB and localStorage.
 */
export async function deleteLocalProfile(profileId: string): Promise<void> {
  try {
    const db = await initLocalDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'streaks', 'attempts'], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      // 1. Delete profile
      const profileStore = transaction.objectStore('profiles');
      profileStore.delete(profileId);

      // 2. Delete all streak records associated with profileId
      const streakStore = transaction.objectStore('streaks');
      const streakIndex = streakStore.index('by_profileId');
      const streakReq = streakIndex.openCursor(IDBKeyRange.only(profileId));

      streakReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // 3. Delete all attempt records associated with profileId
      const attemptStore = transaction.objectStore('attempts');
      const attemptIndex = attemptStore.index('by_profileId');
      const attemptReq = attemptIndex.openCursor(IDBKeyRange.only(profileId));

      attemptReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  } catch (e) {
    console.error('Error during deleteLocalProfile in IndexedDB:', e);
  }

  // Clear all localStorage keys
  try {
    localStorage.removeItem('reasoniq_local_profile_v2');
    localStorage.removeItem('reasoniq_user_profile');
    localStorage.removeItem('reasoniq_history_v1');
    localStorage.removeItem('reasoniq_current_streak');
    localStorage.removeItem('reasoniq_last_visit_date');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('reasoniq_streak_') || k.startsWith('reasoniq_'))) {
        if (k !== 'reasoniq_theme_v2') {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

// ==========================================
// Attempt History Operations
// ==========================================

export async function saveLocalAttempt(attempt: LocalAttemptRecord): Promise<void> {
  try {
    const db = await initLocalDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('attempts', 'readwrite');
      const store = transaction.objectStore('attempts');
      const request = store.put(attempt);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save attempt to IndexedDB:', e);
  }
}

export async function getAllLocalAttempts(profileId?: string): Promise<LocalAttemptRecord[]> {
  try {
    const db = await initLocalDatabase();
    return new Promise<LocalAttemptRecord[]>((resolve, reject) => {
      const transaction = db.transaction('attempts', 'readonly');
      const store = transaction.objectStore('attempts');

      let request: IDBRequest;
      if (profileId) {
        const index = store.index('by_profileId');
        request = index.getAll(IDBKeyRange.only(profileId));
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const list = (request.result as LocalAttemptRecord[]) || [];
        // Sort newest first by completedAt
        list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('getAllLocalAttempts fallback to localStorage:', e);
    const cached = localStorage.getItem('reasoniq_history_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed.map((item: any) => ({
          attemptId: item.examId || item.attemptId,
          profileId: item.profileId || profileId || 'anon',
          testName: item.topic || item.testName || 'Practice Test',
          subject: item.topic || item.subject || 'General Reasoning',
          completedAt: item.dateAttempted || item.completedAt || new Date().toISOString(),
          score: item.totalScore ?? item.score ?? 0,
          maxMarks: item.maxMarks ?? (item.totalQuestions ? item.totalQuestions * 2 : 20),
          totalQuestions: item.totalQuestions || 10,
          correctAnswers: item.correctCount ?? item.correctAnswers ?? 0,
          incorrectAnswers: item.incorrectCount ?? item.incorrectAnswers ?? 0,
          unansweredQuestions: item.unansweredCount ?? item.unansweredQuestions ?? 0,
          percentage: item.accuracy ?? 0,
          accuracy: item.accuracy ?? 0,
          timeTaken: item.timeTakenSeconds ?? item.timeTaken ?? 0,
          questionResponses: item.questions || [],
          config: item.config || {
            topic: item.topic || 'General Reasoning',
            questionCount: item.totalQuestions || 10,
            durationMinutes: 10,
            positiveMarks: item.positiveMarks || 2,
            negativeMarks: item.negativeMarks || 0.5,
            difficulty: item.difficulty || 'medium',
            shuffleOptions: true,
            instantFeedback: false,
            theme: 'midnight-pro',
          },
        }));
      } catch {}
    }
    return [];
  }
}

export async function getLocalAttemptById(attemptId: string): Promise<LocalAttemptRecord | null> {
  try {
    const db = await initLocalDatabase();
    return new Promise<LocalAttemptRecord | null>((resolve, reject) => {
      const transaction = db.transaction('attempts', 'readonly');
      const store = transaction.objectStore('attempts');
      const request = store.get(attemptId);

      request.onsuccess = () => resolve((request.result as LocalAttemptRecord) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('getLocalAttemptById fallback search:', e);
    const attempts = await getAllLocalAttempts();
    return attempts.find((a) => a.attemptId === attemptId) || null;
  }
}

export async function deleteLocalAttempt(attemptId: string): Promise<void> {
  try {
    const db = await initLocalDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('attempts', 'readwrite');
      const store = transaction.objectStore('attempts');
      const request = store.delete(attemptId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to delete attempt from IndexedDB:', e);
  }

  try {
    const cached = localStorage.getItem('reasoniq_history_v1');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((item: any) => (item.examId || item.attemptId) !== attemptId);
        localStorage.setItem('reasoniq_history_v1', JSON.stringify(filtered));
      }
    }
  } catch {}
}

export async function clearAllLocalAttempts(profileId?: string): Promise<void> {
  try {
    const db = await initLocalDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('attempts', 'readwrite');
      const store = transaction.objectStore('attempts');
      
      if (profileId) {
        const index = store.index('by_profileId');
        const req = index.openKeyCursor(IDBKeyRange.only(profileId));
        req.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursor>).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      } else {
        store.clear();
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to clear attempts:', e);
  }
}

export async function clearAllLocalStreaks(profileId: string): Promise<void> {
  try {
    const db = await initLocalDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('streaks', 'readwrite');
      const store = transaction.objectStore('streaks');
      const index = store.index('by_profileId');
      const req = index.openKeyCursor(IDBKeyRange.only(profileId));
      
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursor>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to clear streaks:', e);
  }
}


// ==========================================
// Streak & Activity Tracking Operations
// ==========================================

/**
 * Records a completed learning activity.
 * A day is considered active ONLY when a meaningful activity is completed!
 */
export async function recordLocalActivity(
  profileId: string,
  activityType: 'exam_completion' | 'practice_session',
  metadata: {
    testName?: string;
    subject?: string;
    score?: number;
    accuracy?: number;
    dateStr?: string;
  } = {}
): Promise<LocalStreakRecord> {
  const activityDate = metadata.dateStr || getLocalDateString();
  const timestamp = new Date().toISOString();
  const id = `${profileId}_${activityDate}_${activityType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const record: LocalStreakRecord = {
    id,
    profileId,
    activityDate,
    activityType,
    timestamp,
    testName: metadata.testName,
    subject: metadata.subject,
    score: metadata.score,
    accuracy: metadata.accuracy,
  };

  try {
    const db = await initLocalDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('streaks', 'readwrite');
      const store = transaction.objectStore('streaks');
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to record streak activity to IndexedDB:', e);
  }

  return record;
}

export async function getLocalStreakRecords(profileId: string): Promise<LocalStreakRecord[]> {
  try {
    const db = await initLocalDatabase();
    return new Promise<LocalStreakRecord[]>((resolve, reject) => {
      const transaction = db.transaction('streaks', 'readonly');
      const store = transaction.objectStore('streaks');
      const index = store.index('by_profileId');
      const request = index.getAll(IDBKeyRange.only(profileId));

      request.onsuccess = () => {
        const list = (request.result as LocalStreakRecord[]) || [];
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('getLocalStreakRecords error:', e);
    return [];
  }
}

/**
 * Computes the full streak summary, active dates, monthly counts,
 * and daily goal completion strictly from saved activity records.
 */
export async function getLocalStreakSummary(
  profileId: string,
  dailyGoal: number = 1
): Promise<LocalStreakSummary> {
  const records = await getLocalStreakRecords(profileId);
  const todayStr = getLocalDateString();

  const activeDatesSet = new Set<string>();
  const activityCountsByDate: Record<string, number> = {};

  records.forEach((r) => {
    if (r.activityDate) {
      activeDatesSet.add(r.activityDate);
      activityCountsByDate[r.activityDate] = (activityCountsByDate[r.activityDate] || 0) + 1;
    }
  });

  const activeDates = Array.from(activeDatesSet).sort();
  const stats = calculateStreakStats(activeDates, todayStr);
  const todayCompletedCount = activityCountsByDate[todayStr] || 0;
  const isDailyGoalMet = todayCompletedCount >= Math.max(1, dailyGoal);

  return {
    ...stats,
    dailyGoal: Math.max(1, dailyGoal),
    todayCompletedCount,
    isDailyGoalMet,
    activeDates,
    activityCountsByDate,
    recentActivities: records.slice(0, 15),
  };
}

/**
 * Exports all user data for backup.
 */
export async function exportAllData(): Promise<string> {
  const db = await initLocalDatabase();
  const stores = ['profiles', 'streaks', 'attempts'];
  const data: Record<string, any> = {};

  for (const storeName of stores) {
    data[storeName] = await new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readonly');
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }
  return JSON.stringify(data);
}

/**
 * Imports all user data from backup.
 */
export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  const db = await initLocalDatabase();
  const stores = ['profiles', 'streaks', 'attempts'];

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(stores, 'readwrite');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      store.clear();
      if (data[storeName]) {
        for (const item of data[storeName]) {
          store.put(item);
        }
      }
    }
  });
}
