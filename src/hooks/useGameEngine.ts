import { useState, useEffect } from 'react';
import {
  AnonymizedCacheProfile,
  GameState,
  PlayerStats,
  DungeonState,
  Enemy,
  Chest,
  DataLog,
  SaveSlot,
  ReconBuffType,
  NeuralChipId,
} from '../types';
import { generateFloor } from '../lib/mapGen';
import {
  canDescendFromFloor,
  canUpgrade,
  clampFloor,
  getBankableHintPacks,
  getDiveCost,
  getNextUnlockedFloor,
  getTierForFloor,
  getUpgradeCost,
  HINT_PACK_COST,
  isFloorExitLocked,
  stepEnemies,
} from '../lib/dungeonLogic';
import { BLUE_CACHE_FAIL_DAMAGE, isApexEnemy } from '../lib/combatLogic';
import {
  calculateExtractionBreakdown,
  evaluateSignalSweepRun,
  mergeArchetypeStats,
  RECON_BUFF_RUN_TOKENS,
  RECON_START_FP_BONUS,
  SignalSweepNodeOutcome,
} from '../lib/signalSweepLogic';
import {
  applyConceptOutcomeToStats,
  ConceptOutcome,
  recordConceptOutcomesBatch,
} from '../lib/conceptSpacedRep';
import {
  NEURAL_CHIP_MAP,
  recordSectorMastery,
  shouldInflictScar,
  toggleEquipChip,
  unlockChipIfNeeded,
} from '../lib/loadoutChips';
import { LORE_ENTRIES } from '../lib/lore';
import { getRandomScar } from '../lib/scarData';
import {
  INITIAL_STATS,
  hydrateSaveData,
  loadSlots,
  saveSlot,
  deleteSlot,
  toPersistedSaveData,
  getAnonymizedCacheProfile,
  recordTelemetryEvent,
  rotateAnonymousId,
  clearAllLocalCache,
  exportAnonymizedCacheData,
} from '../lib/storage';

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [dungeon, setDungeon] = useState<DungeonState | null>(null);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [activeLockedChest, setActiveLockedChest] = useState<Chest | null>(null);
  const [dungeonAlert, setDungeonAlert] = useState<string | null>(null);
  const [lootMessage, setLootMessage] = useState<{ text: string; type: 'CHEST' | 'LOG' } | null>(null);
  const [lastDefeatInflictedScar, setLastDefeatInflictedScar] = useState<boolean>(false);
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [showColdOpen, setShowColdOpen] = useState<boolean>(false);
  const [cacheProfile, setCacheProfile] = useState<AnonymizedCacheProfile>(() =>
    getAnonymizedCacheProfile()
  );

  // Load all slots and anonymized cache profile on mount
  useEffect(() => {
    setSlots(loadSlots());
    setCacheProfile(getAnonymizedCacheProfile());
  }, []);

  const handleSelectSlot = (id: number) => {
    const slot = slots.find((s) => s.id === id);
    const isFreshSlot = !slot || !slot.stats;
    if (slot && slot.stats) {
      setStats(hydrateSaveData(slot.stats) ?? INITIAL_STATS);
    } else {
      setStats(INITIAL_STATS);
    }
    setLastDefeatInflictedScar(false);
    setShowColdOpen(isFreshSlot);
    setCurrentSlot(id);
    setGameState('HOME');
  };

  const handleDismissColdOpen = () => {
    setShowColdOpen(false);
  };

  const handleDeleteSlot = (id: number) => {
    deleteSlot(id);
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, stats: null } : s)));
  };

  const handleRotateAnonymousId = () => {
    rotateAnonymousId();
    setCacheProfile(getAnonymizedCacheProfile());
  };

  const handleClearAllCache = () => {
    const freshProfile = clearAllLocalCache();
    setSlots(loadSlots());
    setCurrentSlot(null);
    setStats(INITIAL_STATS);
    setCacheProfile(freshProfile);
  };

  const handleExportCache = () => {
    return JSON.stringify(exportAnonymizedCacheData(), null, 2);
  };

  // Save stats to current slot
  useEffect(() => {
    if (currentSlot !== null && gameState !== 'TITLE') {
      saveSlot(currentSlot, stats);

      const previewStats = hydrateSaveData(toPersistedSaveData(stats));
      setSlots((prev) => prev.map((s) => (s.id === currentSlot ? { ...s, stats: previewStats } : s)));
    }
  }, [
    stats.knowledge,
    stats.hintPacks,
    stats.neuralScars,
    stats.maxExtractedFloor,
    stats.upgrades,
    stats.unlockedLore,
    stats.encounteredTiers,
    stats.unlockedDemos,
    stats.activeReconBuff,
    stats.reconRewardAvailable,
    stats.archetypeStats,
    stats.conceptSchedule,
    stats.conceptStepCounter,
    stats.unlockedChips,
    stats.equippedChips,
    stats.sectorMastery,
    stats.lifetimeShardsExtracted,
    currentSlot,
    gameState,
  ]);

  const startDive = (startFloor: number = 1) => {
    const safeFloor = clampFloor(startFloor);
    const cost = getDiveCost(safeFloor);
    if (stats.knowledge < cost) return;

    setLastDefeatInflictedScar(false);
    setStats((prev) => {
      const startFp =
        prev.activeReconBuff === 'START_FP_20' ? Math.min(prev.maxFp, RECON_START_FP_BONUS) : 0;
      const initialRunBuffs =
        prev.activeReconBuff === 'SHARD_BONUS_15'
          ? [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15]
          : prev.activeReconBuff === 'FREE_SHIELD'
            ? [RECON_BUFF_RUN_TOKENS.FREE_SHIELD]
            : [];

      return {
        ...prev,
        knowledge: prev.knowledge - cost,
        hp: prev.maxHp,
        fp: startFp,
        runKnowledge: 0,
        runHintPacks: prev.upgrades.hints,
        runBuffs: initialRunBuffs,
        activeReconBuff: null,
      };
    });

    recordTelemetryEvent('DIVE_STARTED');
    setCacheProfile(getAnonymizedCacheProfile());

    const startTier = getTierForFloor(safeFloor);
    setActiveLockedChest(null);
    setDungeonAlert(null);
    setDungeon(generateFloor(safeFloor, startTier));
    setGameState('DUNGEON');
  };

  const applyChestReward = (_chest: Chest) => {
    setStats((prev) => ({
      ...prev,
      runBuffs: [...prev.runBuffs, 'ATK_UP'],
    }));
    return 'Neural Overclock Active: +15% Shards & Apex Step-Skip';
  };

  const handleMove = (dx: number, dy: number) => {
    if (gameState !== 'DUNGEON' || !dungeon) return;

    const newX = dungeon.playerPos.x + dx;
    const newY = dungeon.playerPos.y + dy;

    // Bounds check
    if (newX < 0 || newX >= dungeon.gridSize || newY < 0 || newY >= dungeon.gridSize) return;

    // Wall check
    if (dungeon.walls.some((w) => w.x === newX && w.y === newY)) return;

    setDungeonAlert(null);

    // Enemy check
    const enemyIndex = dungeon.enemies.findIndex((e) => e.pos.x === newX && e.pos.y === newY);
    if (enemyIndex !== -1) {
      const enemy = dungeon.enemies[enemyIndex];
      setCurrentEnemy(enemy);
      const variantId = `${dungeon.tier}-${enemy.variant}`;
      setStats((prev) => {
        const currentTiers = prev.encounteredTiers || [];
        if (!currentTiers.includes(variantId)) {
          return { ...prev, encounteredTiers: [...currentTiers, variantId] };
        }
        return prev;
      });
      setGameState('COMBAT');
      return;
    }

    // Chest check
    let chestToOpen: Chest | null = null;
    const chestIndex = dungeon.chests.findIndex((c) => c.pos.x === newX && c.pos.y === newY);
    if (chestIndex !== -1) {
      const chest = dungeon.chests[chestIndex];
      if (!chest.opened) {
        if (chest.type === 'BLUE' && chest.locked !== false) {
          setActiveLockedChest(chest);
          setGameState('LOCK_MODAL');
          return;
        }
        chestToOpen = chest;
        const message = applyChestReward(chest);
        setLootMessage({ text: message, type: 'CHEST' });
        setGameState('CHEST_LOOT');
      }
    }

    // Log check
    let logToCollect: DataLog | null = null;
    const logIndex = dungeon.logs.findIndex((l) => l.pos.x === newX && l.pos.y === newY);
    if (logIndex !== -1) {
      const log = dungeon.logs[logIndex];
      if (!log.collected) {
        logToCollect = log;
        const loreEntry = LORE_ENTRIES.find((l) => l.id === log.loreId);

        setStats((prev) => {
          const currentLore = prev.unlockedLore || [];
          const newLore = currentLore.includes(log.loreId) ? currentLore : [...currentLore, log.loreId];
          return { ...prev, unlockedLore: newLore };
        });

        setLootMessage({ text: `Data Log Recovered: ${loreEntry?.title ?? log.loreId}`, type: 'LOG' });
        setGameState('CHEST_LOOT');
      }
    }

    // Stairs check
    if (newX === dungeon.stairs.x && newY === dungeon.stairs.y) {
      if (isFloorExitLocked(dungeon)) {
        setDungeonAlert('Exit Node Locked — Defeat the Floor 5 Apex Sentinel to unlock!');
        return;
      }
      if (dungeon.floor % 5 === 0) {
        setGameState('SANCTUARY');
      } else {
        setDungeon(generateFloor(dungeon.floor + 1, dungeon.tier));
      }
      return;
    }

    // Move player and enemies
    setDungeon((prev) => {
      if (!prev) return prev;

      const updatedChests = chestToOpen
        ? prev.chests.map((c) => (c.id === chestToOpen.id ? { ...c, opened: true } : c))
        : prev.chests;

      const updatedLogs = logToCollect
        ? prev.logs.map((l) => (l.id === logToCollect.id ? { ...l, collected: true } : l))
        : prev.logs;

      // Move enemies (Step-Sync without stacking or overlapping static objects)
      const updatedEnemies = stepEnemies({
        enemies: prev.enemies,
        playerPos: { x: newX, y: newY },
        gridSize: prev.gridSize,
        walls: prev.walls,
        chests: updatedChests,
        logs: updatedLogs,
        stairs: prev.stairs,
      });

      return {
        ...prev,
        playerPos: { x: newX, y: newY },
        enemies: updatedEnemies,
        chests: updatedChests,
        logs: updatedLogs,
      };
    });
  };

  const handleBlueCacheSuccess = () => {
    if (!activeLockedChest) {
      setGameState('DUNGEON');
      return;
    }
    const unlockedChestId = activeLockedChest.id;
    const currentTier = dungeon?.tier ?? 1;

    const newlyUnlockedNames: string[] = [];
    const previewFirst = unlockChipIfNeeded(stats.unlockedChips, 'STRUCTURAL_SIGHT');
    if (previewFirst.newlyUnlocked) {
      newlyUnlockedNames.push(NEURAL_CHIP_MAP[previewFirst.newlyUnlocked].name);
    }
    if (currentTier >= 2) {
      const previewSecond = unlockChipIfNeeded(previewFirst.unlockedChips, 'NEURAL_DAMPENER');
      if (previewSecond.newlyUnlocked) {
        newlyUnlockedNames.push(NEURAL_CHIP_MAP[previewSecond.newlyUnlocked].name);
      }
    }

    setDungeon((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        chests: prev.chests.map((c) =>
          c.id === unlockedChestId ? { ...c, opened: true, locked: false } : c
        ),
      };
    });
    setStats((prev) => {
      let nextUnlocked = unlockChipIfNeeded(prev.unlockedChips, 'STRUCTURAL_SIGHT').unlockedChips;
      if (currentTier >= 2) {
        nextUnlocked = unlockChipIfNeeded(nextUnlocked, 'NEURAL_DAMPENER').unlockedChips;
      }
      return {
        ...prev,
        runHintPacks: prev.runHintPacks + 1,
        runBuffs: [...prev.runBuffs, 'ATK_UP'],
        unlockedChips: nextUnlocked,
      };
    });
    setActiveLockedChest(null);
    const chipUnlockSuffix =
      newlyUnlockedNames.length > 0 ? ` · Chip Unlocked: ${newlyUnlockedNames.join(' & ')}` : '';
    setLootMessage({
      text: `Blue Cache Unlocked: +1 Hint Pack & Neural Overclock (+15% Shards)${chipUnlockSuffix}`,
      type: 'CHEST',
    });
    setGameState('CHEST_LOOT');
  };

  const handleBlueCacheFail = (damage: number = BLUE_CACHE_FAIL_DAMAGE) => {
    setStats((prev) => ({
      ...prev,
      hp: Math.max(1, prev.hp - damage),
    }));
  };

  const handleBlueCacheClose = () => {
    setActiveLockedChest(null);
    setGameState('DUNGEON');
  };

  const handleCombatWin = (knowledgeGained: number) => {
    if (!dungeon || !currentEnemy) return;
    const defeatedApex = isApexEnemy(currentEnemy);
    const currentTier = dungeon.tier;

    setStats((prev) => {
      let nextUnlocked = prev.unlockedChips;
      if (defeatedApex) {
        nextUnlocked = unlockChipIfNeeded(nextUnlocked, 'OVERCLOCK_CHIP').unlockedChips;
        if (currentTier >= 2) {
          nextUnlocked = unlockChipIfNeeded(nextUnlocked, 'SYNC_MATRIX').unlockedChips;
        }
      }
      return {
        ...prev,
        runKnowledge: prev.runKnowledge + knowledgeGained,
        unlockedChips: nextUnlocked,
      };
    });

    setDungeon((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        enemies: prev.enemies.filter((e) => e.id !== currentEnemy.id),
      };
    });

    recordTelemetryEvent('COMBAT_WON');
    setCacheProfile(getAnonymizedCacheProfile());

    setCurrentEnemy(null);
    setDungeonAlert(null);
    setGameState('DUNGEON');
  };

  const handleCombatLose = () => {
    const candidateScar = shouldInflictScar(stats.equippedChips)
      ? getRandomScar(stats.neuralScars)
      : null;
    setLastDefeatInflictedScar(Boolean(candidateScar));
    setStats((prev) => {
      const nextScars =
        candidateScar && !prev.neuralScars.includes(candidateScar)
          ? [...prev.neuralScars, candidateScar]
          : prev.neuralScars;
      return {
        ...prev,
        runKnowledge: 0,
        runHintPacks: 0,
        runBuffs: [],
        neuralScars: nextScars,
      };
    });
    recordTelemetryEvent('DEFEAT');
    setCacheProfile(getAnonymizedCacheProfile());
    setActiveLockedChest(null);
    setDungeonAlert(null);
    setGameState('GAMEOVER');
  };

  const handleBankAndExit = () => {
    const extraction = calculateExtractionBreakdown(
      stats.runKnowledge,
      stats.runBuffs,
      stats.fp,
      stats.equippedChips
    );
    setLastDefeatInflictedScar(false);
    setStats((prev) => {
      const banked = calculateExtractionBreakdown(
        prev.runKnowledge,
        prev.runBuffs,
        prev.fp,
        prev.equippedChips
      );
      return {
        ...prev,
        knowledge: prev.knowledge + banked.total,
        lifetimeShardsExtracted: prev.lifetimeShardsExtracted + banked.total,
        hintPacks: prev.hintPacks + getBankableHintPacks(prev.runHintPacks, prev.upgrades.hints),
        runKnowledge: 0,
        runHintPacks: 0,
        runBuffs: [],
        maxExtractedFloor: getNextUnlockedFloor(dungeon?.floor ?? 1, prev.maxExtractedFloor),
        reconRewardAvailable: true,
      };
    });
    recordTelemetryEvent('EXTRACTION', extraction.total);
    setCacheProfile(getAnonymizedCacheProfile());
    setActiveLockedChest(null);
    setDungeonAlert(null);
    setGameState('HOME');
  };

  const handleDiveDeeper = () => {
    if (!dungeon || !canDescendFromFloor(dungeon.floor)) return;
    const nextFloor = dungeon.floor + 1;
    setActiveLockedChest(null);
    setDungeonAlert(null);
    setDungeon(generateFloor(nextFloor, getTierForFloor(nextFloor)));
    setGameState('DUNGEON');
  };

  const handleHealScar = (scarToHeal: string) => {
    if (stats.knowledge >= 50) {
      setStats((prev) => {
        const newScars = [...prev.neuralScars];
        const index = newScars.indexOf(scarToHeal);
        if (index === -1) {
          return prev;
        }
        newScars.splice(index, 1);
        const nextUnlocked = unlockChipIfNeeded(prev.unlockedChips, 'NEURAL_DAMPENER').unlockedChips;
        return {
          ...prev,
          knowledge: prev.knowledge - 50,
          neuralScars: newScars,
          unlockedChips: nextUnlocked,
        };
      });
    }
  };

  const handleCalibrateScar = (scarToClear: string) => {
    setStats((prev) => {
      const newScars = [...prev.neuralScars];
      const index = newScars.indexOf(scarToClear);
      if (index === -1) {
        return prev;
      }
      newScars.splice(index, 1);
      const nextUnlocked = unlockChipIfNeeded(prev.unlockedChips, 'NEURAL_DAMPENER').unlockedChips;
      return {
        ...prev,
        neuralScars: newScars,
        unlockedChips: nextUnlocked,
      };
    });
  };

  const handleEmergencyEject = () => {
    setLastDefeatInflictedScar(false);
    setStats((prev) => ({
      ...prev,
      runKnowledge: 0,
      runHintPacks: 0,
      runBuffs: [],
    }));
    setActiveLockedChest(null);
    setDungeonAlert(null);
    setGameState('HOME');
  };

  const handleUpgrade = (type: 'hp' | 'fp' | 'hints' | 'buy_hint') => {
    if (type === 'buy_hint') {
      const cost = HINT_PACK_COST;
      if (stats.knowledge >= cost) {
        setStats((prev) => ({
          ...prev,
          knowledge: prev.knowledge - cost,
          hintPacks: prev.hintPacks + 1,
        }));
      }
      return;
    }

    const currentLevel = stats.upgrades[type];
    if (!canUpgrade(type, currentLevel)) return;
    const cost = getUpgradeCost(type, currentLevel);
    if (cost === null) return;

    if (stats.knowledge >= cost) {
      setStats((prev) => {
        const latestLevel = prev.upgrades[type];
        if (!canUpgrade(type, latestLevel)) return prev;
        const latestCost = getUpgradeCost(type, latestLevel);
        if (latestCost === null || prev.knowledge < latestCost) return prev;
        const newUpgrades = { ...prev.upgrades, [type]: latestLevel + 1 };
        return {
          ...prev,
          knowledge: prev.knowledge - latestCost,
          upgrades: newUpgrades,
          maxHp: type === 'hp' ? 100 + (latestLevel + 1) * 20 : prev.maxHp,
          maxFp: type === 'fp' ? 100 + (latestLevel + 1) * 20 : prev.maxFp,
        };
      });
    }
  };

  const handleToggleEquipChip = (chipId: NeuralChipId) => {
    setStats((prev) => ({
      ...prev,
      equippedChips: toggleEquipChip(prev.unlockedChips, prev.equippedChips, chipId),
    }));
  };

  const handleUnlockDemo = (variantId: string) => {
    const cost = 100;
    if (stats.knowledge >= cost) {
      setStats((prev) => {
        const currentDemos = prev.unlockedDemos || [];
        if (!currentDemos.includes(variantId)) {
          return {
            ...prev,
            knowledge: prev.knowledge - cost,
            unlockedDemos: [...currentDemos, variantId],
          };
        }
        return prev;
      });
    }
  };

  const handleRecordConceptOutcome = (outcome: ConceptOutcome) => {
    setStats((prev) => {
      const next = applyConceptOutcomeToStats(prev, outcome);
      if (!outcome.correct) return next;
      return {
        ...next,
        sectorMastery: recordSectorMastery(next.sectorMastery, outcome.tier, 'CONCEPTUAL'),
      };
    });
  };

  const handleRecordArchetypeStats = (outcomes: readonly SignalSweepNodeOutcome[]) => {
    if (outcomes.length === 0) return;
    const summary = evaluateSignalSweepRun(outcomes);
    setStats((prev) => {
      const spacedRep = recordConceptOutcomesBatch(
        prev.conceptSchedule,
        prev.conceptStepCounter,
        outcomes
      );
      let nextMastery = prev.sectorMastery;
      for (const outcome of outcomes) {
        if (outcome.correct) {
          nextMastery = recordSectorMastery(nextMastery, outcome.tier, 'CONCEPTUAL');
        }
      }
      const nextUnlocked = summary.rewardEligible
        ? unlockChipIfNeeded(prev.unlockedChips, 'PATTERN_LENS').unlockedChips
        : prev.unlockedChips;
      return {
        ...prev,
        archetypeStats: mergeArchetypeStats(prev.archetypeStats, outcomes),
        conceptSchedule: spacedRep.conceptSchedule,
        conceptStepCounter: spacedRep.conceptStepCounter,
        sectorMastery: nextMastery,
        unlockedChips: nextUnlocked,
      };
    });
  };

  const handleClaimReconBuff = (buff: ReconBuffType) => {
    setStats((prev) => {
      if (!prev.reconRewardAvailable) return prev;
      return {
        ...prev,
        activeReconBuff: buff,
        reconRewardAvailable: false,
      };
    });
  };

  return {
    gameState,
    setGameState,
    stats,
    setStats,
    dungeon,
    currentEnemy,
    activeLockedChest,
    dungeonAlert,
    lootMessage,
    setLootMessage,
    lastDefeatInflictedScar,
    currentSlot,
    slots,
    showColdOpen,
    cacheProfile,
    handleSelectSlot,
    handleDismissColdOpen,
    handleDeleteSlot,
    handleRotateAnonymousId,
    handleClearAllCache,
    handleExportCache,
    startDive,
    handleMove,
    handleBlueCacheSuccess,
    handleBlueCacheFail,
    handleBlueCacheClose,
    handleCombatWin,
    handleCombatLose,
    handleBankAndExit,
    handleDiveDeeper,
    handleHealScar,
    handleCalibrateScar,
    handleEmergencyEject,
    handleUpgrade,
    handleToggleEquipChip,
    handleUnlockDemo,
    handleRecordConceptOutcome,
    handleRecordArchetypeStats,
    handleClaimReconBuff,
  };
}
