import React, { useState, useRef } from 'react';
import { MathProblem } from '../types';
import { generateProblem } from '../lib/mathEngine';
import { clampFloor, getTierForFloor } from '../lib/dungeonLogic';
import { getScarName } from '../lib/scarData';
import {
  COMBO_STEP_ADVANCE_MS,
  formatMultiSelectAnswer,
  MISS_REVEAL_MS,
} from '../lib/combatLogic';
import {
  getActiveChoices,
  getActiveMultiSelectOptions,
  getExpectedAnswer,
  getRequireSimplified,
  inferInputType,
} from '../lib/inputUtils';
import { validateAnswer } from '../lib/answerValidator';
import { recordProblemTelemetry } from '../lib/storage';
import { useCombatInput } from '../hooks/useCombatInput';
import { useSafeTimeout } from '../hooks/useSafeTimeout';
import { ProblemPromptCard } from './ProblemPromptCard';
import { ProblemInputRouter } from './inputs/ProblemInputRouter';
import { Activity, X } from 'lucide-react';
import { motion } from 'motion/react';

export interface ScarCalibrationModalProps {
  scar: string;
  maxExtractedFloor: number;
  onComplete: (scar: string) => void;
  onClose: () => void;
}

const CALIBRATION_TARGET_STREAK = 3;

function drawCalibrationProblem(maxTier: number, previousQuestion?: string): MathProblem {
  const safeMaxTier = Math.max(1, maxTier);
  let candidate = generateProblem(Math.floor(Math.random() * safeMaxTier) + 1, 'LOCK');
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!previousQuestion || candidate.question !== previousQuestion) {
      return candidate;
    }
    const tier = Math.floor(Math.random() * safeMaxTier) + 1;
    candidate = generateProblem(tier, 'LOCK');
  }
  return candidate;
}

export const ScarCalibrationModal: React.FC<ScarCalibrationModalProps> = ({
  scar,
  maxExtractedFloor,
  onComplete,
  onClose,
}) => {
  const maxTier = getTierForFloor(clampFloor(maxExtractedFloor));
  const [problem, setProblem] = useState<MathProblem>(() => drawCalibrationProblem(maxTier));
  const [streak, setStreak] = useState<number>(0);
  const [input, setInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [fractionInput, setFractionInput] = useState({ num: '', den: '' });
  const [fractionFocus, setFractionFocus] = useState<'num' | 'den'>('num');
  const [feedback, setFeedback] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCleared, setIsCleared] = useState<boolean>(false);

  const { scheduleTimeout, clearAllTimeouts } = useSafeTimeout();
  const problemStartTimeRef = useRef<number>(Date.now());

  const resetInputs = () => {
    setInput('');
    setSelectedOptions([]);
    setFractionInput({ num: '', den: '' });
    setFractionFocus('num');
  };

  const expectedAnswer = getExpectedAnswer(problem, null);
  const currentInputType = inferInputType(problem, null);
  const activeChoices = getActiveChoices(problem, null);
  const activeMultiSelectOptions = getActiveMultiSelectOptions(problem, null);
  const requireSimplified = getRequireSimplified(problem, null);
  const includeInclusiveRelationship =
    expectedAnswer === '≤' ||
    expectedAnswer === '≥' ||
    problem.question.includes('≤') ||
    problem.question.includes('≥');

  const handleToggleOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleClose = () => {
    clearAllTimeouts();
    onClose();
  };

  const handleSubmit = (overrideInput?: string) => {
    if (feedback !== 'IDLE' || isCleared) return;

    let valueToSubmit = overrideInput !== undefined ? overrideInput : input;
    if (activeMultiSelectOptions && overrideInput === undefined) {
      valueToSubmit = formatMultiSelectAnswer(selectedOptions);
    } else if (currentInputType === 'FRACTION' && overrideInput === undefined) {
      valueToSubmit = `${fractionInput.num}/${fractionInput.den}`;
    } else if (currentInputType === 'RATIO' && overrideInput === undefined) {
      valueToSubmit = `${fractionInput.num}:${fractionInput.den}`;
    }

    if (
      !valueToSubmit ||
      ((currentInputType === 'FRACTION' || currentInputType === 'RATIO') &&
        overrideInput === undefined &&
        (!fractionInput.num || !fractionInput.den))
    ) {
      return;
    }

    const isCorrect = validateAnswer(valueToSubmit, expectedAnswer, {
      inputType: currentInputType,
      requireSimplified,
      isMultiSelect: Boolean(activeMultiSelectOptions),
      isChoice: Boolean(activeChoices),
    });

    const solveMs = Math.max(0, Date.now() - problemStartTimeRef.current);
    recordProblemTelemetry({
      archetype: problem.archetype ?? 'CALIBRATION',
      solveMs,
      firstTryCorrect: isCorrect,
    });

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setFeedback('CORRECT');

      if (nextStreak >= CALIBRATION_TARGET_STREAK) {
        setIsCleared(true);
        setFeedbackMessage(`Scar Cleared: ${getScarName(scar)}`);
        scheduleTimeout(() => {
          onComplete(scar);
        }, 800);
        return;
      }

      setFeedbackMessage(`Signal Aligned (${nextStreak}/${CALIBRATION_TARGET_STREAK})`);
      scheduleTimeout(() => {
        const nextProblem = drawCalibrationProblem(maxTier, problem.question);
        setProblem(nextProblem);
        resetInputs();
        setFeedback('IDLE');
        setFeedbackMessage(null);
        problemStartTimeRef.current = Date.now();
      }, COMBO_STEP_ADVANCE_MS);
      return;
    }

    setStreak(0);
    setFeedback('WRONG');
    setFeedbackMessage(`Calibration Reset (0/${CALIBRATION_TARGET_STREAK}) · Answer: ${expectedAnswer}`);

    scheduleTimeout(() => {
      const nextProblem = drawCalibrationProblem(maxTier, problem.question);
      setProblem(nextProblem);
      resetInputs();
      setFeedback('IDLE');
      setFeedbackMessage(null);
      problemStartTimeRef.current = Date.now();
    }, MISS_REVEAL_MS);
  };

  useCombatInput({
    showSystemMenu: false,
    setShowSystemMenu: (open) => {
      if (open && !isCleared) {
        handleClose();
      }
    },
    feedback,
    isIntro: isCleared,
    activeChoices,
    activeMultiSelectOptions,
    onToggleOption: handleToggleOption,
    currentInputType,
    includeInclusiveRelationship,
    setInput,
    handleSubmit,
    fractionInput,
    setFractionInput,
    fractionFocus,
    setFractionFocus,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scar-calibration-title"
      className="absolute inset-0 z-[60] bg-gb-0/95 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto custom-scrollbar bg-gb-1 border-2 border-neon-cyan p-4 sm:p-5 gb-border dither shadow-[0_0_30px_rgba(0,243,255,0.28)] space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-neon-cyan/30 pb-2.5">
          <div className="flex items-center gap-2 text-neon-cyan min-w-0">
            <Activity className="w-4 h-4 shrink-0" />
            <h2
              id="scar-calibration-title"
              className="text-sm sm:text-base font-black italic uppercase tracking-tight truncate"
            >
              Recalibrate: {getScarName(scar)}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isCleared}
            aria-label="Close neural calibration"
            className="min-h-9 min-w-9 flex items-center justify-center text-gb-3 hover:text-neon-cyan disabled:opacity-40 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Pip Streak Header */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-gb-0 border border-gb-3/50 text-xs font-bold tabular-nums">
          <span className="text-gb-2">
            Calibration {streak}/{CALIBRATION_TARGET_STREAK} · Tiers 1–{maxTier}
          </span>
          <div
            className="flex items-center gap-1.5"
            aria-label={`Calibration streak ${streak} of ${CALIBRATION_TARGET_STREAK}`}
          >
            {Array.from({ length: CALIBRATION_TARGET_STREAK }).map((_, idx) => (
              <span
                key={idx}
                className={`inline-block w-4 h-2.5 border transition-colors ${
                  idx < streak
                    ? 'bg-neon-green border-neon-green shadow-[0_0_6px_rgba(57,255,20,0.6)]'
                    : 'bg-gb-1 border-gb-3/50'
                }`}
              />
            ))}
          </div>
        </div>

        <ProblemPromptCard
          problem={problem}
          modeLabel="Neural Calibration"
          strikeMode="DIRECT"
          stepIndex={null}
          solvedBreadcrumbs={[]}
          isBlurred={false}
          feedback={feedback}
          accent="cyan"
        />

        <div
          aria-live="polite"
          className="min-h-[20px] text-xs font-bold uppercase tracking-wider text-center"
        >
          {feedback === 'CORRECT' && (
            <span className="text-neon-green">{feedbackMessage}</span>
          )}
          {feedback === 'WRONG' && (
            <span className="text-neon-magenta">{feedbackMessage}</span>
          )}
          {feedback === 'IDLE' && (
            <span className="text-gb-2 normal-case font-sans">
              Pass {CALIBRATION_TARGET_STREAK} conceptual checks in a row to clear this scar for free.
            </span>
          )}
        </div>

        <ProblemInputRouter
          choices={activeChoices}
          multiSelectOptions={activeMultiSelectOptions}
          currentInputType={currentInputType}
          includeInclusiveRelationship={includeInclusiveRelationship}
          input={input}
          setInput={setInput}
          selectedOptions={selectedOptions}
          onToggleOption={handleToggleOption}
          fractionInput={fractionInput}
          setFractionInput={setFractionInput}
          fractionFocus={fractionFocus}
          setFractionFocus={setFractionFocus}
          onSubmit={handleSubmit}
          disabled={feedback !== 'IDLE' || isCleared}
        />

        {!isCleared && (
          <button
            type="button"
            onClick={handleClose}
            className="w-full min-h-10 py-2 px-3 bg-gb-0 border border-gb-3/60 text-gb-2 hover:text-gb-3 hover:border-gb-3 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancel Calibration [Esc]
          </button>
        )}
      </div>
    </motion.div>
  );
};
