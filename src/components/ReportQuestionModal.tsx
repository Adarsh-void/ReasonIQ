/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Flag, X, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { QuestionReport } from '../types/exam';

interface ReportQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  questionId: string;
  questionNumber: number;
}

const REPORT_REASONS: {
  id: QuestionReport['reason'];
  label: string;
  desc: string;
}[] = [
  {
    id: 'ambiguous',
    label: 'Ambiguous or Incomplete Premise',
    desc: 'The question lacks critical facts needed for deduction.',
  },
  {
    id: 'wrong_key',
    label: 'Incorrect Answer Key',
    desc: 'The official answer marked correct appears logically flawed.',
  },
  {
    id: 'calculation_error',
    label: 'Numerical or Calculation Error',
    desc: 'Math equations, differences, or series values do not tally.',
  },
  {
    id: 'misleading_premise',
    label: 'Contradictory Logic',
    desc: 'Syllogism or arrangement rules contain internal contradictions.',
  },
  {
    id: 'other',
    label: 'Typo or Other Issue',
    desc: 'Formatting, typos, or duplicate options.',
  },
];

export const ReportQuestionModal: React.FC<ReportQuestionModalProps> = ({
  isOpen,
  onClose,
  examId,
  questionId,
  questionNumber,
}) => {
  const [selectedReason, setSelectedReason] = useState<QuestionReport['reason']>('ambiguous');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/report-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          questionId,
          reason: selectedReason,
          details: details.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record report.');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/75 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
            }}
          >
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
              Flag Question #{questionNumber} for Review
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Help maintain rigorous psychometric quality and reasoning integrity
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto mb-3" />
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              Report Received
            </h4>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Thank you. This question has been logged for logical verification.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold block" style={{ color: 'var(--text-main)' }}>
                Select Issue Category:
              </label>
              {REPORT_REASONS.map((r) => {
                const isSelected = selectedReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.id)}
                    className="w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-surface-elevated)',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border-muted)',
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center"
                      style={{
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border-main)',
                      }}
                    >
                      {isSelected && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: 'var(--accent)' }}
                        />
                      )}
                    </div>
                    <div>
                      <span
                        className="text-xs font-semibold block"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-main)' }}
                      >
                        {r.label}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                        {r.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <label htmlFor="report-details" className="text-xs font-bold block mb-1" style={{ color: 'var(--text-main)' }}>
                Additional Details (Optional):
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe your reasoning or why you believe this solution is flawed..."
                rows={3}
                className="w-full p-3 rounded-xl border text-xs focus:outline-none resize-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-main)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg text-xs text-[var(--danger)] bg-[var(--danger)]/10 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-main)',
                  color: 'var(--text-main)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
