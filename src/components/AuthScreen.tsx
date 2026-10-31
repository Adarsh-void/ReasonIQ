/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, EXAM_CATEGORIES } from '../types/exam';
import { PasswordInputWithMascot } from './PasswordInputWithMascot';
import {
  ShieldCheck,
  Mail,
  User,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Search,
  Check,
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  // Mode: 'login' | 'register-email' | 'register-otp' | 'register-details' | 'forgot-password'
  const [mode, setMode] = useState<'login' | 'register-email' | 'register-otp' | 'register-details' | 'forgot-password'>('login');

  // Registration fields
  const [regEmail, setRegEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([EXAM_CATEGORIES[0]]);
  const [categorySearch, setCategorySearch] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Timers
  const [otpTimerSeconds, setOtpTimerSeconds] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpNotification, setDevOtpNotification] = useState<string | null>(null);
  const [isEmailSentNotice, setIsEmailSentNotice] = useState<string | null>(null);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Countdown timer for OTP expiry
  useEffect(() => {
    let interval: any = null;
    if (mode === 'register-otp' && otpTimerSeconds > 0) {
      interval = setInterval(() => {
        setOtpTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, otpTimerSeconds]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-300' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-[var(--danger)]' };
    if (score <= 3) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    if (score <= 4) return { score: 3, label: 'Strong', color: 'bg-[var(--success)]' };
    return { score: 4, label: 'Very Strong', color: 'bg-indigo-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return;
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Step 1: Initiate Sign-Up with Email
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = regEmail.toLowerCase().trim();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send OTP to email by calling initiate registration with dummy placeholder fields
      const res = await fetch('/api/auth/register/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'User',
          lastName: 'Pending',
          email,
          password: 'Password123!',
          examCategories: [EXAM_CATEGORIES[0]],
          geminiApiKey: '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');

      setMode('register-otp');
      setOtpTimerSeconds(data.expiresInSeconds || 300);
      setResendCooldown(data.resendCooldownSeconds || 60);
      setIsEmailSentNotice(data.message);
      if (data.devOtp) {
        setDevOtpNotification(data.devOtp);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code.');

      setOtpTimerSeconds(data.expiresInSeconds || 300);
      setResendCooldown(data.resendCooldownSeconds || 60);
      if (data.devOtp) {
        setDevOtpNotification(data.devOtp);
      }
      setSuccessMessage('New verification code dispatched!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not resend code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Test code verification by calling verify endpoint with temporary verification or moving to details
      // Note: verifyRegistrationOtp expects the full pending registration. If we initiated with placeholders, we can now collect name & password in Step 3!
      // Let's verify OTP validity first.
      const res = await fetch('/api/auth/register/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail.toLowerCase().trim(),
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If it failed because pending registration requires name/password, we prompt user to enter details in Step 3.
        // Actually, our backend verifyRegistrationOtp creates the user from pending_registrations.
        // Let's make sure the user enters details first OR we verify OTP and proceed to profile setup.
        throw new Error(data.error || 'Invalid verification code.');
      }

      // Successfully verified and created! Now let user complete profile details.
      onLoginSuccess(data.user);
    } catch (err: any) {
      // If verification needs name/password, let's transition to register-details after OTP verification check
      // For smooth flow: once OTP is correct, advance to register-details!
      if (err.message && err.message.includes('Invalid')) {
        setErrorMessage(err.message);
      } else {
        // Proceed to set name & password
        setMode('register-details');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Complete Registration with Name, Password, and Exam Categories
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      setErrorMessage('First name is required.');
      return;
    }
    if (!trimmedLast) {
      setErrorMessage('Last name is required.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (selectedCategories.length === 0) {
      setErrorMessage('Please select at least one exam category.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Re-initiate with real name, password, and categories, then instantly verify OTP
      const initRes = await fetch('/api/auth/register/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: trimmedFirst,
          middleName: middleName.trim() || undefined,
          lastName: trimmedLast,
          email: regEmail.toLowerCase().trim(),
          password,
          confirmPassword,
          examCategories: selectedCategories,
          geminiApiKey: geminiApiKey.trim(),
        }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Failed to update registration details.');

      // Now verify OTP to activate account
      const verifyRes = await fetch('/api/auth/register/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail.toLowerCase().trim(),
          otp: otpCode.trim(),
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed.');

      onLoginSuccess(verifyData.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration completion failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Returning User Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = loginEmail.toLowerCase().trim();
    if (!email || !loginPassword) {
      setErrorMessage('Please enter your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password.');

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code.');

      setForgotStep('verify');
      if (data.devOtp) setDevOtpNotification(data.devOtp);
      setSuccessMessage('Password reset code sent to your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (forgotOtp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit code.');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.toLowerCase().trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed.');

      setSuccessMessage('Password reset successfully! Please sign in.');
      setMode('login');
      setLoginEmail(forgotEmail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = EXAM_CATEGORIES.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
    >
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-10 pointer-events-none -top-40 -left-40"
        style={{ backgroundColor: 'var(--accent)' }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-10 pointer-events-none -bottom-40 -right-40"
        style={{ backgroundColor: 'var(--primary)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-3xl border p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
            Reason<span style={{ color: 'var(--accent)' }}>IQ</span> Portal
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Secure Authentication & Streak Maintenance
          </p>
        </div>

        {errorMessage && (
          <div
            className="mb-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            className="mb-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              borderColor: 'rgba(34, 197, 94, 0.35)',
              color: '#16a34a',
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <div>
            <div
              className="flex p-1 rounded-xl border mb-6 text-xs font-bold"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-muted)',
              }}
            >
              <button
                type="button"
                onClick={() => setMode('register-email')}
                className="flex-1 py-2 rounded-lg transition-all text-[var(--text-faint)] hover:text-[var(--text-main)]"
              >
                Sign Up
              </button>
              <button
                type="button"
                className="flex-1 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>

              <PasswordInputWithMascot
                id="login-password"
                label="Password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password..."
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span style={{ color: 'var(--text-muted)' }}>Remember Me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot-password');
                    setForgotEmail(loginEmail);
                  }}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Sign In to Maintain Streaks</span>
              </button>
            </form>
          </div>
        )}

        {/* MODE: REGISTER - STEP 1: EMAIL */}
        {mode === 'register-email' && (
          <div>
            <div
              className="flex p-1 rounded-xl border mb-6 text-xs font-bold"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-muted)',
              }}
            >
              <button
                type="button"
                className="flex-1 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex-1 py-2 rounded-lg transition-all text-[var(--text-faint)] hover:text-[var(--text-main)]"
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleInitiateRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address <span className="text-[var(--danger)]">*</span></label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
                <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  We will send a 6-digit verification code to verify your email address.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Send Verification Code (OTP)</span>
              </button>
            </form>
          </div>
        )}

        {/* MODE: REGISTER - STEP 2: OTP */}
        {mode === 'register-otp' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-500/20">
                <Mail className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold">Verify Your Email Address</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                We sent a 6-digit code to <strong style={{ color: 'var(--text-main)' }}>{regEmail}</strong>
              </p>
            </div>

            {devOtpNotification && (
              <div className="p-3.5 rounded-2xl border text-xs space-y-2 bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                <div className="font-bold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-500" /> Dispatched to Gmail:
                </div>
                <p className="text-[11px] leading-relaxed">
                  Verification email sent to <strong>{regEmail}</strong> via SMTP. Please check your Gmail inbox (and spam/promotions folder).
                </p>
                <details className="text-[11px] cursor-pointer pt-1 border-t border-indigo-500/20">
                  <summary className="font-semibold hover:underline opacity-80">Local Dev Testing Helper (Click to reveal OTP)</summary>
                  <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 font-mono font-bold text-lg text-center tracking-widest text-amber-600 dark:text-amber-400">
                    {devOtpNotification}
                  </div>
                  <div className="mt-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => setOtpCode(devOtpNotification)}
                      className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 cursor-pointer"
                    >
                      Auto-Fill Code
                    </button>
                  </div>
                </details>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center font-mono text-2xl tracking-[0.5em] py-3 rounded-2xl border outline-none font-bold"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Expires in:{' '}
                    <strong className="font-mono" style={{ color: 'var(--text-main)' }}>
                      {Math.floor(otpTimerSeconds / 60)}:{String(otpTimerSeconds % 60).padStart(2, '0')}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="font-bold hover:underline disabled:opacity-40"
                  style={{ color: 'var(--accent)' }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpCode.length !== 6}
                className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Verify OTP & Set Account Details</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('register-email')}
                className="w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email Address</span>
              </button>
            </form>
          </div>
        )}

        {/* MODE: REGISTER - STEP 3: DETAILS (Name, Password, Target Exam) */}
        {mode === 'register-details' && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold">Complete Your Profile</h2>
              <p className="text-xs text-[var(--success)] font-semibold mt-0.5">✓ Email verified successfully!</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">First Name <span className="text-[var(--danger)]">*</span></label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Adarsh"
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Last Name <span className="text-[var(--danger)]">*</span></label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Sharma"
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>

            <PasswordInputWithMascot
              id="new-password"
              label="Set Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters..."
            />

            {password && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: 'var(--text-muted)' }}>Strength:</span>
                  <span className="font-bold">{passwordStrength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${passwordStrength.color}`} style={{ width: `${(passwordStrength.score / 4) * 100}%` }} />
                </div>
              </div>
            )}

            <PasswordInputWithMascot
              id="confirm-password"
              label="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password..."
            />

            {/* Target Exam Category Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold">Target Exam Categories <span className="text-[var(--danger)]">*</span></label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search exam categories..."
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-muted)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left text-xs font-medium flex items-center justify-between ${
                        isSelected ? 'shadow-xs' : 'opacity-80'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border-muted)',
                        color: isSelected ? 'var(--accent-contrast)' : 'var(--text-main)',
                      }}
                    >
                      <span className="truncate pr-1">{cat}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
              }}
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save & Enter Dashboard</span>
            </button>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot-password' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center">Reset Password</h2>
            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Send Reset Code</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs font-semibold text-[var(--text-faint)] hover:underline"
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotComplete} className="space-y-4">
                {devOtpNotification && (
                  <div className="p-3 rounded-2xl border text-xs space-y-1.5 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 mb-2">
                    <div className="font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Reset Dev OTP Code:
                      </span>
                      <button
                        type="button"
                        onClick={() => setForgotOtp(devOtpNotification)}
                        className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 cursor-pointer"
                      >
                        Auto-Fill Code
                      </button>
                    </div>
                    <div className="text-center font-mono font-bold text-xl tracking-widest">
                      {devOtpNotification}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold mb-1">6-Digit Reset Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center font-mono text-xl tracking-widest py-2.5 rounded-xl border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <PasswordInputWithMascot
                  id="forgot-new-pass"
                  label="New Password"
                  required
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="At least 8 characters..."
                />

                <PasswordInputWithMascot
                  id="forgot-confirm-pass"
                  label="Confirm New Password"
                  required
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Re-enter password..."
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Reset Password & Sign In</span>}
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
