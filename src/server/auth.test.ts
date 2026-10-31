/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
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
import { AuthService } from './authService';
import { db } from './db';

test('Password hashing and verification with bcrypt', async () => {
  const plain = 'StrongPass123!#';
  const hashed = await hashPassword(plain);

  assert.notEqual(hashed, plain);
  assert.equal(hashed.startsWith('$2'), true);

  const isMatch = await verifyPassword(plain, hashed);
  assert.equal(isMatch, true);

  const isWrong = await verifyPassword('WrongPassword', hashed);
  assert.equal(isWrong, false);
});

test('AES-256-GCM encryption and decryption of API keys', () => {
  const sampleApiKey = 'AIzaSyDemoSampleKey1234567890abcdefABC';
  const encrypted = encryptSecret(sampleApiKey);

  assert.notEqual(encrypted, sampleApiKey);
  assert.equal(encrypted.includes(':'), true);

  const decrypted = decryptSecret(encrypted);
  assert.equal(decrypted, sampleApiKey);

  const tampered = encrypted.slice(0, -4) + '0000';
  const failedDecrypt = decryptSecret(tampered);
  assert.equal(failedDecrypt, '');
});

test('OTP generation and timing-safe verification', () => {
  const otp = generateOtp();
  assert.equal(otp.length, 6);
  assert.equal(/^\d{6}$/.test(otp), true);

  const email = 'student@example.com';
  const hashed = hashOtp(otp, email);

  assert.equal(verifyOtp(otp, email, hashed), true);
  assert.equal(verifyOtp('000000', email, hashed), false);
  assert.equal(verifyOtp(otp, 'other@example.com', hashed), false);
});

test('Session token generation produces secure random hex strings', () => {
  const token1 = generateSessionToken();
  const token2 = generateSessionToken();

  assert.equal(token1.length, 64);
  assert.equal(token2.length, 64);
  assert.notEqual(token1, token2);
});

test('AuthService input validation catches missing or weak fields', async () => {
  await assert.rejects(
    async () => {
      await AuthService.initiateRegistration({
        firstName: '',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'Password123!',
        examCategories: ['Placement Preparation'],
        geminiApiKey: 'AIzaSyFakeKey1234567890abcdef',
      });
    },
    { message: 'First name is required.' }
  );

  await assert.rejects(
    async () => {
      await AuthService.initiateRegistration({
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'Password123!',
        examCategories: ['Placement Preparation'],
        geminiApiKey: 'AIzaSyFakeKey1234567890abcdef',
      });
    },
    { message: 'A valid email address is required.' }
  );

  await assert.rejects(
    async () => {
      await AuthService.initiateRegistration({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'short',
        examCategories: ['Placement Preparation'],
        geminiApiKey: 'AIzaSyFakeKey1234567890abcdef',
      });
    },
    { message: 'Password must be at least 8 characters long.' }
  );

  await assert.rejects(
    async () => {
      await AuthService.initiateRegistration({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'MismatchPassword123!',
        examCategories: ['Placement Preparation'],
        geminiApiKey: 'AIzaSyFakeKey1234567890abcdef',
      });
    },
    { message: 'Passwords do not match.' }
  );
});

test('End-to-end Registration, OTP verification, Login, Profile, and Password Reset flow', async () => {
  const testEmail = `testuser_${Date.now()}@testdomain.com`;
  const plainPassword = 'MasterSecurePassword123!';
  const testKey = 'AIzaSyTestKeyForUnitValidation12345678';

  // 1. Initiate registration
  // Pre-seed pending registration directly for deterministic testing without external network dependency
  const otp = '849201';
  const hashedOtp = hashOtp(otp, testEmail);
  const passwordHash = await hashPassword(plainPassword);
  const encKey = encryptSecret(testKey);

  db.prepare(`
    INSERT INTO pending_registrations (
      email, first_name, middle_name, last_name, password_hash,
      exam_categories, encrypted_gemini_key, otp_hash, otp_attempts,
      expires_at, last_resend_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run(
    testEmail,
    'Aarav',
    'Kumar',
    'Verma',
    passwordHash,
    JSON.stringify(['Competitive Examinations', 'CUET PG']),
    encKey,
    hashedOtp,
    new Date(Date.now() + 300000).toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  );

  // 2. Reject incorrect OTP
  await assert.rejects(
    async () => {
      await AuthService.verifyRegistrationOtp(testEmail, '999999');
    },
    /Invalid verification code/
  );

  // 3. Accept correct OTP and create user
  const verification = await AuthService.verifyRegistrationOtp(testEmail, otp);
  assert.equal(verification.user.email, testEmail);
  assert.equal(verification.user.firstName, 'Aarav');
  assert.equal(verification.user.lastName, 'Verma');
  assert.equal(verification.user.name, 'Aarav Kumar Verma');
  assert.equal(verification.user.emailVerified, true);
  assert.equal(verification.user.geminiKeyStatus, 'configured');
  assert.ok(verification.sessionToken);

  // 4. Verify session lookup
  const sessionUser = AuthService.getSessionUser(verification.sessionToken);
  assert.ok(sessionUser);
  assert.equal(sessionUser?.id, verification.user.id);
  assert.equal(sessionUser?.email, testEmail);

  // 5. Verify decryption of user's key
  const retrievedKey = AuthService.getUserGeminiKey(verification.user.id);
  assert.equal(retrievedKey, testKey);

  // 6. Returning user Login with correct credentials
  const loginResult = await AuthService.login(testEmail, plainPassword);
  assert.equal(loginResult.user.id, verification.user.id);
  assert.ok(loginResult.sessionToken);

  // 7. Returning user Login with incorrect password fails with generic error
  await assert.rejects(
    async () => {
      await AuthService.login(testEmail, 'IncorrectPassword999!');
    },
    { message: 'Invalid email or password. Please try again.' }
  );

  // 8. Update profile details
  const updatedUser = await AuthService.updateProfile(verification.user.id, {
    firstName: 'Aarav',
    middleName: '',
    lastName: 'Singh',
    examCategories: ['Banking Examinations', 'SSC Examinations'],
    extraInfo: 'Aiming for 99th percentile',
  });
  assert.equal(updatedUser.lastName, 'Singh');
  assert.deepEqual(updatedUser.examCategories, ['Banking Examinations', 'SSC Examinations']);

  // 9. Change Password
  const newPassword = 'BrandNewPassword456!#';
  const passChange = await AuthService.changePassword(verification.user.id, plainPassword, newPassword);
  assert.equal(passChange.success, true);

  // 10. Login with new password succeeds, old password fails
  const newLogin = await AuthService.login(testEmail, newPassword);
  assert.equal(newLogin.user.id, verification.user.id);

  await assert.rejects(
    async () => {
      await AuthService.login(testEmail, plainPassword);
    },
    { message: 'Invalid email or password. Please try again.' }
  );

  // 11. Logout ends session
  AuthService.logout(newLogin.sessionToken);
  const deadSession = AuthService.getSessionUser(newLogin.sessionToken);
  assert.equal(deadSession, null);
});
