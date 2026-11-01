import { describe, it, expect } from 'bun:test';
import { runAIDecisions } from '../src/engine/physics';
import type { PhysicsEngineState, Planet, FactionId } from '../src/types/game';

describe('6. Autonomous AI Tactical Decision Engine Tests', () => {
  function createAiState(overrides?: Partial<PhysicsEngineState>): PhysicsEngineState {
    const defaultPlanets: Planet[] = [
      { id: 'p_player', name: 'Player HQ', x: 100, y: 100, radius: 30, maxShips: 100, ships: 30, owner: 'player', type: 'standard', productionRate: 1, pulsePhase: 0 },
      { id: 'p_ai_front', name: 'AI Front', x: 250, y: 100, radius: 30, maxShips: 100, ships: 40, owner: 'ai1', type: 'standard', productionRate: 1, pulsePhase: 0 },
      { id: 'p_ai_back', name: 'AI Backline', x: 600, y: 100, radius: 30, maxShips: 100, ships: 35, owner: 'ai1', type: 'standard', productionRate: 1, pulsePhase: 0 },
      { id: 'p_neutral', name: 'Neutral Outpost', x: 300, y: 250, radius: 25, maxShips: 100, ships: 5, owner: 'neutral', type: 'standard', productionRate: 0.5, pulsePhase: 0 },
    ];

    return {
      planets: defaultPlanets,
      ships: [],
      sparks: [],
      lasers: [],
      stats: { shipsDestroyed: 0, planetsCaptured: 0, shipsProduced: 0 },
      screenShake: 0,
      ...overrides
    };
  }

  it('should ignore factions marked as active human players in multiplayer', () => {
    const state = createAiState();
    let launched = false;

    // Treat 'ai1' as human player (e.g. 2-player multiplayer room)
    runAIDecisions(state, 0.5, ['player', 'ai1'], () => {
      launched = true;
    });

    expect(launched).toBe(false);
  });

  it('should not launch if AI faction has fewer than 5 total ships across territory', () => {
    const state = createAiState({
      planets: [
        { id: 'p_ai', name: 'AI Remnant', x: 100, y: 100, radius: 30, maxShips: 100, ships: 3, owner: 'ai1', type: 'standard', productionRate: 1, pulsePhase: 0 },
        { id: 'p_neutral', name: 'Neutral', x: 200, y: 200, radius: 30, maxShips: 100, ships: 10, owner: 'neutral', type: 'standard', productionRate: 1, pulsePhase: 0 },
      ]
    });

    let launchCount = 0;
    for (let i = 0; i < 20; i++) {
      runAIDecisions(state, 0.5, ['player'], () => {
        launchCount++;
      });
    }

    expect(launchCount).toBe(0);
  });

  it('should trigger onAILaunch callback targeting vulnerable neutral or enemy planets', () => {
    const state = createAiState();
    const launches: Array<{ sources: string[]; target: string; ratio: number; faction: FactionId }> = [];

    // Run multiple decision cycles to overcome Math.random() throttle
    for (let i = 0; i < 30; i++) {
      runAIDecisions(state, 0.5, ['player'], (sources, target, ratio, faction) => {
        launches.push({ sources, target, ratio, faction });
      });
    }

    expect(launches.length).toBeGreaterThan(0);
    const validTargets = ['p_player', 'p_neutral', 'p_ai_front'];
    launches.forEach(l => {
      expect(l.faction).toBe('ai1');
      expect(validTargets).toContain(l.target);
      expect(l.ratio).toBeGreaterThan(0);
    });
  });

  it('should automatically fire ready BFG superweapons (charge >= 18) at highest-threat enemy planet', () => {
    const state = createAiState({
      planets: [
        { id: 'p_bfg', name: 'AI BFG Core', x: 100, y: 100, radius: 45, maxShips: 100, ships: 50, owner: 'ai1', type: 'bfg', productionRate: 0, pulsePhase: 0, bfgCharge: 18, bfgCooldown: 0 },
        { id: 'p_player_huge', name: 'Player Fortress', x: 500, y: 100, radius: 40, maxShips: 100, ships: 80, owner: 'player', type: 'standard', productionRate: 1, pulsePhase: 0 },
        { id: 'p_ai2', name: 'AI2 Outpost', x: 300, y: 400, radius: 30, maxShips: 100, ships: 15, owner: 'ai2', type: 'standard', productionRate: 1, pulsePhase: 0 }
      ]
    });

    const nextState = runAIDecisions(state, 0.5, ['player']);
    const bfg = nextState.planets.find(p => p.id === 'p_bfg');

    expect(bfg).toBeDefined();
    // Warmup timer initiated (0.65s) targeting the highest threat (Player with 80 ships)
    expect(bfg?.bfgWarmupTimer).toBeDefined();
    expect(bfg?.bfgWarmupTarget?.targetPlanetId).toBe('p_player_huge');
  });

  it('should funnel backline reinforcements forward to contested front-line planets', () => {
    const state = createAiState({
      planets: [
        { id: 'p_player', name: 'Player Front', x: 100, y: 100, radius: 30, maxShips: 100, ships: 50, owner: 'player', type: 'standard', productionRate: 1, pulsePhase: 0 },
        { id: 'p_front', name: 'AI Frontline', x: 200, y: 100, radius: 30, maxShips: 100, ships: 10, owner: 'ai1', type: 'standard', productionRate: 1, pulsePhase: 0 },
        { id: 'p_back', name: 'AI Secure Backline', x: 900, y: 100, radius: 30, maxShips: 100, ships: 40, owner: 'ai1', type: 'standard', productionRate: 1, pulsePhase: 0 },
      ]
    });

    let reinforcementSent = false;
    for (let i = 0; i < 40; i++) {
      runAIDecisions(state, 0.5, ['player'], (sources, target, _ratio, faction) => {
        if (sources.includes('p_back') && target === 'p_front' && faction === 'ai1') {
          reinforcementSent = true;
        }
      });
    }

    expect(reinforcementSent).toBe(true);
  });
});
