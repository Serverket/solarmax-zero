import { describe, it, expect } from 'bun:test';
import { updatePhysics, launchFleets } from '../src/engine/physics';
import type { GameState, Planet, Spark, Laser } from '../src/types/game';

describe('2. Physics & Combat Engine Unit Tests', () => {
  const createBasePlanet = (id: string, x: number, y: number, owner: 'player' | 'ai1' | 'neutral', ships: number): Planet => ({
    id,
    name: `Planet ${id}`,
    x,
    y,
    radius: 25,
    maxShips: 100,
    ships,
    owner,
    type: 'standard',
    productionRate: 1.5,
    captureProgress: 0,
    capturingFaction: null,
    inCombat: false,
    pulsePhase: 0,
  });

  it('should launch correct number of ships based on percentage', () => {
    const planets: Planet[] = [
      createBasePlanet('p1', 100, 100, 'player', 50),
      createBasePlanet('p2', 300, 300, 'ai1', 20),
    ];

    const initialState: GameState = {
      planets,
      ships: [],
      sparks: [],
      lasers: [],
      screenShake: 0,
    };

    // 50% launch of 50 ships = 25 ships
    const nextState = launchFleets(['p1'], 'p2', initialState, 0.5);

    expect(nextState.planets[0].ships).toBe(25);
    expect(nextState.ships.length).toBe(25);
    expect(nextState.ships[0].faction).toBe('player');
    expect(nextState.ships[0].targetPlanetId).toBe('p2');
  });

  it('should strictly enforce spark cap (MAX_SPARKS = 120) and prevent exponential explosion', () => {
    const planets: Planet[] = [
      createBasePlanet('p1', 100, 100, 'player', 10),
      createBasePlanet('p2', 120, 120, 'ai1', 10),
    ];

    // Seed 150 sparks (exceeding cap)
    const sparks: Spark[] = Array.from({ length: 150 }, (_, i) => ({
      x: 100 + i,
      y: 100 + i,
      vx: (Math.random() - 0.5) * 50,
      vy: (Math.random() - 0.5) * 50,
      life: 0.5,
      maxLife: 0.5,
      color: '#00f0ff',
      type: 'spark' as const,
    }));

    const state: GameState = {
      planets,
      ships: [],
      sparks,
      lasers: [],
      screenShake: 0,
    };

    // Run 10 physics ticks
    let cur = state;
    for (let i = 0; i < 10; i++) {
      cur = updatePhysics(cur, 0.016);
    }

    // Must be capped at or below MAX_SPARKS = 120
    expect(cur.sparks.length).toBeLessThanOrEqual(120);
  });

  it('should strictly enforce laser cap (MAX_LASERS = 50)', () => {
    const planets: Planet[] = [
      createBasePlanet('p1', 100, 100, 'player', 10),
      createBasePlanet('p2', 120, 120, 'ai1', 10),
    ];

    const lasers: Laser[] = Array.from({ length: 80 }, (_, i) => ({
      id: `laser_${i}`,
      x: 100,
      y: 100,
      vx: 100,
      vy: 100,
      life: 0.8,
      maxLife: 0.8,
      color: '#00f0ff',
      faction: 'player' as const,
      sourcePlanetId: 'p1',
      targetPlanetId: 'p2',
    }));

    const state: GameState = {
      planets,
      ships: [],
      sparks: [],
      lasers,
      screenShake: 0,
    };

    const cur = updatePhysics(state, 0.016);
    expect(cur.lasers.length).toBeLessThanOrEqual(50);
  });

  it('should rapidly decay laser lifespan when target ship is eliminated (<= 0.08s)', () => {
    const planets: Planet[] = [
      createBasePlanet('p1', 100, 100, 'player', 10),
      createBasePlanet('p2', 400, 400, 'ai1', 10),
    ];

    // Laser targeting ship "dead_ship_999" which does NOT exist in state.ships
    const lasers: Laser[] = [{
      id: 'test_laser',
      x: 100,
      y: 100,
      vx: 100,
      vy: 100,
      life: 0.8,
      maxLife: 0.8,
      color: '#00f0ff',
      faction: 'player',
      targetId: 'dead_ship_999',
    }];

    const state: GameState = {
      planets,
      ships: [], // dead_ship_999 is missing
      sparks: [],
      lasers,
      screenShake: 0,
    };

    const cur = updatePhysics(state, 0.016);
    // Lifespan must have dropped to <= 0.08s
    if (cur.lasers.length > 0) {
      expect(cur.lasers[0].life).toBeLessThanOrEqual(0.08);
    }
  });

  it('should gradually decay capture progress when occupying fleet leaves', () => {
    const planet = createBasePlanet('p1', 100, 100, 'neutral', 0);
    planet.captureProgress = 0.8;
    planet.capturingFaction = 'player';

    const state: GameState = {
      planets: [planet],
      ships: [], // no player ships present
      sparks: [],
      lasers: [],
      screenShake: 0,
    };

    const nextState = updatePhysics(state, 0.1);
    expect(nextState.planets[0].captureProgress).toBeLessThan(0.8);
  });
});
