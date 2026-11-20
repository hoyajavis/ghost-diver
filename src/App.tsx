import React from 'react';
import { HomeBase } from './components/HomeBase';
import { TitleScreen } from './components/TitleScreen';
import { Dungeon } from './components/Dungeon';
import { Combat } from './components/Combat';
import { Sanctuary } from './components/Sanctuary';
import { ChestLoot } from './components/ChestLoot';
import { motion, MotionConfig } from 'motion/react';
import { useGameEngine } from './hooks/useGameEngine';

export default function App() {
  const {
    gameState,
    setGameState,
    stats,
    setStats,
    dungeon,
    currentEnemy,
    lootMessage,
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
  } = useGameEngine();

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

        {gameState === 'HOME' && (
          <HomeBase
            stats={stats}
            onStartDive={startDive}
            onHealScar={handleHealScar}
            onUpgrade={handleUpgrade}
            onUnlockDemo={handleUnlockDemo}
            onLogout={() => setGameState('TITLE')}
          />
        )}

        {(gameState === 'DUNGEON' || gameState === 'CHEST_LOOT') && dungeon && (
          <div className="relative h-full">
            <Dungeon
              dungeon={dungeon}
              stats={stats}
              onMove={handleMove}
              onEject={handleEmergencyEject}
              isActive={gameState === 'DUNGEON'}
            />
            {gameState === 'CHEST_LOOT' && lootMessage && (
              <ChestLoot
                message={lootMessage.text}
                type={lootMessage.type}
                onDismiss={() => setGameState('DUNGEON')}
              />
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
            onBankAndExit={handleBankAndExit}
            onDiveDeeper={handleDiveDeeper}
          />
        )}

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
              <p className="text-xs text-neon-magenta mb-6 font-bold uppercase tracking-wider">
                Warning: Neural scar sustained
              </p>

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
