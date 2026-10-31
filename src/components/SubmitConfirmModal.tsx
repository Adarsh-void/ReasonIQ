/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, CheckCircle, HelpCircle, Bookmark, Clock, ArrowRight, X } from 'lucide-react';
import { formatTime } from '../utils/scoring';

interface SubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalQuestions: number;
  answeredCount: number;
  markedCount: number;
  secondsRemaining: number;
  isSubmitting: boolean;
}

export const SubmitConfirmModal: React.FC<SubmitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  markedCount,
  secondsRemaining,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl relative"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: unansweredCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: unansweredCount > 0 ? 'var(--warning)' : 'var(--success)',
            }}
          >
            {unansweredCount > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
              Submit Exam Confirmation
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to finish your attempt?
            </p>
          </div>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div
            className="p-3 rounded-xl border text-center"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-muted)',
            }}
          >
            <span className="text-[var(--success)] text-lg font-bold block">
              {answeredCount}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Answered
            </span>
          </div>

          <div
            className="p-3 rounded-xl border text-center"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-muted)',
            }}
          >
            <span className="text-amber-500 text-lg font-bold block">
              {unansweredCount}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Not Attempted
            </span>
          </div>

          <div
            className="p-3 rounded-xl border text-center"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-muted)',
            }}
          >
            <span className="text-purple-400 text-lg font-bold block">
              {markedCount}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Marked
            </span>
          </div>
        </div>

        {/* Time Remaining Notice */}
        <div
          className="p-3 rounded-xl border flex items-center justify-between text-xs mb-6 font-medium"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-muted)',
            color: 'var(--text-muted)',
          }}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            Time Remaining:
          </span>
          <span className="font-mono-numbers font-bold" style={{ color: 'var(--text-main)' }}>
            {formatTime(secondsRemaining)}
          </span>
        </div>

        {unansweredCount > 0 && (
          <p className="text-xs mb-6 text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              You still have {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}.
              Unanswered questions will receive 0 marks.
            </span>
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl border text-xs font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-main)',
              color: 'var(--text-main)',
            }}
          >
            Keep Answering
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-contrast)',
            }}
          >
            <span>{isSubmitting ? 'Evaluating...' : 'Yes, Submit Now'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
