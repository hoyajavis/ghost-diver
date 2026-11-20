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
} from '../types';
import { generateFloor } from '../lib/mapGen';
import {
  canDescendFromFloor,
  clampFloor,
  getBankableHintPacks,
  getDiveCost,
  getNextUnlockedFloor,
  getTierForFloor,
  stepEnemies,
} from '../lib/dungeonLogic';
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
  const [lootMessage, setLootMessage] = useState<{ text: string; type: 'CHEST' | 'LOG' } | null>(null);
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [slots, setSlots] = useState<SaveSlot[]>([]);
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
    if (slot && slot.stats) {
      setStats(hydrateSaveData(slot.stats) ?? INITIAL_STATS);
    } else {
      setStats(INITIAL_STATS);
    }
    setCurrentSlot(id);
    setGameState('HOME');
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
    currentSlot,
    gameState,
  ]);

  const startDive = (startFloor: number = 1) => {
    const safeFloor = clampFloor(startFloor);
    const cost = getDiveCost(safeFloor);
    if (stats.knowledge < cost) return;

    setStats((prev) => ({
      ...prev,
      knowledge: prev.knowledge - cost,
      hp: prev.maxHp,
      fp: 0,
      runKnowledge: 0,
      runHintPacks: prev.upgrades.hints,
      runBuffs: [],
    }));

    recordTelemetryEvent('DIVE_STARTED');
    setCacheProfile(getAnonymizedCacheProfile());

    const startTier = getTierForFloor(safeFloor);
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

  const handleCombatWin = (knowledgeGained: number) => {
    if (!dungeon || !currentEnemy) return;

    setStats((prev) => ({
      ...prev,
      runKnowledge: prev.runKnowledge + knowledgeGained,
    }));

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
    setGameState('DUNGEON');
  };

  const handleCombatLose = () => {
    setStats((prev) => {
      const newScar = getRandomScar(prev.neuralScars);
      return {
        ...prev,
        runKnowledge: 0,
        runHintPacks: 0,
        runBuffs: [],
        neuralScars: newScar ? [...prev.neuralScars, newScar] : prev.neuralScars,
      };
    });
    recordTelemetryEvent('DEFEAT');
    setCacheProfile(getAnonymizedCacheProfile());
    setGameState('GAMEOVER');
  };

  const handleBankAndExit = () => {
    const extractedKnowledge = stats.runKnowledge;
    setStats((prev) => ({
      ...prev,
      knowledge: prev.knowledge + prev.runKnowledge,
      hintPacks: prev.hintPacks + getBankableHintPacks(prev.runHintPacks, prev.upgrades.hints),
      runKnowledge: 0,
      runHintPacks: 0,
      runBuffs: [],
      maxExtractedFloor: getNextUnlockedFloor(dungeon?.floor ?? 1, prev.maxExtractedFloor),
    }));
    recordTelemetryEvent('EXTRACTION', extractedKnowledge);
    setCacheProfile(getAnonymizedCacheProfile());
    setGameState('HOME');
  };

  const handleDiveDeeper = () => {
    if (!dungeon || !canDescendFromFloor(dungeon.floor)) return;
    const nextFloor = dungeon.floor + 1;
    setDungeon(generateFloor(nextFloor, getTierForFloor(nextFloor)));
    setGameState('DUNGEON');
  };

  const handleHealScar = (scarToHeal: string) => {
    if (stats.knowledge >= 50) {
      setStats((prev) => {
        const newScars = [...prev.neuralScars];
        const index = newScars.indexOf(scarToHeal);
        if (index > -1) {
          newScars.splice(index, 1);
        }
        return {
          ...prev,
          knowledge: prev.knowledge - 50,
          neuralScars: newScars,
        };
      });
    }
  };

  const handleEmergencyEject = () => {
    setStats((prev) => ({
      ...prev,
      runKnowledge: 0,
      runHintPacks: 0,
      runBuffs: [],
    }));
    setGameState('HOME');
  };

  const handleUpgrade = (type: 'hp' | 'fp' | 'hints' | 'buy_hint') => {
    if (type === 'buy_hint') {
      const cost = 50;
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
    const cost = (currentLevel + 1) * 100;

    if (stats.knowledge >= cost) {
      setStats((prev) => {
        const newUpgrades = { ...prev.upgrades, [type]: currentLevel + 1 };
        return {
          ...prev,
          knowledge: prev.knowledge - cost,
          upgrades: newUpgrades,
          maxHp: type === 'hp' ? 100 + (currentLevel + 1) * 20 : prev.maxHp,
          maxFp: type === 'fp' ? 100 + (currentLevel + 1) * 20 : prev.maxFp,
        };
      });
    }
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

  return {
    gameState,
    setGameState,
    stats,
    setStats,
    dungeon,
    currentEnemy,
    lootMessage,
    setLootMessage,
    currentSlot,
    slots,
    cacheProfile,
    handleSelectSlot,
    handleDeleteSlot,
    handleRotateAnonymousId,
    handleClearAllCache,
    handleExportCache,
    startDive,
    handleMove,
    handleCombatWin,
    handleCombatLose,
    handleBankAndExit,
    handleDiveDeeper,
    handleHealScar,
    handleEmergencyEject,
    handleUpgrade,
    handleUnlockDemo,
  };
}
