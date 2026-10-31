/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExamResult, ExamTheme, UserProfile } from '../types/exam';

const STORAGE_KEYS = {
  EXAM_HISTORY: 'reasoniq_history_v1',
  SELECTED_THEME: 'reasoniq_theme_v2',
};

const VALID_THEMES: ExamTheme[] = [
  'midnight-pro',
  'ocean-blue',
  'emerald-luxury',
  'black-orange',
  'graphite',
  'royal-purple',
  'cyber-neon',
  'navy-gold',
  'slate-teal',
  'electric-blue',
  'dracula',
  'nord',
  'monochrome',
  'indigo-night',
  'forest',
  'cyan-tech',
  'coffee',
  'lime-black',
  'crimson',
  'rose-charcoal',
  'pure-minimal',
  'saas-indigo',
  'soft-cloud',
  'warm-paper',
  'clean-slate',
  'nordic-frost',
  'mint-fresh',
  'sunset-warm',
  'rose-gold',
  'corporate-trust',
];

export function getSavedTheme(): ExamTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_THEME) as ExamTheme | null;
    if (saved && VALID_THEMES.includes(saved)) {
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return 'graphite';
}

export function saveSelectedTheme(theme: ExamTheme): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_THEME, theme);
  } catch (e) {
    // ignore
  }
}

export function getExamHistory(): ExamResult[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveExamResult(result: ExamResult): void {
  try {
    const history = getExamHistory();
    // Prepend new result, cap to last 20
    const updated = [result, ...history.filter((h) => h.examId !== result.examId)].slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save exam to local history:', e);
  }
}

export function clearExamHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EXAM_HISTORY);
  } catch (e) {
    // ignore
  }
}

export function getSavedUser(): UserProfile | null {
  try {
    const data = localStorage.getItem('reasoniq_user_profile');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return null;
}

export function saveUser(profile: UserProfile): void {
  try {
    localStorage.setItem('reasoniq_user_profile', JSON.stringify(profile));
  } catch (e) {}
}

export function clearUser(): void {
  try {
    localStorage.removeItem('reasoniq_user_profile');
  } catch (e) {}
}

export function getTimeBasedGreeting(name: string): string {
  const hour = new Date().getHours();
  let greeting = 'Good Evening';
  if (hour < 12) {
    greeting = 'Good Morning';
  } else if (hour < 17) {
    greeting = 'Good Afternoon';
  }
  return `${greeting}, ${name}`;
}

