import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { LevelSelectModal } from './components/LevelSelectModal';
import { VictoryModal } from './components/VictoryModal';
import { MapEditor } from './components/MapEditor';
import { InstallBanner } from './components/InstallBanner';
import { ReloadPrompt } from './components/ReloadPrompt';
import { NowPlaying } from './components/NowPlaying';
import { SettingsMenu } from './components/SettingsMenu';
import { CinematicOverlay } from './components/CinematicOverlay';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { LobbyManager } from './engine/multiplayer/LobbyManager';
import { SyncEngine } from './engine/multiplayer/SyncEngine';
import { QuotaManager } from './lib/quota-manager';
import { updatePhysics, launchFleets, runAIDecisions, type PhysicsEngineState } from './engine/physics';
import { CAMPAIGN_LEVELS, MOTHERSHIP_LEVELS } from './utils/levels';
import { sound } from './utils/sound';
import { music } from './utils/music';
import { setUnlockedLevel, saveCustomMap, unlockMothership, getMothershipUnlocked, syncProgressFromCloud, getLastPlayedLevel, setLastPlayedLevel } from './utils/storage';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type { LevelConfig, Planet, GameState } from './types/game';
import { generateRandomLevel } from './utils/levels';

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
  
  // Find the last played level or default to the first level
  const initialLevel = useMemo(() => {
    const lastId = getLastPlayedLevel();
    if (lastId) {
      if (lastId.startsWith('m_lvl')) {
        const mLevel = MOTHERSHIP_LEVELS.find(l => l.id === lastId);
        if (mLevel) return mLevel;
      } else {
        const cLevel = CAMPAIGN_LEVELS.find(l => l.id === lastId);
        if (cLevel) return cLevel;
      }
    }
    return CAMPAIGN_LEVELS[0];
  }, []);

  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(initialLevel);
  const [physicsState, setPhysicsState] = useState<PhysicsEngineState>(() => initLevel(initialLevel));
  const [selectedPlanetIds, setSelectedPlanetIds] = useState<string[]>([]);
  const [sendPercentage, setSendPercentage] = useState(1.0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [showVictory, setShowVictory] = useState(false);
  const [victory, setVictory] = useState(false);
  const [multiplayerRanking, setMultiplayerRanking] = useState<{ faction: string, name: string, score: number, isDead?: boolean }[]>([]);
  const [sfxVolume, setSfxVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.3);
  
  const [editorMapId, setEditorMapId] = useState<string | null>(null);
  const [editorMapName, setEditorMapName] = useState<string | undefined>(undefined);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const quotaAccumRef = useRef(0);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false);
  const lobbyManagerRef = useRef<LobbyManager>(null as unknown as LobbyManager);
  if (!lobbyManagerRef.current) {
    lobbyManagerRef.current = new LobbyManager();
  }

  const syncEngineRef = useRef<SyncEngine>(null as unknown as SyncEngine);
  if (!syncEngineRef.current) {
    syncEngineRef.current = new SyncEngine(lobbyManagerRef.current);
  }

  useEffect(() => { sound.setVolume(sfxVolume); }, [sfxVolume]);
  useEffect(() => { music.setVolume(musicVolume); }, [musicVolume]);
  useEffect(() => { setLastPlayedLevel(currentLevel.id); }, [currentLevel.id]);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase?.auth.getSession().then(({ data: { session } }) => {
        if (session) syncProgressFromCloud();
      });
    }
  }, []);

  const physicsStateRef = useRef(physicsState);
  physicsStateRef.current = physicsState;

  // Sync multiplayer state
  useEffect(() => {
    // 1. Unified Launch Handler (both local and remote launches execute atomically)
    syncEngineRef.current!.onLaunch((action) => {
      setPhysicsState(prev => launchFleets(
        action.sourcePlanetIds,
        action.targetPlanetId,
        prev,
        action.sendRatio,
        action.faction
      ));
    });

    // 2. Authoritative Host Reconciliation for Guests
    syncEngineRef.current!.onHostSync((data) => {
      setPhysicsState(prev => {
        const nextPlanets = prev.planets.map(p => {
          const remoteP = data.planets.find(rp => rp.id === p.id);
          if (remoteP) {
            const shipsDiff = Math.abs(p.ships - remoteP.ships);
            return {
              ...p,
              owner: remoteP.owner,
              ships: shipsDiff > 2 ? remoteP.ships : p.ships
            };
          }
          return p;
        });
        return { ...prev, planets: nextPlanets };
      });
    });

    syncEngineRef.current!.onHostDisconnected(async () => {
      // Host dropped without sending player_left
      syncEngineRef.current!.stopGuestWatchdog();
      alert("HOST DISCONNECTED: The match has been aborted.");
      await lobbyManagerRef.current!.leaveRoom();
      setGameState('menu');
      setShowMultiplayerLobby(true);
    });

    // Listen for guest game launch from host
    lobbyManagerRef.current!.onGameStart((level) => {
      setCurrentLevel(level);
      const initialSt = initLevel(level);
      setPhysicsState(initialSt);
      setSelectedPlanetIds([]);
      setGameState('multiplayer_playing');
      setShowMultiplayerLobby(false);
      setShowLevelSelect(false);
      setShowVictory(false);
      setIsPaused(false);
      hasDiedRef.current = false;
      music.init();
      
      syncEngineRef.current!.startGuestWatchdog();
    });

    // Handle opponent leaving or surrendering during multiplayer
    lobbyManagerRef.current!.onPlayerLeft((playerId) => {
      // Find the assigned faction of the player who left and neutralize their planets
      const leftFaction = lobbyManagerRef.current!.getPlayerFaction(playerId);
      if (leftFaction) {
        setPhysicsState(prev => ({
          ...prev,
          planets: prev.planets.map(p => p.owner === leftFaction ? { ...p, owner: 'neutral', ships: 0 } : p),
          ships: prev.ships.filter(s => s.faction !== leftFaction)
        }));
      }

      setGameState(current => {
        if (current === 'multiplayer_playing') {
          const activeFactions = lobbyManagerRef.current!.getActivePlayerFactions();
          if (activeFactions.length <= 1) {
            setVictory(true);
            setShowVictory(true);
            sound.playVictory();
            syncEngineRef.current!.stopHostSyncLoop();
            syncEngineRef.current!.stopGuestWatchdog();
            
            // We won by default (everyone else left)
            const myFaction = lobbyManagerRef.current!.myFaction;
            const myProfile = lobbyManagerRef.current!.profile;
            setMultiplayerRanking([
              { faction: myFaction, name: myProfile?.name || 'Unknown', score: 9999 }
            ]);
            
            return 'victory';
          }
        }
        return current;
      });
    });
  }, []);

  const lastTimeRef = useRef<number>(0);
  const aiAccumRef = useRef<number>(0);
  const hasDiedRef = useRef<boolean>(false);

  // Main game loop
  useEffect(() => {
    if ((gameState !== 'playing' && gameState !== 'multiplayer_playing') || isPaused) {
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

        const isMultiplayer = gameState === 'multiplayer_playing';

        if (isMultiplayer) {
          quotaAccumRef.current += dt;
          if (quotaAccumRef.current >= 10.0) {
            QuotaManager.addPlayedSeconds(lobbyManagerRef.current!.profile, Math.floor(quotaAccumRef.current));
            quotaAccumRef.current -= Math.floor(quotaAccumRef.current);
          }
        }

        aiAccumRef.current += dt * speedMultiplier;
        if (aiAccumRef.current >= 0.8) {
          aiAccumRef.current = 0;
          if (!isMultiplayer) {
            next = runAIDecisions(next, sendPercentage, ['player']);
          } else if (lobbyManagerRef.current!.isHost) {
            const activeHumans = lobbyManagerRef.current!.getActivePlayerFactions();
            next = runAIDecisions(next, sendPercentage, activeHumans, (sourceIds, targetId, ratio, faction) => {
              syncEngineRef.current!.emitLaunch(sourceIds, targetId, ratio, faction);
            });
          }
        }

        // Check victory/defeat
        if (!isMultiplayer) {
          // Single player logic
          const myPlanets = next.planets.filter(p => p.owner === 'player');
          const myShips = next.ships.filter(s => s.faction === 'player');
          const isMeAlive = myPlanets.length > 0 || myShips.length > 0;

          const enemyPlanets = next.planets.filter(p => p.owner !== 'player' && p.owner !== 'neutral');
          const enemyShips = next.ships.filter(s => s.faction !== 'player' && s.faction !== 'neutral');
          const areEnemiesAlive = enemyPlanets.length > 0 || enemyShips.length > 0;

          if (!isMeAlive) {
            setVictory(false);
            setShowVictory(true);
            setGameState('defeat');
            sound.playDefeat();
          } else if (!areEnemiesAlive) {
            if (currentLevel.id === 'lvl36') {
              setGameState('cinematic');
              sound.playVictory();
              if (!getMothershipUnlocked()) unlockMothership();
            } else {
              setVictory(true);
              setShowVictory(true);
              setGameState('victory');
              sound.playVictory();
              const currentIdx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentLevel.id);
              if (currentIdx >= 0) setUnlockedLevel(currentIdx + 2);
            }
          }
        } else {
          // Multiplayer logic
          const myFaction = lobbyManagerRef.current!.myFaction;
          const myPlanets = next.planets.filter(p => p.owner === myFaction);
          const myShips = next.ships.filter(s => s.faction === myFaction);
          const isMeAlive = myPlanets.length > 0 || myShips.length > 0;

          const activeFactions = lobbyManagerRef.current!.getActivePlayerFactions();
          
          // Check if any other active player is still alive
          let anyOtherAlive = false;
          const scores: { faction: string, score: number }[] = [];
          
          for (const f of activeFactions) {
            const fPlanets = next.planets.filter(p => p.owner === f);
            const fShips = next.ships.filter(s => s.faction === f);
            const isAlive = fPlanets.length > 0 || fShips.length > 0;
            
            // Calculate a score for ranking based on planets and ships
            scores.push({ faction: f, score: fPlanets.length * 1000 + fShips.length });
            
            if (f !== myFaction && isAlive) {
              anyOtherAlive = true;
            }
          }

          if (!isMeAlive && anyOtherAlive) {
            // I died, but game is still going for others.
            if (!hasDiedRef.current) {
              hasDiedRef.current = true;
              setVictory(false);
              setShowVictory(true);
              sound.playDefeat();
              
              // Generate ranking
              const ranking = activeFactions.map(f => {
                 const p = Array.from(lobbyManagerRef.current!.players.values()).find(player => lobbyManagerRef.current!.getPlayerFaction(player.id) === f);
                 const sc = scores.find(s => s.faction === f)?.score || 0;
                 return { faction: f, name: p?.name || 'Unknown', score: sc, isDead: sc === 0 };
              }).sort((a, b) => b.score - a.score);
              setMultiplayerRanking(ranking);
            }
          } else if (!anyOtherAlive) {
            // All enemies are dead
            if (!hasDiedRef.current) {
              hasDiedRef.current = true;
              setVictory(true);
              setShowVictory(true);
              // Do NOT change gameState to defeat or victory so loop keeps running for guests if we are host, 
              // Wait, if everyone else is dead, the game is over! We can stop the loop.
              setGameState('victory');
              sound.playVictory();
              syncEngineRef.current!.stopHostSyncLoop();
              syncEngineRef.current!.stopGuestWatchdog();
              
              // Generate ranking
              const ranking = activeFactions.map(f => {
                 const p = Array.from(lobbyManagerRef.current!.players.values()).find(player => lobbyManagerRef.current!.getPlayerFaction(player.id) === f);
                 const sc = scores.find(s => s.faction === f)?.score || 0;
                 return { faction: f, name: p?.name || 'Unknown', score: sc, isDead: sc === 0 };
              }).sort((a, b) => b.score - a.score);
              setMultiplayerRanking(ranking);
            }
          }
        }


        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, isPaused, speedMultiplier, sendPercentage, currentLevel.id]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing' && gameState !== 'multiplayer_playing') return;

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
        if (gameState !== 'multiplayer_playing') {
          setIsPaused(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  const handleLaunchFleets = useCallback((sourceIds: string[], targetId: string) => {
    if (gameState === 'multiplayer_playing') {
      const myFaction = lobbyManagerRef.current!.myFaction;
      syncEngineRef.current!.emitLaunch(sourceIds, targetId, sendPercentage, myFaction);
    } else {
      setPhysicsState(prev => launchFleets(sourceIds, targetId, prev, sendPercentage));
    }
  }, [sendPercentage, gameState]);

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
    let next;
    const isMothership = currentLevel.id.startsWith('m_lvl');
    
    if (isMothership) {
      const idx = MOTHERSHIP_LEVELS.findIndex(l => l.id === currentLevel.id);
      next = MOTHERSHIP_LEVELS[(idx + 1) % MOTHERSHIP_LEVELS.length];
    } else {
      const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentLevel.id);
      if (currentLevel.id === 'lvl36') {
        // Transition to Mothership campaign!
        next = MOTHERSHIP_LEVELS[0];
      } else {
        next = CAMPAIGN_LEVELS[(idx + 1) % CAMPAIGN_LEVELS.length];
      }
    }
    handleSelectLevel(next);
  };

  const handleToggleMute = () => {
    setIsMuted(sound.toggleMute());
    music.toggleMute();
  };

  const handleSelectAllPlayer = () => {
    const myFaction = gameState === 'multiplayer_playing' ? lobbyManagerRef.current!.myFaction : 'player';
    const playerIds = physicsState.planets.filter(p => p.owner === myFaction).map(p => p.id);
    setSelectedPlanetIds(playerIds);
    sound.playSelect();
  };

  const hudSettingsMenu = (
    <SettingsMenu 
      sfxVolume={sfxVolume}
      onSetSfxVolume={setSfxVolume}
      musicVolume={musicVolume}
      onSetMusicVolume={setMusicVolume}
      onOpenAuth={() => setShowAuthModal(true)}
      onOpenAdmin={() => setShowAdminDashboard(true)}
    />
  );

  const modalSettingsMenu = (
    <SettingsMenu 
      sfxVolume={sfxVolume}
      onSetSfxVolume={setSfxVolume}
      musicVolume={musicVolume}
      onSetMusicVolume={setMusicVolume}
      onOpenAuth={() => setShowAuthModal(true)}
      onOpenAdmin={() => setShowAdminDashboard(true)}
      dropdownClassName="fixed inset-0 m-auto h-max [@media(min-width:768px)_and_(min-height:550px)]:absolute [@media(min-width:768px)_and_(min-height:550px)]:inset-auto [@media(min-width:768px)_and_(min-height:550px)]:top-10 [@media(min-width:768px)_and_(min-height:550px)]:origin-top"
    />
  );

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-[#0a0a14] overscroll-none touch-none">
      {gameState === 'playing' || gameState === 'multiplayer_playing' || gameState === 'paused' || gameState === 'victory' || gameState === 'defeat' ? (
        <>
          <div className="game-canvas-container">
            <GameCanvas
              planets={physicsState.planets}
              ships={physicsState.ships}
              sparks={physicsState.sparks}
              lasers={physicsState.lasers}
              screenShake={physicsState.screenShake}
              selectedPlanetIds={selectedPlanetIds}
              onSelectPlanets={setSelectedPlanetIds}
              onLaunchFleets={handleLaunchFleets}
              playerFaction={gameState === 'multiplayer_playing' ? lobbyManagerRef.current!.myFaction : 'player'}
            />
          </div>
          <HUD
            levelName={currentLevel.name}
            planets={physicsState.planets}
            ships={physicsState.ships}
            sendPercentage={sendPercentage}
            onSetSendPercentage={setSendPercentage}
            speedMultiplier={speedMultiplier}
            onSetSpeedMultiplier={setSpeedMultiplier}
            isPaused={isPaused}
            onTogglePause={() => {
              if (gameState !== 'multiplayer_playing') {
                setIsPaused(p => !p);
              }
            }}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onSelectAllPlayerPlanets={handleSelectAllPlayer}
            onRestartLevel={handleRestart}
            onOpenLevelSelect={() => {
              setIsPaused(true);
              setShowLevelSelect(true);
            }}
            settingsMenu={hudSettingsMenu}
            isMultiplayer={gameState === 'multiplayer_playing'}
            playerFaction={lobbyManagerRef.current!.myFaction}
            onLeaveMultiplayer={async () => {
              await lobbyManagerRef.current!.leaveRoom();
              syncEngineRef.current!.stopHostSyncLoop();
              setGameState('menu');
              setShowLevelSelect(true);
            }}
          />
        </>
      ) : null}

      {gameState === 'cinematic' && (
        <>
          <div className="game-canvas-container">
            <GameCanvas
              planets={physicsState.planets}
              ships={physicsState.ships}
              sparks={physicsState.sparks}
              lasers={physicsState.lasers}
              screenShake={physicsState.screenShake}
              selectedPlanetIds={[]}
              onSelectPlanets={() => {}}
              onLaunchFleets={() => {}}
            />
          </div>
          <CinematicOverlay 
            onComplete={() => {
              setVictory(true);
              setShowVictory(true);
              setGameState('victory');
            }} 
          />
        </>
      )}

      {gameState === 'editor' && (
        <MapEditor
          initialPlanets={physicsState.planets}
          initialMapId={editorMapId || undefined}
          initialMapName={editorMapName}
          onStartGame={(planets, mapId, mapName) => {
            const finalMapId = mapId || `custom-${Date.now()}`;
            const finalMapName = mapName || `Custom Map ${new Date().toLocaleTimeString()}`;
            
            saveCustomMap({
              id: finalMapId,
              name: finalMapName,
              planets
            });

            const level: LevelConfig = {
              id: finalMapId,
              name: finalMapName,
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
          settingsMenu={hudSettingsMenu}
        />
      )}

      {showLevelSelect && gameState !== 'editor' && (
        <LevelSelectModal
          isOpen={showLevelSelect}
          onClose={() => { if (gameState === 'playing') setShowLevelSelect(false); }}
          onSelectLevel={handleSelectLevel}
          currentLevelId={currentLevel.id}
          isGameActive={gameState === 'playing'}
          onOpenMapEditor={(mapToEdit) => {
            if (mapToEdit) {
              setEditorMapId(mapToEdit.id);
              setEditorMapName(mapToEdit.name);
              setPhysicsState(initLevel({
                id: mapToEdit.id,
                name: mapToEdit.name,
                description: 'Custom',
                difficulty: 'Custom',
                width: 1200,
                height: 800,
                planets: mapToEdit.planets,
                activeFactions: []
              }));
              setGameState('editor');
              setShowLevelSelect(false);
            } else {
              setEditorMapId(null);
              setEditorMapName(undefined);
              // Seed editor with random level
              import('./utils/levels').then(({ generateRandomLevel }) => {
                const baseLevel = generateRandomLevel(3, 8);
                setPhysicsState(initLevel(baseLevel));
                setGameState('editor');
                setShowLevelSelect(false);
              });
            }
          }}
          onOpenMultiplayer={() => {
            setShowLevelSelect(false);
            setShowMultiplayerLobby(true);
          }}
          settingsMenu={modalSettingsMenu}
        />
      )}

      <MultiplayerLobbyModal
        isOpen={showMultiplayerLobby}
        onClose={async () => {
          await lobbyManagerRef.current!.leaveRoom();
          setShowMultiplayerLobby(false);
          setShowLevelSelect(true);
        }}
        onRequireAuth={() => {
          setShowMultiplayerLobby(false);
          setShowAuthModal(true);
        }}
        lobbyManager={lobbyManagerRef.current!}
        onStartGame={() => {
          const playerCount = Math.max(2, lobbyManagerRef.current!.players.size);
          const arenaLevel = generateRandomLevel(playerCount, 10);
          arenaLevel.name = `Arena Sector ${lobbyManagerRef.current!.roomId || ''}`;
          
          lobbyManagerRef.current!.startGame(arenaLevel);
          
          setCurrentLevel(arenaLevel);
          const initialSt = initLevel(arenaLevel);
          setPhysicsState(initialSt);
          setSelectedPlanetIds([]);
          
          setGameState('multiplayer_playing');
          setShowMultiplayerLobby(false);
          setShowLevelSelect(false);
          setShowVictory(false);
          setIsPaused(false);
          music.init();
          
          if (lobbyManagerRef.current!.isHost) {
            syncEngineRef.current!.startHostSyncLoop(() => {
              return physicsStateRef.current.planets.map(p => ({
                id: p.id,
                owner: p.owner,
                ships: Math.floor(p.ships)
              }));
            });
          }
        }}
      />

      {showVictory && (
        <VictoryModal
          isVictory={victory}
          stats={physicsState.stats}
          ranking={multiplayerRanking}
          onNextLevel={handleNextLevel}
          onRestart={handleRestart}
          onLevelSelect={() => { 
            setShowVictory(false); 
            if (gameState === 'multiplayer_playing' || gameState === 'victory' || gameState === 'defeat') {
              syncEngineRef.current!.stopHostSyncLoop();
              syncEngineRef.current!.stopGuestWatchdog();
              // Only reset to menu if we are in multiplayer context
              if (lobbyManagerRef.current!.roomId) {
                 setGameState('menu');
                 setShowMultiplayerLobby(true);
              } else {
                 setGameState('menu');
                 setShowLevelSelect(true);
              }
            } else {
              setGameState('menu');
              setShowLevelSelect(true); 
            }
          }}
          isMultiplayer={!!lobbyManagerRef.current!.roomId}
        />
      )}

      <ReloadPrompt />
      <InstallBanner />
      <NowPlaying />

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={() => {
          syncProgressFromCloud();
          setShowAuthModal(false);
        }}
      />

      {showAdminDashboard && (
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
      )}

      <div id="portrait-warning" className="fixed inset-0 z-[9999] bg-black hidden flex-col items-center justify-center p-8 text-center text-white touch-none">
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
