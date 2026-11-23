import React, { Suspense } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { ChestLoot } from './components/ChestLoot';
import { motion, MotionConfig } from 'motion/react';
import { useGameEngine } from './hooks/useGameEngine';
import { hasEquippedChip } from './lib/loadoutChips';

const HomeBase = React.lazy(() =>
  import('./components/HomeBase').then((m) => ({ default: m.HomeBase }))
);
const Dungeon = React.lazy(() =>
  import('./components/Dungeon').then((m) => ({ default: m.Dungeon }))
);
const Combat = React.lazy(() =>
  import('./components/Combat').then((m) => ({ default: m.Combat }))
);
const Sanctuary = React.lazy(() =>
  import('./components/Sanctuary').then((m) => ({ default: m.Sanctuary }))
);
const LockModal = React.lazy(() =>
  import('./components/LockModal').then((m) => ({ default: m.LockModal }))
);

export default function App() {
  const {
    gameState,
    setGameState,
    stats,
    setStats,
    dungeon,
    currentEnemy,
    activeLockedChest,
    dungeonAlert,
    lootMessage,
    lastDefeatInflictedScar,
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
  } = useGameEngine();

  const dampenerBlockedScar =
    !lastDefeatInflictedScar && hasEquippedChip(stats.equippedChips, 'NEURAL_DAMPENER');

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full h-full bg-black overflow-hidden font-sans select-none">
        {gameState === 'TITLE' && (
          <TitleScreen
            slots={slots}
            cacheProfile={cacheProfile}
            onSelectSlot={handleSelectSlot}
            onDeleteSlot={handleDeleteSlot}
            onRotateAnonymousId={handleRotateAnonymousId}
            onClearAllCache={handleClearAllCache}
            onExportCache={handleExportCache}
          />
        )}

        <Suspense fallback={<div className="w-full h-full bg-gb-0" aria-busy="true" />}>
          {gameState === 'HOME' && (
            <HomeBase
              stats={stats}
              onStartDive={startDive}
              onHealScar={handleHealScar}
              onCalibrateScar={handleCalibrateScar}
              onUpgrade={handleUpgrade}
              onToggleEquipChip={handleToggleEquipChip}
              onUnlockDemo={handleUnlockDemo}
              onRecordConceptOutcome={handleRecordConceptOutcome}
              onRecordArchetypeStats={handleRecordArchetypeStats}
              onClaimReconBuff={handleClaimReconBuff}
              onLogout={() => setGameState('TITLE')}
            />
          )}

          {(gameState === 'DUNGEON' || gameState === 'CHEST_LOOT' || gameState === 'LOCK_MODAL') &&
            dungeon && (
              <div className="relative h-full">
                <Dungeon
                  dungeon={dungeon}
                  stats={stats}
                  onMove={handleMove}
                  onEject={handleEmergencyEject}
                  isActive={gameState === 'DUNGEON'}
                  dungeonAlert={dungeonAlert}
                />
                {gameState === 'CHEST_LOOT' && lootMessage && (
                  <ChestLoot
                    message={lootMessage.text}
                    type={lootMessage.type}
                    onDismiss={() => setGameState('DUNGEON')}
                  />
                )}
                {gameState === 'LOCK_MODAL' && activeLockedChest && (
                  <Suspense fallback={null}>
                    <LockModal
                      tier={dungeon.tier}
                      playerHp={stats.hp}
                      playerMaxHp={stats.maxHp}
                      conceptSchedule={stats.conceptSchedule}
                      conceptStepCounter={stats.conceptStepCounter}
                      onRecordConceptOutcome={handleRecordConceptOutcome}
                      onSuccess={handleBlueCacheSuccess}
                      onMiss={handleBlueCacheFail}
                      onClose={handleBlueCacheClose}
                    />
                  </Suspense>
                )}
              </div>
            )}

          {gameState === 'COMBAT' && currentEnemy && dungeon && (
            <Combat
              stats={stats}
              enemy={currentEnemy}
              tier={dungeon.tier}
              floor={dungeon.floor}
              slotId={currentSlot}
              onWin={handleCombatWin}
              onLose={handleCombatLose}
              onUpdateStats={setStats}
            />
          )}

          {gameState === 'SANCTUARY' && (
            <Sanctuary
              stats={stats}
              floor={dungeon?.floor ?? 1}
              onBankAndExit={handleBankAndExit}
              onDiveDeeper={handleDiveDeeper}
            />
          )}
        </Suspense>

        {gameState === 'GAMEOVER' && (
          <div className="flex flex-col items-center justify-center h-full bg-gb-0 text-gb-3 p-4 scanlines terminal-text wireframe-bg overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gb-1 border-4 border-neon-magenta p-6 gb-border max-w-md w-full text-center dither shadow-[0_0_50px_rgba(255,0,255,0.2)]"
            >
              <h2 className="text-2xl md:text-3xl font-black italic mb-3 text-neon-magenta tracking-tight uppercase drop-shadow-[2px_2px_0px_#000]">
                Neural Link Severed
              </h2>
              <div className="w-full h-[1px] bg-neon-magenta mb-4" />
              <p className="text-sm text-gb-3 mb-2 font-semibold">
                All unextracted data was lost to the static.
              </p>
              {dampenerBlockedScar ? (
                <p className="text-xs text-neon-cyan mb-6 font-bold uppercase tracking-wider">
                  Neural Dampener blocked scar corruption
                </p>
              ) : (
                <p className="text-xs text-neon-magenta mb-6 font-bold uppercase tracking-wider">
                  Warning: Neural scar sustained
                </p>
              )}

              <button
                type="button"
                onClick={() => setGameState('TITLE')}
                className="w-full min-h-11 py-3 px-4 bg-gb-3 text-gb-0 font-black italic text-base transition-all hover:bg-neon-cyan active:scale-95 uppercase tracking-wider gb-border"
              >
                Return to Title
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
