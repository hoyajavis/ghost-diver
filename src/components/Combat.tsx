import React, { useState, useEffect, useRef } from 'react';
import {
  CombatMode,
  ConceptualArchetype,
  PlayerStats,
  Enemy,
  MathProblem,
  ProblemType,
} from '../types';
import { generateProblem } from '../lib/mathEngine';
import { applyConceptOutcomeToStats } from '../lib/conceptSpacedRep';
import { ConceptualGenerationOptions } from '../lib/generators/conceptual';
import { ENEMY_TIERS } from '../lib/enemyData';
import {
  APEX_INTRO_MS,
  applyFocusScanSuccess,
  applyMeditationRecovery,
  applyTacticalHint,
  calculateCombatReward,
  canToggleDirectStrike,
  canUseFocusScan,
  CombatTurnState,
  createCombatTurnState,
  formatMultiSelectAnswer,
  getAtkUpStacks,
  getInitialEnemyShieldLayers,
  getTotalHints,
  isApexEnemy,
  MEDITATION_FP_COST,
  MEDITATION_HEAL_AMOUNT,
  PATROL_INTRO_MS,
  PROBLEM_ADVANCE_MS,
  resolveCorrectAttack,
  resolveShieldBreakHit,
  resolveWrongAttack,
  toggleStrikeMode,
} from '../lib/combatLogic';
import { getPatrolBaseHpForTier } from '../lib/dungeonLogic';
import { RECON_BUFF_RUN_TOKENS, removeRunBuff } from '../lib/signalSweepLogic';
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
import { Crown, Shield, ShieldAlert, Skull, Zap, User, Settings, X, LogOut } from 'lucide-react';
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

function getProblemTypeForMode(combatMode: CombatMode): ProblemType {
  if (combatMode === 'ATTACK') return 'ATTACK';
  if (combatMode === 'SHIELD_BREAK') return 'SHIELD_BREAK';
  return 'MEDITATION';
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
  const hasReconShield = stats.runBuffs.includes(RECON_BUFF_RUN_TOKENS.FREE_SHIELD);
  const hasReconShard = stats.runBuffs.includes(RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15);
  const initialShieldLayers = getInitialEnemyShieldLayers(enemy);
  const maxShieldLayers = enemy.maxShieldLayers ?? initialShieldLayers;
  const initialMode: CombatMode = initialShieldLayers > 0 ? 'SHIELD_BREAK' : 'ATTACK';

  const [currentEnemyHp, setCurrentEnemyHp] = useState(enemy.hp);
  const [shieldLayers, setShieldLayers] = useState<number>(initialShieldLayers);
  const [isVulnerable, setIsVulnerable] = useState<boolean>(false);
  const [focusScanUsed, setFocusScanUsed] = useState<boolean>(false);
  const [phaseBanner, setPhaseBanner] = useState<string | null>(null);
  const [mode, setMode] = useState<CombatMode>(initialMode);
  const [problem, setProblem] = useState<MathProblem>(() =>
    initialMode === 'ATTACK'
      ? generateProblem(tier, 'ATTACK', enemy.variant)
      : generateProblem(tier, getProblemTypeForMode(initialMode), enemy.variant, {
          conceptSchedule: stats.conceptSchedule,
          conceptStepCounter: stats.conceptStepCounter,
        })
  );
  const [turn, setTurn] = useState<CombatTurnState>(() =>
    createCombatTurnState({
      problem,
      mode: initialMode,
      isApex,
      runBuffs: stats.runBuffs,
    })
  );
  const [hintShieldActive, setHintShieldActive] = useState(false);
  const effectiveShieldActive = hintShieldActive || hasReconShield;
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
  const statsRef = useRef<PlayerStats>(stats);
  statsRef.current = stats;

  // Encounter-scoped anti-repeat tracking for conceptual checks (Shield Break, Focus Scan, Meditation)
  const seenConceptQuestionsRef = useRef<Set<string>>(
    new Set(initialMode !== 'ATTACK' ? [problem.question] : [])
  );
  const seenConceptTemplateIdsRef = useRef<Set<string>>(
    new Set(initialMode !== 'ATTACK' && problem.templateId ? [problem.templateId] : [])
  );
  const lastConceptArchetypeRef = useRef<ConceptualArchetype | null>(
    initialMode !== 'ATTACK' ? (problem.archetype ?? null) : null
  );
  const lastConceptTemplateIdRef = useRef<string | null>(
    initialMode !== 'ATTACK' ? (problem.templateId ?? null) : null
  );

  const generateCombatProblem = (nextMode: CombatMode): MathProblem => {
    const problemType = getProblemTypeForMode(nextMode);
    if (problemType === 'ATTACK') {
      return generateProblem(tier, 'ATTACK', enemy.variant);
    }

    const latestStats = statsRef.current;
    const excludeTemplateIds =
      seenConceptTemplateIdsRef.current.size > 0
        ? seenConceptTemplateIdsRef.current
        : lastConceptTemplateIdRef.current
          ? new Set([lastConceptTemplateIdRef.current])
          : undefined;
    const conceptualOptions: ConceptualGenerationOptions = {
      conceptSchedule: latestStats.conceptSchedule,
      conceptStepCounter: latestStats.conceptStepCounter,
      excludeQuestions:
        seenConceptQuestionsRef.current.size > 0 ? seenConceptQuestionsRef.current : undefined,
      excludeArchetypes: lastConceptArchetypeRef.current
        ? new Set([lastConceptArchetypeRef.current])
        : undefined,
      excludeTemplateIds,
    };

    const nextProblem = generateProblem(tier, problemType, enemy.variant, conceptualOptions);
    seenConceptQuestionsRef.current.add(nextProblem.question);
    if (nextProblem.templateId) {
      seenConceptTemplateIdsRef.current.add(nextProblem.templateId);
    }
    lastConceptArchetypeRef.current = nextProblem.archetype ?? null;
    lastConceptTemplateIdRef.current = nextProblem.templateId ?? null;
    return nextProblem;
  };

  const withConceptOutcome = (
    nextStats: PlayerStats,
    activeMode: CombatMode,
    activeProblem: MathProblem,
    correct: boolean
  ): PlayerStats => {
    if (activeMode === 'ATTACK' || !activeProblem.archetype) {
      return nextStats;
    }
    return applyConceptOutcomeToStats(nextStats, {
      tier,
      archetype: activeProblem.archetype,
      correct,
    });
  };

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

  const emitProblemTelemetry = (
    firstTryCorrect: boolean,
    activeMode: CombatMode,
    activeProblem: MathProblem
  ) => {
    const solveMs = Math.max(0, Date.now() - problemStartTimeRef.current);
    recordProblemTelemetry({
      tierVariant: activeMode === 'ATTACK' ? `${tier}-${enemy.variant}` : undefined,
      archetype:
        activeMode !== 'ATTACK'
          ? (activeProblem.archetype ?? activeMode)
          : undefined,
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
  const focusScanAvailable = canUseFocusScan({ focusScanUsed, mode, shieldLayers });
  const includeInclusiveRelationship =
    expectedAnswer === '≤' ||
    expectedAnswer === '≥' ||
    problem.question.includes('≤') ||
    problem.question.includes('≥');

  const diverLabel = `Diver 0${slotId ?? 1}`;
  const enemyDisplayName =
    ENEMY_TIERS[tier]?.variants[enemy.variant]?.fullName || enemy.type || `Sentinel T${tier}`;

  const scheduleNextProblem = (
    nextMode: CombatMode,
    delayMs: number,
    runBuffs: string[],
    clearPhaseBanner = false
  ) => {
    scheduleTimeout(() => {
      const nextProblem = generateCombatProblem(nextMode);
      setMode(nextMode);
      setFeedback('IDLE');
      setFeedbackMessage(null);
      setIsAttacking(null);
      setActiveClue(null);
      if (clearPhaseBanner) {
        setPhaseBanner(null);
      }
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
      isChoice: Boolean(activeChoices),
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
          isVulnerable,
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
                : isVulnerable
                  ? `2× Vulnerable Hit: -${res.damage} INT`
                  : `Critical Hit: -${res.damage} INT`
        );

        onUpdateStats({
          ...stats,
          fp: Math.min(stats.maxFp, stats.fp + res.fpGain),
        });

        if (res.isVictory) {
          emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK', problem);
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

        emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK', problem);
        scheduleNextProblem('ATTACK', res.delayMs, stats.runBuffs);
        return;
      }

      if (mode === 'SHIELD_BREAK') {
        setIsAttacking('PLAYER');
        emitProblemTelemetry(!hadWrongAttemptRef.current, 'SHIELD_BREAK', problem);
        const res = resolveShieldBreakHit({
          shieldLayers,
          neuralScars: stats.neuralScars,
        });
        setShieldLayers(res.newShieldLayers);
        onUpdateStats(
          withConceptOutcome(
            {
              ...stats,
              fp: Math.min(stats.maxFp, stats.fp + res.fpGain),
            },
            'SHIELD_BREAK',
            problem,
            true
          )
        );

        if (res.shieldBroken) {
          setIsVulnerable(true);
          setPhaseBanner('SHIELD BROKEN — 2× VULNERABLE');
          setFeedbackMessage(`Logic Shield Shattered! +${res.fpGain} FP · 2× Vulnerable`);
          scheduleNextProblem('ATTACK', 1200, stats.runBuffs, true);
        } else {
          setFeedbackMessage(
            `Logic Shield Cracked (${res.newShieldLayers}/${maxShieldLayers}) · +${res.fpGain} FP`
          );
          scheduleNextProblem('SHIELD_BREAK', PROBLEM_ADVANCE_MS, stats.runBuffs);
        }
        return;
      }

      if (mode === 'FOCUS_SCAN') {
        emitProblemTelemetry(!hadWrongAttemptRef.current, 'FOCUS_SCAN', problem);
        const res = applyFocusScanSuccess(stats, shieldLayers);
        onUpdateStats(withConceptOutcome(res.nextStats, 'FOCUS_SCAN', problem, true));
        setShieldLayers(res.newShieldLayers);

        if (res.shieldBroken) {
          setIsVulnerable(true);
          setPhaseBanner('SHIELD BROKEN — 2× VULNERABLE');
          setFeedbackMessage(`Focus Scan Shattered Shield! +${res.fpGain} FP · 2× Vulnerable`);
          scheduleNextProblem('ATTACK', 1200, res.nextStats.runBuffs, true);
        } else {
          setFeedbackMessage(
            shieldLayers > 0
              ? `Focus Scan: +${res.fpGain} FP · Shield Cracked`
              : `Focus Scan Complete: +${res.fpGain} FP`
          );
          const nextMode: CombatMode = res.newShieldLayers > 0 ? 'SHIELD_BREAK' : 'ATTACK';
          scheduleNextProblem(nextMode, PROBLEM_ADVANCE_MS, res.nextStats.runBuffs);
        }
        return;
      }

      emitProblemTelemetry(!hadWrongAttemptRef.current, 'MEDITATION', problem);
      onUpdateStats(withConceptOutcome(applyMeditationRecovery(stats), 'MEDITATION', problem, true));
      setFeedbackMessage(`Emergency Heal Complete: +${MEDITATION_HEAL_AMOUNT} HP`);
      const nextModeAfterHeal: CombatMode = shieldLayers > 0 ? 'SHIELD_BREAK' : 'ATTACK';
      scheduleNextProblem(nextModeAfterHeal, PROBLEM_ADVANCE_MS, stats.runBuffs);
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
      shieldActive: effectiveShieldActive,
    });

    let nextRunBuffs = stats.runBuffs;
    if (res.shieldAbsorbed) {
      if (hintShieldActive) {
        setHintShieldActive(false);
      } else if (hasReconShield) {
        nextRunBuffs = removeRunBuff(stats.runBuffs, RECON_BUFF_RUN_TOKENS.FREE_SHIELD);
      }
    }

    setTurn(res.nextTurn);
    onUpdateStats(
      withConceptOutcome(
        {
          ...stats,
          hp: res.newPlayerHp,
          runBuffs: nextRunBuffs,
        },
        mode,
        problem,
        false
      )
    );

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
      emitProblemTelemetry(false, mode, problem);
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

    emitProblemTelemetry(false, mode, problem);
    const nextModeAfterMiss: CombatMode =
      mode === 'FOCUS_SCAN'
        ? shieldLayers > 0
          ? 'SHIELD_BREAK'
          : 'ATTACK'
        : mode;
    scheduleNextProblem(nextModeAfterMiss, res.delayMs, nextRunBuffs);
  };

  const handleFocusScanClick = () => {
    if (!focusScanAvailable || feedback !== 'IDLE' || isIntro) return;
    clearAllTimeouts();
    const nextProblem = generateCombatProblem('FOCUS_SCAN');
    setFocusScanUsed(true);
    setMode('FOCUS_SCAN');
    setProblem(nextProblem);
    setTurn(
      createCombatTurnState({
        problem: nextProblem,
        mode: 'FOCUS_SCAN',
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
  };

  const handleMeditationClick = () => {
    if (stats.fp >= MEDITATION_FP_COST && mode !== 'MEDITATION' && feedback === 'IDLE' && !isIntro) {
      clearAllTimeouts();
      const nextProblem = generateCombatProblem('MEDITATION');
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
      shieldActive: effectiveShieldActive,
      isVulnerable,
    });

    const statsAfterHint = hintResult.nextStats;
    setHintShieldActive(hintResult.nextShieldActive);
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
        emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK', problem);
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

      emitProblemTelemetry(!hadWrongAttemptRef.current, 'ATTACK', problem);
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
    onFocusScan: handleFocusScanClick,
    onMeditation: handleMeditationClick,
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

  const actionBarProps = {
    onHintClick: handleHintClick,
    onFocusScanClick: handleFocusScanClick,
    onMeditationClick: handleMeditationClick,
    totalHints,
    hintDisabled: totalHints <= 0 || mode !== 'ATTACK' || feedback !== 'IDLE' || isIntro,
    focusScanDisabled: !focusScanAvailable || feedback !== 'IDLE' || isIntro,
    focusScanUsed,
    meditationDisabled:
      stats.fp < MEDITATION_FP_COST || mode === 'MEDITATION' || feedback !== 'IDLE' || isIntro,
    shieldActive: effectiveShieldActive,
  };

  const modeLabel =
    mode === 'SHIELD_BREAK'
      ? 'Logic Shield Breach'
      : mode === 'FOCUS_SCAN'
        ? 'Focus Scan'
        : mode === 'MEDITATION'
          ? 'Emergency Heal'
          : 'Cipher Attack';
  const promptAccent: 'cyan' | 'purple' =
    mode === 'SHIELD_BREAK' || mode === 'FOCUS_SCAN' ? 'purple' : 'cyan';

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
      <header className="grid grid-cols-[auto_1fr_minmax(0,1fr)] items-center gap-2 px-2.5 py-1.5 lg:px-3 lg:py-2 bg-gb-1 border-b-2 border-gb-3 shadow-lg z-10 shrink-0 tabular-nums">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] lg:text-xs text-gb-2 leading-tight">Diver</span>
          <span className="text-xs sm:text-sm font-bold truncate">{diverLabel}</span>
        </div>

        <div className="flex flex-col items-center justify-center min-w-0">
          <span className="text-[11px] lg:text-xs text-gb-2 leading-tight">Depth</span>
          <span className="text-xs sm:text-sm font-bold text-neon-cyan whitespace-nowrap">
            Sector {tier} · F{floor}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1.5 lg:gap-2 min-w-0">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-[11px] lg:text-xs text-gb-2 leading-tight">Target</span>
            <span className="text-xs sm:text-sm font-bold text-neon-magenta truncate max-w-full">
              {enemy.type}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSystemMenu(true)}
            aria-label="Open combat systems menu"
            className="min-h-9 min-w-9 lg:min-h-10 lg:min-w-10 flex items-center justify-center border border-gb-3 bg-gb-0 text-gb-3 hover:text-neon-cyan hover:border-neon-cyan transition-colors shrink-0"
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
                  {atkUpStacks > 0 || hasReconShard || hasReconShield ? (
                    <div className="space-y-1 text-xs font-bold">
                      {atkUpStacks > 0 && (
                        <div className="text-neon-cyan">
                          Neural Overclock (+{atkUpStacks * 15}% Shards · Apex Step-Skip)
                        </div>
                      )}
                      {hasReconShard && (
                        <div className="text-neon-green">
                          Recon: +15% Shard Extraction
                        </div>
                      )}
                      {hasReconShield && (
                        <div className="text-amber-300">
                          Recon: 1 Free Shield Charge
                        </div>
                      )}
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

      {/* Main Split Body (Desktop side-by-side / Mobile stacked without overflow) */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 wireframe-bg dither-heavy overflow-hidden">
        {/* Left / Top: Battle Arena + Feedback */}
        <div className="lg:col-span-6 flex flex-col justify-between shrink-0 lg:shrink lg:border-r-2 lg:border-gb-3">
          {/* Side-View Battle Scene */}
          <div className="flex-1 flex items-center justify-around px-3 py-1.5 lg:px-4 lg:py-8 relative">
            {/* Player Side */}
            <motion.div
              animate={isAttacking === 'PLAYER' ? { x: [0, 60, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-1 lg:gap-2"
            >
              <div className="relative">
                <div
                  className={`w-11 h-11 lg:w-20 lg:h-20 bg-gb-0 border-2 ${
                    effectiveShieldActive
                      ? 'border-neon-cyan shadow-[0_0_12px_rgba(34,211,238,0.45)]'
                      : 'border-gb-3'
                  } rounded-lg flex items-center justify-center gb-border overflow-hidden transition-all`}
                >
                  <User className="w-6 h-6 lg:w-11 lg:h-11 text-neon-cyan" />
                  <div className="absolute inset-0 bg-neon-cyan/10 pointer-events-none" />
                </div>
                {effectiveShieldActive && (
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
                    <Zap className="w-7 h-7 lg:w-9 lg:h-9 text-white" />
                  </motion.div>
                )}
              </div>
              <div className="w-28 lg:w-40 tabular-nums space-y-0.5 lg:space-y-1">
                <div>
                  <div className="flex justify-between text-[11px] lg:text-xs font-bold mb-0.5">
                    <span>HP</span>
                    <span>
                      {stats.hp}/{stats.maxHp}
                    </span>
                  </div>
                  <div className="h-1.5 lg:h-2 bg-gb-0 border border-gb-3 p-[1px]">
                    <div
                      className="h-full bg-neon-green transition-all duration-300"
                      style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] lg:text-xs font-bold mb-0.5">
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
            <div className="text-base lg:text-3xl font-black italic text-gb-3/30 select-none" aria-hidden="true">
              VS
            </div>

            {/* Enemy Side */}
            <motion.div
              animate={isAttacking === 'ENEMY' ? { x: [0, -60, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-1 lg:gap-2"
            >
              <div className="relative">
                <div
                  className={`w-11 h-11 lg:w-20 lg:h-20 bg-gb-0 border-2 ${
                    isApex ? 'border-amber-400 shadow-[0_0_14px_rgba(255,0,255,0.5)]' : 'border-neon-magenta'
                  } rounded-lg flex items-center justify-center gb-border-sm overflow-hidden`}
                >
                  <Skull className="w-6 h-6 lg:w-11 lg:h-11 text-neon-magenta" />
                  <div className="absolute inset-0 bg-neon-magenta/10 pointer-events-none" />
                </div>
                {isApex && (
                  <div
                    aria-label="Apex Sentinel"
                    className="absolute -top-2 -right-2 px-1 py-0.5 bg-gb-0 border border-amber-400 text-amber-300 text-[10px] font-black flex items-center gap-0.5"
                  >
                    <Crown className="w-3 h-3" />
                  </div>
                )}
                {isAttacking === 'PLAYER' && feedback === 'CORRECT' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg"
                  >
                    <Zap className="w-7 h-7 lg:w-9 lg:h-9 text-neon-cyan" />
                  </motion.div>
                )}
              </div>
              <div className="w-28 lg:w-40 tabular-nums space-y-0.5 lg:space-y-1">
                {isApex && maxShieldLayers > 0 && (
                  <div>
                    <div className="flex justify-between items-center gap-1 text-[10px] lg:text-[11px] font-bold mb-0.5">
                      <span className={shieldLayers > 0 ? 'text-neon-cyan' : 'text-amber-300'}>
                        SHIELD
                      </span>
                      <span className={`${shieldLayers > 0 ? 'text-neon-cyan' : 'text-amber-300'} whitespace-nowrap`}>
                        {shieldLayers > 0 ? `${shieldLayers}/${maxShieldLayers}` : '2× VULN'}
                      </span>
                    </div>
                    <div
                      className="flex gap-1 h-1.5 lg:h-2"
                      aria-label={
                        shieldLayers > 0
                          ? `Logic Shield ${shieldLayers} of ${maxShieldLayers}`
                          : 'Logic Shield Broken — 2× Vulnerable'
                      }
                    >
                      {Array.from({ length: maxShieldLayers }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 border transition-all duration-300 ${
                            idx < shieldLayers
                              ? 'bg-neon-cyan border-neon-cyan shadow-[0_0_6px_rgba(0,243,255,0.6)]'
                              : 'bg-gb-0 border-gb-3/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="flex justify-between text-[11px] lg:text-xs font-bold mb-0.5">
                    <span>INT</span>
                    <span>
                      {currentEnemyHp}/{enemy.maxHp}
                    </span>
                  </div>
                  <div className="h-1.5 lg:h-2 bg-gb-0 border border-neon-magenta p-[1px]">
                    <div
                      className="h-full bg-neon-magenta transition-all duration-300"
                      style={{ width: `${(currentEnemyHp / enemy.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="hidden lg:block text-xs mt-1 text-right text-gb-2 font-semibold truncate">
                  {enemyDisplayName}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Phase Transition Banner */}
          <AnimatePresence>
            {phaseBanner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                role="status"
                className="mx-3 mb-1.5 lg:mb-2 px-3 py-1 lg:py-1.5 bg-amber-400/20 border-2 border-amber-400 text-amber-200 font-black italic uppercase tracking-wider text-[11px] sm:text-sm text-center shadow-[0_0_16px_rgba(251,191,36,0.35)]"
              >
                {phaseBanner}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combat Log / Feedback Banner */}
          <div
            aria-live="polite"
            className="min-h-7 lg:min-h-10 px-2.5 py-1 lg:px-3 lg:py-1.5 flex items-center justify-center bg-gb-0/90 border-y lg:border-b-0 border-gb-3"
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
                  className="text-gb-2 text-[11px] lg:text-xs text-center"
                >
                  {feedbackMessage ??
                    (mode === 'SHIELD_BREAK'
                      ? 'Crack the Apex Logic Shield with conceptual checks.'
                      : 'Solve the problem to breach Sentinel shields.')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right / Bottom: Problem & Input Terminal */}
        <div className="lg:col-span-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 lg:p-6 bg-gb-1 border-t-2 lg:border-t-0 border-gb-3 dither flex flex-col justify-start lg:justify-center">
          <div className="w-full max-w-md mx-auto flex flex-col gap-1.5 lg:gap-3">
            <ProblemPromptCard
              problem={problem}
              modeLabel={modeLabel}
              strikeMode={turn.strikeMode}
              stepIndex={activeStepIndex}
              effectiveStepCount={turn.effectiveStepCount}
              comboStreak={turn.comboStreak}
              solvedBreadcrumbs={turn.solvedBreadcrumbs}
              activeClue={activeClue}
              isBlurred={stats.neuralScars.includes('THE_BLUR')}
              feedback={feedback}
              accent={promptAccent}
            />

            {directStrikeAvailable && (
              <button
                type="button"
                disabled={feedback !== 'IDLE' || isIntro}
                onClick={handleToggleDirectStrike}
                aria-pressed={turn.strikeMode === 'DIRECT'}
                className={`w-full min-h-8 lg:min-h-10 px-2.5 py-1 lg:px-3 lg:py-1.5 border text-[11px] lg:text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 lg:gap-2 transition-colors disabled:opacity-40 ${
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
