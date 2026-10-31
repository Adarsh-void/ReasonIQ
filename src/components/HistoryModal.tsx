/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExamResult } from '../types/exam';
import { History, X, Trophy, Calendar, Clock, Trash2, ArrowRight, BookOpen } from 'lucide-react';
import { formatTime } from '../utils/scoring';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ExamResult[];
  onSelectExam: (result: ExamResult) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectExam,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/75 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl border p-6 shadow-2xl flex flex-col relative"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
              }}
            >
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
                Past Exam Attempts
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {history.length} saved mock exams on this device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-1.5 rounded-lg text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10 flex items-center gap-1 transition-colors"
                title="Clear all saved attempts"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-faint)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                No past attempts yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Complete a mock exam to track your score progressions here.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const formattedDate = new Date(item.dateAttempted).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isPositiveScore = item.totalScore > 0;

              return (
                <div
                  key={item.examId}
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-muted)',
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                        {item.topic}
                      </span>
                      <span
                        className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border"
                        style={{
                          backgroundColor: 'var(--accent-light)',
                          borderColor: 'var(--accent-border)',
                          color: 'var(--accent)',
                        }}
                      >
                        {item.difficulty}
                      </span>
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>
                        Questions: <strong style={{ color: 'var(--text-main)' }}>{item.totalQuestions}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Accuracy: <strong className="text-[var(--success)]">{item.accuracy}%</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Time: <strong style={{ color: 'var(--text-main)' }}>{formatTime(item.timeTakenSeconds)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-base font-extrabold font-mono-numbers" style={{ color: isPositiveScore ? 'var(--accent)' : 'var(--danger)' }}>
                        {item.totalScore} / {item.maxMarks}
                      </div>
                      <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                        Score ({item.correctCount}C / {item.incorrectCount}W / {item.unansweredCount}S)
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onSelectExam(item);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-main)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
