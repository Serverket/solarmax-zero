import { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { LevelSelectModal } from './components/LevelSelectModal';
import { VictoryModal } from './components/VictoryModal';
import { MapEditor } from './components/MapEditor';
import { InstallBanner } from './components/InstallBanner';
import { ReloadPrompt } from './components/ReloadPrompt';
import { NowPlaying } from './components/NowPlaying';
import { SettingsMenu } from './components/SettingsMenu';
import { updatePhysics, launchFleets, runAIDecisions, type PhysicsEngineState } from './engine/physics';
import { CAMPAIGN_LEVELS } from './utils/levels';
import { sound } from './utils/sound';
import { music } from './utils/music';
import { setUnlockedLevel, saveCustomMap } from './utils/storage';
import type { LevelConfig, Planet, GameState } from './types/game';

function initLevel(level: LevelConfig): PhysicsEngineState {
  const planets: Planet[] = level.planets.map(p => ({
    ...p,
    ships: p.ships,
    captureProgress: 0,
    capturingFaction: null,
    inCombat: false,
    turretCooldown: 0,
  }));

  return {
    planets,
    ships: [],
    sparks: [],
    lasers: [],
    screenShake: 0,
    stats: {
      shipsProduced: 0,
      shipsDestroyed: 0,
      planetsCaptured: 0,
      startTime: Date.now(),
      endTime: 0,
    },
  };
}

function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(CAMPAIGN_LEVELS[0]);
  const [physicsState, setPhysicsState] = useState<PhysicsEngineState>(() => initLevel(CAMPAIGN_LEVELS[0]));
  const [selectedPlanetIds, setSelectedPlanetIds] = useState<string[]>([]);
  const [sendPercentage, setSendPercentage] = useState(1.0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [showVictory, setShowVictory] = useState(false);
  const [victory, setVictory] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.3);

  useEffect(() => { sound.setVolume(sfxVolume); }, [sfxVolume]);
  useEffect(() => { music.setVolume(musicVolume); }, [musicVolume]);

  const physicsStateRef = useRef(physicsState);
  physicsStateRef.current = physicsState;

  const lastTimeRef = useRef<number>(0);
  const aiAccumRef = useRef<number>(0);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) {
      lastTimeRef.current = 0;
      return;
    }

    let animId: number;

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
        animId = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      setPhysicsState(prev => {
        let next = updatePhysics(prev, dt, sendPercentage, speedMultiplier);

        // AI decisions every ~0.8 seconds
        aiAccumRef.current += dt * speedMultiplier;
        if (aiAccumRef.current >= 0.8) {
          aiAccumRef.current = 0;
          next = runAIDecisions(next, sendPercentage);
        }

        // Check victory/defeat (Supremacy Rules)
        const playerPlanets = next.planets.filter(p => p.owner === 'player');
        const playerShips = next.ships.filter(s => s.faction === 'player');
        const isPlayerAlive = playerPlanets.length > 0 || playerShips.length > 0;

        const enemyPlanets = next.planets.filter(p => p.owner !== 'player' && p.owner !== 'neutral');
        const enemyShips = next.ships.filter(s => s.faction !== 'player' && s.faction !== 'neutral');
        const areEnemiesAlive = enemyPlanets.length > 0 || enemyShips.length > 0;

        if (!isPlayerAlive) {
          setVictory(false);
          setShowVictory(true);
          setGameState('defeat');
          sound.playDefeat();
        } else if (!areEnemiesAlive) {
          setVictory(true);
          setShowVictory(true);
          setGameState('victory');
          sound.playVictory();
          
          // Save progression if campaign level
          const currentIdx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentLevel.id);
          if (currentIdx >= 0) {
            setUnlockedLevel(currentIdx + 2); // unlock next level (1-indexed)
          }
        }

        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, isPaused, speedMultiplier, sendPercentage]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        setSendPercentage(prev => Math.max(0, prev - 0.1));
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        setSendPercentage(prev => Math.min(1, prev + 0.1));
      } else if (e.key >= '1' && e.key <= '9') {
        setSendPercentage(parseInt(e.key) / 10);
      } else if (e.key === '0') {
        setSendPercentage(1.0);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  const handleLaunchFleets = useCallback((sourceIds: string[], targetId: string) => {
    setPhysicsState(prev => launchFleets(sourceIds, targetId, prev, sendPercentage));
  }, [sendPercentage]);

  const handleSelectLevel = (level: LevelConfig) => {
    setCurrentLevel(level);
    setPhysicsState(initLevel(level));
    setSelectedPlanetIds([]);
    setGameState('playing');
    setShowLevelSelect(false);
    setShowVictory(false);
    setIsPaused(false);
    music.init();
  };

  const handleRestart = () => {
    setPhysicsState(initLevel(currentLevel));
    setSelectedPlanetIds([]);
    setGameState('playing');
    setShowVictory(false);
    setIsPaused(false);
  };

  const handleNextLevel = () => {
    const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentLevel.id);
    const next = CAMPAIGN_LEVELS[(idx + 1) % CAMPAIGN_LEVELS.length];
    handleSelectLevel(next);
  };

  const handleToggleMute = () => {
    setIsMuted(sound.toggleMute());
    music.toggleMute();
  };

  const handleSelectAllPlayer = () => {
    const playerIds = physicsState.planets.filter(p => p.owner === 'player').map(p => p.id);
    setSelectedPlanetIds(playerIds);
    sound.playSelect();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a14]">
      {gameState === 'playing' || gameState === 'paused' || gameState === 'victory' || gameState === 'defeat' ? (
        <>
          <GameCanvas
            planets={physicsState.planets}
            ships={physicsState.ships}
            sparks={physicsState.sparks}
            lasers={physicsState.lasers}
            screenShake={physicsState.screenShake}
            selectedPlanetIds={selectedPlanetIds}
            onSelectPlanets={setSelectedPlanetIds}
            onLaunchFleets={handleLaunchFleets}
          />
          <HUD
            levelName={currentLevel.name}
            planets={physicsState.planets}
            ships={physicsState.ships}
            sendPercentage={sendPercentage}
            onSetSendPercentage={setSendPercentage}
            speedMultiplier={speedMultiplier}
            onSetSpeedMultiplier={setSpeedMultiplier}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(p => !p)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onSelectAllPlayerPlanets={handleSelectAllPlayer}
            onRestartLevel={handleRestart}
            onOpenLevelSelect={() => {
              setIsPaused(true);
              setShowLevelSelect(true);
            }}
          />
        </>
      ) : null}

      {gameState === 'editor' && (
        <MapEditor
          initialPlanets={physicsState.planets}
          onStartGame={(planets) => {
            const mapId = `custom-${Date.now()}`;
            const mapName = `Custom Map ${new Date().toLocaleTimeString()}`;
            
            saveCustomMap({
              id: mapId,
              name: mapName,
              planets
            });

            const level: LevelConfig = {
              id: mapId,
              name: mapName,
              description: 'User created map.',
              difficulty: 'Custom',
              width: 1200,
              height: 800,
              planets,
              activeFactions: Array.from(new Set(planets.map(p => p.owner)))
            };
            handleSelectLevel(level);
          }}
          onExit={() => {
            setGameState('menu');
            setShowLevelSelect(true);
          }}
        />
      )}

      {showLevelSelect && gameState !== 'editor' && (
        <LevelSelectModal
          isOpen={showLevelSelect}
          onClose={() => { if (gameState === 'playing') setShowLevelSelect(false); }}
          onSelectLevel={handleSelectLevel}
          currentLevelId={currentLevel.id}
          isGameActive={gameState === 'playing'}
          onOpenMapEditor={() => {
            // Seed editor with random level
            import('./utils/levels').then(({ generateRandomLevel }) => {
              const baseLevel = generateRandomLevel(3, 8);
              setPhysicsState(initLevel(baseLevel));
              setGameState('editor');
              setShowLevelSelect(false);
            });
          }}
        />
      )}

      {showVictory && (
        <VictoryModal
          isVictory={victory}
          stats={physicsState.stats}
          onNextLevel={handleNextLevel}
          onRestart={handleRestart}
          onLevelSelect={() => { setShowVictory(false); setShowLevelSelect(true); }}
        />
      )}

      <ReloadPrompt />
      <InstallBanner />
      <NowPlaying />
      <SettingsMenu 
        sfxVolume={sfxVolume}
        onSetSfxVolume={setSfxVolume}
        musicVolume={musicVolume}
        onSetMusicVolume={setMusicVolume}
      />

      <div id="portrait-warning" className="fixed inset-0 z-50 bg-black hidden flex-col items-center justify-center p-8 text-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-6 animate-pulse-slow">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <path d="M12 18h.01"></path>
          <path d="M16.5 12a4.5 4.5 0 0 1-9 0"></path>
          <path d="M21 8l-3-3-3 3"></path>
        </svg>
        <h2 className="font-orbitron text-2xl mb-2 text-[#00f0ff] glow-white">ROTATE DEVICE</h2>
        <p className="text-white/70">Solarmax Zero requires landscape orientation for optimal tactical overview.</p>
      </div>
    </div>
  );
}

export default App;
