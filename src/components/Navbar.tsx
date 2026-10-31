/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExamTheme, UserProfile } from '../types/exam';
import {
  History,
  Palette,
  ChevronDown,
  Check,
  Moon,
  Sun,
  Flame,
  BarChart3,
  BookOpen,
  Zap,
} from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';
import { useCyclingAvatar } from '../utils/avatar';
import { useStreak } from '../hooks/useStreak';
import { StreakModal } from './StreakModal';

interface NavbarProps {
  currentTheme: ExamTheme;
  onThemeChange: (theme: ExamTheme) => void;
  onOpenHistory: () => void;
  historyCount: number;
  onGoHome: () => void;
  onOpenDashboard: () => void;
  onOpenAttempts: () => void;
  onOpenStreak: () => void;
  activeView: string;
  isInExam: boolean;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export interface PaletteThemeItem {
  id: ExamTheme;
  name: string;
  category: 'dark' | 'light';
  bgHex: string;
  primaryHex: string;
  accentHex: string;
}

export const PALETTE_THEMES: PaletteThemeItem[] = [
  // 1. Dark Themes (20)
  { id: 'midnight-pro', name: 'Midnight Pro', category: 'dark', bgHex: '#0B0F19', primaryHex: '#6366F1', accentHex: '#22D3EE' },
  { id: 'ocean-blue', name: 'Ocean Blue', category: 'dark', bgHex: '#071B33', primaryHex: '#2196F3', accentHex: '#38BDF8' },
  { id: 'emerald-luxury', name: 'Emerald Luxury', category: 'dark', bgHex: '#071C17', primaryHex: '#10B981', accentHex: '#A3E635' },
  { id: 'black-orange', name: 'Black & Orange', category: 'dark', bgHex: '#101010', primaryHex: '#F97316', accentHex: '#FDBA74' },
  { id: 'graphite', name: 'Graphite', category: 'dark', bgHex: '#18181B', primaryHex: '#A1A1AA', accentHex: '#E4E4E7' },
  { id: 'royal-purple', name: 'Royal Purple', category: 'dark', bgHex: '#100B20', primaryHex: '#8B5CF6', accentHex: '#D8B4FE' },
  { id: 'cyber-neon', name: 'Cyber Neon', category: 'dark', bgHex: '#050816', primaryHex: '#00F5D4', accentHex: '#FF3CAC' },
  { id: 'navy-gold', name: 'Navy & Gold', category: 'dark', bgHex: '#0B132B', primaryHex: '#D4AF37', accentHex: '#F5D77A' },
  { id: 'slate-teal', name: 'Slate & Teal', category: 'dark', bgHex: '#0F172A', primaryHex: '#14B8A6', accentHex: '#5EEAD4' },
  { id: 'electric-blue', name: 'Electric Blue', category: 'dark', bgHex: '#080D1A', primaryHex: '#3B82F6', accentHex: '#60A5FA' },
  { id: 'dracula', name: 'Dracula', category: 'dark', bgHex: '#282A36', primaryHex: '#BD93F9', accentHex: '#50FA7B' },
  { id: 'nord', name: 'Nord', category: 'dark', bgHex: '#2E3440', primaryHex: '#88C0D0', accentHex: '#A3BE8C' },
  { id: 'monochrome', name: 'Monochrome', category: 'dark', bgHex: '#09090B', primaryHex: '#D4D4D8', accentHex: '#FFFFFF' },
  { id: 'indigo-night', name: 'Indigo Night', category: 'dark', bgHex: '#0C1024', primaryHex: '#6366F1', accentHex: '#A5B4FC' },
  { id: 'forest', name: 'Forest', category: 'dark', bgHex: '#14251B', primaryHex: '#4D9A65', accentHex: '#D0E8A8' },
  { id: 'cyan-tech', name: 'Cyan Tech', category: 'dark', bgHex: '#06171D', primaryHex: '#06B6D4', accentHex: '#67E8F9' },
  { id: 'coffee', name: 'Coffee', category: 'dark', bgHex: '#211813', primaryHex: '#B7794B', accentHex: '#E5BD91' },
  { id: 'lime-black', name: 'Lime & Black', category: 'dark', bgHex: '#10120D', primaryHex: '#A3E635', accentHex: '#D9F99D' },
  { id: 'crimson', name: 'Crimson', category: 'dark', bgHex: '#170B0D', primaryHex: '#E11D48', accentHex: '#FDA4AF' },
  { id: 'rose-charcoal', name: 'Rose & Charcoal', category: 'dark', bgHex: '#181316', primaryHex: '#F472B6', accentHex: '#FDA4AF' },

  // 2. Light Themes (10)
  { id: 'pure-minimal', name: 'Pure Minimal', category: 'light', bgHex: '#FFFFFF', primaryHex: '#18181B', accentHex: '#2563EB' },
  { id: 'saas-indigo', name: 'SaaS Indigo', category: 'light', bgHex: '#F8FAFC', primaryHex: '#4F46E5', accentHex: '#6366F1' },
  { id: 'soft-cloud', name: 'Soft Cloud', category: 'light', bgHex: '#F1F5F9', primaryHex: '#0284C7', accentHex: '#38BDF8' },
  { id: 'warm-paper', name: 'Warm Paper', category: 'light', bgHex: '#FAF7F2', primaryHex: '#B45309', accentHex: '#D97706' },
  { id: 'clean-slate', name: 'Clean Slate', category: 'light', bgHex: '#F8FAFC', primaryHex: '#334155', accentHex: '#0EA5E9' },
  { id: 'nordic-frost', name: 'Nordic Frost', category: 'light', bgHex: '#F4F7F9', primaryHex: '#2B6CB0', accentHex: '#4FD1C5' },
  { id: 'mint-fresh', name: 'Mint Fresh', category: 'light', bgHex: '#F0FDF4', primaryHex: '#059669', accentHex: '#34D399' },
  { id: 'sunset-warm', name: 'Sunset Warm', category: 'light', bgHex: '#FFF7ED', primaryHex: '#EA580C', accentHex: '#FB923C' },
  { id: 'rose-gold', name: 'Rose Gold', category: 'light', bgHex: '#FFF1F2', primaryHex: '#E11D48', accentHex: '#FB7185' },
  { id: 'corporate-trust', name: 'Corporate Trust', category: 'light', bgHex: '#F8FAFC', primaryHex: '#1E3A8A', accentHex: '#2563EB' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTheme,
  onThemeChange,
  historyCount,
  onGoHome,
  onOpenDashboard,
  onOpenAttempts,
  onOpenStreak,
  activeView,
  isInExam,
  currentUser,
  onOpenProfile,
}) => {
  const displayAvatar = useCyclingAvatar(currentUser?.avatarUrl);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [themeTab, setThemeTab] = useState<'dark' | 'light'>('dark');

  const { streakData, streakCount } = useStreak(currentUser?.profileId || currentUser?.email);

  const currentThemeObj = PALETTE_THEMES.find((t) => t.id === currentTheme) || PALETTE_THEMES[0];
  const activeThemesList = PALETTE_THEMES.filter((t) => t.category === themeTab);

  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-main)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 sm:gap-3 text-left group focus:outline-none shrink-0 cursor-pointer"
            title="ReasonIQ Home"
          >
            <AnimatedLogo size="md" />
            <div className="flex flex-col justify-center">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-none" style={{ color: 'var(--text-main)' }}>
                Reason<span style={{ color: 'var(--accent)' }}>IQ</span>
              </span>

            </div>
          </button>

          {/* Nav Navigation Links (Hidden in live exam to prevent distraction) */}
          {!isInExam && (
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={onGoHome}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'setup'
                    ? 'shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100 hover:bg-[var(--accent-light)]'
                }`}
                style={{
                  backgroundColor: activeView === 'setup' ? 'var(--accent-light)' : 'transparent',
                  color: activeView === 'setup' ? 'var(--accent)' : 'var(--text-main)',
                }}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Practice</span>
              </button>

              <button
                type="button"
                onClick={onOpenDashboard}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'dashboard'
                    ? 'shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100 hover:bg-[var(--accent-light)]'
                }`}
                style={{
                  backgroundColor: activeView === 'dashboard' ? 'var(--accent-light)' : 'transparent',
                  color: activeView === 'dashboard' ? 'var(--accent)' : 'var(--text-main)',
                }}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Performance</span>
              </button>

              <button
                type="button"
                onClick={onOpenAttempts}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'attempts'
                    ? 'shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100 hover:bg-[var(--accent-light)]'
                }`}
                style={{
                  backgroundColor: activeView === 'attempts' ? 'var(--accent-light)' : 'transparent',
                  color: activeView === 'attempts' ? 'var(--accent)' : 'var(--text-main)',
                }}
              >
                <History className="w-3.5 h-3.5" />
                <span>Past Attempts</span>
              </button>
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Daily Streak Badge */}
          <button
            type="button"
            onClick={onOpenStreak}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all hover:scale-103 active:scale-95 cursor-pointer group"
            style={{
              backgroundColor: streakData.todayPracticed ? 'rgba(249, 115, 22, 0.12)' : 'var(--bg-surface-elevated)',
              borderColor: streakData.todayPracticed ? 'rgba(249, 115, 22, 0.4)' : 'var(--border-main)',
              color: 'var(--text-main)',
            }}
            title={`Daily Learning Streak: ${streakCount} active days. Click for weekly/monthly calendar!`}
          >
            <Flame className={`w-4 h-4 text-[var(--warning)] shrink-0 ${streakData.todayPracticed ? 'animate-bounce' : 'animate-pulse'}`} />
            <span className="font-bold">
              {streakCount} <span className="hidden sm:inline font-normal opacity-80">streak</span>
            </span>
            {streakData.todayPracticed && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-ping" />
            )}
          </button>

          {/* Professional Palette Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:opacity-90 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
              aria-label="Change Theme"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                style={{ backgroundColor: currentThemeObj.primaryHex }}
              />
              <span className="hidden lg:inline">{currentThemeObj.name}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {themeDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setThemeDropdownOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 rounded-2xl border shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                  }}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: 'var(--border-muted)' }}>
                    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                      <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      <span>Theme Palette Library</span>
                    </div>

                    {/* Dark / Light Category Tabs */}
                    <div
                      className="flex items-center p-0.5 rounded-lg border text-[11px] font-semibold"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-muted)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setThemeTab('dark')}
                        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                          themeTab === 'dark' ? 'shadow-sm font-bold' : 'opacity-70'
                        }`}
                        style={{
                          backgroundColor: themeTab === 'dark' ? 'var(--accent)' : 'transparent',
                          color: themeTab === 'dark' ? 'var(--accent-contrast)' : 'var(--text-muted)',
                        }}
                      >
                        <Moon className="w-3 h-3" />
                        <span>Dark (20)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeTab('light')}
                        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                          themeTab === 'light' ? 'shadow-sm font-bold' : 'opacity-70'
                        }`}
                        style={{
                          backgroundColor: themeTab === 'light' ? 'var(--accent)' : 'transparent',
                          color: themeTab === 'light' ? 'var(--accent-contrast)' : 'var(--text-muted)',
                        }}
                      >
                        <Sun className="w-3 h-3" />
                        <span>Light (10)</span>
                      </button>
                    </div>
                  </div>

                  {/* Themes Grid */}
                  <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                    {activeThemesList.map((theme) => {
                      const isSelected = theme.id === currentTheme;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            onThemeChange(theme.id);
                            setThemeDropdownOpen(false);
                          }}
                          className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-all hover:bg-[var(--accent-light)] cursor-pointer"
                          style={{
                            backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                            color: isSelected ? 'var(--accent)' : 'var(--text-main)',
                            border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center -space-x-1.5 shrink-0">
                              <span
                                className="w-4 h-4 rounded-full border border-black/25 z-20 shadow-xs"
                                style={{ backgroundColor: theme.primaryHex }}
                                title="Primary"
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/25 z-10 shadow-xs"
                                style={{ backgroundColor: theme.accentHex }}
                                title="Accent"
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-white/20 z-0 shadow-xs"
                                style={{ backgroundColor: theme.bgHex }}
                                title="Background"
                              />
                            </div>
                            <span className="font-semibold">{theme.name}</span>
                          </div>

                          {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile Button */}
          {currentUser && (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:opacity-90 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-main)',
              }}
              title="Edit Profile, Daily Goal, or Reset Data"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden text-xs shrink-0"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {displayAvatar.startsWith('data:image') || displayAvatar.startsWith('http') ? (
                  <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  displayAvatar
                )}
              </div>
              <span className="hidden sm:inline">
                {currentUser.profileName || currentUser.firstName || currentUser.name.split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>

    </header>
  );
};
