/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from './db';
import {
  hashPassword,
  verifyPassword,
  encryptSecret,
  decryptSecret,
  generateOtp,
  hashOtp,
  verifyOtp,
  generateSessionToken,
} from './crypto';
import { sendRegistrationOtpEmail, sendPasswordResetOtpEmail } from './email';
import { validateGeminiKey } from './geminiValidation';

export interface UserDTO {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  name: string;
  email: string;
  emailVerified: boolean;
  examCategories: string[];
  avatarUrl?: string;
  websiteInstructions?: string;
  extraInfo?: string;
  createdAt: string;
  updatedAt: string;
  geminiKeyStatus: 'configured' | 'invalid' | 'unavailable';
}

export interface RegisterInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  examCategories: string[];
  geminiApiKey: string;
}

export const EXAM_CATEGORIES_LIST = [
  'Competitive Examinations',
  'Placement Preparation',
  'Government Job Examinations',
  'NIMCET / MCA Entrance',
  'CUET PG',
  'Banking Examinations',
  'SSC Examinations',
  'Campus Recruitment',
  'Technical Interviews',
  'Other Examinations',
];

export class AuthService {
  /**
   * Helper to format user row to client-safe DTO
   */
  static formatUser(row: any, keyStatus: 'configured' | 'invalid' | 'unavailable' = 'configured'): UserDTO {
    const fullName = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ');
    let categories: string[] = [];
    try {
      categories = JSON.parse(row.exam_categories || '[]');
    } catch {
      categories = [EXAM_CATEGORIES_LIST[0]];
    }

    return {
      id: row.id,
      firstName: row.first_name,
      middleName: row.middle_name || undefined,
      lastName: row.last_name,
      name: fullName || row.first_name,
      email: row.email,
      emailVerified: Boolean(row.email_verified),
      examCategories: categories,
      avatarUrl: row.avatar_url || '🧠',
      websiteInstructions: row.website_instructions || undefined,
      extraInfo: row.extra_info || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      geminiKeyStatus: keyStatus,
    };
  }

  /**
   * Step 1 of Sign-up: Validate inputs, test Gemini API key, hash password, create pending registration, send OTP
   */
  static async initiateRegistration(input: RegisterInput) {
    const firstName = (input.firstName || '').trim();
    const middleName = (input.middleName || '').trim();
    const lastName = (input.lastName || '').trim();
    const email = (input.email || '').toLowerCase().trim();
    const password = input.password || '';
    const categories = Array.isArray(input.examCategories) && input.examCategories.length > 0
      ? input.examCategories
      : [EXAM_CATEGORIES_LIST[0]];
    const geminiKey = (input.geminiApiKey || '').trim();

    // 1. Validation
    if (!firstName) {
      throw new Error('First name is required.');
    }
    if (!lastName) {
      throw new Error('Last name is required.');
    }
    if (!email || !email.includes('@') || email.length < 5) {
      throw new Error('A valid email address is required.');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (input.confirmPassword && input.confirmPassword !== password) {
      throw new Error('Passwords do not match.');
    }
    // 2. Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    // 3. Test and validate user's Gemini API key if provided
    let encryptedKey = '';
    let keyStatus: 'configured' | 'unavailable' = 'unavailable';

    if (geminiKey) {
      const keyCheck = await validateGeminiKey(geminiKey);
      if (!keyCheck.isValid) {
        throw new Error(`Gemini API Key verification failed: ${keyCheck.message}`);
      }
      encryptedKey = encryptSecret(geminiKey);
      keyStatus = 'configured';
    } else {
      encryptedKey = encryptSecret('');
      keyStatus = 'unavailable';
    }

    // 4. Rate-limit check on pending registration
    const pending = db.prepare('SELECT last_resend_at FROM pending_registrations WHERE email = ?').get(email) as any;
    const now = Date.now();
    if (pending) {
      const lastResend = new Date(pending.last_resend_at).getTime();
      const diffSeconds = Math.floor((now - lastResend) / 1000);
      if (diffSeconds < 60) {
        throw new Error(`Please wait ${60 - diffSeconds} seconds before requesting a new OTP code.`);
      }
    }

    // 5. Hash password and store encrypted Gemini API Key (or empty placeholder)
    const passwordHash = await hashPassword(password);

    // 6. Generate 6-digit OTP and store hash with 5-minute expiry
    const otp = generateOtp();
    const otpHash = hashOtp(otp, email);
    const expiresAt = new Date(now + 5 * 60 * 1000).toISOString();
    const lastResendAt = new Date(now).toISOString();
    const createdAt = new Date(now).toISOString();

    // 7. Upsert into pending_registrations table
    db.prepare(`
      INSERT INTO pending_registrations (
        email, first_name, middle_name, last_name, password_hash,
        exam_categories, encrypted_gemini_key, otp_hash, otp_attempts,
        expires_at, last_resend_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        first_name = excluded.first_name,
        middle_name = excluded.middle_name,
        last_name = excluded.last_name,
        password_hash = excluded.password_hash,
        exam_categories = excluded.exam_categories,
        encrypted_gemini_key = excluded.encrypted_gemini_key,
        otp_hash = excluded.otp_hash,
        otp_attempts = 0,
        expires_at = excluded.expires_at,
        last_resend_at = excluded.last_resend_at
    `).run(
      email,
      firstName,
      middleName || null,
      lastName,
      passwordHash,
      JSON.stringify(categories),
      encryptedKey,
      otpHash,
      expiresAt,
      lastResendAt,
      createdAt
    );

    // 8. Dispatch verification email via transactional email service
    const emailResult = await sendRegistrationOtpEmail(email, firstName, otp);

    return {
      success: true,
      email,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      emailSent: emailResult.providerConfigured,
      message: emailResult.message,
      devOtp: emailResult.devOtp,
    };
  }

  /**
   * Resend OTP for pending registration with 60-second cooldown
   */
  static async resendRegistrationOtp(emailRaw: string) {
    const email = (emailRaw || '').toLowerCase().trim();
    const pending = db.prepare('SELECT * FROM pending_registrations WHERE email = ?').get(email) as any;

    if (!pending) {
      throw new Error('No pending registration found for this email. Please fill out the registration form.');
    }

    const now = Date.now();
    const lastResend = new Date(pending.last_resend_at).getTime();
    const diffSeconds = Math.floor((now - lastResend) / 1000);
    if (diffSeconds < 60) {
      throw new Error(`Please wait ${60 - diffSeconds} seconds before requesting another verification code.`);
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp, email);
    const expiresAt = new Date(now + 5 * 60 * 1000).toISOString();
    const lastResendAt = new Date(now).toISOString();

    db.prepare(`
      UPDATE pending_registrations
      SET otp_hash = ?, otp_attempts = 0, expires_at = ?, last_resend_at = ?
      WHERE email = ?
    `).run(otpHash, expiresAt, lastResendAt, email);

    const emailResult = await sendRegistrationOtpEmail(email, pending.first_name, otp);

    return {
      success: true,
      email,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      emailSent: emailResult.providerConfigured,
      message: emailResult.message,
      devOtp: emailResult.devOtp,
    };
  }

  /**
   * Step 2 of Sign-up: Verify OTP, create persistent account in DB, save key, issue session
   */
  static async verifyRegistrationOtp(emailRaw: string, otpRaw: string) {
    const email = (emailRaw || '').toLowerCase().trim();
    const otp = (otpRaw || '').trim();

    const pending = db.prepare('SELECT * FROM pending_registrations WHERE email = ?').get(email) as any;
    if (!pending) {
      throw new Error('Registration session expired or not found. Please start registration again.');
    }

    const now = Date.now();
    const expiresAt = new Date(pending.expires_at).getTime();
    if (now > expiresAt) {
      db.prepare('DELETE FROM pending_registrations WHERE email = ?').run(email);
      throw new Error('Verification code has expired. Please register again.');
    }

    if (pending.otp_attempts >= 5) {
      db.prepare('DELETE FROM pending_registrations WHERE email = ?').run(email);
      throw new Error('Too many incorrect verification attempts. Please register again.');
    }

    // Verify OTP using timing-safe comparison
    const isCorrect = verifyOtp(otp, email, pending.otp_hash);
    if (!isCorrect) {
      const attempts = pending.otp_attempts + 1;
      db.prepare('UPDATE pending_registrations SET otp_attempts = ? WHERE email = ?').run(attempts, email);
      const remaining = 5 - attempts;
      throw new Error(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
    }

    // OTP verified! Create real user account
    const userId = `usr_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const hasKey = Boolean(pending.encrypted_gemini_key && pending.encrypted_gemini_key !== encryptSecret(''));
    const keyStatus = hasKey ? 'configured' : 'unavailable';

    const insertUser = db.prepare(`
      INSERT INTO users (
        id, first_name, middle_name, last_name, email, password_hash,
        email_verified, exam_categories, avatar_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, '🧠', ?, ?)
    `);

    const insertKey = db.prepare(`
      INSERT INTO gemini_keys (user_id, encrypted_api_key, key_status, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    // Run in transaction
    insertUser.run(
      userId,
      pending.first_name,
      pending.middle_name,
      pending.last_name,
      pending.email,
      pending.password_hash,
      pending.exam_categories,
      timestamp,
      timestamp
    );

    insertKey.run(userId, pending.encrypted_gemini_key || encryptSecret(''), keyStatus, timestamp);

    // Clean up pending registration
    db.prepare('DELETE FROM pending_registrations WHERE email = ?').run(email);

    // Create session token valid for 30 days
    const sessionToken = generateSessionToken();
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
      sessionToken,
      userId,
      timestamp,
      sessionExpires
    );

    const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return {
      user: this.formatUser(createdUser, keyStatus),
      sessionToken,
    };
  }

  /**
   * Returning User Login: Email + Password verification, session creation
   */
  static async login(emailRaw: string, passwordRaw: string) {
    const email = (emailRaw || '').toLowerCase().trim();
    const password = passwordRaw || '';

    if (!email || !password) {
      throw new Error('Invalid email or password. Please try again.');
    }

    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!userRow) {
      // Generic error: never reveal if email exists
      throw new Error('Invalid email or password. Please try again.');
    }

    const passwordMatches = await verifyPassword(password, userRow.password_hash);
    if (!passwordMatches) {
      throw new Error('Invalid email or password. Please try again.');
    }

    if (!userRow.email_verified) {
      throw new Error('Account email is not verified. Please complete verification.');
    }

    // Check Gemini API key status
    const keyRow = db.prepare('SELECT key_status FROM gemini_keys WHERE user_id = ?').get(userRow.id) as any;
    const keyStatus = keyRow ? (keyRow.key_status as any) : 'unavailable';

    // Issue session token
    const sessionToken = generateSessionToken();
    const timestamp = new Date().toISOString();
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
      sessionToken,
      userRow.id,
      timestamp,
      sessionExpires
    );

    return {
      user: this.formatUser(userRow, keyStatus),
      sessionToken,
    };
  }

  /**
   * Validate session token from cookie or header and return authenticated UserDTO
   */
  static getSessionUser(sessionToken: string): UserDTO | null {
    if (!sessionToken) return null;

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionToken) as any;
    if (!session) return null;

    if (new Date(session.expires_at).getTime() < Date.now()) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionToken);
      return null;
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as any;
    if (!userRow) return null;

    const keyRow = db.prepare('SELECT key_status FROM gemini_keys WHERE user_id = ?').get(userRow.id) as any;
    const keyStatus = keyRow ? (keyRow.key_status as any) : 'unavailable';

    return this.formatUser(userRow, keyStatus);
  }

  /**
   * Terminate session on logout
   */
  static logout(sessionToken: string): void {
    if (sessionToken) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionToken);
    }
  }

  /**
   * Update Profile details (names, categories, avatar, instructions)
   */
  static async updateProfile(userId: string, updates: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    examCategories?: string[];
    avatarUrl?: string;
    websiteInstructions?: string;
    extraInfo?: string;
  }): Promise<UserDTO> {
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!userRow) {
      throw new Error('User account not found.');
    }

    const firstName = updates.firstName !== undefined ? updates.firstName.trim() : userRow.first_name;
    const middleName = updates.middleName !== undefined ? updates.middleName.trim() : userRow.middle_name;
    const lastName = updates.lastName !== undefined ? updates.lastName.trim() : userRow.last_name;
    const categories = updates.examCategories ? JSON.stringify(updates.examCategories) : userRow.exam_categories;
    const avatarUrl = updates.avatarUrl || userRow.avatar_url;
    const websiteInstructions = updates.websiteInstructions ?? userRow.website_instructions;
    const extraInfo = updates.extraInfo ?? userRow.extra_info;
    const updatedAt = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET first_name = ?, middle_name = ?, last_name = ?, exam_categories = ?,
          avatar_url = ?, website_instructions = ?, extra_info = ?, updated_at = ?
      WHERE id = ?
    `).run(
      firstName,
      middleName || null,
      lastName,
      categories,
      avatarUrl,
      websiteInstructions,
      extraInfo,
      updatedAt,
      userId
    );

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const keyRow = db.prepare('SELECT key_status FROM gemini_keys WHERE user_id = ?').get(userId) as any;
    return this.formatUser(updatedUser, keyRow ? keyRow.key_status : 'unavailable');
  }

  /**
   * Update or Change Gemini API Key: validates with minimal test request, encrypts, and updates DB
   */
  static async updateGeminiKey(userId: string, newApiKey: string) {
    const trimmed = (newApiKey || '').trim();
    if (!trimmed) {
      throw new Error('New Gemini API key cannot be empty.');
    }

    // 1. Validate with real test request
    const check = await validateGeminiKey(trimmed);
    if (!check.isValid) {
      throw new Error(`API key validation failed: ${check.message}`);
    }

    // 2. Encrypt
    const encrypted = encryptSecret(trimmed);
    const updatedAt = new Date().toISOString();

    // 3. Upsert into gemini_keys
    db.prepare(`
      INSERT INTO gemini_keys (user_id, encrypted_api_key, key_status, updated_at)
      VALUES (?, ?, 'configured', ?)
      ON CONFLICT(user_id) DO UPDATE SET
        encrypted_api_key = excluded.encrypted_api_key,
        key_status = 'configured',
        updated_at = excluded.updated_at
    `).run(userId, encrypted, updatedAt);

    return {
      success: true,
      message: 'Gemini API key updated and verified successfully.',
      keyStatus: 'configured' as const,
    };
  }

  /**
   * Change user password (requires current password)
   */
  static async changePassword(userId: string, currentPass: string, newPass: string) {
    if (!newPass || newPass.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
    if (!user) throw new Error('User not found.');

    const matches = await verifyPassword(currentPass, user.password_hash);
    if (!matches) {
      throw new Error('Current password does not match.');
    }

    const newHash = await hashPassword(newPass);
    const updatedAt = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, updatedAt, userId);

    return { success: true, message: 'Password changed successfully.' };
  }

  /**
   * Step 1 of Password Reset: Send 6-digit OTP to user's email
   */
  static async initiatePasswordReset(emailRaw: string) {
    const email = (emailRaw || '').toLowerCase().trim();
    if (!email) throw new Error('Please enter your registered email address.');

    const user = db.prepare('SELECT id, first_name FROM users WHERE email = ?').get(email) as any;
    
    // Always return generic response to prevent user enumeration
    if (!user) {
      return {
        success: true,
        email,
        message: 'If an account exists with this email, a password reset code has been sent.',
        emailSent: true,
      };
    }

    // Rate-limit check
    const existingReset = db.prepare('SELECT last_resend_at FROM password_resets WHERE email = ?').get(email) as any;
    const now = Date.now();
    if (existingReset) {
      const diff = Math.floor((now - new Date(existingReset.last_resend_at).getTime()) / 1000);
      if (diff < 60) {
        throw new Error(`Please wait ${60 - diff} seconds before requesting another reset code.`);
      }
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp, email);
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
    const lastResendAt = new Date(now).toISOString();
    const createdAt = new Date(now).toISOString();

    db.prepare(`
      INSERT INTO password_resets (email, otp_hash, otp_attempts, expires_at, last_resend_at, created_at)
      VALUES (?, ?, 0, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        otp_hash = excluded.otp_hash,
        otp_attempts = 0,
        expires_at = excluded.expires_at,
        last_resend_at = excluded.last_resend_at
    `).run(email, otpHash, expiresAt, lastResendAt, createdAt);

    const emailResult = await sendPasswordResetOtpEmail(email, otp);

    return {
      success: true,
      email,
      expiresInSeconds: 600,
      resendCooldownSeconds: 60,
      emailSent: emailResult.providerConfigured,
      message: 'If an account exists with this email, a password reset code has been sent.',
      devOtp: emailResult.devOtp,
    };
  }

  /**
   * Step 2 of Password Reset: Verify OTP and update password
   */
  static async completePasswordReset(emailRaw: string, otpRaw: string, newPasswordRaw: string) {
    const email = (emailRaw || '').toLowerCase().trim();
    const otp = (otpRaw || '').trim();
    const newPassword = newPasswordRaw || '';

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const resetRow = db.prepare('SELECT * FROM password_resets WHERE email = ?').get(email) as any;
    if (!resetRow) {
      throw new Error('Password reset session not found or expired. Please request a new code.');
    }

    const now = Date.now();
    if (now > new Date(resetRow.expires_at).getTime()) {
      db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
      throw new Error('Password reset code has expired. Please request a new code.');
    }

    if (resetRow.otp_attempts >= 5) {
      db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
      throw new Error('Too many invalid attempts. Please request a new reset code.');
    }

    const isMatch = verifyOtp(otp, email, resetRow.otp_hash);
    if (!isMatch) {
      const attempts = resetRow.otp_attempts + 1;
      db.prepare('UPDATE password_resets SET otp_attempts = ? WHERE email = ?').run(attempts, email);
      const remaining = 5 - attempts;
      throw new Error(`Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
    }

    // OTP is valid! Hash password and update user
    const newHash = await hashPassword(newPassword);
    const updatedAt = new Date().toISOString();

    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?').run(newHash, updatedAt, email);
    
    // Invalidate existing sessions for this user for security
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (user) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    }

    db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);

    return {
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.',
    };
  }

  /**
   * Internal server method: Retrieve and decrypt a user's Gemini API key for exam generation
   */
  static getUserGeminiKey(userId: string): string | null {
    const row = db.prepare('SELECT encrypted_api_key, key_status FROM gemini_keys WHERE user_id = ?').get(userId) as any;
    if (!row || !row.encrypted_api_key) return null;
    return decryptSecret(row.encrypted_api_key);
  }
}
