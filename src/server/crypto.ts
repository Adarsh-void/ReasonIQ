/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

// Load or generate persistent encryption secret for AES-256-GCM
function getEncryptionKey(): Buffer {
  if (process.env.APP_ENCRYPTION_SECRET && process.env.APP_ENCRYPTION_SECRET.length >= 32) {
    return crypto.createHash('sha256').update(process.env.APP_ENCRYPTION_SECRET).digest();
  }

  const secretsDir = path.resolve(process.cwd(), '.secrets');
  const secretFile = path.join(secretsDir, 'encryption.key');

  if (fs.existsSync(secretFile)) {
    try {
      const stored = fs.readFileSync(secretFile, 'utf8').trim();
      if (stored) {
        return Buffer.from(stored, 'hex');
      }
    } catch {}
  }

  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
  }

  const newKey = crypto.randomBytes(32);
  fs.writeFileSync(secretFile, newKey.toString('hex'), { mode: 0o600 });
  return newKey;
}

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-gcm';
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Encrypt a sensitive string (e.g., Gemini API key) using AES-256-GCM
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted secret string
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText || !cipherText.includes(':')) return '';
  try {
    const [ivHex, authTagHex, encryptedData] = cipherText.split(':');
    if (!ivHex || !authTagHex || !encryptedData) return '';
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return '';
  }
}

/**
 * Hash password with bcrypt and 10 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateOtp(): string {
  const number = crypto.randomInt(100000, 999999);
  return number.toString();
}

/**
 * Hash an OTP with email salt for secure storage in database
 */
export function hashOtp(otp: string, email: string): string {
  return crypto.createHash('sha256').update(`${email.toLowerCase().trim()}:${otp}`).digest('hex');
}

/**
 * Verify an entered OTP against stored hash
 */
export function verifyOtp(otp: string, email: string, storedHash: string): boolean {
  const incomingHash = hashOtp(otp, email);
  return crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash));
}

/**
 * Generate a 32-byte cryptographically secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
