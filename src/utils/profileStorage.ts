/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LocalProfile {
  profileId: string;
  profileName: string;
  encryptedApiKey: string;
  encryptionSalt: string;
  initializationVector: string;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'ReasonIQProfilesDB';
const STORE_NAME = 'profiles';
const DB_VERSION = 1;

export function openProfilesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'profileId' });
      }
    };
  });
}

export async function getAllProfiles(): Promise<LocalProfile[]> {
  const db = await openProfilesDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function saveProfile(profile: LocalProfile): Promise<void> {
  const db = await openProfilesDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(profile);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteProfileStore(profileId: string): Promise<void> {
  const db = await openProfilesDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(profileId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem('reasoniq_active_profile_id');
}

export function setActiveProfileId(profileId: string): void {
  localStorage.setItem('reasoniq_active_profile_id', profileId);
}
