import { PlayerStats } from '../types';
import { calculateGardenRestoration } from './loadoutChips';
import { CradleAccent } from './cradleProps';

export type CradleStationId = 'DIVE' | 'UPGRADES' | 'LORE' | 'GARDEN' | 'GUIDE' | 'TRAINING';

export type CrewResidentId =
  | 'CRADLE_SYS'
  | 'DR_ARIS_THORNE'
  | 'DIVER_77'
  | 'COMBAT_ANALYST_V'
  | 'BOTANIST_AI_CORE';

export interface StationUnlockStatus {
  id: CradleStationId;
  unlocked: boolean;
  label: string;
  offlineTag: string;
  offlineHint: string;
  accent: CradleAccent;
}

export interface CrewResidentStatus {
  id: CrewResidentId;
  name: string;
  shortName: string;
  role: string;
  stationId: CradleStationId | null;
  arrived: boolean;
  arrivalHint: string;
  dialogue: string;
  accent: CradleAccent;
}

export function isStationUnlocked(stationId: CradleStationId, stats: PlayerStats): boolean {
  const restorationPercent = calculateGardenRestoration(
    stats.lifetimeShardsExtracted,
    stats.sectorMastery
  );
  const totalUpgrades = stats.upgrades.hp + stats.upgrades.fp + stats.upgrades.hints;

  switch (stationId) {
    case 'DIVE':
    case 'GUIDE':
      return true;
    case 'UPGRADES':
      return (
        stats.knowledge > 0 ||
        stats.lifetimeShardsExtracted > 0 ||
        stats.neuralScars.length > 0 ||
        stats.maxExtractedFloor > 0 ||
        totalUpgrades > 0
      );
    case 'LORE':
      return (
        stats.unlockedLore.length > 0 ||
        stats.maxExtractedFloor >= 5 ||
        Object.keys(stats.sectorMastery).length > 0
      );
    case 'TRAINING':
      return (
        stats.maxExtractedFloor >= 5 ||
        stats.reconRewardAvailable ||
        stats.activeReconBuff !== null ||
        stats.unlockedDemos.length > 0 ||
        Object.keys(stats.archetypeStats).length > 0
      );
    case 'GARDEN':
      return (
        stats.maxExtractedFloor >= 5 ||
        stats.lifetimeShardsExtracted >= 50 ||
        restorationPercent >= 5
      );
  }
}

export function getStationUnlockStatus(
  stationId: CradleStationId,
  stats: PlayerStats
): StationUnlockStatus {
  const unlocked = isStationUnlocked(stationId, stats);

  switch (stationId) {
    case 'DIVE':
      return {
        id: 'DIVE',
        unlocked,
        label: 'Neural Chair',
        offlineTag: 'ONLINE',
        offlineHint: 'Neural Chair is ready for launch.',
        accent: 'cyan',
      };
    case 'GUIDE':
      return {
        id: 'GUIDE',
        unlocked,
        label: 'Diver Manual',
        offlineTag: 'ONLINE',
        offlineHint: 'Diver Manual is ready to read.',
        accent: 'amber',
      };
    case 'UPGRADES':
      return {
        id: 'UPGRADES',
        unlocked,
        label: 'Workbench',
        offlineTag: 'STANDBY · FIRST SHARDS',
        offlineHint:
          'Workbench is on standby. Bring back your first Knowledge Shards—or return from a dive—to power up the rig bench.',
        accent: 'magenta',
      };
    case 'LORE':
      return {
        id: 'LORE',
        unlocked,
        label: 'Archivist Logs',
        offlineTag: 'STANDBY · LOG OR F5',
        offlineHint:
          'Archivist Terminal is offline. Recover a glowing Data Log or extract from Floor 5 to wake the archives.',
        accent: 'cyan',
      };
    case 'TRAINING':
      return {
        id: 'TRAINING',
        unlocked,
        label: 'Combat Simulator',
        offlineTag: 'STANDBY · FLOOR 5',
        offlineHint:
          'Combat Simulator is in sleep mode. Clear Floor 5 and extract at a Secure Node to unlock Signal Sweep and drills.',
        accent: 'purple',
      };
    case 'GARDEN':
      return {
        id: 'GARDEN',
        unlocked,
        label: 'Green-Print',
        offlineTag: 'STANDBY · FLOOR 5',
        offlineHint:
          'The Green-Print grow lights are dimmed. Extract from Floor 5 or bank 50 lifetime Shards to wake the garden.',
        accent: 'green',
      };
  }
}

export function getAllStationUnlockStatuses(
  stats: PlayerStats
): Record<CradleStationId, StationUnlockStatus> {
  return {
    DIVE: getStationUnlockStatus('DIVE', stats),
    UPGRADES: getStationUnlockStatus('UPGRADES', stats),
    LORE: getStationUnlockStatus('LORE', stats),
    GARDEN: getStationUnlockStatus('GARDEN', stats),
    GUIDE: getStationUnlockStatus('GUIDE', stats),
    TRAINING: getStationUnlockStatus('TRAINING', stats),
  };
}

export function getCrewResidentStatus(
  residentId: CrewResidentId,
  stats: PlayerStats
): CrewResidentStatus {
  const restorationPercent = calculateGardenRestoration(
    stats.lifetimeShardsExtracted,
    stats.sectorMastery
  );
  const totalUpgrades = stats.upgrades.hp + stats.upgrades.fp + stats.upgrades.hints;

  switch (residentId) {
    case 'CRADLE_SYS':
      return {
        id: 'CRADLE_SYS',
        name: 'CRADLE_SYS',
        shortName: 'Cradle AI',
        role: 'Bunker Caretaker',
        stationId: null,
        arrived: true,
        arrivalHint: 'Online from Dive 1.',
        dialogue:
          'CRADLE_SYS online! Keep diving and extracting—every run wakes up more of this bunker.',
        accent: 'cyan',
      };

    case 'DR_ARIS_THORNE': {
      const arrived = isStationUnlocked('UPGRADES', stats);
      let dialogue: string;
      if (stats.neuralScars.length > 0) {
        dialogue =
          'I see static on your link. Patch that Neural Scar at the Neural Chair, or let me reinforce your rig HP right here.';
      } else if (totalUpgrades === 0) {
        dialogue =
          'Dr. Aris Thorne, online. Bring me Knowledge Shards and I will wire more HP, Focus, and Hint Packs into your rig.';
      } else if (stats.knowledge >= 100) {
        dialogue = `You have ${stats.knowledge} Shards ready to spend. A quick upgrade now pays off big against the next Apex Boss.`;
      } else {
        dialogue =
          'Your rig upgrades are holding steady. Extract more Shards whenever you want to push into deeper sectors.';
      }

      return {
        id: 'DR_ARIS_THORNE',
        name: 'Dr. Aris Thorne',
        shortName: 'Dr. Thorne',
        role: 'Rig Engineer · Scar Specialist',
        stationId: 'UPGRADES',
        arrived,
        arrivalHint: 'Arrives once the Workbench powers on.',
        dialogue,
        accent: 'magenta',
      };
    }

    case 'DIVER_77': {
      const arrived = isStationUnlocked('LORE', stats);
      let dialogue: string;
      if (stats.unlockedLore.includes('LOG_777')) {
        dialogue =
          'You found the Architect’s confession! Keep cracking the deep strata—there really is a way to wake everyone up.';
      } else if (stats.unlockedLore.length === 0) {
        dialogue =
          'Diver 77 here. The terminal is awake—watch for glowing green Data Logs on dungeon floors so we can piece the past together.';
      } else if (stats.maxExtractedFloor >= 16) {
        dialogue =
          'Sector 4’s files were locked from the inside. You are getting close to whatever the Archivist tried to hide.';
      } else {
        dialogue = `Diver 77 checking in. ${stats.unlockedLore.length} Data ${stats.unlockedLore.length === 1 ? 'Log' : 'Logs'} decrypted so far—check Sector Mastery to track your Attacks and Logic Checks.`;
      }

      return {
        id: 'DIVER_77',
        name: 'DIVER_77',
        shortName: 'Diver 77',
        role: 'Veteran Ghost Diver',
        stationId: 'LORE',
        arrived,
        arrivalHint: 'Arrives once the Archivist Terminal wakes up.',
        dialogue,
        accent: 'cyan',
      };
    }

    case 'COMBAT_ANALYST_V': {
      const arrived = stats.maxExtractedFloor >= 10 || stats.unlockedDemos.length > 0;
      let dialogue: string;
      if (stats.activeReconBuff) {
        dialogue =
          'Combat Analyst V here. Your Recon Buff is locked in—go test it on the next Sentinel patrol.';
      } else if (stats.reconRewardAvailable) {
        dialogue =
          'Analyst V online! Run a 10-node Signal Sweep before you dive to arm a free Recon Buff.';
      } else {
        dialogue =
          'Sentinels adapt fast past Sector 2. Use Signal Sweep and Sentinel Practice here to stay two steps ahead.';
      }

      return {
        id: 'COMBAT_ANALYST_V',
        name: 'COMBAT_ANALYST_V',
        shortName: 'Analyst V',
        role: 'Sentinel Tactician',
        stationId: 'TRAINING',
        arrived,
        arrivalHint: 'Automated sim mode · Extract from Floor 10 to draw Combat Analyst V here.',
        dialogue,
        accent: 'purple',
      };
    }

    case 'BOTANIST_AI_CORE': {
      const arrived = stats.maxExtractedFloor >= 15 || restorationPercent >= 25;
      let dialogue: string;
      if (restorationPercent >= 75) {
        dialogue = `Botanist AI Core online. Restoration is at ${restorationPercent}%—our green signal is breaking through to the surface!`;
      } else if (restorationPercent >= 40) {
        dialogue =
          'Roots are spreading under the bunker tiles now. Every extracted Shard strengthens our anchor to the real world.';
      } else {
        dialogue =
          'Botanist AI Core awake! Keep extracting Shards and building Sector Mastery—the Green-Print never loses progress.';
      }

      return {
        id: 'BOTANIST_AI_CORE',
        name: 'BOTANIST_AI_CORE',
        shortName: 'Botanist AI',
        role: 'Garden Caretaker AI',
        stationId: 'GARDEN',
        arrived,
        arrivalHint: 'Auto-growth mode · Reach Floor 15 or 25% restoration to wake Botanist AI Core.',
        dialogue,
        accent: 'green',
      };
    }
  }
}

export function getStationResident(
  stationId: CradleStationId,
  stats: PlayerStats
): CrewResidentStatus | null {
  switch (stationId) {
    case 'UPGRADES':
      return getCrewResidentStatus('DR_ARIS_THORNE', stats);
    case 'LORE':
      return getCrewResidentStatus('DIVER_77', stats);
    case 'TRAINING':
      return getCrewResidentStatus('COMBAT_ANALYST_V', stats);
    case 'GARDEN':
      return getCrewResidentStatus('BOTANIST_AI_CORE', stats);
    default:
      return null;
  }
}

export function countArrivedCrew(stats: PlayerStats): number {
  const ids: CrewResidentId[] = [
    'CRADLE_SYS',
    'DR_ARIS_THORNE',
    'DIVER_77',
    'COMBAT_ANALYST_V',
    'BOTANIST_AI_CORE',
  ];
  return ids.filter((id) => getCrewResidentStatus(id, stats).arrived).length;
}
