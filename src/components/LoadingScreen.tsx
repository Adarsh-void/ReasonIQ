/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

interface LoadingScreenProps {
  topic: string;
  questionCount: number;
}

const REASONING_TIPS = [
  'In Syllogisms, never rely on real-world facts—only evaluate what directly follows from the given premises.',
  'For Seating Arrangements, always anchor the person with the most definitive left/right position first.',
  'In Blood Relations, convert names into standard generation tree diagrams to prevent relationship confusion.',
  'When solving Direction Sense, draw a compass reference and plot coordinates relative to the initial origin (0,0).',
  'For Number Series, check consecutive differences first, then second-order differences, primes, or squares.',
  'In Critical Thinking questions, identify the conclusion before evaluating the supporting assumptions or flaws.',
];

const GENERATION_STEPS = [
  { label: 'Deconstructing analytical reasoning topic & subdomains', icon: Brain },
  { label: 'Prompting Gemini AI model for verified multiple-choice problems', icon: Cpu },
  { label: 'Verifying mathematical consistency & answer key accuracy', icon: ShieldCheck },
  { label: 'Formatting interactive exam simulation workspace', icon: Sparkles },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ topic, questionCount }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 200);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % REASONING_TIPS.length);
    }, 4000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(tipInterval);
    };
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <div
        className="max-w-lg w-full rounded-2xl border p-8 shadow-2xl text-center relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-main)',
        }}
      >
        {/* Glow Header */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6 animate-pulse"
          style={{
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            border: '1px solid var(--accent-border)',
          }}
        >
          <Brain className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-main)' }}>
          Generating Mock Exam
        </h2>
        <p className="text-xs mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>
          Topic: <span className="font-semibold" style={{ color: 'var(--accent)' }}>{topic}</span> ({questionCount} Questions)
        </p>

        {/* Progress Steps */}
        <div className="space-y-3 text-left mb-8">
          {GENERATION_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            const Icon = step.icon;

            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium transition-all"
                style={{
                  backgroundColor: isCurrent ? 'var(--accent-light)' : 'var(--bg-surface-elevated)',
                  borderColor: isCurrent ? 'var(--accent)' : 'var(--border-muted)',
                  color: isCurrent ? 'var(--accent)' : isCompleted ? 'var(--text-main)' : 'var(--text-faint)',
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--success)]" />
                ) : (
                  <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'animate-spin' : ''}`} />
                )}
                <span className="flex-1">{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Dynamic Reasoning Tip */}
        <div
          className="p-4 rounded-xl border text-left"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-muted)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Exam Insight & Tip
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            "{REASONING_TIPS[tipIndex]}"
          </p>
        </div>
      </div>
    </div>
  );
};
