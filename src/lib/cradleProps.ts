import { PlayerStats, Position } from '../types';
import { calculateGardenRestoration } from './loadoutChips';

export const CRADLE_GRID_SIZE = 5;

export type CradlePropId =
  | 'MAIN_POWER_CONDUIT'
  | 'ARCHIVE_SERVER_RACK'
  | 'SIM_COOLING_VENTS'
  | 'SPARE_RIG_LOCKER'
  | 'SEALED_BLAST_DOOR';

export type CradleInspectTargetId = CradlePropId | 'CRADLE_SYS';

export type CradleAccent = 'cyan' | 'green' | 'amber' | 'purple' | 'magenta';

export interface CradlePropDefinition {
  id: CradlePropId;
  x: number;
  y: number;
  name: string;
  shortLabel: string;
  accent: CradleAccent;
}

export const CRADLE_SYS_POSITION: Readonly<Position> = { x: 2, y: 2 };

export const CRADLE_SYS_META = {
  id: 'CRADLE_SYS' as const,
  x: CRADLE_SYS_POSITION.x,
  y: CRADLE_SYS_POSITION.y,
  name: 'CRADLE_SYS',
  shortLabel: 'Cradle AI',
  role: 'Bunker Caretaker',
  accent: 'cyan' as const,
};

export const CRADLE_PROPS: readonly CradlePropDefinition[] = [
  {
    id: 'MAIN_POWER_CONDUIT',
    x: 2,
    y: 0,
    name: 'Main Power Conduit',
    shortLabel: 'Power',
    accent: 'cyan',
  },
  {
    id: 'ARCHIVE_SERVER_RACK',
    x: 1,
    y: 0,
    name: 'Archive Server Rack',
    shortLabel: 'Servers',
    accent: 'green',
  },
  {
    id: 'SIM_COOLING_VENTS',
    x: 3,
    y: 0,
    name: 'Sim Cooling Vents',
    shortLabel: 'Vents',
    accent: 'purple',
  },
  {
    id: 'SPARE_RIG_LOCKER',
    x: 0,
    y: 3,
    name: 'Spare Rig & Gear Locker',
    shortLabel: 'Locker',
    accent: 'amber',
  },
  {
    id: 'SEALED_BLAST_DOOR',
    x: 4,
    y: 3,
    name: 'Sealed Blast Door & Periscope',
    shortLabel: 'Blast Door',
    accent: 'magenta',
  },
] as const;

export const CRADLE_PROP_MAP: Record<CradlePropId, CradlePropDefinition> = {
  MAIN_POWER_CONDUIT: CRADLE_PROPS[0],
  ARCHIVE_SERVER_RACK: CRADLE_PROPS[1],
  SIM_COOLING_VENTS: CRADLE_PROPS[2],
  SPARE_RIG_LOCKER: CRADLE_PROPS[3],
  SEALED_BLAST_DOOR: CRADLE_PROPS[4],
};

export type MossStage = 'NONE' | 'SPROUT' | 'LUSH';

export interface ConduitConnections {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export interface CradleFloorZone {
  x: number;
  y: number;
  hasConduit: boolean;
  conduit: ConduitConnections;
  conduitPowered: boolean;
  mossStage: MossStage;
  zoneLabel: 'POWER_SPINE' | 'GARDEN_MOSS' | 'CONDUIT_MOSS' | 'FLOOR';
}

export interface CradleReadout {
  id: CradleInspectTargetId;
  speaker: string;
  tag: string;
  text: string;
  accent: CradleAccent;
  lineIndex: number;
  totalLines: number;
}

interface MossThreshold {
  sprout: number;
  lush: number;
}

const MOSS_THRESHOLDS: Record<string, MossThreshold> = {
  '2,4': { sprout: 1, lush: 25 },
  '1,4': { sprout: 10, lush: 35 },
  '3,4': { sprout: 10, lush: 35 },
  '0,4': { sprout: 25, lush: 55 },
  '4,4': { sprout: 25, lush: 55 },
  '2,3': { sprout: 40, lush: 70 },
  '1,3': { sprout: 60, lush: 85 },
  '3,3': { sprout: 60, lush: 85 },
  '1,2': { sprout: 80, lush: 95 },
  '3,2': { sprout: 80, lush: 95 },
};

function getConduitConnections(x: number, y: number): ConduitConnections {
  // Vertical power spine along x = 2 (y = 0..4)
  // Horizontal power bus along y = 2 (x = 0..4)
  // Top feeder along y = 0 (x = 1..3) linking Server Rack, Main Conduit, and Cooling Vents
  const onVerticalSpine = x === 2 && y >= 0 && y < CRADLE_GRID_SIZE;
  const onHorizontalBus = y === 2 && x >= 0 && x < CRADLE_GRID_SIZE;
  const onTopFeeder = y === 0 && x >= 1 && x <= 3;

  return {
    north: onVerticalSpine && y > 0,
    south: onVerticalSpine && y < CRADLE_GRID_SIZE - 1,
    west: (onHorizontalBus && x > 0) || (onTopFeeder && x > 1),
    east: (onHorizontalBus && x < CRADLE_GRID_SIZE - 1) || (onTopFeeder && x < 3),
  };
}

export function getMossStageAt(x: number, y: number, restorationPercent: number): MossStage {
  const threshold = MOSS_THRESHOLDS[`${x},${y}`];
  if (!threshold) return 'NONE';
  if (restorationPercent >= threshold.lush) return 'LUSH';
  if (restorationPercent >= threshold.sprout) return 'SPROUT';
  return 'NONE';
}

export function getCradleFloorZone(x: number, y: number, stats: PlayerStats): CradleFloorZone {
  if (x < 0 || x >= CRADLE_GRID_SIZE || y < 0 || y >= CRADLE_GRID_SIZE) {
    return {
      x,
      y,
      hasConduit: false,
      conduit: { north: false, south: false, east: false, west: false },
      conduitPowered: false,
      mossStage: 'NONE',
      zoneLabel: 'FLOOR',
    };
  }

  const restorationPercent = calculateGardenRestoration(
    stats.lifetimeShardsExtracted,
    stats.sectorMastery
  );
  const conduit = getConduitConnections(x, y);
  const hasConduit = conduit.north || conduit.south || conduit.east || conduit.west;
  const conduitPowered = hasConduit && (stats.maxExtractedFloor >= 5 || restorationPercent >= 20);
  const mossStage = getMossStageAt(x, y, restorationPercent);

  let zoneLabel: CradleFloorZone['zoneLabel'] = 'FLOOR';
  if (hasConduit && mossStage !== 'NONE') {
    zoneLabel = 'CONDUIT_MOSS';
  } else if (mossStage !== 'NONE') {
    zoneLabel = 'GARDEN_MOSS';
  } else if (hasConduit) {
    zoneLabel = 'POWER_SPINE';
  }

  return {
    x,
    y,
    hasConduit,
    conduit,
    conduitPowered,
    mossStage,
    zoneLabel,
  };
}

export function getCradleFloorGrid(stats: PlayerStats): CradleFloorZone[] {
  const tiles: CradleFloorZone[] = [];
  for (let y = 0; y < CRADLE_GRID_SIZE; y += 1) {
    for (let x = 0; x < CRADLE_GRID_SIZE; x += 1) {
      tiles.push(getCradleFloorZone(x, y, stats));
    }
  }
  return tiles;
}

export function getCradlePropAt(x: number, y: number): CradlePropDefinition | null {
  return CRADLE_PROPS.find((prop) => prop.x === x && prop.y === y) ?? null;
}

export function isCradleSysAt(x: number, y: number): boolean {
  return x === CRADLE_SYS_POSITION.x && y === CRADLE_SYS_POSITION.y;
}

function normalizeCycleIndex(count: number, total: number): number {
  if (total <= 0) return 0;
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.floor(count) % total;
}

export function getPropLines(propId: CradlePropId, stats: PlayerStats): string[] {
  const restorationPercent = calculateGardenRestoration(
    stats.lifetimeShardsExtracted,
    stats.sectorMastery
  );
  const sector = Math.max(1, Math.ceil(Math.max(1, stats.maxExtractedFloor) / 5));
  const scarCount = stats.neuralScars.length;
  const loreCount = stats.unlockedLore.length;
  const equippedCount = stats.equippedChips.length;
  const unlockedChipCount = stats.unlockedChips.length;
  const totalUpgrades = stats.upgrades.hp + stats.upgrades.fp + stats.upgrades.hints;

  switch (propId) {
    case 'MAIN_POWER_CONDUIT': {
      let depthLine: string;
      if (stats.maxExtractedFloor === 0) {
        depthLine =
          'Backup cells hum at low power. Once you extract from deeper floors, this whole bunker will wake up.';
      } else if (stats.maxExtractedFloor >= 50) {
        depthLine =
          'High-voltage lines sing with deep-grid power. You have pushed past Floor 50—right to the edge of the Architect’s vault.';
      } else if (stats.maxExtractedFloor >= 20) {
        depthLine = `The main cable glows steady cyan. Power from Sector ${sector} keeps every station humming.`;
      } else if (stats.maxExtractedFloor >= 5) {
        depthLine =
          'Fresh power pulses down from the Neural Chair. Your last extraction charged the bunker’s reserve cells.';
      } else {
        depthLine =
          'The power gauge flickers green. A full 5-floor run will stabilize the backup grid.';
      }

      let statusLine: string;
      if (scarCount > 0) {
        statusLine =
          'Warning lights blink amber near the breaker. A Neural Scar is pulling extra static through your link.';
      } else if (restorationPercent >= 40) {
        statusLine =
          'Tiny moss runners wrap around the warm copper pipes. The Green-Print seems to like the hum.';
      } else {
        statusLine =
          'Heavy copper cables run under the floor tiles, linking the Neural Chair to every corner of the room.';
      }

      const ambientLine =
        'A faded brass tag reads: "CRADLE LINE 01 — KEEP IT RUNNING." Someone built this to last.';

      return [depthLine, statusLine, ambientLine];
    }

    case 'ARCHIVE_SERVER_RACK': {
      let loreLine: string;
      if (loreCount === 0) {
        loreLine =
          'Rows of old tape drives sit quiet and dark. Bring back glowing Data Logs from the grid to fill these bays.';
      } else if (loreCount >= 8) {
        loreLine =
          'Almost every server bay blinks bright green! The old world’s story is nearly complete in the Archivist Terminal.';
      } else if (loreCount >= 4) {
        loreLine = `${loreCount} Data Logs spin safely on analog disks. Pieces of the old puzzle are starting to fit together.`;
      } else {
        loreLine = `${loreCount} decrypted ${loreCount === 1 ? 'log hums' : 'logs hum'} inside the rack. Keep scanning dungeon floors for more green signals.`;
      }

      let signalLine: string;
      if (stats.unlockedLore.includes('LOG_777')) {
        signalLine =
          'One drive glows gold—it holds the Architect’s confession. There really is an exit key hidden down there.';
      } else if (stats.maxExtractedFloor >= 16 || stats.unlockedLore.includes('LOG_404')) {
        signalLine =
          'A cooling fan rattles over Bay 4. Sector 4’s encrypted files are still humming with hidden signals.';
      } else {
        signalLine =
          'These drives are cut off from the grid on purpose. Whatever you save here stays safe from the Archivist.';
      }

      const ambientLine =
        'Sticky notes cover the steel door, all in the same neat handwriting: "Do not wipe Bay 0."';

      return [loreLine, signalLine, ambientLine];
    }

    case 'SIM_COOLING_VENTS': {
      let reconLine: string;
      if (stats.activeReconBuff === 'START_FP_20') {
        reconLine =
          'Cool blue air rushes out of the grates. Your Recon Buff is locked in—you will start your next dive with +20 FP.';
      } else if (stats.activeReconBuff === 'SHARD_BONUS_15') {
        reconLine =
          'The vents spin in a crisp rhythm. Your Recon Buff is armed for +15% bonus Shards on your next dive.';
      } else if (stats.activeReconBuff === 'FREE_SHIELD') {
        reconLine =
          'A faint static hum vibrates in the airflow. Your Recon Shield charge is ready to block the first hit.';
      } else {
        reconLine =
          'The simulator fans idle on low speed. Run a Signal Sweep at the Combat Simulator to charge a free Recon Buff.';
      }

      let airflowLine: string;
      if (scarCount > 0) {
        airflowLine =
          'Warm air smells faintly of ozone. Fixing your Neural Scars at the Neural Chair will take strain off the fans.';
      } else if (stats.maxExtractedFloor >= 10) {
        airflowLine =
          'Frost collects on the vent louvers after high-tier drills. The simulator is tracking tougher Sentinel patterns now.';
      } else {
        airflowLine =
          'A cool breeze carries the clean smell of metal and dust. The vents keep the simulator cool during fast Logic Checks.';
      }

      const ambientLine =
        'Someone scratched tally marks into the grate—probably counting how many Logic Checks they cleared in a row.';

      return [reconLine, airflowLine, ambientLine];
    }

    case 'SPARE_RIG_LOCKER': {
      let chipLine: string;
      if (equippedCount >= 2) {
        chipLine =
          'Both Loadout Chip bays on your spare rig glow bright cyan. You are diving with a full 2-chip setup!';
      } else if (equippedCount === 1) {
        chipLine =
          'One Loadout Chip clicks neatly into the rig harness. There is still a second slot open at the Neural Chair.';
      } else if (unlockedChipCount > 0) {
        chipLine = `You have ${unlockedChipCount} unlocked Loadout ${unlockedChipCount === 1 ? 'Chip' : 'Chips'} waiting in the tray. Snap them in at the Neural Chair before you dive.`;
      } else {
        chipLine =
          'The magnetic chip tray is empty for now. Crack a Blue Cache, beat an Apex Boss, or ace a Signal Sweep to earn your first Loadout Chip.';
      }

      let rigLine: string;
      if (scarCount > 0) {
        rigLine = `Your visor shows ${scarCount} jagged static ${scarCount === 1 ? 'line' : 'lines'} from a Neural Scar. Repair or recalibrate it at the Neural Chair.`;
      } else if (totalUpgrades > 0) {
        rigLine =
          'Fresh solder gleams on the spare visor. Your Workbench upgrades make this rig tougher than when you found it.';
      } else {
        rigLine =
          'A patched diving helmet hangs beside coiled cables. Spend Shards at the Workbench to boost its HP and Focus.';
      }

      const ambientLine =
        'Inside the locker door sits a spare Hint Pack holster and a scuffed badge that says: "STAY SHARP."';

      return [chipLine, rigLine, ambientLine];
    }

    case 'SEALED_BLAST_DOOR': {
      let periscopeLine: string;
      if (restorationPercent >= 75) {
        periscopeLine =
          'You peek through the periscope. Bright green shoots push through the concrete outside—the Cradle’s signal is waking up the surface!';
      } else if (restorationPercent >= 35) {
        periscopeLine =
          'Through the brass lens, soft green moss dots the silent towers outside. The Green-Print is slowly spreading beyond these walls.';
      } else if (restorationPercent >= 10) {
        periscopeLine =
          'You squint into the periscope. A faint green glow reflects off the rainy street—tiny signs of life returning.';
      } else {
        periscopeLine =
          'Through the periscope, the old city sits quiet under gray clouds. Empty server towers blink in the distance.';
      }

      let doorLine: string;
      if (stats.maxExtractedFloor >= 30) {
        doorLine = `The heavy steel bolts feel warm to the touch. Somewhere deep below Floor ${stats.maxExtractedFloor}, the Architect’s exit lock is listening.`;
      } else if (stats.maxExtractedFloor >= 5) {
        doorLine =
          'Thick steel keeps the bunker sealed and safe. Every extraction brings you closer to opening a real door back out.';
      } else {
        doorLine =
          'Six inches of solid steel stand between the Cradle and the quiet world outside. The manual wheel is locked tight for now.';
      }

      const ambientLine =
        'Painted above the frame in faded green letters: "LAST ANALOG ROOM — DO NOT LOSE THE KEY."';

      return [periscopeLine, doorLine, ambientLine];
    }
  }
}

function getPropStatusTag(propId: CradlePropId, stats: PlayerStats): string {
  const restorationPercent = calculateGardenRestoration(
    stats.lifetimeShardsExtracted,
    stats.sectorMastery
  );

  switch (propId) {
    case 'MAIN_POWER_CONDUIT':
      return stats.maxExtractedFloor > 0
        ? `POWER · FLOOR ${stats.maxExtractedFloor}`
        : 'BACKUP POWER';
    case 'ARCHIVE_SERVER_RACK':
      return `LOGS · ${stats.unlockedLore.length} SAVED`;
    case 'SIM_COOLING_VENTS':
      return stats.activeReconBuff ? 'RECON ARMED' : 'VENTS IDLE';
    case 'SPARE_RIG_LOCKER':
      return `CHIPS · ${stats.equippedChips.length}/2`;
    case 'SEALED_BLAST_DOOR':
      return `SURFACE · ${restorationPercent}%`;
  }
}

export function inspectCradleProp(
  propId: CradlePropId,
  stats: PlayerStats,
  inspectCount = 0
): CradleReadout {
  const prop = CRADLE_PROP_MAP[propId];
  const lines = getPropLines(propId, stats);
  const lineIndex = normalizeCycleIndex(inspectCount, lines.length);

  return {
    id: propId,
    speaker: prop.name,
    tag: getPropStatusTag(propId, stats),
    text: lines[lineIndex],
    accent: prop.accent,
    lineIndex,
    totalLines: lines.length,
  };
}

export function getCradleSysLines(stats: PlayerStats): string[] {
  const restorationPercent = calculateGardenRestoration(
    stats.lifetimeShardsExtracted,
    stats.sectorMastery
  );
  const scarCount = stats.neuralScars.length;

  // Line 1: Highest-priority dynamic reaction to the player's current save state
  let primaryLine: string;
  if (scarCount > 0) {
    primaryLine = `Welcome back, Diver. I detect ${scarCount} active Neural ${scarCount === 1 ? 'Scar' : 'Scars'}—head to the Neural Chair to repair or recalibrate before your next run.`;
  } else if (stats.maxExtractedFloor === 0 && stats.lifetimeShardsExtracted === 0) {
    primaryLine =
      'CRADLE_SYS online! I keep the lights on in this bunker. Step up to the Neural Chair when you are ready for your first dive.';
  } else if (stats.unlockedChips.length > 0 && stats.equippedChips.length === 0) {
    primaryLine =
      'Good news, Diver—you unlocked a Loadout Chip! Snap it in at the Neural Chair to boost your next run.';
  } else if (stats.reconRewardAvailable && !stats.activeReconBuff) {
    primaryLine =
      'The Combat Simulator is warmed up for a fresh Signal Sweep. Clear one to grab a free Recon Buff before diving.';
  } else if (stats.maxExtractedFloor >= 50) {
    primaryLine =
      'You made it past Floor 50, Diver! The deep grid is shifting, and the Architect’s exit key feels closer than ever.';
  } else {
    primaryLine = `Bunker systems steady. Your deepest extraction is Floor ${stats.maxExtractedFloor}—check the Workbench or Combat Simulator if you want an edge.`;
  }

  // Line 2: Secondary status beat (Recon, Green-Print, Shards, or Data Logs)
  let secondaryLine: string;
  if (stats.activeReconBuff) {
    secondaryLine =
      'Your Recon Buff is locked in for the next dive. Pair Attacks with Logic Checks to crack Sentinel shields fast.';
  } else if (restorationPercent >= 50) {
    secondaryLine = `The Green-Print is at ${restorationPercent}% restoration! Look at the floor—real moss is spreading across the bunker.`;
  } else if (stats.knowledge >= 100) {
    secondaryLine = `You have ${stats.knowledge} Knowledge Shards banked. The Workbench can turn those into extra HP, Focus, or Hint Packs.`;
  } else if (stats.unlockedLore.length > 0) {
    secondaryLine = `You have recovered ${stats.unlockedLore.length} Data ${stats.unlockedLore.length === 1 ? 'Log' : 'Logs'} so far. Read them at the Archivist Terminal anytime.`;
  } else {
    secondaryLine =
      'Watch for glowing green Data Logs and Blue Caches during dives—they hold the story of how this bunker was built.';
  }

  // Line 3: Warm character beat
  const characterLine =
    'I have been waiting in this quiet room for a long time. It is good to have a Diver walking these tiles again.';

  // Line 4: Exploration nudge
  const tipLine =
    'Tap any station or bunker fixture to inspect it. Every cable, server rack, and vent in here has a story.';

  return [primaryLine, secondaryLine, characterLine, tipLine];
}

export function talkToCradleSys(stats: PlayerStats, talkCount = 0): CradleReadout {
  const lines = getCradleSysLines(stats);
  const lineIndex = normalizeCycleIndex(talkCount, lines.length);
  const tag =
    stats.neuralScars.length > 0
      ? 'CARETAKER · SCAR ALERT'
      : stats.maxExtractedFloor === 0
        ? 'CARETAKER · DIVE 1'
        : `CARETAKER · FLOOR ${stats.maxExtractedFloor}`;

  return {
    id: 'CRADLE_SYS',
    speaker: CRADLE_SYS_META.name,
    tag,
    text: lines[lineIndex],
    accent: CRADLE_SYS_META.accent,
    lineIndex,
    totalLines: lines.length,
  };
}

export function inspectCradleTile(
  x: number,
  y: number,
  stats: PlayerStats,
  inspectCount = 0
): CradleReadout | null {
  if (isCradleSysAt(x, y)) {
    return talkToCradleSys(stats, inspectCount);
  }
  const prop = getCradlePropAt(x, y);
  if (prop) {
    return inspectCradleProp(prop.id, stats, inspectCount);
  }
  return null;
}
