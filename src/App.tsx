/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ExamConfig, ExamTheme, ClientQuestion, ExamResult, UserProfile } from './types/exam';
import { Navbar } from './components/Navbar';
import { SetupScreen } from './components/SetupScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { ExamWorkspace } from './components/ExamWorkspace';
import { ResultsDashboard } from './components/ResultsDashboard';
import { HistoryModal } from './components/HistoryModal';
import { ProfileModal } from './components/ProfileModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PastAttemptsPage } from './components/PastAttemptsPage';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { StreakPage } from './components/StreakPage';
import { useExam } from './hooks/useExam';
import {
  getSavedTheme,
  saveSelectedTheme,
  getExamHistory,
  saveExamResult,
  clearExamHistory,
  getSavedUser,
  saveUser,
  clearUser,
} from './utils/storage';
import {
  recordExamCompletionStreak,
  reconcileStreakWithHistory,
} from './utils/streak';
import {
  initLocalDatabase,
  getLocalProfile,
  saveLocalProfile,
  deleteLocalProfile,
  deleteLocalAttempt,
  saveLocalAttempt,
  getAllLocalAttempts,
  LocalAttemptRecord,
  LocalProfile,
} from './utils/localDatabase';
import { useStreak } from './hooks/useStreak';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<ExamTheme>(getSavedTheme);
  const [view, setView] = useState<'setup' | 'loading' | 'exam' | 'results' | 'dashboard' | 'attempts' | 'streak'>('setup');
  
  const [activeConfig, setActiveConfig] = useState<ExamConfig | null>(null);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<ExamResult[]>([]);
  const [localAttempts, setLocalAttempts] = useState<LocalAttemptRecord[]>([]);

  // Persistent anonymous profile state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const cached = getSavedUser();
    if (cached) return cached;
    return null;
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { streakData } = useStreak(currentUser?.profileId || currentUser?.email);

  // Initialize Local IndexedDB and profile on first mount
  useEffect(() => {
    const initApp = async () => {
      try {
        await initLocalDatabase();
        const profile = await getLocalProfile();

        if (profile) {
          const userObj: UserProfile = {
            id: profile.profileId,
            profileId: profile.profileId,
            profileName: profile.profileName,
            name: profile.profileName,
            firstName: profile.firstName || profile.profileName.split(' ')[0],
            lastName: profile.lastName,
            email: `${profile.profileId}@reasoniq.local`,
            emailVerified: true,
            examCategories: profile.examCategories,
            dailyGoal: profile.dailyGoal,
            email: `${profile.profileId}@reasoniq.local`,
            emailVerified: true,
            examCategories: profile.examCategories,
            dailyGoal: profile.dailyGoal,
            avatarUrl: profile.avatarUrl,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          };
          setCurrentUser(userObj);
          saveUser(userObj);

          // Load local attempts from IndexedDB
          const attempts = await getAllLocalAttempts(profile.profileId);
          setLocalAttempts(attempts);
          reconcileStreakWithHistory(historyList, profile.profileId);
        } else {
          // Check if there was a legacy profile in localStorage to migrate
          const legacy = getSavedUser();
          if (legacy) {
            const pId = legacy.profileId || legacy.id || `profile_${Date.now()}`;
            const migrated: LocalProfile = {
              profileId: pId,
              profileName: legacy.name || legacy.firstName || 'Learner',
              firstName: legacy.firstName || 'Learner',
              lastName: legacy.lastName,
              avatarUrl: legacy.avatarUrl || '🧠',
              examCategories: legacy.examCategories || ['Competitive Examinations'],
              dailyGoal: legacy.dailyGoal || 1,
              createdAt: legacy.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await saveLocalProfile(migrated);
            const userObj: UserProfile = { ...legacy, profileId: pId };
            setCurrentUser(userObj);
            saveUser(userObj);

            const attempts = await getAllLocalAttempts(pId);
            setLocalAttempts(attempts);
          } else {
            // First time visitor or deleted profile -> auto-create default profile and land on home
            const pId = `profile_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const now = new Date().toISOString();
            const defaultProfile: LocalProfile = {
              profileId: pId,
              profileName: 'Learner',
              firstName: 'Learner',
              avatarUrl: '🧠',
              examCategories: ['Competitive Examinations'],
              dailyGoal: 1,
              createdAt: now,
              updatedAt: now,
            };
            await saveLocalProfile(defaultProfile);
            
            const userObj: UserProfile = {
              id: pId,
              profileId: pId,
              profileName: 'Learner',
              name: 'Learner',
              firstName: 'Learner',
              email: `${pId}@reasoniq.local`,
              emailVerified: true,
              examCategories: ['Competitive Examinations'],
              dailyGoal: 1,
              avatarUrl: '🧠',
              createdAt: now,
              updatedAt: now,
            };
            setCurrentUser(userObj);
            saveUser(userObj);
            setLocalAttempts([]);
            setHistoryList([]);
            setView('setup');
          }
        }
      } catch (err) {
        console.warn('Local database initialization fallback:', err);
      }
    };

    initApp();
  }, []);

  // Load history & autostart query param support
  useEffect(() => {
    const history = getExamHistory();
    setHistoryList(history);
    if (currentUser?.profileId) {
      reconcileStreakWithHistory(history, currentUser.profileId);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const demoConfig: ExamConfig = {
        topic: 'Syllogisms',
        questionCount: 5,
        durationMinutes: 5,
        positiveMarks: 2,
        negativeMarks: 0.5,
        difficulty: 'medium',
        shuffleOptions: true,
        instantFeedback: false,
        theme: getSavedTheme(),
      };
      handleStartExam(demoConfig);
    }
  }, [currentUser?.profileId]);


  const handleDeleteProfile = async () => {
    const pId = currentUser?.profileId || currentUser?.id || 'anon_profile';
    await deleteLocalProfile(pId);
    clearUser();
    clearExamHistory();
    setCurrentUser(null);
    setLocalAttempts([]);
    setHistoryList([]);
    setIsProfileOpen(false);
    setView('setup');
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
  };

  const handleThemeChange = (newTheme: ExamTheme) => {
    setTheme(newTheme);
    saveSelectedTheme(newTheme);
  };

  const { isLoading, isSubmitting, handleStartExam, handleSubmitExam } = useExam(
    currentUser,
    activeConfig,
    setActiveConfig,
    setView,
    setQuestions,
    setCurrentExamId,
    setExamResult,
    setHistoryList,
    setLocalAttempts,
    setErrorBanner,
    (msg) => {
      // API Key no longer required in UI
    }
  );

  const handleRetake = () => {
    if (activeConfig) {
      handleStartExam(activeConfig);
    } else {
      setView('setup');
    }
  };

  const handleNewExam = () => {
    setView('setup');
    setQuestions([]);
    setCurrentExamId(null);
    setExamResult(null);
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    await deleteLocalAttempt(attemptId);
    const pId = currentUser?.profileId || currentUser?.email || 'anon_profile';
    const attempts = await getAllLocalAttempts(pId);
    setLocalAttempts(attempts);
    reconcileStreakWithHistory(attempts, pId);
  };

  const handleSelectHistoryExam = (result: ExamResult) => {
    setExamResult(result);
    setView('results');
    setIsHistoryOpen(false);
  };

  const handleClearHistory = () => {
    clearExamHistory();
    setHistoryList([]);
  };

  const handleStartExamWithTopic = (topic: string) => {
    const config: ExamConfig = {
      topic,
      questionCount: 10,
      durationMinutes: 10,
      positiveMarks: 2,
      negativeMarks: 0.5,
      difficulty: 'medium',
      shuffleOptions: true,
      instantFeedback: false,
      theme,
    };
    handleStartExam(config);
  };

  // Fallback for safety if currentUser is missing during init
  if (!currentUser) {
    return <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-app)' }} />;
  }


  return (
    <div
      className={`min-h-screen flex flex-col theme-${theme} transition-colors duration-200`}
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      <Navbar
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={localAttempts.length || historyList.length}
        onGoHome={handleNewExam}
        onOpenDashboard={() => setView('dashboard')}
        onOpenAttempts={() => setView('attempts')}
        onOpenStreak={() => setView('streak')}
        activeView={view}
        isInExam={view === 'exam'}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Global Error Banner */}
      {errorBanner && (
        <div className="max-w-5xl mx-auto px-4 mt-4 w-full">
          <div
            className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-md"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: 'var(--danger)',
            }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="p-1 rounded hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {view === 'setup' && (
          <SetupScreen
            onStartExam={handleStartExam}
            isLoading={isLoading}
            currentTheme={theme}
            onThemeSelect={handleThemeChange}
            currentUser={currentUser}
          />
        )}

        {view === 'dashboard' && (
          <PerformanceDashboard
            attempts={localAttempts}
            streakData={streakData}
            onStartExamWithTopic={handleStartExamWithTopic}
            onGoToPractice={() => setView('setup')}
            onViewAttempts={() => setView('attempts')}
            onOpenStreakModal={() => setView('streak')}
          />
        )}

        {view === 'streak' && (
          <StreakPage
            streakData={streakData}
            onGoBack={() => setView('dashboard')}
          />
        )}

        {view === 'attempts' && (
          <PastAttemptsPage
            attempts={localAttempts}
            onRetryTest={handleStartExam}
            onStartNewExam={handleNewExam}
            onDeleteAttempt={handleDeleteAttempt}
          />
        )}

        {view === 'loading' && activeConfig && (
          <LoadingScreen
            topic={activeConfig.topic}
            questionCount={activeConfig.questionCount}
          />
        )}

        {view === 'exam' && currentExamId && activeConfig && (
          <ExamWorkspace
            examId={currentExamId}
            config={activeConfig}
            questions={questions}
            onSubmitExam={(answers, timeTaken) => handleSubmitExam(answers, timeTaken, currentExamId)}
            isSubmitting={isSubmitting}
          />
        )}

        {view === 'results' && examResult && (
          <ResultsDashboard
            result={examResult}
            onRetake={handleRetake}
            onNewExam={handleNewExam}
            onViewAllAttempts={() => setView('attempts')}
            onViewDashboard={() => setView('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t py-6 mt-12 transition-colors text-center text-xs"
        style={{
          borderColor: 'var(--border-muted)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold" style={{ color: 'var(--text-main)' }}>
              Reason<span style={{ color: 'var(--accent)' }}>IQ</span>
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-faint)' }}>· Made with love ❤️</span>
          </div>
        </div>
      </footer>

      {/* History Drawer Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={historyList}
        onSelectExam={handleSelectHistoryExam}
        onClearHistory={handleClearHistory}
      />

      {/* Profile & Settings Modal */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            saveUser(updated);
          }}
          onLogout={handleLogout}
          onDeleteProfile={handleDeleteProfile}
        />
      )}

    </div>
  );
}
