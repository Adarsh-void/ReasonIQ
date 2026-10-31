/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordInputWithMascotProps {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
  showMascot?: boolean;
  hint?: string;
}

export const PasswordInputWithMascot: React.FC<PasswordInputWithMascotProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  autoComplete = 'current-password',
  error,
  disabled = false,
  showMascot = true,
  hint,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Mascot state calculation:
  // - If password is visible: mascot is looking with wide open, happy eyes!
  // - If password is hidden AND user is typing or focused: mascot covers eyes with paws 🙈!
  // - If idle and empty: calm guardian pose with gentle closed eyes 🛡️
  const isTyping = value.length > 0;
  const isPeeking = isVisible;
  const isEyesClosed = !isVisible && (isFocused || isTyping);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-semibold tracking-wide"
          style={{ color: 'var(--text-main)' }}
        >
          {label} {required && <span className="text-[var(--danger)] font-bold">*</span>}
        </label>

        {showMascot && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all duration-300 select-none shadow-xs"
            style={{
              backgroundColor: isEyesClosed
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(34, 197, 94, 0.12)',
              borderColor: isEyesClosed
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(34, 197, 94, 0.35)',
              color: isEyesClosed ? '#ef4444' : '#16a34a',
            }}
            title={
              isEyesClosed
                ? 'Password hidden: Eyes closed 🙈'
                : 'Password visible/open: Eyes open 👀'
            }
          >
            {/* Native Apple iOS Single Eye Emoji */}
            <div
              key={isEyesClosed ? 'closed' : 'open'}
              className="relative w-5 h-5 flex items-center justify-center text-sm transition-transform duration-300 transform scale-110"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", sans-serif' }}
            >
              👁️
            </div>
            <span
              className="font-semibold text-[10px] transition-opacity duration-300"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", sans-serif' }}
            >
              {isEyesClosed ? 'Closed Eye' : 'Open Eye'}
            </span>
          </div>
        )}
      </div>

      <div className="relative rounded-xl shadow-xs">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-faint)]">
          <Lock className="w-4 h-4" />
        </div>

        <input
          id={id}
          name={name || id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border outline-none transition-all ${
            error
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-[var(--border-main)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'
          }`}
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-main)',
          }}
        />

        {/* Show/Hide Interactive Toggle Button */}
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          tabIndex={0}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors focus:outline-none cursor-pointer"
        >
          {isVisible ? (
            <EyeOff className="w-4 h-4 text-[var(--success)]" />
          ) : (
            <Eye className="w-4 h-4 hover:opacity-80" />
          )}
        </button>
      </div>

      {error ? (
        <p className="text-[11px] text-[var(--danger)] font-medium">{error}</p>
      ) : hint ? (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};
