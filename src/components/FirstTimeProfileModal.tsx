/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Key, User, ExternalLink, ShieldCheck, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { encryptApiKey } from '../utils/cryptoProfile';
import { LocalProfile, saveProfile, setActiveProfileId } from '../utils/profileStorage';

interface FirstTimeProfileModalProps {
  onProfileCreated: (profile: LocalProfile) => void;
}

export const FirstTimeProfileModal: React.FC<FirstTimeProfileModalProps> = ({ onProfileCreated }) => {
  const [profileName, setProfileName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = profileName.trim();
    const key = apiKey.trim();

    if (!name) {
      setErrorMsg('Please enter a profile name.');
      return;
    }
    if (!key) {
      setErrorMsg('Please enter your Gemini API key.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Test key validity via backend
      const testRes = await fetch('/api/auth/test-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const testData = await testRes.json();
      if (!testRes.ok || !testData.isValid) {
        throw new Error(testData.message || 'Invalid Gemini API key.');
      }

      // 2. Encrypt API key locally using Web Crypto API
      const { encrypted, salt, iv } = await encryptApiKey(key);
      const profileId = `prof_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const newProfile: LocalProfile = {
        profileId,
        profileName: name,
        encryptedApiKey: encrypted,
        encryptionSalt: salt,
        initializationVector: iv,
        createdAt: now,
        updatedAt: now,
      };

      await saveProfile(newProfile);
      setActiveProfileId(profileId);
      onProfileCreated(newProfile);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-8 overflow-hidden relative"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <div className="text-center mb-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center mx-auto border border-[var(--accent-border)]">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
            Welcome to Reason<span style={{ color: 'var(--accent)' }}>IQ</span>
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Create your first anonymous local profile and configure your personal Gemini API key to start generating practice exams.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold bg-[var(--danger)]/10 border-red-500/30 text-[var(--danger)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
              Profile Name <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type="text"
                required
                autoFocus
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Adarsh or Guest 1"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-main)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                Gemini API Key (BYOK) <span className="text-[var(--danger)]">*</span>
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold flex items-center gap-1 hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                <span>Get API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type={isKeyVisible ? 'text' : 'password'}
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-9 pr-16 py-2.5 text-xs rounded-xl border outline-none font-mono"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-main)',
                  color: 'var(--text-main)',
                }}
              />
              <button
                type="button"
                onClick={() => setIsKeyVisible(!isKeyVisible)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--text-main)] cursor-pointer"
              >
                {isKeyVisible ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              🔒 Encrypted securely in browser IndexedDB (AES-256-GCM). Never sent to our servers.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 mt-2"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-contrast)',
            }}
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Create Profile & Enter Portal</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
