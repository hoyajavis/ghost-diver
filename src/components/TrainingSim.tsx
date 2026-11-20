import React, { useState, useRef } from 'react';
import { MathProblem, SolvedBreadcrumb, StrikeMode } from '../types';
import { generateProblem } from '../lib/mathEngine';
import { ENEMY_TIERS } from '../lib/enemyData';
import {
  COMBO_STEP_ADVANCE_MS,
  formatMultiSelectAnswer,
  MISS_RETRY_MS,
  MISS_REVEAL_MS,
  PROBLEM_ADVANCE_MS,
} from '../lib/combatLogic';
import {
  getActiveChoices,
  getActiveMultiSelectOptions,
  getCurrentStep,
  getExpectedAnswer,
  getRequireSimplified,
  hasProblemSteps,
  inferInputType,
} from '../lib/inputUtils';
import { validateAnswer } from '../lib/answerValidator';
import { recordProblemTelemetry } from '../lib/storage';
import { useCombatInput } from '../hooks/useCombatInput';
import { useSafeTimeout } from '../hooks/useSafeTimeout';
import { ProblemInputRouter } from './inputs/ProblemInputRouter';
import { ProblemPromptCard } from './ProblemPromptCard';
import { BrainCircuit, X, ChevronRight, Lightbulb, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  variantId: string;
  onClose: () => void;
}

function getDefaultStrikeMode(problem: MathProblem): StrikeMode {
  return problem.complexity === 'COMBO' && hasProblemSteps(problem) ? 'COMBO' : 'DIRECT';
}

export const TrainingSim: React.FC<Props> = ({ variantId, onClose }) => {
  const [tierStr, variantStr] = variantId.split('-');
  const tier = parseInt(tierStr, 10);
  const variant = parseInt(variantStr, 10) as 1 | 2 | 3 | 4 | 5;

  const [problem, setProblem] = useState<MathProblem>(() => generateProblem(tier, 'ATTACK', variant));
  const [strikeMode, setStrikeMode] = useState<StrikeMode>(() => getDefaultStrikeMode(problem));
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [solvedBreadcrumbs, setSolvedBreadcrumbs] = useState<SolvedBreadcrumb[]>([]);
  const [showClue, setShowClue] = useState<boolean>(false);
  const [input, setInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [fractionInput, setFractionInput] = useState({ num: '', den: '' });
  const [fractionFocus, setFractionFocus] = useState<'num' | 'den'>('num');
  const [feedback, setFeedback] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [stepMissCount, setStepMissCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const { scheduleTimeout, clearAllTimeouts } = useSafeTimeout();
  const problemStartTimeRef = useRef<number>(Date.now());
  const hadWrongAttemptRef = useRef<boolean>(false);

  const resetInputs = () => {
    setInput('');
    setSelectedOptions([]);
    setFractionInput({ num: '', den: '' });
    setFractionFocus('num');
  };

  const problemHasSteps = hasProblemSteps(problem);
  const supportsModeToggle = problem.complexity === 'COMBO' && problemHasSteps;
  const activeStepIndex = strikeMode === 'COMBO' && problemHasSteps ? stepIndex : null;
  const currentStep = getCurrentStep(problem, activeStepIndex);
  const expectedAnswer = getExpectedAnswer(problem, activeStepIndex);
  const currentInputType = inferInputType(problem, currentStep);
  const activeChoices = getActiveChoices(problem, currentStep);
  const activeMultiSelectOptions = getActiveMultiSelectOptions(problem, currentStep);
  const requireSimplified = getRequireSimplified(problem, currentStep);
  const includeInclusiveRelationship =
    expectedAnswer === '≤' ||
    expectedAnswer === '≥' ||
    problem.question.includes('≤') ||
    problem.question.includes('≥');

  const availableClue =
    currentStep?.clue ?? (problemHasSteps ? problem.steps[0]?.clue ?? null : null);

  const applyStrikeMode = (nextMode: StrikeMode) => {
    if (!supportsModeToggle || feedback !== 'IDLE' || isComplete) return;
    if (nextMode === strikeMode) return;
    clearAllTimeouts();
    setStrikeMode(nextMode);
    setStepIndex(0);
    setComboStreak(0);
    setSolvedBreadcrumbs([]);
    setStepMissCount(0);
    setShowClue(false);
    resetInputs();
    setFeedback('IDLE');
  };

  const handleToggleStrikeMode = () => {
    if (!supportsModeToggle || feedback !== 'IDLE' || isComplete) return;
    applyStrikeMode(strikeMode === 'COMBO' ? 'DIRECT' : 'COMBO');
  };

  const handleToggleClue = () => {
    if (!availableClue || isComplete) return;
    setShowClue((prev) => !prev);
  };

  const handleNextProblem = () => {
    clearAllTimeouts();
    const nextProblem = generateProblem(tier, 'ATTACK', variant);
    setProblem(nextProblem);
    setStrikeMode(getDefaultStrikeMode(nextProblem));
    problemStartTimeRef.current = Date.now();
    hadWrongAttemptRef.current = false;
    setStepIndex(0);
    setComboStreak(0);
    setSolvedBreadcrumbs([]);
    setShowClue(false);
    setStepMissCount(0);
    resetInputs();
    setFeedback('IDLE');
    setIsComplete(false);
  };

  const handleToggleOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleSubmit = (overrideInput?: string) => {
    if (isComplete || feedback !== 'IDLE') return;

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
    });

    if (isCorrect) {
      setFeedback('CORRECT');
      setStepMissCount(0);
      setComboStreak((prev) => prev + 1);

      const isComboMode = strikeMode === 'COMBO' && problemHasSteps;
      const isFinalStep = !(isComboMode && stepIndex < problem.steps.length - 1);

      if (isComboMode && currentStep) {
        setSolvedBreadcrumbs((prev) => [
          ...prev,
          {
            stepIndex,
            label: currentStep.resultLabel ?? String(currentStep.answer),
            answer: String(currentStep.answer),
          },
        ]);
      }

      if (isFinalStep) {
        recordProblemTelemetry({
          tierVariant: variantId,
          solveMs: Math.max(0, Date.now() - problemStartTimeRef.current),
          firstTryCorrect: !hadWrongAttemptRef.current,
        });
      }

      scheduleTimeout(() => {
        if (!isFinalStep) {
          setStepIndex((prev) => prev + 1);
          setShowClue(false);
          resetInputs();
          setFeedback('IDLE');
        } else {
          setIsComplete(true);
        }
      }, isFinalStep ? PROBLEM_ADVANCE_MS : COMBO_STEP_ADVANCE_MS);
    } else {
      hadWrongAttemptRef.current = true;
      const nextMissCount = stepMissCount + 1;
      setStepMissCount(nextMissCount);
      setComboStreak(0);
      setFeedback('WRONG');
      scheduleTimeout(() => {
        resetInputs();
        setFeedback('IDLE');
      }, nextMissCount >= 2 ? MISS_REVEAL_MS : MISS_RETRY_MS);
    }
  };

  useCombatInput({
    showSystemMenu: false,
    setShowSystemMenu: (open) => {
      if (open) {
        clearAllTimeouts();
        onClose();
      }
    },
    feedback,
    isIntro: isComplete,
    onToggleDirectStrike: supportsModeToggle ? handleToggleStrikeMode : undefined,
    onTacticalHint: availableClue ? handleToggleClue : undefined,
    activeChoices,
    activeMultiSelectOptions,
    onToggleOption: handleToggleOption,
    currentInputType,
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
      aria-labelledby="training-sim-title"
      className="absolute inset-0 z-50 bg-gb-0/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 font-mono"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto custom-scrollbar bg-gb-1 border-2 border-purple-400 p-5 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
        <div className="flex justify-between items-center mb-4 border-b border-purple-400/30 pb-3 gap-2">
          <div className="flex items-center gap-2 text-purple-300 min-w-0">
            <BrainCircuit className="w-5 h-5 shrink-0" />
            <h2 id="training-sim-title" className="text-base font-black italic tracking-tight uppercase truncate">
              {ENEMY_TIERS[tier]?.variants[variant]?.fullName || `Simulation T${tier} V${variant}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAllTimeouts();
              onClose();
            }}
            aria-label="Close training simulator"
            className="min-h-10 min-w-10 flex items-center justify-center text-gb-3 hover:text-purple-300 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isComplete ? (
          <div className="space-y-3">
            {/* Untimed Mode Toggle & Clue Controls */}
            {(supportsModeToggle || availableClue) && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {supportsModeToggle && (
                  <div
                    role="group"
                    aria-label="Practice strike mode"
                    className="inline-flex border border-purple-400/50 bg-gb-0 text-xs font-bold"
                  >
                    <button
                      type="button"
                      disabled={feedback !== 'IDLE'}
                      onClick={() => applyStrikeMode('COMBO')}
                      className={`px-2.5 py-1.5 transition-colors disabled:opacity-40 ${
                        strikeMode === 'COMBO'
                          ? 'bg-purple-500 text-gb-0'
                          : 'text-gb-2 hover:text-gb-3'
                      }`}
                    >
                      Combo Chain
                    </button>
                    <button
                      type="button"
                      disabled={feedback !== 'IDLE'}
                      onClick={() => applyStrikeMode('DIRECT')}
                      className={`px-2.5 py-1.5 flex items-center gap-1 transition-colors disabled:opacity-40 ${
                        strikeMode === 'DIRECT'
                          ? 'bg-amber-400 text-gb-0'
                          : 'text-gb-2 hover:text-gb-3'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      Direct Strike
                      <kbd className="hidden sm:inline-block px-1 text-[10px] border border-current/40 opacity-75">
                        ⇧D
                      </kbd>
                    </button>
                  </div>
                )}

                {availableClue && (
                  <button
                    type="button"
                    onClick={handleToggleClue}
                    aria-pressed={showClue}
                    className={`px-2.5 py-1.5 border text-xs font-bold flex items-center gap-1 transition-colors ${
                      showClue
                        ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                        : 'border-gb-3 bg-gb-0 text-gb-2 hover:text-amber-200 hover:border-amber-400/60'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    {showClue ? 'Hide Clue' : 'Clue'}
                  </button>
                )}
              </div>
            )}

            <ProblemPromptCard
              problem={problem}
              modeLabel="Training Sim"
              strikeMode={strikeMode}
              stepIndex={activeStepIndex}
              comboStreak={comboStreak}
              solvedBreadcrumbs={solvedBreadcrumbs}
              activeClue={showClue ? availableClue : null}
              feedback={feedback}
              accent="purple"
            />

            <div aria-live="polite" className="min-h-[20px] text-xs font-bold uppercase tracking-wider text-center">
              {feedback === 'CORRECT' && (
                <span className="text-neon-green">
                  {strikeMode === 'COMBO' ? 'Step Verified' : 'Direct Strike Verified'}
                </span>
              )}
              {feedback === 'WRONG' && (
                <span className="text-neon-magenta">
                  {stepMissCount >= 2
                    ? `Incorrect · Expected: ${expectedAnswer}`
                    : 'Incorrect · Try Again'}
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
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-5 py-6"
          >
            <div className="text-neon-green text-2xl font-black italic tracking-tight uppercase">
              Simulation Complete
            </div>
            <p className="text-gb-2 text-sm font-sans">
              Sentinel logic pattern decoded successfully.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNextProblem}
                className="flex-1 min-h-11 py-3 px-4 bg-purple-500 text-gb-0 font-bold uppercase tracking-wider hover:bg-gb-3 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Practice Again <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
