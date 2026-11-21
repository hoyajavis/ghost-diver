import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PlayerStats, ReconBuffType } from '../types';
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
import {
  evaluateSignalSweepRun,
  generateSignalSweepDeck,
  getReachedTiers,
  getReconBuffOption,
  RECON_BUFF_OPTIONS,
  SIGNAL_SWEEP_NODE_COUNT,
  SignalSweepNode,
  SignalSweepNodeOutcome,
} from '../lib/signalSweepLogic';
import { useCombatInput } from '../hooks/useCombatInput';
import { useSafeTimeout } from '../hooks/useSafeTimeout';
import { ProblemPromptCard } from './ProblemPromptCard';
import { ProblemInputRouter } from './inputs/ProblemInputRouter';
import {
  CheckCircle2,
  Clock,
  Radio,
  RotateCcw,
  Shield,
  Sparkles,
  X,
  Zap,
  Database,
} from 'lucide-react';
import { motion } from 'motion/react';

export interface SignalSweepProps {
  stats: PlayerStats;
  initialTimed: boolean;
  onCompleteRun: (outcomes: readonly SignalSweepNodeOutcome[]) => void;
  onClaimReconBuff: (buff: ReconBuffType) => void;
  onClose: () => void;
}

function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getReconBuffIcon(id: ReconBuffType): React.ReactNode {
  if (id === 'START_FP_20') return <Zap className="w-4 h-4 text-neon-cyan shrink-0" />;
  if (id === 'SHARD_BONUS_15') return <Database className="w-4 h-4 text-neon-green shrink-0" />;
  return <Shield className="w-4 h-4 text-amber-300 shrink-0" />;
}

export const SignalSweep: React.FC<SignalSweepProps> = ({
  stats,
  initialTimed,
  onCompleteRun,
  onClaimReconBuff,
  onClose,
}) => {
  const reachedTiers = useMemo(
    () => getReachedTiers(stats),
    [stats.maxExtractedFloor, stats.encounteredTiers]
  );
  const maxTier = reachedTiers[reachedTiers.length - 1] ?? 1;

  const [timed, setTimed] = useState<boolean>(initialTimed);
  const [phase, setPhase] = useState<'PLAYING' | 'SUMMARY'>('PLAYING');
  const [deck, setDeck] = useState<SignalSweepNode[]>(() =>
    generateSignalSweepDeck(reachedTiers, SIGNAL_SWEEP_NODE_COUNT)
  );
  const [nodeIndex, setNodeIndex] = useState<number>(0);
  const [outcomes, setOutcomes] = useState<SignalSweepNodeOutcome[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [input, setInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [fractionInput, setFractionInput] = useState({ num: '', den: '' });
  const [fractionFocus, setFractionFocus] = useState<'num' | 'den'>('num');
  const [feedback, setFeedback] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [selectedBuffIndex, setSelectedBuffIndex] = useState<number>(0);
  const [claimedBuff, setClaimedBuff] = useState<ReconBuffType | null>(null);

  const { scheduleTimeout, clearAllTimeouts } = useSafeTimeout();
  const problemStartTimeRef = useRef<number>(Date.now());
  const runStartTimeRef = useRef<number>(Date.now());
  const completedRunRef = useRef<boolean>(false);

  const currentNode = deck[nodeIndex] ?? deck[0];
  const problem = currentNode.problem;

  const resetInputs = useCallback(() => {
    setInput('');
    setSelectedOptions([]);
    setFractionInput({ num: '', den: '' });
    setFractionFocus('num');
  }, []);

  // Non-punitive live count-up stopwatch when Arcade Timer is enabled
  useEffect(() => {
    if (!timed || phase !== 'PLAYING' || outcomes.length >= deck.length) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - runStartTimeRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [timed, phase, outcomes.length, deck.length]);

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

  const handleToggleOption = useCallback((option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }, []);

  const handleClose = useCallback(() => {
    clearAllTimeouts();
    onClose();
  }, [clearAllTimeouts, onClose]);

  const handleRunAgain = useCallback(() => {
    clearAllTimeouts();
    const freshDeck = generateSignalSweepDeck(reachedTiers, SIGNAL_SWEEP_NODE_COUNT);
    setDeck(freshDeck);
    setNodeIndex(0);
    setOutcomes([]);
    setStreak(0);
    setElapsedSeconds(0);
    setFeedback('IDLE');
    setFeedbackMessage(null);
    setSelectedBuffIndex(0);
    setClaimedBuff(null);
    resetInputs();
    completedRunRef.current = false;
    const now = Date.now();
    problemStartTimeRef.current = now;
    runStartTimeRef.current = now;
    setPhase('PLAYING');
  }, [clearAllTimeouts, reachedTiers, resetInputs]);

  const handleSubmit = (overrideInput?: string) => {
    if (phase !== 'PLAYING' || feedback !== 'IDLE') return;

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

    const now = Date.now();
    const solveMs = Math.max(0, now - problemStartTimeRef.current);
    recordProblemTelemetry({
      archetype: currentNode.archetype,
      solveMs,
      firstTryCorrect: isCorrect,
    });

    const outcome: SignalSweepNodeOutcome = {
      tier: currentNode.tier,
      archetype: currentNode.archetype,
      correct: isCorrect,
      solveMs,
    };
    const nextOutcomes = [...outcomes, outcome];
    const nextStreak = isCorrect ? streak + 1 : 0;
    const isFinalNode = nodeIndex + 1 >= deck.length;

    if (isFinalNode && timed) {
      setElapsedSeconds(Math.floor((now - runStartTimeRef.current) / 1000));
    }

    setOutcomes(nextOutcomes);
    setStreak(nextStreak);
    setFeedback(isCorrect ? 'CORRECT' : 'WRONG');
    setFeedbackMessage(
      isCorrect
        ? `Signal Locked · Streak ${nextStreak}`
        : `Static Interference · Answer: ${expectedAnswer}`
    );

    const delayMs = isCorrect ? COMBO_STEP_ADVANCE_MS : MISS_REVEAL_MS;
    scheduleTimeout(() => {
      if (isFinalNode) {
        setFeedback('IDLE');
        setFeedbackMessage(null);
        resetInputs();
        setPhase('SUMMARY');
        if (!completedRunRef.current) {
          completedRunRef.current = true;
          onCompleteRun(nextOutcomes);
        }
        return;
      }

      setNodeIndex((prev) => prev + 1);
      resetInputs();
      setFeedback('IDLE');
      setFeedbackMessage(null);
      problemStartTimeRef.current = Date.now();
    }, delayMs);
  };

  // Silence answer hotkeys completely outside PLAYING by setting isIntro: phase !== 'PLAYING'
  useCombatInput({
    showSystemMenu: false,
    setShowSystemMenu: (open) => {
      if (open) {
        handleClose();
      }
    },
    feedback,
    isIntro: phase !== 'PLAYING',
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

  const summary = useMemo(() => evaluateSignalSweepRun(outcomes), [outcomes]);
  const canPickReconBuff =
    phase === 'SUMMARY' &&
    summary.rewardEligible &&
    stats.reconRewardAvailable &&
    claimedBuff === null;

  const handleConfirmBuff = useCallback(
    (index: number) => {
      if (!canPickReconBuff) return;
      const option = RECON_BUFF_OPTIONS[index];
      if (!option) return;
      setClaimedBuff(option.id);
      onClaimReconBuff(option.id);
    },
    [canPickReconBuff, onClaimReconBuff]
  );

  // Dedicated SUMMARY-phase keyboard handler for 1-3 / Arrows / Enter / Escape
  useEffect(() => {
    if (phase !== 'SUMMARY') return;

    const handleSummaryKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (!canPickReconBuff) return;

      if (e.key === '1') {
        e.preventDefault();
        setSelectedBuffIndex(0);
      } else if (e.key === '2') {
        e.preventDefault();
        setSelectedBuffIndex(1);
      } else if (e.key === '3') {
        e.preventDefault();
        setSelectedBuffIndex(2);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedBuffIndex(
          (prev) => (prev + RECON_BUFF_OPTIONS.length - 1) % RECON_BUFF_OPTIONS.length
        );
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedBuffIndex((prev) => (prev + 1) % RECON_BUFF_OPTIONS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmBuff(selectedBuffIndex);
      }
    };

    window.addEventListener('keydown', handleSummaryKeyDown);
    return () => window.removeEventListener('keydown', handleSummaryKeyDown);
  }, [phase, canPickReconBuff, selectedBuffIndex, handleConfirmBuff, handleClose]);

  const claimedOption = getReconBuffOption(claimedBuff);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signal-sweep-title"
      className="absolute inset-0 z-[60] bg-gb-0/95 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono"
    >
      <div className="w-full max-w-md max-h-[94dvh] overflow-y-auto custom-scrollbar bg-gb-1 border-2 border-neon-cyan p-2.5 sm:p-4 gb-border dither shadow-[0_0_30px_rgba(0,243,255,0.28)] space-y-2 sm:space-y-2.5">
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-2 border-b border-neon-cyan/30 pb-2">
          <div className="flex items-center gap-1.5 text-neon-cyan min-w-0">
            <Radio className="w-4 h-4 shrink-0" />
            <h2
              id="signal-sweep-title"
              className="text-xs sm:text-sm font-black italic uppercase tracking-tight truncate"
            >
              Signal Sweep
            </h2>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gb-0 border border-neon-cyan/50 text-neon-cyan whitespace-nowrap tabular-nums">
              T1–{maxTier}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {timed ? (
              <div
                aria-label="Arcade timer elapsed"
                className="flex items-center gap-1 px-2 py-1 bg-gb-0 border border-neon-cyan/50 text-[11px] font-bold text-neon-cyan tabular-nums"
              >
                <Clock className="w-3 h-3 shrink-0" />
                <span>{formatElapsed(elapsedSeconds)}</span>
              </div>
            ) : (
              <span className="px-2 py-1 bg-gb-0 border border-gb-3/50 text-[10px] font-bold uppercase text-gb-2 whitespace-nowrap">
                Relaxed Focus
              </span>
            )}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close Signal Sweep"
              className="min-h-9 min-w-9 flex items-center justify-center text-gb-3 hover:text-neon-cyan transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 10-Pip Progress Bar */}
        <div className="bg-gb-0 border border-gb-3/50 px-2.5 py-1.5 space-y-1.5 tabular-nums">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-gb-2">
              {phase === 'PLAYING'
                ? `Node ${Math.min(nodeIndex + 1, deck.length)}/${deck.length}`
                : `Sweep Complete (${summary.correct}/${summary.total})`}
            </span>
            <span className="text-neon-cyan">
              {phase === 'PLAYING' ? `Streak ${streak}` : `Best Streak ${summary.bestStreak}`}
            </span>
          </div>
          <div
            className="flex items-center gap-1"
            aria-label={`Signal Sweep progress: ${outcomes.length} of ${deck.length} nodes completed`}
          >
            {deck.map((_, idx) => {
              const outcome = outcomes[idx];
              const isCurrent = phase === 'PLAYING' && idx === nodeIndex && !outcome;
              let pipClass = 'bg-gb-1 border-gb-3/40';
              if (outcome?.correct) {
                pipClass = 'bg-neon-green border-neon-green shadow-[0_0_6px_rgba(57,255,20,0.45)]';
              } else if (outcome && !outcome.correct) {
                pipClass = 'bg-neon-magenta border-neon-magenta';
              } else if (isCurrent) {
                pipClass = 'bg-neon-cyan border-neon-cyan animate-pulse';
              }
              return <span key={idx} className={`flex-1 h-2 border transition-colors ${pipClass}`} />;
            })}
          </div>
        </div>

        {phase === 'PLAYING' ? (
          <>
            <ProblemPromptCard
              problem={problem}
              modeLabel={`Signal Sweep · T${currentNode.tier}`}
              strikeMode="DIRECT"
              stepIndex={null}
              solvedBreadcrumbs={[]}
              isBlurred={false}
              feedback={feedback}
              accent="cyan"
            />

            <div
              aria-live="polite"
              className="min-h-[18px] text-[11px] sm:text-xs font-bold uppercase tracking-wider text-center"
            >
              {feedback === 'CORRECT' && (
                <span className="text-neon-green">{feedbackMessage}</span>
              )}
              {feedback === 'WRONG' && (
                <span className="text-neon-magenta">{feedbackMessage}</span>
              )}
              {feedback === 'IDLE' && (
                <span className="text-gb-2 normal-case font-sans">
                  Score ≥ 70% to arm a Recon Buff for your next dive.
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
          </>
        ) : (
          <div className="space-y-2.5">
            {/* Scorecard Summary Row */}
            <div className="grid grid-cols-3 gap-1.5 tabular-nums text-center">
              <div className="bg-gb-0 border border-gb-3/60 p-2">
                <div className="text-[10px] text-gb-2 uppercase font-bold">Accuracy</div>
                <div
                  className={`text-base sm:text-lg font-black ${
                    summary.rewardEligible ? 'text-neon-green' : 'text-neon-magenta'
                  }`}
                >
                  {summary.accuracyPercent}%
                </div>
                <div className="text-[10px] text-gb-2">
                  {summary.correct}/{summary.total}
                </div>
              </div>
              <div className="bg-gb-0 border border-gb-3/60 p-2">
                <div className="text-[10px] text-gb-2 uppercase font-bold">Best Streak</div>
                <div className="text-base sm:text-lg font-black text-neon-cyan">
                  {summary.bestStreak}
                </div>
                <div className="text-[10px] text-gb-2">In a row</div>
              </div>
              <div className="bg-gb-0 border border-gb-3/60 p-2">
                <div className="text-[10px] text-gb-2 uppercase font-bold">
                  {timed ? 'Time' : 'Mode'}
                </div>
                <div className="text-base sm:text-lg font-black text-gb-3">
                  {timed ? formatElapsed(elapsedSeconds) : 'Calm'}
                </div>
                <div className="text-[10px] text-gb-2">
                  {timed ? 'Arcade' : 'Untimed'}
                </div>
              </div>
            </div>

            {/* Compact 2-Column Archetype Breakdown */}
            <div className="bg-gb-0 border border-gb-3/60 p-2 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gb-2">
                Archetype Breakdown
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] tabular-nums">
                {summary.archetypeBreakdown.map((entry) => {
                  const ratio = entry.total > 0 ? entry.correct / entry.total : 0;
                  const scoreColor =
                    ratio === 1
                      ? 'text-neon-green'
                      : ratio >= 0.5
                        ? 'text-amber-300'
                        : 'text-neon-magenta';
                  return (
                    <div
                      key={entry.archetype}
                      className="flex items-center justify-between gap-1 px-2 py-1 bg-gb-1/70 border border-gb-3/30"
                    >
                      <span className="text-gb-3 truncate">{entry.label}</span>
                      <span className={`font-bold shrink-0 ${scoreColor}`}>
                        {entry.correct}/{entry.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recon Buff Picker / Status */}
            {canPickReconBuff ? (
              <div className="bg-gb-0 border border-neon-cyan p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-neon-cyan">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Select Recon Buff</span>
                  </div>
                  <span className="text-[10px] text-gb-2">Keys 1–3 · Enter</span>
                </div>

                <div className="space-y-1.5" role="radiogroup" aria-label="Recon Buff Options">
                  {RECON_BUFF_OPTIONS.map((option, idx) => {
                    const isSelected = idx === selectedBuffIndex;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          if (isSelected) {
                            handleConfirmBuff(idx);
                          } else {
                            setSelectedBuffIndex(idx);
                          }
                        }}
                        className={`w-full text-left p-2 border transition-colors flex items-start gap-2 ${
                          isSelected
                            ? 'border-neon-cyan bg-neon-cyan/15 text-gb-3'
                            : 'border-gb-3/40 bg-gb-1/60 text-gb-2 hover:border-gb-3'
                        }`}
                      >
                        <kbd
                          className={`px-1.5 py-0.5 text-[10px] font-bold border shrink-0 leading-none mt-0.5 ${
                            isSelected
                              ? 'border-neon-cyan bg-neon-cyan text-gb-0'
                              : 'border-gb-3/60 text-gb-3'
                          }`}
                        >
                          {option.shortcut}
                        </kbd>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gb-3">
                            {getReconBuffIcon(option.id)}
                            <span className="truncate">{option.name}</span>
                          </div>
                          <div className="text-[11px] text-gb-2 font-sans leading-snug mt-0.5">
                            {option.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmBuff(selectedBuffIndex)}
                  className="w-full min-h-10 py-2 px-3 bg-neon-cyan text-gb-0 hover:bg-gb-3 font-black uppercase tracking-wider text-xs transition-colors"
                >
                  Confirm Recon Buff [Enter]
                </button>
              </div>
            ) : claimedOption ? (
              <div className="bg-neon-green/10 border border-neon-green p-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase text-neon-green">
                    Recon Buff Armed: {claimedOption.name}
                  </div>
                  <div className="text-[11px] text-gb-2 font-sans">
                    {claimedOption.description}
                  </div>
                </div>
              </div>
            ) : !summary.rewardEligible ? (
              <div className="bg-gb-0 border border-gb-3/50 p-2.5 text-center text-xs text-gb-2 font-sans">
                Score <strong className="text-gb-3 font-mono">≥ 70%</strong> to earn a Recon Buff for your next dive.
              </div>
            ) : (
              <div className="bg-gb-0 border border-amber-400/50 p-2.5 text-center text-xs text-amber-300 font-sans">
                Recon Buff already earned this dive cycle — extract from a dive to recharge. Practice remains open!
              </div>
            )}

            {/* Replay Mode Toggle + Footer Actions */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[10px] uppercase font-bold text-gb-2">Next Run Mode:</span>
              <div className="flex items-center gap-1" role="group" aria-label="Timer mode for next run">
                <button
                  type="button"
                  onClick={() => setTimed(true)}
                  aria-pressed={timed}
                  className={`px-2 py-1 text-[10px] font-bold uppercase border transition-colors ${
                    timed
                      ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan'
                      : 'border-gb-3/40 bg-gb-0 text-gb-2 hover:text-gb-3'
                  }`}
                >
                  Arcade Timer
                </button>
                <button
                  type="button"
                  onClick={() => setTimed(false)}
                  aria-pressed={!timed}
                  className={`px-2 py-1 text-[10px] font-bold uppercase border transition-colors ${
                    !timed
                      ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan'
                      : 'border-gb-3/40 bg-gb-0 text-gb-2 hover:text-gb-3'
                  }`}
                >
                  Relaxed
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleRunAgain}
                className="min-h-10 py-2 px-3 bg-gb-0 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-gb-0 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                Run Again
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-10 py-2 px-3 bg-gb-3 text-gb-0 hover:bg-neon-cyan text-xs font-black uppercase tracking-wider transition-colors"
              >
                Return to Bunker
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
