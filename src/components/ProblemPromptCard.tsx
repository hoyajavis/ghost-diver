import React from 'react';
import { BrainCircuit, Lightbulb, Terminal, Zap } from 'lucide-react';
import { MathProblem, SolvedBreadcrumb, StrikeMode } from '../types';
import { getCurrentStep, hasProblemSteps } from '../lib/inputUtils';

export interface ProblemPromptCardProps {
  problem: MathProblem;
  modeLabel: string;
  strikeMode: StrikeMode;
  stepIndex: number | null;
  effectiveStepCount?: number;
  comboStreak?: number;
  solvedBreadcrumbs: SolvedBreadcrumb[];
  activeClue?: string | null;
  isBlurred?: boolean;
  feedback?: 'IDLE' | 'CORRECT' | 'WRONG';
  accent?: 'cyan' | 'purple';
}

export const ProblemPromptCard: React.FC<ProblemPromptCardProps> = ({
  problem,
  modeLabel,
  strikeMode,
  stepIndex,
  effectiveStepCount,
  comboStreak = 0,
  solvedBreadcrumbs,
  activeClue = null,
  isBlurred = false,
  feedback = 'IDLE',
  accent = 'cyan',
}) => {
  const problemHasSteps = hasProblemSteps(problem);
  const hasPromptLines = Array.isArray(problem.promptLines) && problem.promptLines.length > 0;
  const applyTextBlur = isBlurred && !hasPromptLines && problem.category !== 'CONCEPTUAL';
  const activeStepIndex = strikeMode === 'COMBO' ? stepIndex : null;
  const currentStep = getCurrentStep(problem, activeStepIndex);
  const totalSteps =
    effectiveStepCount && effectiveStepCount > 0
      ? effectiveStepCount
      : problemHasSteps
        ? problem.steps.length
        : 0;
  const isComboDisplay = strikeMode === 'COMBO' && activeStepIndex !== null && totalSteps > 0;
  const isDirectOnCombo = strikeMode === 'DIRECT' && problem.complexity === 'COMBO';

  const headerAccentClass = accent === 'purple' ? 'text-purple-300' : 'text-neon-cyan';
  const activePipClass =
    accent === 'purple'
      ? 'bg-purple-400 border-purple-300 animate-pulse'
      : 'bg-neon-cyan border-neon-cyan animate-pulse';

  const cardBorderClass =
    feedback === 'CORRECT'
      ? 'border-neon-green'
      : feedback === 'WRONG'
        ? 'border-neon-magenta'
        : isBlurred && !applyTextBlur
          ? 'border-neon-magenta/70'
          : 'border-gb-3';

  return (
    <div className="flex flex-col gap-1.5">
      {/* Header Strip */}
      <div className="flex flex-wrap justify-between items-center gap-1.5 text-xs text-gb-2 font-bold">
        <div className="flex items-center gap-1.5">
          {accent === 'purple' ? (
            <BrainCircuit className="w-3.5 h-3.5 text-purple-300" />
          ) : (
            <Terminal className="w-3.5 h-3.5" />
          )}
          <span>{modeLabel}</span>
        </div>

        {isComboDisplay && (
          <div className="flex items-center gap-2 tabular-nums">
            <div className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: totalSteps }).map((_, idx) => {
                const pipClass =
                  idx < activeStepIndex
                    ? 'bg-neon-green border-neon-green'
                    : idx === activeStepIndex
                      ? activePipClass
                      : 'bg-gb-0 border-gb-3/50';
                return (
                  <span
                    key={idx}
                    className={`inline-block w-2.5 h-2 border transition-colors ${pipClass}`}
                  />
                );
              })}
            </div>
            <span className={headerAccentClass}>
              Step {activeStepIndex + 1}/{totalSteps}
              {comboStreak >= 2 && (
                <span className="text-neon-green"> · {comboStreak}× Combo</span>
              )}
            </span>
          </div>
        )}

        {isDirectOnCombo && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-amber-400/70 bg-amber-400/10 text-amber-300 text-[11px] font-bold uppercase tracking-wide">
            <Zap className="w-3 h-3" />
            DIRECT · 1-SHOT · +50% SHARDS
          </span>
        )}
      </div>

      {/* Main Prompt Card */}
      <div className={`bg-gb-0 p-2 lg:p-3 border-2 ${cardBorderClass} gb-border text-center transition-colors`}>
        {/* Pinned Original Problem — always visible */}
        {currentStep ? (
          <div className="relative border-b border-gb-3/30 pb-1 mb-1 lg:pb-1.5 lg:mb-2">
            <div className="text-xs sm:text-sm font-bold text-gb-2 tracking-tight leading-snug">
              {problem.question}
            </div>
            {applyTextBlur && (
              <div className="absolute inset-0 backdrop-blur-[1.5px] pointer-events-none" />
            )}
          </div>
        ) : hasPromptLines ? (
          <div>
            <div className="text-sm sm:text-base font-bold text-gb-3 tracking-tight leading-snug">
              {problem.question}
            </div>
            <ol
              aria-label="Solution steps to inspect"
              className="mt-2 pt-1.5 lg:mt-2.5 lg:pt-2 border-t border-gb-3/30 space-y-1 lg:space-y-1.5 text-left font-mono text-xs sm:text-sm"
            >
              {problem.promptLines!.map((line, idx) => {
                const hasPrefix = /^Step\s+\d+\s*:/i.test(line.trim());
                return (
                  <li
                    key={idx}
                    className="px-2 py-1 bg-gb-1/80 border border-gb-3/30 text-gb-3 flex items-baseline gap-2 leading-snug"
                  >
                    {!hasPrefix && (
                      <span className={`${headerAccentClass} font-bold shrink-0`}>
                        Step {idx + 1}:
                      </span>
                    )}
                    <span className="break-words">{line}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className="relative">
            <div className="text-base sm:text-xl font-bold text-gb-3 tracking-tight leading-snug">
              {problem.question}
            </div>
            {applyTextBlur && (
              <div className="absolute inset-0 backdrop-blur-[1.5px] pointer-events-none" />
            )}
          </div>
        )}

        {/* Solved-Step Breadcrumb Strip — always unblurred */}
        {solvedBreadcrumbs.length > 0 && (
          <div
            aria-label="Solved steps"
            className="flex flex-wrap items-center justify-center gap-1 mb-1 lg:mb-2 text-[11px] font-bold"
          >
            {solvedBreadcrumbs.map((crumb, idx) => (
              <React.Fragment key={`${crumb.stepIndex}-${idx}`}>
                <span className="px-1.5 py-0.5 bg-gb-1 border border-neon-green/50 text-neon-green">
                  {crumb.label}
                </span>
                {idx < solvedBreadcrumbs.length - 1 && (
                  <span className="text-gb-2" aria-hidden="true">
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Active Step Prompt (COMBO mode) */}
        {currentStep && (
          <div className="relative">
            <div className="text-base sm:text-xl font-bold text-gb-3 tracking-tight leading-snug">
              {currentStep.prompt}
            </div>
            {applyTextBlur && (
              <div className="absolute inset-0 backdrop-blur-[1.5px] pointer-events-none" />
            )}
          </div>
        )}
      </div>

      {/* Optional Tactical Clue Banner — always unblurred */}
      {activeClue && (
        <div
          role="note"
          className="px-2.5 py-1.5 bg-amber-400/10 border border-amber-400/70 text-amber-200 text-xs font-semibold flex items-start gap-1.5 text-left"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
          <span>Clue: {activeClue}</span>
        </div>
      )}
    </div>
  );
};
