/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'reasoniq.sqlite');

export const db = new DatabaseSync(DB_PATH);

// Initialize database schemas with strict constraints and indexes
export function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER DEFAULT 0,
      exam_categories TEXT NOT NULL,
      avatar_url TEXT,
      website_instructions TEXT,
      extra_info TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS gemini_keys (
      user_id TEXT PRIMARY KEY,
      encrypted_api_key TEXT NOT NULL,
      key_status TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS pending_registrations (
      email TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      exam_categories TEXT NOT NULL,
      encrypted_gemini_key TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      otp_attempts INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      last_resend_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      otp_hash TEXT NOT NULL,
      otp_attempts INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      last_resend_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

// Run schema initialization
initDatabase();
