/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_AVATAR = '🧠';

export function useCyclingAvatar(currentAvatar?: string): string {
  if (currentAvatar && currentAvatar.trim()) {
    return currentAvatar;
  }
  return DEFAULT_AVATAR;
}
