/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { db, auth } from './firebase';
import { LocalProfile, LocalAttemptRecord } from './localDatabase';
import { UserStreakData } from './streak';

export class FirebaseService {
  /**
   * Sign in with Google Popup
   */
  static async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  /**
   * Sign out
   */
  static async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Sync local profile to Firestore
   */
  static async uploadProfile(profile: LocalProfile): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      ...profile,
      profileId: user.uid,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  /**
   * Fetch profile from Firestore
   */
  static async downloadProfile(): Promise<LocalProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as LocalProfile;
    }
    return null;
  }

  /**
   * Sync streak data to Firestore
   */
  static async uploadStreak(streak: UserStreakData): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const streakDocRef = doc(db, 'users', user.uid, 'streaks', 'main');
    await setDoc(streakDocRef, {
      ...streak,
      profileId: user.uid,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Fetch streak data from Firestore
   */
  static async downloadStreak(): Promise<UserStreakData | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const streakDocRef = doc(db, 'users', user.uid, 'streaks', 'main');
    const snap = await getDoc(streakDocRef);
    if (snap.exists()) {
      return snap.data() as UserStreakData;
    }
    return null;
  }

  /**
   * Upload multiple attempts in a batch
   */
  static async uploadAttempts(attempts: LocalAttemptRecord[]): Promise<void> {
    const user = auth.currentUser;
    if (!user || attempts.length === 0) return;

    const batch = writeBatch(db);
    attempts.forEach((attempt) => {
      const attemptDocRef = doc(db, 'users', user.uid, 'attempts', attempt.attemptId);
      batch.set(attemptDocRef, {
        ...attempt,
        profileId: user.uid,
      });
    });
    await batch.commit();
  }

  /**
   * Upload a single attempt
   */
  static async uploadAttempt(attempt: LocalAttemptRecord): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const attemptDocRef = doc(db, 'users', user.uid, 'attempts', attempt.attemptId);
    await setDoc(attemptDocRef, {
      ...attempt,
      profileId: user.uid,
    });
  }

  /**
   * Download all attempts for the user
   */
  static async downloadAttempts(): Promise<LocalAttemptRecord[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const attemptsColRef = collection(db, 'users', user.uid, 'attempts');
    const snap = await getDocs(attemptsColRef);
    return snap.docs.map(doc => doc.data() as LocalAttemptRecord);
  }

  /**
   * Delete an attempt from Firestore
   */
  static async deleteAttempt(attemptId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const attemptDocRef = doc(db, 'users', user.uid, 'attempts', attemptId);
    await deleteDoc(attemptDocRef);
  }

  /**
   * Comprehensive restore: Downloads all data from Cloud and overwrites local storage
   */
  static async restoreCloudData(): Promise<{
    profile: LocalProfile | null;
    streak: UserStreakData | null;
    attempts: LocalAttemptRecord[];
  }> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const [profile, streak, attempts] = await Promise.all([
      this.downloadProfile(),
      this.downloadStreak(),
      this.downloadAttempts(),
    ]);

    return { profile, streak, attempts };
  }
}
