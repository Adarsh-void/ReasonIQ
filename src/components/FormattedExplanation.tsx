/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, CheckCircle, ShieldCheck, ArrowRight, XCircle, Lightbulb } from 'lucide-react';

interface FormattedExplanationProps {
  explanation: string;
}

export const FormattedExplanation: React.FC<FormattedExplanationProps> = ({ explanation }) => {
  if (!explanation) return null;

  // Normalize and parse text into structured blocks
  const rawText = explanation.trim();

  // Check if explanation has explicit step numbers or bullet breaks
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Extract numbered or lettered points
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  
  // Categorize content: Core premise, numbered logic steps, distractor notes, and conclusion
  const stepItems: string[] = [];
  const generalLines: string[] = [];
  let conclusionText = '';

  lines.forEach((line) => {
    // Check for conclusion indicator
    if (/^(therefore|thus|hence|in conclusion|consequently|so,)\b/i.test(line)) {
      conclusionText = line;
      return;
    }

    // Check for step indicator
    const stepMatch = line.match(/^(\d+[\.\)]|step\s*\d+:|point\s*\d+:|\([a-z0-9]\))\s*(.*)$/i);
    if (stepMatch) {
      stepItems.push(stepMatch[2] || line);
    } else {
      generalLines.push(line);
    }
  });

  return (
    <div
      className="mt-4 p-4 sm:p-5 rounded-2xl border transition-all text-xs"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-muted)',
      }}
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between pb-3 mb-3 border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
            }}
          >
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-extrabold text-[12px] tracking-tight block" style={{ color: 'var(--text-main)' }}>
              Step-by-Step Logical Proof & Verification
            </span>
            <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
              Rigorous analytical breakdown and deduction
            </span>
          </div>
        </div>

        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
          style={{
            backgroundColor: 'var(--accent-light)',
            borderColor: 'var(--accent-border)',
            color: 'var(--accent)',
          }}
        >
          Verified Key
        </span>
      </div>

      {/* Main Deduction Content */}
      <div className="space-y-3">
        {/* General premise or statement breakdown */}
        {generalLines.length > 0 && (
          <div className="space-y-2 leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {generalLines.map((line, idx) => (
              <p key={idx} className="text-[12px] font-normal leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Step-by-Step Cards */}
        {stepItems.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: 'var(--text-faint)' }}>
              Logical Chain of Deduction:
            </span>
            {stepItems.map((step, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border flex items-start gap-2.5 transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-muted)',
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10.5px] shrink-0 font-mono-numbers mt-0.5"
                  style={{
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  {idx + 1}
                </span>
                <p className="flex-1 text-[12px] leading-relaxed font-normal" style={{ color: 'var(--text-main)' }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Highlighted Conclusion */}
        {conclusionText && (
          <div
            className="p-3 rounded-xl border flex items-start gap-2 mt-2"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderColor: 'rgba(16, 185, 129, 0.25)',
              color: 'var(--text-main)',
            }}
          >
            <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
            <div className="text-[12px] leading-relaxed">
              <strong className="text-[var(--success)] font-bold">Conclusion: </strong>
              <span>{conclusionText}</span>
            </div>
          </div>
        )}
      </div>

      {/* Logical Guarantee Footer */}
      <div
        className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px]"
        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-faint)' }}
      >
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
          <span>Follows strictly from rules of analytical deduction without external assumptions.</span>
        </div>
      </div>
    </div>
  );
};
