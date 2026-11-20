import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats, Enemy, MathProblem } from '../types';
import { generateProblem } from '../lib/mathEngine';
import { ENEMY_TIERS } from '../lib/enemyData';
import {
  APEX_INTRO_MS,
  applyMeditationRecovery,
  applyTacticalHint,
  calculateCombatReward,
  canToggleDirectStrike,
  CombatTurnState,
  createCombatTurnState,
  formatMultiSelectAnswer,
  getAtkUpStacks,
  getTotalHints,
  isApexEnemy,
  MEDITATION_FP_COST,
  PATROL_INTRO_MS,
  PROBLEM_ADVANCE_MS,
  resolveCorrectAttack,
  resolveWrongAttack,
  toggleStrikeMode,
} from '../lib/combatLogic';
import { getPatrolBaseHpForTier } from '../lib/dungeonLogic';
import {
  getActiveChoices,
  getActiveMultiSelectOptions,
  getCurrentStep,
  getExpectedAnswer,
  getRequireSimplified,
  inferInputType,
} from '../lib/inputUtils';
import { validateAnswer } from '../lib/answerValidator';
import { getScarName } from '../lib/scarData';
import { recordProblemTelemetry } from '../lib/storage';
import { Shield, ShieldAlert, Skull, Zap, User, Settings, X, LogOut } from 'lucide-react';
import { ProblemInputRouter } from './inputs/ProblemInputRouter';
import { ProblemPromptCard } from './ProblemPromptCard';
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
  const isApex = isApexEnemy(enemy);
  const isBossIntro = isApex || floor % 5 === 0;
  const patrolBaseHp = getPatrolBaseHpForTier(tier);
  const atkUpStacks = getAtkUpStacks(stats.runBuffs);

  const [currentEnemyHp, setCurrentEnemyHp] = useState(enemy.hp);
  const [problem, setProblem] = useState<MathProblem>(() => generateProblem(tier, 'ATTACK', enemy.variant));
  const [mode, setMode] = useState<'ATTACK' | 'MEDITATION'>('ATTACK');
  const [turn, setTurn] = useState<CombatTurnState>(() =>
    createCombatTurnState({
      problem,
      mode: 'ATTACK',
      isApex,
      runBuffs: stats.runBuffs,
    })
  );
  const [shieldActive, setShieldActive] = useState(false);
  const [activeClue, setActiveClue] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
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

  const resetInputs = () => {
    setInput('');
    setSelectedOptions([]);
    setFractionInput({ num: '', den: '' });
    setFractionFocus('num');
  };

  const skipIntro = () => {
    if (!isIntro) return;
    clearAllTimeouts();
    setIsIntro(false);
    problemStartTimeRef.current = Date.now();
    hadWrongAttemptRef.current = false;
  };

  useEffect(() => {
    const introDelayMs = isBossIntro ? APEX_INTRO_MS : PATROL_INTRO_MS;
    scheduleTimeout(() => {
      setIsIntro(false);
      problemStartTimeRef.current = Date.now();
      hadWrongAttemptRef.current = false;
    }, introDelayMs);
  }, [scheduleTimeout, isBossIntro]);

  const emitProblemTelemetry = (firstTryCorrect: boolean, activeMode: 'ATTACK' | 'MEDITATION') => {
    const solveMs = Math.max(0, Date.now() - problemStartTimeRef.current);
    recordProblemTelemetry({
      tierVariant: activeMode === 'ATTACK' ? `${tier}-${enemy.variant}` : undefined,
      archetype: activeMode === 'MEDITATION' ? 'MEDITATION' : undefined,
      solveMs,
      firstTryCorrect,
    });
  };

  const activeStepIndex = turn.strikeMode === 'COMBO' ? turn.stepIndex : null;
  const currentStep = getCurrentStep(problem, activeStepIndex);
  const expectedAnswer = getExpectedAnswer(problem, activeStepIndex);
  const currentInputType = inferInputType(problem, currentStep);
  const activeChoices = getActiveChoices(problem, currentStep);
  const activeMultiSelectOptions = getActiveMultiSelectOptions(problem, currentStep);
  const requireSimplified = getRequireSimplified(problem, currentStep);
  const directStrikeAvailable = canToggleDirectStrike({ problem, mode, turn });
  const includeInclusiveRelationship =
    expectedAnswer === '≤' ||
    expectedAnswer === '≥' ||
    problem.question.includes('≤') ||
    problem.question.includes('≥');

  const diverLabel = `Diver 0${slotId ?? 1}`;
  const enemyDisplayName =
    ENEMY_TIERS[tier]?.variants[enemy.variant]?.fullName || enemy.type || `Sentinel T${tier}`;

  const scheduleNextProblem = (
    nextMode: 'ATTACK' | 'MEDITATION',
    delayMs: number,
    runBuffs: string[]
  ) => {
    scheduleTimeout(() => {
      const nextProblem = generateProblem(tier, nextMode, enemy.variant);
      setFeedback('IDLE');
      setFeedbackMessage(null);
      setIsAttacking(null);
      setActiveClue(null);
      setProblem(nextProblem);
      setTurn(
        createCombatTurnState({
          problem: nextProblem,
          mode: nextMode,
          isApex,
          runBuffs,
        })
      );
      resetInputs();
      problemStartTimeRef.current = Date.now();
      hadWrongAttemptRef.current = false;
    }, delayMs);
  };

  const handleToggleOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleToggleDirectStrike = () => {
    if (feedback !== 'IDLE' || isIntro || !directStrikeAvailable) return;
    setTurn((prev) => toggleStrikeMode(problem, mode, prev));
    setActiveClue(null);
    resetInputs();
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

    if (isCorrect) {
      setFeedback('CORRECT');

      if (mode === 'ATTACK') {
        setIsAttacking('PLAYER');
        const res = resolveCorrectAttack({
          problem,
          turn,
          currentEnemyHp,
          patrolBaseHp,
          neuralScars: stats.neuralScars,
          isApex,
          runBuffs: stats.runBuffs,
        });

        setCurrentEnemyHp(res.newEnemyHp);
        setTurn(res.nextTurn);
        setFeedbackMessage(
          res.skippedFinalStepWithOverclock
            ? `Overclock Surge: -${res.damage} INT · Apex Step Skipped`
            : res.nextTurn.directStrikeUsedOnKill
              ? `Direct Strike Kill: -${res.damage} INT (+50% Shards)`
              : res.nextTurn.comboStreak >= 2
                ? `${res.nextTurn.comboStreak}× Combo Hit: -${res.damage} INT`
                : `Critical Hit: -${res.damage} INT`
        );

        onUpdateStats({
          ...stats,
          fp: Math.min(stats.maxFp, stats.fp + res.fpGain),
        });

        if (res.isVictory) {
          emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK');
          scheduleTimeout(() => {
            onWin(
              calculateCombatReward({
                tier,
                directStrikeBonus: res.nextTurn.directStrikeUsedOnKill,
                runBuffs: stats.runBuffs,
                isApex,
              })
            );
          }, res.delayMs);
          return;
        }

        if (res.advanceToNextStep) {
          scheduleTimeout(() => {
            setFeedback('IDLE');
            setFeedbackMessage(null);
            setIsAttacking(null);
            setActiveClue(null);
            resetInputs();
          }, res.delayMs);
          return;
        }

        emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK');
        scheduleNextProblem('ATTACK', res.delayMs, stats.runBuffs);
        return;
      }

      emitProblemTelemetry(!hadWrongAttemptRef.current, 'MEDITATION');
      onUpdateStats(applyMeditationRecovery(stats));
      setFeedbackMessage('System Recovery Complete');
      setMode('ATTACK');
      scheduleNextProblem('ATTACK', PROBLEM_ADVANCE_MS, stats.runBuffs);
      return;
    }

    hadWrongAttemptRef.current = true;
    setFeedback('WRONG');
    setIsAttacking('ENEMY');

    const res = resolveWrongAttack({
      problem,
      mode,
      turn,
      tier,
      isApex,
      currentPlayerHp: stats.hp,
      shieldActive,
    });

    setShieldActive(res.nextShieldActive);
    setTurn(res.nextTurn);
    onUpdateStats({
      ...stats,
      hp: res.newPlayerHp,
    });

    const hitPrefix = res.shieldAbsorbed
      ? 'Shield Absorbed Counter-Hit (0 HP)'
      : `Counter Hit: -${res.damage} HP`;
    const hitSuffix = res.fellBackToCombo
      ? ' · Falling back to Combo Step 1'
      : res.revealAnswer
        ? turn.strikeMode === 'COMBO'
          ? ` · Step Answer: ${expectedAnswer}`
          : ` · Answer: ${expectedAnswer}`
        : res.keepSameProblem
          ? ' · Retry Step'
          : '';
    setFeedbackMessage(`${hitPrefix}${hitSuffix}`);

    if (res.isDefeat) {
      emitProblemTelemetry(false, mode);
      scheduleTimeout(onLose, res.delayMs);
      return;
    }

    if (res.keepSameProblem) {
      scheduleTimeout(() => {
        setFeedback('IDLE');
        setFeedbackMessage(null);
        setIsAttacking(null);
        if (res.fellBackToCombo) {
          setActiveClue(null);
        }
        resetInputs();
      }, res.delayMs);
      return;
    }

    emitProblemTelemetry(false, mode);
    scheduleNextProblem(mode, res.delayMs, stats.runBuffs);
  };

  const handleMeditationClick = () => {
    if (stats.fp >= MEDITATION_FP_COST && mode !== 'MEDITATION' && feedback === 'IDLE' && !isIntro) {
      clearAllTimeouts();
      const nextProblem = generateProblem(tier, 'MEDITATION', enemy.variant);
      setMode('MEDITATION');
      setProblem(nextProblem);
      setTurn(
        createCombatTurnState({
          problem: nextProblem,
          mode: 'MEDITATION',
          isApex,
          runBuffs: stats.runBuffs,
        })
      );
      setActiveClue(null);
      setFeedback('IDLE');
      setFeedbackMessage(null);
      problemStartTimeRef.current = Date.now();
      hadWrongAttemptRef.current = false;
      resetInputs();
    }
  };

  const handleHintClick = () => {
    if (totalHints <= 0 || mode !== 'ATTACK' || feedback !== 'IDLE' || isIntro) return;

    const hintResult = applyTacticalHint({
      stats,
      problem,
      turn,
      currentEnemyHp,
      patrolBaseHp,
      isApex,
      shieldActive,
    });

    const statsAfterHint = hintResult.nextStats;
    setShieldActive(hintResult.nextShieldActive);
    if (hintResult.clueText) {
      setActiveClue(hintResult.clueText);
    }

    if (hintResult.autoCompletedStep && hintResult.attackResolution) {
      const res = hintResult.attackResolution;
      setFeedback('CORRECT');
      setIsAttacking('PLAYER');
      setCurrentEnemyHp(res.newEnemyHp);
      setTurn(res.nextTurn);
      setFeedbackMessage(
        res.skippedFinalStepWithOverclock
          ? `Tactical Breach + Overclock Skip: -${res.damage} INT · Shield Armed`
          : `Tactical Breach: -${res.damage} INT · Shield Armed`
      );

      onUpdateStats({
        ...statsAfterHint,
        fp: Math.min(statsAfterHint.maxFp, statsAfterHint.fp + res.fpGain),
      });

      if (res.isVictory) {
        emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK');
        scheduleTimeout(() => {
          onWin(
            calculateCombatReward({
              tier,
              directStrikeBonus: res.nextTurn.directStrikeUsedOnKill,
              runBuffs: statsAfterHint.runBuffs,
              isApex,
            })
          );
        }, res.delayMs);
        return;
      }

      if (res.advanceToNextStep) {
        scheduleTimeout(() => {
          setFeedback('IDLE');
          setFeedbackMessage(null);
          setIsAttacking(null);
          setActiveClue(null);
          resetInputs();
        }, res.delayMs);
        return;
      }

      emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK');
      scheduleNextProblem('ATTACK', res.delayMs, statsAfterHint.runBuffs);
      return;
    }

    onUpdateStats(statsAfterHint);
    setFeedbackMessage('Tactical Shield Armed · Next Counter-Hit Blocked');
  };

  useCombatInput({
    showSystemMenu,
    setShowSystemMenu,
    feedback,
    isIntro,
    onSkipIntro: skipIntro,
    onToggleDirectStrike: directStrikeAvailable ? handleToggleDirectStrike : undefined,
    onTacticalHint: handleHintClick,
    onMeditation: handleMeditationClick,
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
    hintDisabled: totalHints <= 0 || mode !== 'ATTACK' || feedback !== 'IDLE' || isIntro,
    meditationDisabled:
      stats.fp < MEDITATION_FP_COST || mode === 'MEDITATION' || feedback !== 'IDLE' || isIntro,
    shieldActive,
  };

  return (
    <div className="flex flex-col h-full bg-gb-0 text-gb-3 scanlines overflow-hidden terminal-text">
      <AnimatePresence>
        {isIntro && (
          <motion.div
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            onClick={skipIntro}
            role="button"
            tabIndex={0}
            aria-label="Skip battle intro"
            className="absolute inset-0 z-[100] flex items-center justify-center bg-gb-0/90 backdrop-blur-sm p-4 cursor-pointer"
          >
            <div className="text-center">
              <div className="text-4xl md:text-6xl font-bold text-neon-cyan mb-2 tracking-tight italic uppercase">
                {isBossIntro ? 'Apex Encounter' : 'Battle Start'}
              </div>
              <div className="text-base md:text-xl text-gb-2 tracking-widest uppercase">
                {enemyDisplayName}
              </div>
              <div className="text-xs text-gb-2/70 mt-3 uppercase tracking-wider">
                Tap or press Enter to engage
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
                  {atkUpStacks > 0 ? (
                    <div className="text-xs font-bold text-neon-cyan">
                      Neural Overclock (+{atkUpStacks * 15}% Shards · Apex Step-Skip)
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
                <div
                  className={`w-16 h-16 lg:w-20 lg:h-20 bg-gb-0 border-2 ${
                    shieldActive ? 'border-neon-cyan shadow-[0_0_12px_rgba(34,211,238,0.45)]' : 'border-gb-3'
                  } rounded-lg flex items-center justify-center gb-border overflow-hidden transition-all`}
                >
                  <User className="w-9 h-9 lg:w-11 lg:h-11 text-neon-cyan" />
                  <div className="absolute inset-0 bg-neon-cyan/10 pointer-events-none" />
                </div>
                {shieldActive && (
                  <div
                    aria-label="Tactical Shield active"
                    className="absolute -top-2 -right-2 px-1 py-0.5 bg-gb-0 border border-neon-cyan text-neon-cyan text-[10px] font-black flex items-center gap-0.5"
                  >
                    <Shield className="w-3 h-3" />
                  </div>
                )}
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
                  {feedbackMessage ?? 'Critical Hit'}
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
                  {feedbackMessage ?? 'Counter Hit'}
                </motion.div>
              )}
              {feedback === 'IDLE' && !isIntro && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gb-2 text-xs text-center"
                >
                  {feedbackMessage ?? 'Solve the problem to breach Sentinel shields.'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right / Bottom: Scrollable Problem & Input Terminal */}
        <div className="lg:col-span-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 lg:p-6 bg-gb-1 border-t-2 lg:border-t-0 border-gb-3 dither flex flex-col justify-start lg:justify-center">
          <div className="w-full max-w-md mx-auto flex flex-col gap-3">
            <ProblemPromptCard
              problem={problem}
              modeLabel={mode === 'ATTACK' ? 'Cipher Attack' : 'Meditation Recovery'}
              strikeMode={turn.strikeMode}
              stepIndex={activeStepIndex}
              effectiveStepCount={turn.effectiveStepCount}
              comboStreak={turn.comboStreak}
              solvedBreadcrumbs={turn.solvedBreadcrumbs}
              activeClue={activeClue}
              isBlurred={stats.neuralScars.includes('THE_BLUR')}
              feedback={feedback}
              accent="cyan"
            />

            {directStrikeAvailable && (
              <button
                type="button"
                disabled={feedback !== 'IDLE' || isIntro}
                onClick={handleToggleDirectStrike}
                aria-pressed={turn.strikeMode === 'DIRECT'}
                className={`w-full min-h-10 px-3 py-1.5 border text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${
                  turn.strikeMode === 'DIRECT'
                    ? 'bg-amber-400/20 border-amber-400 text-amber-200 hover:bg-amber-400/30'
                    : 'bg-gb-0 border-amber-400/60 text-amber-300 hover:bg-amber-400/15'
                }`}
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {turn.strikeMode === 'DIRECT'
                    ? 'Direct Strike ARMED · 1-Shot · +50% Shards · Click for Combo'
                    : 'Direct Strike · 1-Shot · +50% Shards'}
                </span>
                <kbd className="hidden sm:inline-block px-1 py-0.5 text-[10px] font-mono border border-current/40 opacity-80 leading-none">
                  ⇧D
                </kbd>
              </button>
            )}

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
