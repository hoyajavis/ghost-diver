import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NeuralChipId, PlayerStats, Position, ReconBuffType } from '../types';
import { SignalSweepNodeOutcome } from '../lib/signalSweepLogic';
import { ConceptOutcome } from '../lib/conceptSpacedRep';
import {
  CRADLE_GRID_SIZE,
  CRADLE_SYS_META,
  CradleAccent,
  CradleInspectTargetId,
  CradlePropId,
  getCradleFloorGrid,
  getCradlePropAt,
  inspectCradleProp,
  isCradleSysAt,
  talkToCradleSys,
} from '../lib/cradleProps';
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
  BarChart3,
  X,
  Bot,
  Zap,
  Server,
  Wind,
  Shield,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  stats: PlayerStats;
  isOverlayOpen?: boolean;
  onStartDive: (startFloor?: number) => void;
  onHealScar: (scar: string) => void;
  onCalibrateScar: (scar: string) => void;
  onUpgrade: (type: 'hp' | 'fp' | 'hints' | 'buy_hint') => void;
  onToggleEquipChip: (chipId: NeuralChipId) => void;
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

const GRID_SIZE = CRADLE_GRID_SIZE;

const PROP_ICONS: Record<CradlePropId, React.ReactNode> = {
  MAIN_POWER_CONDUIT: <Zap className="w-4 h-4 text-neon-cyan" />,
  ARCHIVE_SERVER_RACK: <Server className="w-4 h-4 text-neon-green" />,
  SIM_COOLING_VENTS: <Wind className="w-4 h-4 text-purple-300" />,
  SPARE_RIG_LOCKER: <Shield className="w-4 h-4 text-amber-400" />,
  SEALED_BLAST_DOOR: <Eye className="w-4 h-4 text-neon-magenta" />,
};

const ACCENT_STYLES: Record<CradleAccent, { border: string; text: string; pill: string }> = {
  cyan: {
    border: 'border-neon-cyan/70',
    text: 'text-neon-cyan',
    pill: 'border-neon-cyan/50 text-neon-cyan',
  },
  green: {
    border: 'border-neon-green/70',
    text: 'text-neon-green',
    pill: 'border-neon-green/50 text-neon-green',
  },
  amber: {
    border: 'border-amber-400/70',
    text: 'text-amber-400',
    pill: 'border-amber-400/50 text-amber-400',
  },
  purple: {
    border: 'border-purple-400/70',
    text: 'text-purple-300',
    pill: 'border-purple-400/50 text-purple-300',
  },
  magenta: {
    border: 'border-neon-magenta/70',
    text: 'text-neon-magenta',
    pill: 'border-neon-magenta/50 text-neon-magenta',
  },
};

const STATIONS: Record<Exclude<BaseStation, 'NONE'>, StationConfig> = {
  DIVE: {
    x: 2,
    y: 1,
    icon: <Activity className="w-5 h-5 text-neon-cyan" />,
    shortLabel: 'Dive',
    label: 'Neural Chair',
    summary: 'Launch a dive, equip Chips, or repair Scars',
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
    summary: 'Sector Mastery readout & decrypted logs',
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
  isOverlayOpen = false,
  onStartDive,
  onHealScar,
  onCalibrateScar,
  onUpgrade,
  onToggleEquipChip,
  onUnlockDemo,
  onRecordConceptOutcome,
  onRecordArchetypeStats,
  onClaimReconBuff,
  onLogout,
}) => {
  const [playerPos, setPlayerPos] = useState<Position>({ x: 2, y: 3 });
  const [activeStation, setActiveStation] = useState<BaseStation>('NONE');
  const [archivistTab, setArchivistTab] = useState<'MASTERY' | 'LOGS'>('LOGS');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [activeSimTier, setActiveSimTier] = useState<string | null>(null);
  const [calibratingScar, setCalibratingScar] = useState<string | null>(null);
  const [signalSweepConfig, setSignalSweepConfig] = useState<{ timed: boolean } | null>(null);
  const [selectedInspectId, setSelectedInspectId] = useState<CradleInspectTargetId>('CRADLE_SYS');
  const [inspectCounts, setInspectCounts] = useState<Partial<Record<CradleInspectTargetId, number>>>(
    {}
  );

  const floorGrid = useMemo(() => getCradleFloorGrid(stats), [stats]);

  const activeReadout = useMemo(() => {
    const count = inspectCounts[selectedInspectId] ?? 0;
    if (selectedInspectId === 'CRADLE_SYS') {
      return talkToCradleSys(stats, count);
    }
    return inspectCradleProp(selectedInspectId, stats, count);
  }, [selectedInspectId, inspectCounts, stats]);

  const focusInspectTarget = useCallback(
    (targetId: CradleInspectTargetId, advanceIfSame: boolean) => {
      if (advanceIfSame && selectedInspectId === targetId) {
        setInspectCounts((prev) => ({
          ...prev,
          [targetId]: (prev[targetId] ?? 0) + 1,
        }));
      } else {
        setSelectedInspectId(targetId);
      }
    },
    [selectedInspectId]
  );

  const cycleActiveReadout = useCallback(() => {
    setInspectCounts((prev) => ({
      ...prev,
      [selectedInspectId]: (prev[selectedInspectId] ?? 0) + 1,
    }));
  }, [selectedInspectId]);

  const handleMove = useCallback((dx: number, dy: number) => {
    setPlayerPos((prev) => ({
      x: Math.max(0, Math.min(GRID_SIZE - 1, prev.x + dx)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, prev.y + dy)),
    }));
  }, []);

  useEffect(() => {
    if (isCradleSysAt(playerPos.x, playerPos.y)) {
      setSelectedInspectId('CRADLE_SYS');
      return;
    }
    const prop = getCradlePropAt(playerPos.x, playerPos.y);
    if (prop) {
      setSelectedInspectId(prop.id);
    }
  }, [playerPos.x, playerPos.y]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isOverlayOpen || activeSimTier !== null || calibratingScar !== null || signalSweepConfig !== null) return;

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
            break;
          }
          if (isCradleSysAt(playerPos.x, playerPos.y)) {
            e.preventDefault();
            focusInspectTarget('CRADLE_SYS', true);
            break;
          }
          const propMatch = getCradlePropAt(playerPos.x, playerPos.y);
          if (propMatch) {
            e.preventDefault();
            focusInspectTarget(propMatch.id, true);
          }
          break;
        }
      }

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        handleMove(dx, dy);
      }
    },
    [
      isOverlayOpen,
      activeSimTier,
      calibratingScar,
      signalSweepConfig,
      activeStation,
      playerPos,
      handleMove,
      focusInspectTarget,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentStationEntry = Object.entries(STATIONS).find(
    ([, pos]) => playerPos.x === pos.x && playerPos.y === pos.y
  );
  const currentProp = getCradlePropAt(playerPos.x, playerPos.y);
  const isStandingOnCradleSys = isCradleSysAt(playerPos.x, playerPos.y);
  const readoutAccent = ACCENT_STYLES[activeReadout.accent];

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
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 gap-2.5 sm:gap-3">
          <div className="text-[11px] sm:text-xs text-gb-2 text-center font-sans">
            Move with WASD or Arrow keys, or tap any station, fixture, or CRADLE_SYS.
          </div>

          <div
            className="grid bg-gb-1/85 border-2 border-gb-3 gb-border shadow-[0_0_40px_rgba(0,0,0,0.45)] aspect-square flex-shrink-0 overflow-hidden relative"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              width: 'min(86vw, 410px)',
              height: 'min(86vw, 410px)',
            }}
          >
            {floorGrid.map((floorZone, i) => {
              const { x, y } = floorZone;
              const isPlayer = playerPos.x === x && playerPos.y === y;

              const stationEntry = Object.entries(STATIONS).find(([, pos]) => pos.x === x && pos.y === y);
              const station = stationEntry ? stationEntry[1] : null;
              const stationKey = stationEntry ? (stationEntry[0] as BaseStation) : null;
              const prop = !station ? getCradlePropAt(x, y) : null;
              const isCradleSysTile = !station && !prop && isCradleSysAt(x, y);
              const hasTileEntity = Boolean(station || prop || isCradleSysTile);

              const conduitColor = floorZone.conduitPowered
                ? 'bg-neon-cyan/45 shadow-[0_0_6px_rgba(0,243,255,0.35)]'
                : 'bg-neon-cyan/20';

              const mossBg =
                floorZone.mossStage === 'LUSH'
                  ? 'bg-neon-green/20'
                  : floorZone.mossStage === 'SPROUT'
                    ? 'bg-neon-green/10'
                    : '';

              return (
                <div
                  key={i}
                  data-floor-zone={floorZone.zoneLabel}
                  data-moss-stage={floorZone.mossStage}
                  className={`relative border-r border-b border-gb-3/20 flex items-center justify-center transition-colors ${mossBg} ${
                    isPlayer ? 'bg-neon-cyan/10' : ''
                  } ${x === GRID_SIZE - 1 ? 'border-r-0' : ''} ${y === GRID_SIZE - 1 ? 'border-b-0' : ''}`}
                  onClick={() => setPlayerPos({ x, y })}
                >
                  {/* Architectural Floor Layer: Power Conduit Traces */}
                  {floorZone.hasConduit && (
                    <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
                      {floorZone.conduit.north && (
                        <span
                          className={`absolute left-1/2 top-0 h-1/2 w-[2px] -translate-x-1/2 ${conduitColor}`}
                        />
                      )}
                      {floorZone.conduit.south && (
                        <span
                          className={`absolute left-1/2 bottom-0 h-1/2 w-[2px] -translate-x-1/2 ${conduitColor}`}
                        />
                      )}
                      {floorZone.conduit.west && (
                        <span
                          className={`absolute top-1/2 left-0 w-1/2 h-[2px] -translate-y-1/2 ${conduitColor}`}
                        />
                      )}
                      {floorZone.conduit.east && (
                        <span
                          className={`absolute top-1/2 right-0 w-1/2 h-[2px] -translate-y-1/2 ${conduitColor}`}
                        />
                      )}
                      <span
                        className={`absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${conduitColor}`}
                      />
                    </div>
                  )}

                  {/* Architectural Floor Layer: Green-Print Moss Accents */}
                  {floorZone.mossStage !== 'NONE' && (
                    <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
                      <span className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-neon-green/45" />
                      {floorZone.mossStage === 'LUSH' && (
                        <>
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-neon-green/55" />
                          <span className="absolute bottom-1 right-2 w-1 h-1 rounded-full bg-neon-green/60" />
                        </>
                      )}
                    </div>
                  )}

                  {/* Primary Station Tile */}
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

                  {/* CRADLE_SYS Caretaker Tile at (2,2) */}
                  {isCradleSysTile ? (
                    <button
                      type="button"
                      aria-label={`Talk to ${CRADLE_SYS_META.name}`}
                      className="flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors z-20 w-full h-full p-1 hover:bg-gb-0/45"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayerPos({ x, y });
                        focusInspectTarget('CRADLE_SYS', true);
                      }}
                    >
                      <div
                        className={`relative p-1.5 rounded-sm border ${
                          selectedInspectId === 'CRADLE_SYS'
                            ? 'border-neon-cyan bg-gb-0/90 shadow-[0_0_10px_rgba(0,243,255,0.35)]'
                            : 'border-neon-cyan/50 bg-gb-0/75'
                        }`}
                      >
                        <Bot className="w-5 h-5 text-neon-cyan" />
                        <span
                          aria-hidden="true"
                          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${
                            stats.neuralScars.length > 0 ? 'bg-amber-400' : 'bg-neon-green'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-bold leading-none whitespace-nowrap text-neon-cyan">
                        {CRADLE_SYS_META.shortLabel}
                      </span>
                    </button>
                  ) : null}

                  {/* Atmospheric Reactive Bunker Prop Tile */}
                  {prop ? (
                    <button
                      type="button"
                      aria-label={`Inspect ${prop.name}`}
                      className="flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors z-20 w-full h-full p-1 hover:bg-gb-0/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayerPos({ x, y });
                        focusInspectTarget(prop.id, true);
                      }}
                    >
                      <div
                        className={`p-1 rounded-sm border ${
                          selectedInspectId === prop.id
                            ? `${ACCENT_STYLES[prop.accent].border} bg-gb-0/90`
                            : 'border-gb-3/25 bg-gb-0/55'
                        }`}
                      >
                        {PROP_ICONS[prop.id]}
                      </div>
                      <span
                        className={`text-[10px] font-semibold leading-none whitespace-nowrap ${
                          selectedInspectId === prop.id ? ACCENT_STYLES[prop.accent].text : 'text-gb-2'
                        }`}
                      >
                        {prop.shortLabel}
                      </span>
                    </button>
                  ) : null}

                  {isPlayer && (
                    <motion.div
                      layoutId="player"
                      className="absolute inset-1 border-2 border-neon-cyan pointer-events-none z-30 shadow-[0_0_12px_rgba(0,243,255,0.45)] flex items-center justify-center"
                    >
                      {!hasTileEntity && <User className="w-6 h-6 text-neon-cyan" />}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Compact In-Panel Inspector / CRADLE_SYS Readout (No Modal Spam) */}
          <section
            aria-label="Cradle Inspector Readout"
            aria-live="polite"
            className={`w-full max-w-[440px] bg-gb-0/95 border ${readoutAccent.border} px-3 py-2.5 gb-border-sm space-y-1.5`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-black uppercase tracking-wider truncate ${readoutAccent.text}`}>
                  {activeReadout.speaker}
                </span>
                <span
                  className={`px-1.5 py-0.5 border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 ${readoutAccent.pill}`}
                >
                  {activeReadout.tag}
                </span>
              </div>
              <button
                type="button"
                onClick={cycleActiveReadout}
                aria-label={`Next ${activeReadout.speaker} note`}
                className="px-1.5 py-0.5 border border-gb-3/50 text-gb-2 hover:text-neon-cyan hover:border-neon-cyan text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5 shrink-0 transition-colors tabular-nums"
              >
                <span>
                  {activeReadout.lineIndex + 1}/{activeReadout.totalLines}
                </span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gb-3 font-sans leading-snug">
              {activeReadout.text}
            </p>
          </section>

          {/* Interaction Prompt (Clickable button!) */}
          <div className="min-h-10 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {currentStationEntry ? (
                <motion.button
                  key={`station-${currentStationEntry[0]}`}
                  type="button"
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  onClick={() => setActiveStation(currentStationEntry[0] as BaseStation)}
                  className="min-h-10 px-5 py-2 bg-gb-3 text-gb-0 hover:bg-neon-cyan text-xs font-black uppercase tracking-wider gb-border-sm transition-colors"
                >
                  Open {currentStationEntry[1].label} [Space]
                </motion.button>
              ) : isStandingOnCradleSys ? (
                <motion.button
                  key="cradle-sys-action"
                  type="button"
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  onClick={() => focusInspectTarget('CRADLE_SYS', true)}
                  className="min-h-10 px-5 py-2 bg-gb-0 text-neon-cyan border border-neon-cyan hover:bg-neon-cyan hover:text-gb-0 text-xs font-black uppercase tracking-wider gb-border-sm transition-colors"
                >
                  Talk to {CRADLE_SYS_META.name} [Space]
                </motion.button>
              ) : currentProp ? (
                <motion.button
                  key={`prop-${currentProp.id}`}
                  type="button"
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  onClick={() => focusInspectTarget(currentProp.id, true)}
                  className="min-h-10 px-5 py-2 bg-gb-0 text-gb-3 border border-gb-3 hover:border-neon-cyan hover:text-neon-cyan text-xs font-black uppercase tracking-wider gb-border-sm transition-colors"
                >
                  Inspect {currentProp.name} [Space]
                </motion.button>
              ) : null}
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
                      if (key === 'LORE') {
                        setArchivistTab('LOGS');
                      }
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

          {/* Sector Mastery Mini-Card */}
          {(() => {
            const masteryEntries = Object.values(stats.sectorMastery);
            const totalProcedural = masteryEntries.reduce(
              (sum, e) => sum + (e?.proceduralCorrect ?? 0),
              0
            );
            const totalConceptual = masteryEntries.reduce(
              (sum, e) => sum + (e?.conceptualCorrect ?? 0),
              0
            );
            return (
              <div className="mt-1 bg-gb-0 border border-gb-3/70 p-3 gb-border-sm space-y-2 tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                    Sector Mastery
                  </span>
                  <span className="text-[11px] font-mono text-gb-2">
                    {totalProcedural + totalConceptual} total
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neon-cyan">Proc: {totalProcedural}</span>
                  <span className="text-purple-300">Conc: {totalConceptual}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setArchivistTab('MASTERY');
                    setPlayerPos({ x: STATIONS.LORE.x, y: STATIONS.LORE.y });
                    setActiveStation('LORE');
                  }}
                  className="w-full min-h-9 py-1.5 px-2.5 border border-neon-cyan/70 text-neon-cyan hover:bg-neon-cyan hover:text-gb-0 text-[11px] font-black uppercase tracking-wider transition-colors"
                >
                  Open Mastery Readout
                </button>
              </div>
            );
          })()}
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
                  onToggleEquipChip={onToggleEquipChip}
                />
              )}

              {activeStation === 'UPGRADES' && <WorkbenchStation stats={stats} onUpgrade={onUpgrade} />}

              {activeStation === 'LORE' && (
                <ArchivistStation
                  unlockedLore={stats.unlockedLore}
                  sectorMastery={stats.sectorMastery}
                  maxExtractedFloor={stats.maxExtractedFloor}
                  initialTab={archivistTab}
                />
              )}

              {activeStation === 'GARDEN' && (
                <GardenStation
                  lifetimeShardsExtracted={stats.lifetimeShardsExtracted}
                  sectorMastery={stats.sectorMastery}
                />
              )}

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
