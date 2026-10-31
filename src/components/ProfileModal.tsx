/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, EXAM_CATEGORIES } from '../types/exam';
import { useStreak } from '../hooks/useStreak';
import {
  User as UserIcon,
  Target,
  FileText,
  Info,
  X,
  Check,
  Flame,
  Key,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Database,
  Sliders,
  Cloud,
  LogOut,
} from 'lucide-react';
import { saveLocalProfile, LocalProfile } from '../utils/localDatabase';
import { FirebaseService } from '../utils/firebaseService';
import { auth } from '../utils/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  onDeleteProfile: () => void;
}

const AVATAR_OPTIONS = ['🧠', '👨‍💻', '👩‍💻', '🎯', '🚀', '💡', '⚡', '🏆', '📚', '🦊'];


export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onDeleteProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'cloud' | 'settings'>('profile');
  const [fbUser, setFbUser] = useState<User | null>(auth.currentUser);

  // Sync with Firebase Auth state
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setFbUser(user));
    return unsub;
  }, []);

  // Profile Form States
  const [profileName, setProfileName] = useState(
    currentUser.profileName || currentUser.name || 'Learner'
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentUser.examCategories && currentUser.examCategories.length > 0
      ? currentUser.examCategories
      : [currentUser.examGoal || EXAM_CATEGORIES[0]]
  );
  const [avatar, setAvatar] = useState(currentUser.avatarUrl || '🧠');
  const [dailyGoal, setDailyGoal] = useState<number>(currentUser.dailyGoal || 1);
  const [websiteInstructions, setWebsiteInstructions] = useState(
    currentUser.websiteInstructions || 'Focus on rigorous logical step-by-step proofs, time management, and shortcut deductions.'
  );


  // General feedback
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Cloud Sync & Restore states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);

  // Profile Deletion Confirmation Modal state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const { streakCount } = useStreak(currentUser.profileId || currentUser.email);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return;
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Save profile updates to local IndexedDB and React state
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    setIsSavingProfile(true);

    const name = profileName.trim() || 'Learner';
    const profileId = currentUser.profileId || currentUser.id || 'anon_profile';
    const now = new Date().toISOString();

    const updatedProfile: LocalProfile = {
      profileId,
      profileName: name,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || undefined,
      avatarUrl: avatar,
      examCategories: selectedCategories,
      dailyGoal,
      createdAt: currentUser.createdAt || now,
      updatedAt: now,
    };

    try {
      await saveLocalProfile(updatedProfile);

      onUpdateUser({
        ...currentUser,
        profileId,
        profileName: name,
        name,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || undefined,
        avatarUrl: avatar,
        examCategories: selectedCategories,
        dailyGoal,
        websiteInstructions,
      });

      // Update streak storage with new daily goal
      const { getStoredStreak, saveStreak } = await import('../utils/streak');
      const currentStreak = getStoredStreak(profileId);
      saveStreak({ ...currentStreak, dailyGoal }, profileId);

      setProfileMessage('Profile settings updated successfully!');
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Error updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-8"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        {/* Header Bar */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-main)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl border shadow-xs overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-muted)',
              }}
            >
              {avatar.startsWith('data:image') ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                avatar
              )}
            </div>
            <div>
              <h2 className="text-base font-black" style={{ color: 'var(--text-main)' }}>
                {profileName || 'Anonymous Profile'}
              </h2>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--warning)' }}>
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{streakCount} Active Days</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border hover:opacity-80 cursor-pointer"
            style={{
              borderColor: 'var(--border-muted)',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-muted)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex border-b text-xs font-bold"
          style={{
            borderColor: 'var(--border-muted)',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-faint)] hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile & Goals</span>
          </button>


          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-faint)] hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Cloud Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-faint)] hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Tab 1: Profile & Daily Goals */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {profileMessage && (
                <div className="p-3.5 rounded-xl bg-[var(--success)]/10 border border-emerald-500/30 text-[var(--success)] text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileMessage}</span>
                </div>
              )}
              {profileError && (
                <div className="p-3.5 rounded-xl bg-[var(--danger)]/10 border border-red-500/30 text-[var(--danger)] text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Profile Name & Avatar */}
              <div className="space-y-2">
                <label className="block text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  Profile Name / Nickname
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-main)',
                    }}
                  />
                  <div
                    className="w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                    }}
                  >
                    {avatar.startsWith('data:image') ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      avatar
                    )}
                  </div>
                </div>

                {/* Avatar Picker */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <label className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer hover:opacity-100 bg-[var(--bg-surface-elevated)]">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Resize image to 64x64
                        const img = new Image();
                        img.src = URL.createObjectURL(file);
                        await img.decode();
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = 64;
                        canvas.height = 64;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, 64, 64);
                        
                        setAvatar(canvas.toDataURL('image/jpeg', 0.8));
                      }}
                    />
                    <span className="text-sm">📷</span>
                  </label>
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`w-8 h-8 rounded-lg border text-base flex items-center justify-center cursor-pointer transition-all ${
                        avatar === av ? 'ring-2 ring-[var(--accent)] scale-105' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: avatar === av ? 'var(--accent-light)' : 'var(--bg-surface-elevated)',
                        borderColor: avatar === av ? 'var(--accent)' : 'var(--border-muted)',
                      }}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>


              {/* Daily Learning Goal */}
              <div className="space-y-2">
                <label className="block text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  Daily Learning Goal (Sessions)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2.5 rounded-xl border text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-main)',
                    }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    Target sessions per day to maintain streak
                  </span>
                </div>
              </div>


              {/* Target Categories */}
              <div className="space-y-2">
                <label className="block text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                  <Target className="w-3.5 h-3.5 text-blue-500" />
                  <span>Exam Target Categories</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EXAM_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isSelected ? 'font-bold' : 'opacity-65 hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-surface-elevated)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border-muted)',
                          color: isSelected ? 'var(--accent)' : 'var(--text-main)',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}


          {/* Tab 3: Cloud Sync */}
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              {!fbUser ? (
                <div className="text-center py-10 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-[var(--bg-surface-elevated)] flex items-center justify-center mx-auto mb-4">
                    <Cloud className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>Sync to Cloud</h3>
                    <p className="text-xs mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-faint)' }}>
                      Sign in to persist your learning history, streaks, and settings across all your devices.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await FirebaseService.signInWithGoogle();
                      } catch (err: any) {
                        setProfileError(err.message || 'Login failed');
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-white text-black font-black text-xs flex items-center gap-3 mx-auto shadow-lg hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-4 h-4 hidden" alt="" />
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl border bg-[var(--success)]/5 border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500/30">
                        <img src={fbUser.photoURL || ''} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xs font-black" style={{ color: 'var(--text-main)' }}>{fbUser.displayName}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{fbUser.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => FirebaseService.logout()}
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        setIsSyncing(true);
                        try {
                          // Upload all local data to cloud
                          const { getAllLocalAttempts } = await import('../utils/localDatabase');
                          const { getStoredStreak } = await import('../utils/streak');
                          
                          const attempts = await getAllLocalAttempts(currentUser.profileId);
                          const streak = getStoredStreak(currentUser.profileId);
                          
                          await FirebaseService.uploadProfile({
                            profileId: fbUser.uid,
                            profileName: profileName,
                            avatarUrl: avatar,
                            examCategories: selectedCategories,
                            dailyGoal: dailyGoal,
                            createdAt: currentUser.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          });
                          await FirebaseService.uploadStreak(streak);
                          await FirebaseService.uploadAttempts(attempts);
                          
                          setProfileMessage('Data synced to cloud successfully!');
                        } catch (err: any) {
                          setProfileError('Sync failed: ' + err.message);
                        } finally {
                          setIsSyncing(false);
                        }
                      }}
                      disabled={isSyncing || isRestoring}
                      className="w-full py-3 rounded-xl border flex items-center justify-center gap-3 text-xs font-black transition-all hover:bg-[var(--accent-light)] cursor-pointer disabled:opacity-50"
                      style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                      <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Local Data to Cloud'}</span>
                    </button>

                    <button
                      onClick={() => setIsConfirmingRestore(true)}
                      disabled={isSyncing || isRestoring}
                      className="w-full py-3 rounded-xl border border-dashed flex items-center justify-center gap-3 text-xs font-black transition-all hover:bg-[var(--bg-surface-hover)] cursor-pointer disabled:opacity-50"
                      style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                    >
                      <Database className={`w-4 h-4 ${isRestoring ? 'animate-pulse' : ''}`} />
                      <span>{isRestoring ? 'Restoring...' : 'Restore from Cloud'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Settings & Profile Deletion */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Local Storage Status */}
              <div
                className="p-4 rounded-2xl border flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-main)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                      IndexedDB Database Status
                    </h4>
                    <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                      Persistent, encrypted, and isolated to this browser
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>

              {/* Backup & Restore */}
              <div className="p-5 rounded-2xl border border-[var(--border-muted)] bg-[var(--bg-surface-elevated)] space-y-3">
                <h4 className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  Data Backup
                </h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const { exportAllData } = await import('../utils/localDatabase');
                      const data = await exportAllData();
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `reasoniq_backup_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-main)' }}
                  >
                    Backup Data
                  </button>
                  <label className="flex-1 py-2 rounded-xl text-xs font-bold text-center cursor-pointer" style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-main)' }}>
                    Restore Data
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const { importAllData } = await import('../utils/localDatabase');
                          await importAllData(event.target?.result as string);
                          window.location.reload();
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Danger Zone: Permanently Delete Profile */}
              <div className="p-5 rounded-2xl border border-red-500/30 bg-[var(--danger)]/5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--danger)]">
                      Delete Profile & All Learning Data
                    </h4>
                    <p className="text-[11px] leading-relaxed mt-1" style={{ color: 'var(--text-faint)' }}>
                      Permanently delete your profile information, streak history, all past exam attempts, and performance statistics from this browser.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-4 py-2 rounded-xl bg-[var(--danger)] hover:bg-red-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Profile & Erase History</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Profile Deletion Confirmation Modal Dialog */}
      <AnimatePresence>
        {isConfirmingDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm"
              onClick={() => setIsConfirmingDelete(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md rounded-3xl border border-red-500/40 p-6 shadow-2xl z-20 space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--danger)]/10 border border-red-500/20 text-[var(--danger)] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-[var(--danger)]">
                  Delete Profile Permanently?
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  This will permanently delete your profile, streak history, past attempts, test answers, and performance statistics.
                </p>
                <p className="text-[11px] text-red-400 font-bold pt-1">
                  This action cannot be undone. You will return to the initial profile creation screen.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                  style={{
                    borderColor: 'var(--border-muted)',
                    color: 'var(--text-main)',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    onDeleteProfile();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--danger)] hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Permanently Delete Everything
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cloud Restore Confirmation Modal Dialog */}
      <AnimatePresence>
        {isConfirmingRestore && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm"
              onClick={() => setIsConfirmingRestore(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md rounded-3xl border border-blue-500/40 p-6 shadow-2xl z-20 space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto">
                <Cloud className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-blue-500">
                  Restore Data from Cloud?
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  This will download your cloud profile, streak history, and all past exam attempts.
                </p>
                <p className="text-[11px] text-amber-400 font-bold pt-1">
                  WARNING: This will overwrite any local data on this browser with your cloud-saved records.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingRestore(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                  style={{
                    borderColor: 'var(--border-muted)',
                    color: 'var(--text-main)',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsConfirmingRestore(false);
                    setIsRestoring(true);
                    try {
                      const { profile, streak, attempts } = await FirebaseService.restoreCloudData();
                      
                      if (!profile) {
                        setProfileError('No cloud profile found to restore.');
                        return;
                      }

                      // Save to IndexedDB
                      const { saveLocalProfile, saveLocalAttempt, clearAllLocalAttempts } = await import('../utils/localDatabase');
                      const { saveStreak } = await import('../utils/streak');

                      await saveLocalProfile(profile);
                      if (streak) {
                        saveStreak(streak, profile.profileId);
                      }
                      
                      await clearAllLocalAttempts(profile.profileId);
                      for (const attempt of attempts) {
                        await saveLocalAttempt(attempt);
                      }

                      setProfileMessage('Cloud data restored! App will refresh.');
                      setTimeout(() => window.location.reload(), 1500);
                    } catch (err: any) {
                      setProfileError('Restore failed: ' + err.message);
                    } finally {
                      setIsRestoring(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Restore & Refresh
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
