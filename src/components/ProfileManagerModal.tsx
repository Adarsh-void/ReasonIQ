/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Key, Plus, Trash2, Edit2, Check, X, ShieldCheck, AlertCircle, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { LocalProfile, getAllProfiles, saveProfile, deleteProfileStore, setActiveProfileId } from '../utils/profileStorage';
import { encryptApiKey } from '../utils/cryptoProfile';

interface ProfileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfileId: string;
  onSwitchProfile: (profile: LocalProfile) => void;
}

export const ProfileManagerModal: React.FC<ProfileManagerModalProps> = ({
  isOpen,
  onClose,
  activeProfileId,
  onSwitchProfile,
}) => {
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [mode, setMode] = useState<'list' | 'create' | 'edit-key' | 'rename'>('list');
  const [selectedProfile, setSelectedProfile] = useState<LocalProfile | null>(null);

  // Form states
  const [newProfileName, setNewProfileName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
      setMode('list');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    try {
      const list = await getAllProfiles();
      setProfiles(list);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  if (!isOpen) return null;

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const name = newProfileName.trim();
    const key = newApiKey.trim();

    if (!name || !key) {
      setErrorMsg('Profile name and Gemini API key are required.');
      return;
    }

    setIsLoading(true);
    try {
      const testRes = await fetch('/api/auth/test-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const testData = await testRes.json();
      if (!testRes.ok || !testData.isValid) {
        throw new Error(testData.message || 'Invalid Gemini API key.');
      }

      const { encrypted, salt, iv } = await encryptApiKey(key);
      const profileId = `prof_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const newProf: LocalProfile = {
        profileId,
        profileName: name,
        encryptedApiKey: encrypted,
        encryptionSalt: salt,
        initializationVector: iv,
        createdAt: now,
        updatedAt: now,
      };

      await saveProfile(newProf);
      setActiveProfileId(profileId);
      onSwitchProfile(newProf);
      setNewProfileName('');
      setNewApiKey('');
      setSuccessMsg('New profile created and activated successfully!');
      setMode('list');
      loadProfiles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setErrorMsg(null);
    const key = newApiKey.trim();
    if (!key) {
      setErrorMsg('Please enter a valid API key.');
      return;
    }

    setIsLoading(true);
    try {
      const testRes = await fetch('/api/auth/test-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const testData = await testRes.json();
      if (!testRes.ok || !testData.isValid) {
        throw new Error(testData.message || 'Invalid Gemini API key.');
      }

      const { encrypted, salt, iv } = await encryptApiKey(key);
      const updated: LocalProfile = {
        ...selectedProfile,
        encryptedApiKey: encrypted,
        encryptionSalt: salt,
        initializationVector: iv,
        updatedAt: new Date().toISOString(),
      };

      await saveProfile(updated);
      if (selectedProfile.profileId === activeProfileId) {
        onSwitchProfile(updated);
      }
      setSuccessMsg('Gemini API key updated successfully for this profile.');
      setNewApiKey('');
      setMode('list');
      loadProfiles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    const newName = renameValue.trim();
    if (!newName) {
      setErrorMsg('Profile name cannot be empty.');
      return;
    }

    const updated: LocalProfile = {
      ...selectedProfile,
      profileName: newName,
      updatedAt: new Date().toISOString(),
    };

    await saveProfile(updated);
    if (selectedProfile.profileId === activeProfileId) {
      onSwitchProfile(updated);
    }
    setSuccessMsg('Profile renamed successfully.');
    setMode('list');
    loadProfiles();
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length <= 1) {
      alert('You must keep at least one profile on this device.');
      return;
    }
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return;
    }

    await deleteProfileStore(profileId);
    if (profileId === activeProfileId) {
      const remaining = profiles.filter((p) => p.profileId !== profileId);
      if (remaining.length > 0) {
        setActiveProfileId(remaining[0].profileId);
        onSwitchProfile(remaining[0]);
      }
    }
    loadProfiles();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden my-8"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        {/* Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-main)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: 'var(--accent-light)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
              }}
            >
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
                Multi-Profile Manager (BYOK)
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Independent anonymous profiles on this device
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-500/15 transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold bg-[var(--danger)]/10 border-red-500/30 text-[var(--danger)]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold bg-[var(--success)]/10 border-emerald-500/30 text-emerald-600">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Device Profiles ({profiles.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewProfileName('');
                    setNewApiKey('');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('create');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Profile</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {profiles.map((prof) => {
                  const isActive = prof.profileId === activeProfileId;
                  return (
                    <div
                      key={prof.profileId}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isActive ? 'ring-2 ring-[var(--accent)]/30' : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-surface-elevated)',
                        borderColor: isActive ? 'var(--accent)' : 'var(--border-muted)',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border"
                          style={{
                            backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-surface)',
                            color: isActive ? 'var(--accent-contrast)' : 'var(--text-main)',
                            borderColor: isActive ? 'var(--accent)' : 'var(--border-main)',
                          }}
                        >
                          {prof.profileName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                              {prof.profileName}
                            </h3>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-contrast)]">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono opacity-70 truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            ID: {prof.profileId} • Created {new Date(prof.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveProfileId(prof.profileId);
                              onSwitchProfile(prof);
                              setSuccessMsg(`Switched to profile "${prof.profileName}"`);
                            }}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                          >
                            Switch
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfile(prof);
                            setRenameValue(prof.profileName);
                            setMode('rename');
                          }}
                          className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                          title="Rename Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfile(prof);
                            setNewApiKey('');
                            setMode('edit-key');
                          }}
                          className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                          title="Change Gemini API Key"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        {profiles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProfile(prof.profileId)}
                            className="p-1.5 rounded-lg border hover:bg-[var(--danger)]/15 cursor-pointer text-[var(--danger)]"
                            style={{ borderColor: 'var(--border-muted)' }}
                            title="Delete Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Create New Profile
              </h3>
              <div>
                <label className="block text-xs font-semibold mb-1">Profile Name</label>
                <input
                  type="text"
                  required
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Guest 2 or Test Prep"
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold">Gemini API Key (BYOK)</label>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold flex items-center gap-1 hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type={isKeyVisible ? 'text' : 'password'}
                  required
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none font-mono"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border cursor-pointer"
                  style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Create Profile</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'edit-key' && selectedProfile && (
            <form onSubmit={handleUpdateApiKey} className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Update Gemini API Key for "{selectedProfile.profileName}"
              </h3>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold">New Gemini API Key</label>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold flex items-center gap-1 hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type={isKeyVisible ? 'text' : 'password'}
                  required
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none font-mono"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border cursor-pointer"
                  style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Save Key</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'rename' && selectedProfile && (
            <form onSubmit={handleRenameProfile} className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Rename Profile
              </h3>
              <div>
                <label className="block text-xs font-semibold mb-1">New Profile Name</label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border cursor-pointer"
                  style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  <Check className="w-4 h-4" />
                  <span>Save Name</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
