import React, { useEffect, useCallback } from 'react';
import { DungeonState, PlayerStats } from '../types';
import { getScarName } from '../lib/scarData';
import { getAtkUpStacks, isApexEnemy } from '../lib/combatLogic';
import { isFloorExitLocked } from '../lib/dungeonLogic';
import { RECON_BUFF_RUN_TOKENS } from '../lib/signalSweepLogic';
import {
  Cpu,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Database,
  User,
  Skull,
  Box,
  Zap,
  LogOut,
  Settings,
  X,
  Shield,
  ShieldAlert,
  FileText,
  Lock,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  dungeon: DungeonState;
  stats: PlayerStats;
  onMove: (dx: number, dy: number) => void;
  onEject: () => void;
  isActive?: boolean;
  dungeonAlert?: string | null;
}

const LEGEND_ITEMS = [
  {
    label: 'Diver (You)',
    icon: (
      <div className="w-6 h-6 bg-neon-cyan flex items-center justify-center rounded-sm shrink-0">
        <User className="w-3.5 h-3.5 text-gb-0" />
      </div>
    ),
  },
  {
    label: 'Sentinel',
    icon: (
      <div className="w-6 h-6 bg-gb-0 border-2 border-neon-magenta flex items-center justify-center rounded-sm shrink-0">
        <Skull className="w-3.5 h-3.5 text-neon-magenta" />
      </div>
    ),
  },
  {
    label: 'Exit Node',
    icon: (
      <div className="w-6 h-6 bg-neon-magenta flex items-center justify-center rounded-sm shrink-0">
        <Zap className="w-3.5 h-3.5 text-gb-0" />
      </div>
    ),
  },
  {
    label: 'Red Cache (+Buff)',
    icon: (
      <div className="w-6 h-6 bg-gb-0 border-2 border-amber-500 flex items-center justify-center rounded-sm shrink-0">
        <Box className="w-3.5 h-3.5 text-amber-500" />
      </div>
    ),
  },
  {
    label: 'Blue Cache (Lock)',
    icon: (
      <div className="w-6 h-6 bg-gb-0 border-2 border-neon-cyan flex items-center justify-center rounded-sm shrink-0">
        <Lock className="w-3.5 h-3.5 text-neon-cyan" />
      </div>
    ),
  },
  {
    label: 'Data Log',
    icon: (
      <div className="w-6 h-6 bg-gb-0 border-2 border-neon-green flex items-center justify-center rounded-sm shrink-0">
        <FileText className="w-3.5 h-3.5 text-neon-green" />
      </div>
    ),
  },
  {
    label: 'Barrier Wall',
    icon: <div className="w-6 h-6 bg-gb-1 dither-heavy border border-gb-2/40 rounded-sm shrink-0" />,
  },
];

export const Dungeon: React.FC<Props> = ({
  dungeon,
  stats,
  onMove,
  onEject,
  isActive = true,
  dungeonAlert = null,
}) => {
  const [showSystemMenu, setShowSystemMenu] = React.useState(false);
  const atkUpStacks = getAtkUpStacks(stats.runBuffs);
  const hasReconShard = stats.runBuffs.includes(RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15);
  const hasReconShield = stats.runBuffs.includes(RECON_BUFF_RUN_TOKENS.FREE_SHIELD);
  const exitLocked = isFloorExitLocked(dungeon);
  const unopenedBlueCaches = dungeon.chests.filter((c) => !c.opened && c.type === 'BLUE').length;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showSystemMenu) {
        if (e.key === 'Escape') setShowSystemMenu(false);
        return;
      }
      if (!isActive || !onMove) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          onMove(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          onMove(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          onMove(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          onMove(1, 0);
          break;
        case 'Escape':
          setShowSystemMenu(true);
          break;
      }
    },
    [onMove, showSystemMenu, isActive]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < dungeon.gridSize; y++) {
      for (let x = 0; x < dungeon.gridSize; x++) {
        let content = null;
        let bgClass = 'bg-gb-0';

        if (dungeon.playerPos.x === x && dungeon.playerPos.y === y) {
          content = (
            <motion.div
              layoutId="player"
              className="w-full h-full bg-neon-cyan flex items-center justify-center rounded-sm shadow-[0_0_10px_rgba(0,243,255,0.7)]"
            >
              <User className="w-4 h-4 text-gb-0" />
            </motion.div>
          );
        } else if (dungeon.stairs.x === x && dungeon.stairs.y === y) {
          content = exitLocked ? (
            <div
              title="Defeat the Apex Sentinel to unlock Exit Node"
              className="w-full h-full bg-gb-0 border-2 border-neon-magenta/70 flex items-center justify-center rounded-sm shadow-[0_0_8px_rgba(255,0,255,0.35)]"
            >
              <Lock className="w-3.5 h-3.5 text-neon-magenta" />
            </div>
          ) : (
            <div className="w-full h-full bg-neon-magenta flex items-center justify-center rounded-sm animate-pulse shadow-[0_0_10px_rgba(255,0,255,0.7)]">
              <Zap className="w-4 h-4 text-gb-0" />
            </div>
          );
        } else if (dungeon.walls.some((w) => w.x === x && w.y === y)) {
          bgClass = 'bg-gb-1';
          content = <div className="w-full h-full dither-heavy opacity-45 border border-gb-2/25" />;
        } else {
          const enemy = dungeon.enemies.find((e) => e.pos.x === x && e.pos.y === y);
          if (enemy) {
            const enemyIsApex = isApexEnemy(enemy);
            const hasStaticEye = !enemyIsApex && stats.neuralScars.includes('STATIC_EYE');
            content = enemyIsApex ? (
              <div
                title="Floor 5 Apex Sentinel"
                className="w-full h-full bg-neon-magenta/20 border-2 border-amber-400 flex items-center justify-center rounded-sm shadow-[0_0_12px_rgba(255,0,255,0.65)] relative"
              >
                <Skull className="w-4 h-4 text-neon-magenta" />
                <Crown className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1 drop-shadow-[0_0_3px_#000]" />
              </div>
            ) : (
              <div
                className={`w-full h-full bg-gb-0 border-2 border-neon-magenta flex items-center justify-center rounded-sm shadow-[0_0_8px_rgba(255,0,255,0.4)] ${
                  hasStaticEye ? 'opacity-40 animate-pulse' : ''
                }`}
              >
                <Skull className="w-4 h-4 text-neon-magenta" />
              </div>
            );
          } else {
            const chest = dungeon.chests.find((c) => c.pos.x === x && c.pos.y === y);
            if (chest && !chest.opened) {
              content =
                chest.type === 'BLUE' ? (
                  <div
                    title="Locked Blue Cache (Conceptual Check)"
                    className="w-full h-full bg-gb-0 border-2 border-neon-cyan flex items-center justify-center rounded-sm shadow-[0_0_8px_rgba(0,243,255,0.5)]"
                  >
                    <Lock className="w-3.5 h-3.5 text-neon-cyan" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gb-0 border-2 border-amber-500 flex items-center justify-center rounded-sm shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                    <Box className="w-4 h-4 text-amber-500" />
                  </div>
                );
            } else if (chest && chest.opened) {
              content = <div className="w-full h-full bg-gb-1 opacity-20 border border-gb-2/10" />;
            } else {
              const log = dungeon.logs?.find((l) => l.pos.x === x && l.pos.y === y);
              if (log && !log.collected) {
                content = (
                  <div className="w-full h-full bg-gb-0 border-2 border-neon-green flex items-center justify-center rounded-sm shadow-[0_0_8px_rgba(57,255,20,0.45)] animate-bounce">
                    <FileText className="w-4 h-4 text-neon-green" />
                  </div>
                );
              }
            }
          }
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`w-full h-full ${bgClass} border border-gb-3/10 flex items-center justify-center p-[1px]`}
          >
            {content}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="flex flex-col h-full bg-gb-0 text-gb-3 scanlines terminal-text overflow-hidden">
      {/* Top HUD */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-gb-1 border-b-2 border-gb-3 shadow-lg z-10 shrink-0 tabular-nums">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between gap-2 text-xs font-bold leading-none">
              <span className="text-gb-2">HP</span>
              <span>
                {stats.hp}/{stats.maxHp}
              </span>
            </div>
            <div className="w-24 h-2 bg-gb-0 border border-gb-3 p-[1px]">
              <div
                className="h-full bg-neon-green transition-all"
                style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between gap-2 text-xs font-bold leading-none">
              <span className="text-gb-2">FP</span>
              <span>
                {stats.fp}/{stats.maxFp}
              </span>
            </div>
            <div className="w-24 h-2 bg-gb-0 border border-gb-3 p-[1px]">
              <div
                className="h-full bg-neon-cyan transition-all"
                style={{ width: `${(stats.fp / stats.maxFp) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="flex items-center gap-1 text-neon-green" title="Run Knowledge Shards">
              <Database className="w-3.5 h-3.5" />
              <span>+{stats.runKnowledge}</span>
            </div>
            <div className="flex items-center gap-1 text-neon-cyan" title="Run Hint Packs">
              <Cpu className="w-3.5 h-3.5" />
              <span>+{stats.runHintPacks}</span>
            </div>
            {hasReconShard && (
              <div
                title="Recon Buff: +15% Shard Extraction"
                className="flex items-center gap-1 px-1.5 py-0.5 bg-neon-cyan/15 border border-neon-cyan text-neon-cyan text-[10px] font-black uppercase whitespace-nowrap"
              >
                <Zap className="w-3 h-3 shrink-0" />
                <span>Recon +15%</span>
              </div>
            )}
            {hasReconShield && (
              <div
                title="Recon Buff: 1 Free Shield Charge"
                className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-400/15 border border-amber-400 text-amber-300 text-[10px] font-black uppercase whitespace-nowrap"
              >
                <Shield className="w-3 h-3 shrink-0" />
                <span>Shield ×1</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 bg-gb-0 px-2.5 py-1.5 gb-border-sm text-xs font-bold whitespace-nowrap">
            <span className="text-gb-2">Sector {dungeon.tier}</span>
            <span className="text-gb-3/50" aria-hidden="true">·</span>
            <span className="text-neon-cyan">Floor {dungeon.floor}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSystemMenu(true)}
            aria-label="Open system menu"
            className="min-h-10 px-3 py-1.5 flex items-center gap-1.5 text-xs uppercase font-bold text-gb-3 hover:bg-gb-3 hover:text-gb-0 border border-gb-3 transition-colors whitespace-nowrap"
          >
            <Settings className="w-4 h-4" />
            <span>System</span>
          </button>
        </div>
      </header>

      {/* Main Content Split (Desktop 2-column / Mobile stacked) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 wireframe-bg dither overflow-y-auto custom-scrollbar">
        {/* Dungeon Grid Column */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-3 md:p-6 gap-3">
          {dungeonAlert && (
            <div
              role="alert"
              aria-live="polite"
              className="max-w-md w-full px-3 py-2 bg-neon-magenta/15 border-2 border-neon-magenta text-neon-magenta text-xs font-bold uppercase tracking-wider text-center gb-border-sm"
            >
              {dungeonAlert}
            </div>
          )}

          <div
            className="grid gap-0 bg-gb-1 p-1 gb-border shadow-[0_0_30px_rgba(0,243,255,0.1)] aspect-square flex-shrink-0"
            style={{
              gridTemplateColumns: `repeat(${dungeon.gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${dungeon.gridSize}, 1fr)`,
              width: 'min(90vw, 58vh, 520px)',
              height: 'min(90vw, 58vh, 520px)',
            }}
          >
            {renderGrid()}
          </div>

          {/* Compact Legend Strip on mobile/tablet */}
          <div className="lg:hidden flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-3 py-2 bg-gb-0/90 border border-gb-3/40 text-xs max-w-md w-full">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                {item.icon}
                <span className="text-gb-3 font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden grid grid-cols-3 gap-2 max-w-[196px] mx-auto pb-2">
            <div />
            <button
              type="button"
              onClick={() => isActive && onMove(0, -1)}
              disabled={!isActive}
              aria-label="Move Up"
              className={`min-h-12 min-w-12 bg-gb-1 border-2 border-gb-3 text-gb-3 p-2 gb-border-sm flex items-center justify-center active:bg-gb-3 active:text-gb-0 transition-colors ${
                !isActive ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />
            <button
              type="button"
              onClick={() => isActive && onMove(-1, 0)}
              disabled={!isActive}
              aria-label="Move Left"
              className={`min-h-12 min-w-12 bg-gb-1 border-2 border-gb-3 text-gb-3 p-2 gb-border-sm flex items-center justify-center active:bg-gb-3 active:text-gb-0 transition-colors ${
                !isActive ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => isActive && onMove(0, 1)}
              disabled={!isActive}
              aria-label="Move Down"
              className={`min-h-12 min-w-12 bg-gb-1 border-2 border-gb-3 text-gb-3 p-2 gb-border-sm flex items-center justify-center active:bg-gb-3 active:text-gb-0 transition-colors ${
                !isActive ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => isActive && onMove(1, 0)}
              disabled={!isActive}
              aria-label="Move Right"
              className={`min-h-12 min-w-12 bg-gb-1 border-2 border-gb-3 text-gb-3 p-2 gb-border-sm flex items-center justify-center active:bg-gb-3 active:text-gb-0 transition-colors ${
                !isActive ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop Tactical Sidebar */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col gap-4 p-5 bg-gb-1/90 border-l-2 border-gb-3 overflow-y-auto custom-scrollbar">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-neon-cyan mb-2">
              Map Legend
            </h2>
            <div className="bg-gb-0 border border-gb-3 p-3 gb-border-sm grid grid-cols-2 gap-2.5 text-xs">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-gb-3 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tabular-nums">
            <h2 className="text-sm font-black uppercase tracking-wider text-gb-3 mb-2">
              Floor Status
            </h2>
            <div className="bg-gb-0 border border-gb-3 p-3 gb-border-sm space-y-2 text-xs">
              {dungeon.floor % 5 === 0 && (
                <div className="flex justify-between">
                  <span className="text-gb-2">Apex Gatekeeper</span>
                  <span className={`font-bold ${exitLocked ? 'text-amber-300' : 'text-neon-green'}`}>
                    {exitLocked ? 'Active — Exit Locked' : 'Breached — Exit Open'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gb-2">Sentinels Active</span>
                <span className="font-bold text-neon-magenta">{dungeon.enemies.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gb-2">Unopened Caches</span>
                <span className="font-bold text-amber-400">
                  {dungeon.chests.filter((c) => !c.opened).length}
                </span>
              </div>
              {unopenedBlueCaches > 0 && (
                <div className="flex justify-between">
                  <span className="text-gb-2">Locked Blue Caches</span>
                  <span className="font-bold text-neon-cyan">{unopenedBlueCaches}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-gb-2 shrink-0">Active Buffs</span>
                <span className="font-bold text-neon-cyan text-right">
                  {[
                    atkUpStacks > 0 ? `+${atkUpStacks * 15}% Overclock` : null,
                    hasReconShard ? '+15% Recon Extraction' : null,
                    hasReconShield ? 'Recon Shield ×1' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gb-2">Neural Scars</span>
                <span className={`font-bold ${stats.neuralScars.length > 0 ? 'text-neon-magenta' : 'text-neon-green'}`}>
                  {stats.neuralScars.length > 0 ? stats.neuralScars.map(getScarName).join(', ') : 'Stable'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-gb-3 mb-2">
              Controls
            </h2>
            <div className="bg-gb-0 border border-gb-3 p-3 gb-border-sm space-y-1.5 text-xs text-gb-2 font-sans">
              <p><span className="font-mono font-bold text-gb-3">WASD / Arrows</span> — Move Diver</p>
              <p><span className="font-mono font-bold text-gb-3">Esc</span> — System Menu &amp; Eject</p>
              <p>Step onto the magenta Exit Node to advance. Floor 5 opens a Secure Node.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* System Overlay */}
      <AnimatePresence>
        {showSystemMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dungeon-system-title"
            className="absolute inset-0 z-[100] bg-gb-0/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-sm w-full bg-gb-1 border-2 border-gb-3 p-5 gb-border dither relative">
              <button
                type="button"
                onClick={() => setShowSystemMenu(false)}
                aria-label="Close system menu"
                className="absolute top-3 right-3 min-h-10 min-w-10 flex items-center justify-center text-gb-3 hover:text-neon-magenta"
              >
                <X className="w-5 h-5" />
              </button>

              <h3
                id="dungeon-system-title"
                className="text-xl font-black italic mb-4 text-gb-3 tracking-tight uppercase flex items-center gap-2 pr-10"
              >
                <Settings className="w-5 h-5" />
                System Overlay
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
                    <div className="text-xs text-neon-green font-bold">Stable — No scars active</div>
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
                    <div className="text-xs text-gb-2">No active buffs</div>
                  )}
                </div>

                <div className="pt-3 border-t border-gb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSystemMenu(false);
                      onEject();
                    }}
                    className="w-full min-h-11 py-2.5 px-4 bg-gb-0 border-2 border-neon-magenta text-neon-magenta hover:bg-neon-magenta hover:text-gb-0 text-xs font-black uppercase tracking-wider transition-all gb-border-sm flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Emergency Eject (Lose Run Loot)
                  </button>
                </div>
              </div>

              <div className="mt-4 text-xs text-gb-2 text-center">
                Press Esc to resume exploration
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
