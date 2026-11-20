import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats, Enemy, MathProblem } from '../types';
import { generateProblem } from '../lib/mathEngine';
import { ENEMY_TIERS } from '../lib/enemyData';
import {
  applyMeditationRecovery,
  calculateCombatReward,
  calculateEnemyCounterDamage,
  calculateFpGain,
  calculatePlayerAttackDamage,
  consumeHintPack,
  formatMultiSelectAnswer,
  getTotalHints,
  MEDITATION_FP_COST,
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
import { getScarName } from '../lib/scarData';
import { recordProblemTelemetry } from '../lib/storage';
import { ShieldAlert, Skull, Terminal, Zap, User, Settings, X, LogOut } from 'lucide-react';
import { ProblemInputRouter } from './inputs/ProblemInputRouter';
import { motion, AnimatePresence } from 'motion/react';
import { useCombatInput } from '../hooks/useCombatInput';
import { useSafeTimeout } from '../hooks/useSafeTimeout';

interface Props {
  stats: PlayerStats;
  enemy: Enemy;
  tier: number;
  floor: number;
  slotId?: number | null;
  onWin: (knowledgeGained: number) => void;
  onLose: () => void;
  onUpdateStats: (newStats: PlayerStats) => void;
}

export const Combat: React.FC<Props> = ({
  stats,
  enemy,
  tier,
  floor,
  slotId,
  onWin,
  onLose,
  onUpdateStats,
}) => {
  const [currentEnemyHp, setCurrentEnemyHp] = useState(enemy.hp);
  const [problem, setProblem] = useState<MathProblem>(() => generateProblem(tier, 'ATTACK', enemy.variant));
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [mode, setMode] = useState<'ATTACK' | 'MEDITATION'>('ATTACK');
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [lastExpectedAnswer, setLastExpectedAnswer] = useState<string | null>(null);
  const [hintMissCount, setHintMissCount] = useState(0);
  const [hintStepIndex, setHintStepIndex] = useState<number | null>(null);
  const [isIntro, setIsIntro] = useState(true);
  const [isAttacking, setIsAttacking] = useState<'PLAYER' | 'ENEMY' | null>(null);
  const [showSystemMenu, setShowSystemMenu] = useState(false);

  const { scheduleTimeout, clearAllTimeouts } = useSafeTimeout();
  const totalHints = getTotalHints(stats);
  const problemStartTimeRef = useRef<number>(Date.now());
  const hadWrongAttemptRef = useRef<boolean>(false);

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [fractionInput, setFractionInput] = useState({ num: '', den: '' });
  const [fractionFocus, setFractionFocus] = useState<'num' | 'den'>('num');

  useEffect(() => {
    scheduleTimeout(() => {
      setIsIntro(false);
      problemStartTimeRef.current = Date.now();
      hadWrongAttemptRef.current = false;
    }, 1200);
  }, [scheduleTimeout]);

  const emitProblemTelemetry = (firstTryCorrect: boolean, activeMode: 'ATTACK' | 'MEDITATION') => {
    const solveMs = Math.max(0, Date.now() - problemStartTimeRef.current);
    recordProblemTelemetry({
      tierVariant: activeMode === 'ATTACK' ? `${tier}-${enemy.variant}` : undefined,
      archetype: activeMode === 'MEDITATION' ? 'MEDITATION' : undefined,
      solveMs,
      firstTryCorrect,
    });
  };

  const isHintMode = hintStepIndex !== null;
  const currentStep = getCurrentStep(problem, hintStepIndex);
  const expectedAnswer = getExpectedAnswer(problem, hintStepIndex);
  const currentInputType = inferInputType(problem, currentStep);
  const problemHasSteps = hasProblemSteps(problem);
  const activeChoices = getActiveChoices(problem, currentStep);
  const activeMultiSelectOptions = getActiveMultiSelectOptions(problem, currentStep);
  const requireSimplified = getRequireSimplified(problem, currentStep);
  const includeInclusiveRelationship =
    expectedAnswer === '≤' ||
    expectedAnswer === '≥' ||
    problem.question.includes('≤') ||
    problem.question.includes('≥');

  const diverLabel = `Diver 0${slotId ?? 1}`;
  const enemyDisplayName =
    ENEMY_TIERS[tier]?.variants[enemy.variant]?.fullName || enemy.type || `Sentinel T${tier}`;

  const handleToggleOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleSubmit = (overrideInput?: string) => {
    if (feedback !== 'IDLE' || isIntro) return;

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
    let nextMode: 'ATTACK' | 'MEDITATION' = mode;

    if (isCorrect) {
      setFeedback('CORRECT');
      setLastExpectedAnswer(null);
      setHintMissCount(0);
      if (mode === 'ATTACK') {
        setIsAttacking('PLAYER');
        const stepCount = problemHasSteps ? problem.steps.length : 0;
        const isFinalHintStep = isHintMode && problemHasSteps && hintStepIndex === problem.steps.length - 1;
        const damage = calculatePlayerAttackDamage({
          isHintMode,
          stepCount,
          isFinalHintStep,
          enemyMaxHp: enemy.maxHp,
          currentEnemyHp,
          runBuffs: stats.runBuffs,
        });

        setLastDamage(damage);
        const newEnemyHp = Math.max(0, currentEnemyHp - damage);
        setCurrentEnemyHp(newEnemyHp);

        onUpdateStats({
          ...stats,
          fp: Math.min(stats.maxFp, stats.fp + calculateFpGain(stats.neuralScars)),
        });

        if (newEnemyHp <= 0) {
          emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK');
          scheduleTimeout(() => {
            setHintStepIndex(null);
            onWin(calculateCombatReward(tier));
          }, 1200);
          return;
        }

        if (isHintMode && problemHasSteps && hintStepIndex < problem.steps.length - 1) {
          scheduleTimeout(() => {
            setFeedback('IDLE');
            setInput('');
            setFractionInput({ num: '', den: '' });
            setFractionFocus('num');
            setSelectedOptions([]);
            setLastDamage(null);
            setIsAttacking(null);
            setHintMissCount(0);
            setHintStepIndex(hintStepIndex + 1);
          }, 800);
          return;
        }

        emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK');
      } else {
        emitProblemTelemetry(!hadWrongAttemptRef.current, 'MEDITATION');
        onUpdateStats(applyMeditationRecovery(stats));
        nextMode = 'ATTACK';
        setMode('ATTACK');
      }
    } else {
      hadWrongAttemptRef.current = true;
      setFeedback('WRONG');
      setIsAttacking('ENEMY');
      const damage = calculateEnemyCounterDamage(tier);
      setLastDamage(damage);
      setLastExpectedAnswer(expectedAnswer);
      const newHp = Math.max(0, stats.hp - damage);
      onUpdateStats({
        ...stats,
        hp: newHp,
      });

      if (newHp <= 0) {
        emitProblemTelemetry(false, mode);
        scheduleTimeout(onLose, 1200);
        return;
      }

      if (isHintMode) {
        const nextMissCount = hintMissCount + 1;
        setHintMissCount(nextMissCount);
        scheduleTimeout(() => {
          setFeedback('IDLE');
          setInput('');
          setFractionInput({ num: '', den: '' });
          setFractionFocus('num');
          setSelectedOptions([]);
          setLastDamage(null);
          setLastExpectedAnswer(null);
          setIsAttacking(null);
        }, nextMissCount >= 2 ? 1600 : 1000);
        return;
      }

      emitProblemTelemetry(false, mode);
    }

    scheduleTimeout(() => {
      setFeedback('IDLE');
      setInput('');
      setFractionInput({ num: '', den: '' });
      setFractionFocus('num');
      setSelectedOptions([]);
      setLastDamage(null);
      setLastExpectedAnswer(null);
      setHintMissCount(0);
      setIsAttacking(null);
      setHintStepIndex(null);
      setProblem(generateProblem(tier, nextMode, enemy.variant));
      problemStartTimeRef.current = Date.now();
      hadWrongAttemptRef.current = false;
    }, isCorrect ? 800 : 1800);
  };

  const handleMeditationClick = () => {
    if (stats.fp >= MEDITATION_FP_COST && mode !== 'MEDITATION') {
      clearAllTimeouts();
      setMode('MEDITATION');
      setHintStepIndex(null);
      setHintMissCount(0);
      setLastExpectedAnswer(null);
      setFeedback('IDLE');
      setProblem(generateProblem(tier, 'MEDITATION', enemy.variant));
      problemStartTimeRef.current = Date.now();
      hadWrongAttemptRef.current = false;
      setInput('');
      setFractionInput({ num: '', den: '' });
      setFractionFocus('num');
      setSelectedOptions([]);
    }
  };

  const handleHintClick = () => {
    if (totalHints > 0 && hintStepIndex === null && problemHasSteps) {
      onUpdateStats(consumeHintPack(stats));
      setHintStepIndex(0);
      setHintMissCount(0);
      setLastExpectedAnswer(null);
      setInput('');
      setFractionInput({ num: '', den: '' });
      setFractionFocus('num');
      setSelectedOptions([]);
    }
  };

  useCombatInput({
    showSystemMenu,
    setShowSystemMenu,
    feedback,
    isIntro,
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

  const actionBarProps = {
    onHintClick: handleHintClick,
    onMeditationClick: handleMeditationClick,
    totalHints,
    hintDisabled: totalHints <= 0 || hintStepIndex !== null || !problemHasSteps || mode === 'MEDITATION',
    meditationDisabled: stats.fp < MEDITATION_FP_COST || mode === 'MEDITATION',
  };

  return (
    <div className="flex flex-col h-full bg-gb-0 text-gb-3 scanlines overflow-hidden terminal-text">
      <AnimatePresence>
        {isIntro && (
          <motion.div
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-gb-0/90 backdrop-blur-sm p-4"
          >
            <div className="text-center">
              <div className="text-4xl md:text-6xl font-bold text-neon-cyan mb-2 tracking-tight italic uppercase">
                Battle Start
              </div>
              <div className="text-base md:text-xl text-gb-2 tracking-widest uppercase">
                {enemyDisplayName}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <header className="grid grid-cols-3 items-center px-3 py-2 bg-gb-1 border-b-2 border-gb-3 shadow-lg z-10 shrink-0 tabular-nums">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gb-2 leading-tight">Diver</span>
          <span className="text-xs sm:text-sm font-bold truncate">{diverLabel}</span>
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-xs text-gb-2 leading-tight">Depth</span>
          <span className="text-xs sm:text-sm font-bold text-neon-cyan whitespace-nowrap">
            Sector {tier} · F{floor}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 min-w-0">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-xs text-gb-2 leading-tight">Target</span>
            <span className="text-xs sm:text-sm font-bold text-neon-magenta truncate max-w-[140px] sm:max-w-[220px]">
              {enemy.type}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSystemMenu(true)}
            aria-label="Open combat systems menu"
            className="min-h-10 min-w-10 flex items-center justify-center border border-gb-3 bg-gb-0 text-gb-3 hover:text-neon-cyan hover:border-neon-cyan transition-colors shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Combat System Menu */}
      <AnimatePresence>
        {showSystemMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="combat-systems-title"
            className="absolute inset-0 z-[100] bg-gb-0/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-sm w-full bg-gb-1 border-2 border-gb-3 p-5 gb-border dither relative">
              <button
                type="button"
                onClick={() => setShowSystemMenu(false)}
                aria-label="Close combat systems menu"
                className="absolute top-3 right-3 min-h-10 min-w-10 flex items-center justify-center text-gb-3 hover:text-neon-magenta"
              >
                <X className="w-5 h-5" />
              </button>

              <h3
                id="combat-systems-title"
                className="text-xl font-black italic mb-4 text-gb-3 tracking-tight uppercase flex items-center gap-2 pr-10"
              >
                <Settings className="w-5 h-5" />
                Combat Systems
              </h3>

              <div className="space-y-4">
                <div className="bg-gb-0 border border-gb-3 p-3 gb-border-sm">
                  <div className="text-xs text-gb-2 uppercase font-bold mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Neural Integrity
                  </div>
                  {stats.neuralScars.length > 0 ? (
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-neon-magenta">
                      {stats.neuralScars.map((scar, i) => (
                        <span key={`${scar}-${i}`}>
                          {getScarName(scar)}
                          {i < stats.neuralScars.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-neon-green font-bold">Stable</div>
                  )}
                </div>

                <div className="bg-gb-0 border border-gb-3 p-3 gb-border-sm">
                  <div className="text-xs text-gb-2 uppercase font-bold mb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Active Buffs
                  </div>
                  {stats.runBuffs.length > 0 ? (
                    <div className="text-xs font-bold text-neon-cyan">
                      Neural Overclock (+{stats.runBuffs.length * 10}% Attack)
                    </div>
                  ) : (
                    <div className="text-xs text-gb-2">None</div>
                  )}
                </div>

                <div className="pt-3 border-t border-gb-3">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllTimeouts();
                      onLose();
                    }}
                    className="w-full min-h-11 py-2.5 px-4 bg-gb-0 border-2 border-neon-magenta text-neon-magenta hover:bg-neon-magenta hover:text-gb-0 text-xs font-black uppercase tracking-wider transition-all gb-border-sm flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Force Disconnect (Lose Run)
                  </button>
                </div>
              </div>

              <div className="mt-4 text-xs text-gb-2 text-center">
                Press Esc to resume battle
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Split Body (Desktop side-by-side / Mobile stacked with scrollable terminal) */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 wireframe-bg dither-heavy overflow-hidden">
        {/* Left / Top: Battle Arena + Feedback */}
        <div className="lg:col-span-6 flex flex-col justify-between shrink-0 lg:shrink lg:border-r-2 lg:border-gb-3">
          {/* Side-View Battle Scene */}
          <div className="flex-1 flex items-center justify-around px-4 py-3 lg:py-8 relative">
            {/* Player Side */}
            <motion.div
              animate={isAttacking === 'PLAYER' ? { x: [0, 60, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gb-0 border-2 border-gb-3 rounded-lg flex items-center justify-center gb-border overflow-hidden">
                  <User className="w-9 h-9 lg:w-11 lg:h-11 text-neon-cyan" />
                  <div className="absolute inset-0 bg-neon-cyan/10 pointer-events-none" />
                </div>
                {isAttacking === 'ENEMY' && feedback === 'WRONG' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    className="absolute inset-0 bg-red-500/50 flex items-center justify-center rounded-lg"
                  >
                    <Zap className="w-9 h-9 text-white" />
                  </motion.div>
                )}
              </div>
              <div className="w-32 lg:w-40 tabular-nums space-y-1">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-0.5">
                    <span>HP</span>
                    <span>
                      {stats.hp}/{stats.maxHp}
                    </span>
                  </div>
                  <div className="h-2 bg-gb-0 border border-gb-3 p-[1px]">
                    <div
                      className="h-full bg-neon-green transition-all duration-300"
                      style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-0.5">
                    <span>FP</span>
                    <span>
                      {stats.fp}/{stats.maxFp}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gb-0 border border-gb-3 p-[1px]">
                    <div
                      className="h-full bg-neon-cyan transition-all duration-300"
                      style={{ width: `${(stats.fp / stats.maxFp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* VS Divider */}
            <div className="text-xl lg:text-3xl font-black italic text-gb-3/30 select-none" aria-hidden="true">
              VS
            </div>

            {/* Enemy Side */}
            <motion.div
              animate={isAttacking === 'ENEMY' ? { x: [0, -60, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gb-0 border-2 border-neon-magenta rounded-lg flex items-center justify-center gb-border-sm overflow-hidden">
                  <Skull className="w-9 h-9 lg:w-11 lg:h-11 text-neon-magenta" />
                  <div className="absolute inset-0 bg-neon-magenta/10 pointer-events-none" />
                </div>
                {isAttacking === 'PLAYER' && feedback === 'CORRECT' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg"
                  >
                    <Zap className="w-9 h-9 text-neon-cyan" />
                  </motion.div>
                )}
              </div>
              <div className="w-32 lg:w-40 tabular-nums">
                <div className="flex justify-between text-xs font-bold mb-0.5">
                  <span>INT</span>
                  <span>
                    {currentEnemyHp}/{enemy.maxHp}
                  </span>
                </div>
                <div className="h-2 bg-gb-0 border border-neon-magenta p-[1px]">
                  <div
                    className="h-full bg-neon-magenta transition-all duration-300"
                    style={{ width: `${(currentEnemyHp / enemy.maxHp) * 100}%` }}
                  />
                </div>
                <div className="text-xs mt-1 text-center lg:text-right text-gb-2 font-semibold truncate">
                  {enemyDisplayName}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Combat Log / Feedback Banner */}
          <div
            aria-live="polite"
            className="min-h-10 px-3 py-1.5 flex items-center justify-center bg-gb-0/90 border-y lg:border-b-0 border-gb-3"
          >
            <AnimatePresence mode="wait">
              {feedback === 'CORRECT' && (
                <motion.div
                  key="correct"
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  className="text-neon-cyan font-bold text-xs sm:text-sm text-center"
                >
                  {mode === 'ATTACK' ? `Critical Hit: -${lastDamage} INT` : 'System Recovery Complete'}
                </motion.div>
              )}
              {feedback === 'WRONG' && (
                <motion.div
                  key="wrong"
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  className="text-neon-magenta font-bold text-xs sm:text-sm text-center"
                >
                  {!isHintMode && lastExpectedAnswer
                    ? `Counter Hit: -${lastDamage} HP · Answer: ${lastExpectedAnswer}`
                    : isHintMode && hintMissCount >= 2 && lastExpectedAnswer
                      ? `Counter Hit: -${lastDamage} HP · Step Answer: ${lastExpectedAnswer}`
                      : isHintMode
                        ? `Counter Hit: -${lastDamage} HP · Retry Step`
                        : `Counter Hit: -${lastDamage} HP`}
                </motion.div>
              )}
              {feedback === 'IDLE' && !isIntro && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gb-2 text-xs text-center"
                >
                  Solve the problem to breach Sentinel shields.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right / Bottom: Scrollable Problem & Input Terminal */}
        <div className="lg:col-span-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 lg:p-6 bg-gb-1 border-t-2 lg:border-t-0 border-gb-3 dither flex flex-col justify-start lg:justify-center">
          <div className="w-full max-w-md mx-auto flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs text-gb-2 font-bold">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{mode === 'ATTACK' ? 'Cipher Attack' : 'Meditation Recovery'}</span>
                </div>
                {hintStepIndex !== null && problemHasSteps && (
                  <span className="text-neon-cyan tabular-nums">
                    Hint Step {hintStepIndex + 1} / {problem.steps.length}
                  </span>
                )}
              </div>
              <div className="bg-gb-0 p-3 gb-border text-center relative">
                <div className="text-lg sm:text-xl font-bold text-gb-3 tracking-tight leading-snug">
                  {currentStep ? currentStep.prompt : problem.question}
                </div>
                {stats.neuralScars.includes('THE_BLUR') && (
                  <div className="absolute inset-0 backdrop-blur-[1.5px] pointer-events-none" />
                )}
              </div>
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
              disabled={feedback !== 'IDLE' || isIntro}
              actionBarProps={actionBarProps}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
