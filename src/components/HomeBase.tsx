import React, { useState, useEffect, useCallback } from 'react';
import { PlayerStats, Position, ReconBuffType } from '../types';
import { SignalSweepNodeOutcome } from '../lib/signalSweepLogic';
import { ConceptOutcome } from '../lib/conceptSpacedRep';
import { TrainingSim } from './TrainingSim';
import { ScarCalibrationModal } from './ScarCalibrationModal';
import { SignalSweep } from './SignalSweep';
import { DiveStation } from './stations/DiveStation';
import { WorkbenchStation } from './stations/WorkbenchStation';
import { ArchivistStation } from './stations/ArchivistStation';
import { GardenStation } from './stations/GardenStation';
import { ManualStation } from './stations/ManualStation';
import { SimulatorStation } from './stations/SimulatorStation';
import {
  Database,
  Cpu,
  TreePine,
  Terminal,
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  LogOut,
  User,
  Info,
  Settings,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  stats: PlayerStats;
  onStartDive: (startFloor?: number) => void;
  onHealScar: (scar: string) => void;
  onCalibrateScar: (scar: string) => void;
  onUpgrade: (type: 'hp' | 'fp' | 'hints' | 'buy_hint') => void;
  onUnlockDemo: (variantId: string) => void;
  onRecordConceptOutcome: (outcome: ConceptOutcome) => void;
  onRecordArchetypeStats: (outcomes: readonly SignalSweepNodeOutcome[]) => void;
  onClaimReconBuff: (buff: ReconBuffType) => void;
  onLogout: () => void;
}

type BaseStation = 'DIVE' | 'UPGRADES' | 'LORE' | 'GARDEN' | 'GUIDE' | 'TRAINING' | 'NONE';

interface StationConfig {
  x: number;
  y: number;
  icon: React.ReactNode;
  shortLabel: string;
  label: string;
  summary: string;
}

const GRID_SIZE = 5;

const STATIONS: Record<Exclude<BaseStation, 'NONE'>, StationConfig> = {
  DIVE: {
    x: 2,
    y: 1,
    icon: <Activity className="w-5 h-5 text-neon-cyan" />,
    shortLabel: 'Dive',
    label: 'Neural Chair',
    summary: 'Launch a dive or repair Neural Scars',
  },
  UPGRADES: {
    x: 0,
    y: 2,
    icon: <Settings className="w-5 h-5 text-neon-magenta" />,
    shortLabel: 'Build',
    label: 'Workbench',
    summary: 'Upgrade HP, FP, and buy Hint Packs',
  },
  LORE: {
    x: 4,
    y: 2,
    icon: <Terminal className="w-5 h-5 text-gb-3" />,
    shortLabel: 'Logs',
    label: 'Archivist Logs',
    summary: 'Read decrypted archive data logs',
  },
  GARDEN: {
    x: 2,
    y: 4,
    icon: <TreePine className="w-5 h-5 text-neon-green" />,
    shortLabel: 'Garden',
    label: 'Green-Print',
    summary: 'Track global restoration progress',
  },
  GUIDE: {
    x: 0,
    y: 0,
    icon: <Info className="w-5 h-5 text-amber-400" />,
    shortLabel: 'Manual',
    label: 'Diver Manual',
    summary: 'Review mechanics and combat tips',
  },
  TRAINING: {
    x: 4,
    y: 0,
    icon: <BrainCircuit className="w-5 h-5 text-purple-400" />,
    shortLabel: 'Sim',
    label: 'Combat Simulator',
    summary: 'Signal Sweep recon & Sentinel practice',
  },
};

export const HomeBase: React.FC<Props> = ({
  stats,
  onStartDive,
  onHealScar,
  onCalibrateScar,
  onUpgrade,
  onUnlockDemo,
  onRecordConceptOutcome,
  onRecordArchetypeStats,
  onClaimReconBuff,
  onLogout,
}) => {
  const [playerPos, setPlayerPos] = useState<Position>({ x: 2, y: 3 });
  const [activeStation, setActiveStation] = useState<BaseStation>('NONE');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [activeSimTier, setActiveSimTier] = useState<string | null>(null);
  const [calibratingScar, setCalibratingScar] = useState<string | null>(null);
  const [signalSweepConfig, setSignalSweepConfig] = useState<{ timed: boolean } | null>(null);

  const handleMove = useCallback((dx: number, dy: number) => {
    setPlayerPos((prev) => ({
      x: Math.max(0, Math.min(GRID_SIZE - 1, prev.x + dx)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, prev.y + dy)),
    }));
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activeSimTier !== null || calibratingScar !== null || signalSweepConfig !== null) return;

      if (activeStation !== 'NONE') {
        if (e.key === 'Escape') setActiveStation('NONE');
        return;
      }

      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dy = -1;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dy = 1;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dx = -1;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dx = 1;
          break;
        case 'Enter':
        case ' ': {
          const match = Object.entries(STATIONS).find(
            ([, pos]) => playerPos.x === pos.x && playerPos.y === pos.y
          );
          if (match) {
            e.preventDefault();
            setActiveStation(match[0] as BaseStation);
          }
          break;
        }
      }

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        handleMove(dx, dy);
      }
    },
    [activeSimTier, calibratingScar, signalSweepConfig, activeStation, playerPos, handleMove]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentStationEntry = Object.entries(STATIONS).find(
    ([, pos]) => playerPos.x === pos.x && playerPos.y === pos.y
  );

  return (
    <div className="flex flex-col h-full bg-gb-0 text-gb-3 scanlines relative overflow-hidden terminal-text">
      {/* Top Status Bar */}
      <header className="flex items-center justify-between gap-4 px-3 py-2 border-b-2 border-gb-3 bg-gb-1 dither z-20 shrink-0 tabular-nums">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onLogout}
            aria-label="Return to Title Screen"
            className="min-h-10 min-w-10 px-2.5 flex items-center justify-center gap-1.5 hover:bg-gb-3 hover:text-gb-0 border border-gb-3 bg-gb-0 text-xs font-bold transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Title</span>
          </button>
          <span className="text-xs sm:text-sm font-black italic uppercase tracking-tight truncate">
            The Cradle Bunker
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm font-bold shrink-0">
          <div className="flex items-center gap-1.5" title="Banked Knowledge Shards">
            <Database className="w-4 h-4 text-neon-green" />
            <span>{stats.knowledge}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Banked Hint Packs">
            <Cpu className="w-4 h-4 text-neon-cyan" />
            <span>{stats.hintPacks}</span>
          </div>
        </div>
      </header>

      {/* Main Content Split */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 wireframe-bg dither overflow-y-auto custom-scrollbar">
        {/* Navigable Room View */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-4 md:p-6 gap-3">
          <div className="text-xs text-gb-2 text-center font-sans">
            Move with WASD or Arrow keys, or click any station tile directly.
          </div>

          <div
            className="grid bg-gb-1/85 border-2 border-gb-3 gb-border shadow-[0_0_40px_rgba(0,0,0,0.45)] aspect-square flex-shrink-0 overflow-hidden relative"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              width: 'min(88vw, 440px)',
              height: 'min(88vw, 440px)',
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const isPlayer = playerPos.x === x && playerPos.y === y;

              const stationEntry = Object.entries(STATIONS).find(([, pos]) => pos.x === x && pos.y === y);
              const station = stationEntry ? stationEntry[1] : null;
              const stationKey = stationEntry ? (stationEntry[0] as BaseStation) : null;

              return (
                <div
                  key={i}
                  className={`relative border-r border-b border-gb-3/20 flex items-center justify-center transition-colors ${
                    isPlayer ? 'bg-neon-cyan/10' : ''
                  } ${x === GRID_SIZE - 1 ? 'border-r-0' : ''} ${y === GRID_SIZE - 1 ? 'border-b-0' : ''}`}
                  onClick={() => setPlayerPos({ x, y })}
                >
                  {station && stationKey ? (
                    <button
                      type="button"
                      aria-label={`Open ${station.label}`}
                      className="flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform z-20 w-full h-full p-1 hover:bg-gb-0/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayerPos({ x, y });
                        setActiveStation(stationKey);
                      }}
                    >
                      <div
                        className={`p-1.5 rounded-sm border ${
                          isPlayer
                            ? 'border-neon-cyan bg-gb-0/90'
                            : 'border-gb-3/30 bg-gb-0/60'
                        }`}
                      >
                        {station.icon}
                      </div>
                      <span
                        className={`text-[11px] font-bold leading-none whitespace-nowrap ${
                          isPlayer ? 'text-neon-cyan' : 'text-gb-3'
                        }`}
                      >
                        {station.shortLabel}
                      </span>
                    </button>
                  ) : null}

                  {isPlayer && (
                    <motion.div
                      layoutId="player"
                      className="absolute inset-1 border-2 border-neon-cyan pointer-events-none z-30 shadow-[0_0_12px_rgba(0,243,255,0.45)] flex items-center justify-center"
                    >
                      {!station && <User className="w-6 h-6 text-neon-cyan" />}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Interaction Prompt (Clickable button!) */}
          <div className="min-h-11 flex items-center justify-center">
            <AnimatePresence>
              {currentStationEntry && (
                <motion.button
                  type="button"
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  onClick={() => setActiveStation(currentStationEntry[0] as BaseStation)}
                  className="min-h-11 px-5 py-2 bg-gb-3 text-gb-0 hover:bg-neon-cyan text-xs font-black uppercase tracking-wider gb-border-sm transition-colors"
                >
                  Open {currentStationEntry[1].label} [Space]
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden grid grid-cols-3 gap-2 max-w-[196px] mx-auto pb-2">
            <div />
            <button
              type="button"
              onClick={() => activeStation === 'NONE' && handleMove(0, -1)}
              disabled={activeStation !== 'NONE'}
              aria-label="Move Up"
              className={`min-h-12 min-w-12 bg-gb-1 border-2 border-gb-3 text-gb-3 p-2 gb-border-sm flex items-center justify-center active:bg-gb-3 active:text-gb-0 transition-colors ${
                activeStation !== 'NONE' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />
            <button
              type="button"
              onClick={() => activeStation === 'NONE' && handleMove(-1, 0)}
              disabled={activeStation !== 'NONE'}
              aria-label="Move Left"
              className={`min-h-12 min-w-12 bg-gb-1 border-2 border-gb-3 text-gb-3 p-2 gb-border-sm flex items-center justify-center active:bg-gb-3 active:text-gb-0 transition-colors ${
                activeStation !== 'NONE' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => activeStation === 'NONE' && handleMove(0, 1)}
              disabled={activeStation !== 'NONE'}
              aria-label="Move Down"
              className={`min-h-12 min-w-12 bg-gb-1 border-2 border-gb-3 text-gb-3 p-2 gb-border-sm flex items-center justify-center active:bg-gb-3 active:text-gb-0 transition-colors ${
                activeStation !== 'NONE' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => activeStation === 'NONE' && handleMove(1, 0)}
              disabled={activeStation !== 'NONE'}
              aria-label="Move Right"
              className={`min-h-12 min-w-12 bg-gb-1 border-2 border-gb-3 text-gb-3 p-2 gb-border-sm flex items-center justify-center active:bg-gb-3 active:text-gb-0 transition-colors ${
                activeStation !== 'NONE' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop Station Directory Sidebar */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col gap-3 p-5 bg-gb-1/90 border-l-2 border-gb-3 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-gb-3/50 pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-neon-cyan">
              Bunker Stations
            </h2>
            <span className="text-xs text-gb-2 tabular-nums">
              Max Floor {stats.maxExtractedFloor}
            </span>
          </div>

          <div className="space-y-2">
            {(Object.entries(STATIONS) as [Exclude<BaseStation, 'NONE'>, StationConfig][]).map(
              ([key, station]) => {
                const isSelected = playerPos.x === station.x && playerPos.y === station.y;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setPlayerPos({ x: station.x, y: station.y });
                      setActiveStation(key);
                    }}
                    className={`w-full min-h-12 p-3 border text-left transition-colors flex items-center gap-3 gb-border-sm ${
                      isSelected
                        ? 'bg-gb-0 border-neon-cyan'
                        : 'bg-gb-0/80 border-gb-3/60 hover:border-neon-cyan hover:bg-gb-0'
                    }`}
                  >
                    <div className="shrink-0">{station.icon}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gb-3">{station.label}</div>
                      <div className="text-xs text-gb-2 font-sans truncate">{station.summary}</div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </aside>
      </div>

      {/* Station Overlays */}
      <AnimatePresence>
        {activeStation !== 'NONE' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            className="absolute inset-0 z-50 bg-gb-0/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar bg-gb-1 border-2 border-gb-3 p-5 gb-border dither relative">
              <button
                type="button"
                onClick={() => setActiveStation('NONE')}
                aria-label="Close station panel"
                className="absolute top-3 right-3 min-h-10 min-w-10 flex items-center justify-center text-gb-3 hover:text-neon-magenta"
              >
                <X className="w-5 h-5" />
              </button>

              {activeStation === 'DIVE' && (
                <DiveStation
                  stats={stats}
                  selectedFloor={selectedFloor}
                  setSelectedFloor={setSelectedFloor}
                  onStartDive={onStartDive}
                  onHealScar={onHealScar}
                  onCalibrateScar={(scar) => setCalibratingScar(scar)}
                />
              )}

              {activeStation === 'UPGRADES' && <WorkbenchStation stats={stats} onUpgrade={onUpgrade} />}

              {activeStation === 'LORE' && <ArchivistStation unlockedLore={stats.unlockedLore} />}

              {activeStation === 'GARDEN' && <GardenStation knowledge={stats.knowledge} />}

              {activeStation === 'GUIDE' && <ManualStation />}

              {activeStation === 'TRAINING' && (
                <SimulatorStation
                  stats={stats}
                  onUnlockDemo={onUnlockDemo}
                  onRunSim={(variantId) => setActiveSimTier(variantId)}
                  onLaunchSignalSweep={(config) => setSignalSweepConfig(config)}
                />
              )}

              <div className="mt-5 text-xs text-gb-2 text-center">
                Press Esc to return to bunker
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeSimTier !== null && (
          <TrainingSim variantId={activeSimTier} onClose={() => setActiveSimTier(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {calibratingScar !== null && (
          <ScarCalibrationModal
            scar={calibratingScar}
            maxExtractedFloor={stats.maxExtractedFloor}
            conceptSchedule={stats.conceptSchedule}
            conceptStepCounter={stats.conceptStepCounter}
            onRecordConceptOutcome={onRecordConceptOutcome}
            onComplete={(clearedScar) => {
              onCalibrateScar(clearedScar);
              setCalibratingScar(null);
            }}
            onClose={() => setCalibratingScar(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {signalSweepConfig !== null && (
          <SignalSweep
            stats={stats}
            initialTimed={signalSweepConfig.timed}
            onCompleteRun={onRecordArchetypeStats}
            onClaimReconBuff={onClaimReconBuff}
            onClose={() => setSignalSweepConfig(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
