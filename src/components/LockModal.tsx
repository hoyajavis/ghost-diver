import React, { useState, useRef } from 'react';
import { ConceptScheduleMap, ConceptualArchetype, MathProblem } from '../types';
import { generateProblem } from '../lib/mathEngine';
import { ConceptOutcome } from '../lib/conceptSpacedRep';
import {
  BLUE_CACHE_FAIL_DAMAGE,
  COMBO_STEP_ADVANCE_MS,
  formatMultiSelectAnswer,
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
import { Lock, X } from 'lucide-react';
import { motion } from 'motion/react';

export interface LockModalProps {
  tier: number;
  playerHp: number;
  playerMaxHp: number;
  conceptSchedule?: ConceptScheduleMap;
  conceptStepCounter?: number;
  onRecordConceptOutcome?: (outcome: ConceptOutcome) => void;
  onSuccess: () => void;
  onMiss: (damage: number) => void;
  onClose: () => void;
}

const LOCK_RETRY_DELAY_MS = 1200;

interface LockAntiRepeatState {
  seenQuestions: ReadonlySet<string>;
  seenTemplateIds: ReadonlySet<string>;
  lastArchetype: ConceptualArchetype | null;
  lastTemplateId: string | null;
}

function drawFreshLockProblem(
  tier: number,
  conceptSchedule: ConceptScheduleMap | undefined,
  conceptStepCounter: number | undefined,
  antiRepeat?: LockAntiRepeatState
): MathProblem {
  const excludeTemplateIds =
    antiRepeat && antiRepeat.seenTemplateIds.size > 0
      ? antiRepeat.seenTemplateIds
      : antiRepeat?.lastTemplateId
        ? new Set([antiRepeat.lastTemplateId])
        : undefined;

  return generateProblem(tier, 'LOCK', 1, {
    conceptSchedule,
    conceptStepCounter,
    excludeQuestions: antiRepeat && antiRepeat.seenQuestions.size > 0 ? antiRepeat.seenQuestions : undefined,
    excludeArchetypes: antiRepeat?.lastArchetype ? new Set([antiRepeat.lastArchetype]) : undefined,
    excludeTemplateIds,
  });
}

export const LockModal: React.FC<LockModalProps> = ({
  tier,
  playerHp,
  playerMaxHp,
  conceptSchedule,
  conceptStepCounter,
  onRecordConceptOutcome,
  onSuccess,
  onMiss,
  onClose,
}) => {
  const [problem, setProblem] = useState<MathProblem>(() =>
    drawFreshLockProblem(tier, conceptSchedule, conceptStepCounter)
  );
  const [input, setInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [fractionInput, setFractionInput] = useState({ num: '', den: '' });
  const [fractionFocus, setFractionFocus] = useState<'num' | 'den'>('num');
  const [feedback, setFeedback] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const { scheduleTimeout, clearAllTimeouts } = useSafeTimeout();
  const problemStartTimeRef = useRef<number>(Date.now());
  const seenQuestionsRef = useRef<Set<string>>(new Set([problem.question]));
  const seenTemplateIdsRef = useRef<Set<string>>(
    new Set(problem.templateId ? [problem.templateId] : [])
  );
  const lastArchetypeRef = useRef<ConceptualArchetype | null>(problem.archetype ?? null);
  const lastTemplateIdRef = useRef<string | null>(problem.templateId ?? null);
  const latestScheduleRef = useRef<ConceptScheduleMap | undefined>(conceptSchedule);
  const latestStepRef = useRef<number | undefined>(conceptStepCounter);
  latestScheduleRef.current = conceptSchedule;
  latestStepRef.current = conceptStepCounter;

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
    if (feedback !== 'IDLE') return;

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
      archetype: problem.archetype ?? 'LOCK',
      solveMs,
      firstTryCorrect: isCorrect,
    });

    if (problem.archetype && onRecordConceptOutcome) {
      onRecordConceptOutcome({
        tier,
        archetype: problem.archetype,
        correct: isCorrect,
      });
    }

    if (isCorrect) {
      setFeedback('CORRECT');
      setFeedbackMessage('Lock Breached — Cache Unlocked');
      scheduleTimeout(() => {
        onSuccess();
      }, COMBO_STEP_ADVANCE_MS);
      return;
    }

    setFeedback('WRONG');
    setFeedbackMessage(
      `Static Shock: -${BLUE_CACHE_FAIL_DAMAGE} HP · Answer: ${expectedAnswer}`
    );
    onMiss(BLUE_CACHE_FAIL_DAMAGE);

    scheduleTimeout(() => {
      const nextProblem = drawFreshLockProblem(
        tier,
        latestScheduleRef.current,
        latestStepRef.current,
        {
          seenQuestions: seenQuestionsRef.current,
          seenTemplateIds: seenTemplateIdsRef.current,
          lastArchetype: lastArchetypeRef.current,
          lastTemplateId: lastTemplateIdRef.current,
        }
      );
      seenQuestionsRef.current.add(nextProblem.question);
      if (nextProblem.templateId) {
        seenTemplateIdsRef.current.add(nextProblem.templateId);
      }
      lastArchetypeRef.current = nextProblem.archetype ?? null;
      lastTemplateIdRef.current = nextProblem.templateId ?? null;
      setProblem(nextProblem);
      resetInputs();
      setFeedback('IDLE');
      setFeedbackMessage(null);
      problemStartTimeRef.current = Date.now();
    }, LOCK_RETRY_DELAY_MS);
  };

  useCombatInput({
    showSystemMenu: false,
    setShowSystemMenu: (open) => {
      if (open && feedback === 'IDLE') {
        handleClose();
      }
    },
    feedback,
    isIntro: false,
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
      aria-labelledby="lock-modal-title"
      className="absolute inset-0 z-50 bg-gb-0/90 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto custom-scrollbar bg-gb-1 border-2 border-neon-cyan p-4 sm:p-5 gb-border dither shadow-[0_0_30px_rgba(0,243,255,0.25)] space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-neon-cyan/30 pb-2.5">
          <div className="flex items-center gap-2 text-neon-cyan min-w-0">
            <Lock className="w-4 h-4 shrink-0" />
            <h2
              id="lock-modal-title"
              className="text-sm sm:text-base font-black italic uppercase tracking-tight truncate"
            >
              Blue Cache · Sector {tier}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-gb-2 tabular-nums">
              HP {playerHp}/{playerMaxHp}
            </span>
            <button
              type="button"
              onClick={handleClose}
              disabled={feedback !== 'IDLE'}
              aria-label="Step back from Blue Cache"
              className="min-h-9 min-w-9 flex items-center justify-center text-gb-3 hover:text-neon-cyan disabled:opacity-40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <ProblemPromptCard
          problem={problem}
          modeLabel="Blue Cache Lock"
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
              Crack the conceptual lock for +1 Hint Pack &amp; Overclock. Misses deal -{BLUE_CACHE_FAIL_DAMAGE} HP (non-lethal).
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
          disabled={feedback !== 'IDLE'}
        />

        {feedback === 'IDLE' && (
          <button
            type="button"
            onClick={handleClose}
            className="w-full min-h-10 py-2 px-3 bg-gb-0 border border-gb-3/60 text-gb-2 hover:text-gb-3 hover:border-gb-3 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Step Back [Esc]
          </button>
        )}
      </div>
    </motion.div>
  );
};
