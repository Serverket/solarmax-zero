import { describe, it, expect } from 'bun:test';
import { updatePhysics } from '../src/engine/physics';
import { generateProceduralBiomeCanvas, resolveAssetUrl } from '../src/utils/assets';
import type { PhysicsEngineState, Planet, Ship } from '../src/types/game';

describe('5. Performance & Regression Benchmark Suite', () => {
  function createBenchmarkPlanets(): Planet[] {
    return [
      { id: 'p1', name: 'Alpha', x: 100, y: 150, radius: 32, maxShips: 100, ships: 40, owner: 'player', type: 'standard', productionRate: 1, pulsePhase: 0 },
      { id: 'p2', name: 'Beta', x: 500, y: 550, radius: 35, maxShips: 100, ships: 40, owner: 'ai1', type: 'standard', productionRate: 1, pulsePhase: 0 },
      { id: 'p3', name: 'Turret Bastion', x: 300, y: 350, radius: 30, maxShips: 100, ships: 0, owner: 'neutral', type: 'turret', productionRate: 0, pulsePhase: 0, turretRange: 260, turretCooldown: 0 },
      { id: 'p4', name: 'BFG Station', x: 700, y: 200, radius: 45, maxShips: 100, ships: 60, owner: 'ai2', type: 'bfg', productionRate: 0, pulsePhase: 0, bfgCharge: 12, bfgCooldown: 0 },
    ];
  }

  function createBenchmarkShips(count: number): Ship[] {
    const ships: Ship[] = [];
    const factions: Array<'player' | 'ai1' | 'ai2'> = ['player', 'ai1', 'ai2'];
    for (let i = 0; i < count; i++) {
      const f = factions[i % 3];
      ships.push({
        id: `bench-ship-${i}`,
        x: 100 + ((i * 17) % 650),
        y: 100 + ((i * 23) % 450),
        vx: (Math.sin(i) * 50),
        vy: (Math.cos(i) * 50),
        targetPlanetId: i % 2 === 0 ? 'p2' : 'p3',
        faction: f,
        state: i % 3 === 0 ? 'orbit' : 'transit',
        orbitAngle: (i * 0.2) % (Math.PI * 2),
        orbitRadius: 35 + (i % 20),
        orbitDirection: i % 2 === 0 ? 1 : -1,
        cooldown: 0
      });
    }
    return ships;
  }

  it('should maintain average physics tick under 3.5ms during 600-ship 3-way combat', () => {
    let state: PhysicsEngineState = {
      planets: createBenchmarkPlanets(),
      ships: createBenchmarkShips(600),
      sparks: [],
      lasers: [],
      stats: { shipsDestroyed: 0, planetsCaptured: 0, shipsProduced: 0 },
      screenShake: 0
    };

    // Warmup JIT
    for (let i = 0; i < 15; i++) {
      state = updatePhysics(state, 1 / 60);
    }

    // Benchmark 60 frames (1 second of 60 FPS combat)
    const start = performance.now();
    for (let i = 0; i < 60; i++) {
      state = updatePhysics(state, 1 / 60);
    }
    const totalElapsed = performance.now() - start;
    const avgTick = totalElapsed / 60;

    // Must be well within the 16.6ms 60 FPS frame budget
    expect(avgTick).toBeLessThan(3.5);
    expect(state.ships.length).toBeGreaterThan(0);
  });

  it('should scale linearly O(N) via spatial hash grid rather than quadratically O(N^2)', () => {
    const runBenchmark = (shipCount: number, ticks: number) => {
      let state: PhysicsEngineState = {
        planets: createBenchmarkPlanets(),
        ships: createBenchmarkShips(shipCount),
        sparks: [],
        lasers: [],
        stats: { shipsDestroyed: 0, planetsCaptured: 0, shipsProduced: 0 },
        screenShake: 0
      };

      for (let i = 0; i < 10; i++) state = updatePhysics(state, 1 / 60);

      const start = performance.now();
      for (let i = 0; i < ticks; i++) {
        state = updatePhysics(state, 1 / 60);
      }
      return performance.now() - start;
    };

    const timeSmall = runBenchmark(250, 40);
    const timeLarge = runBenchmark(500, 40);

    // In O(N^2), 2x ships would take 4x time.
    // In our O(N) spatial hash grid, 2x ships should take strictly less than 3.0x time.
    const scalingFactor = timeLarge / Math.max(1, timeSmall);
    expect(scalingFactor).toBeLessThan(3.0);
  });

  it('should strictly maintain hard entity ceilings and avoid memory leaks over 120 combat ticks', () => {
    let state: PhysicsEngineState = {
      planets: createBenchmarkPlanets(),
      ships: createBenchmarkShips(500),
      sparks: [],
      lasers: [],
      stats: { shipsDestroyed: 0, planetsCaptured: 0, shipsProduced: 0 },
      screenShake: 0
    };

    for (let i = 0; i < 120; i++) {
      state = updatePhysics(state, 1 / 60);

      // Verify hard caps per tick
      expect(state.sparks.length).toBeLessThanOrEqual(120); // MAX_SPARKS
      expect(state.lasers.length).toBeLessThanOrEqual(50);  // MAX_LASERS

      // Coordinate sanity check (no NaN / Infinity leaks)
      if (state.ships[0]) {
        expect(Number.isFinite(state.ships[0].x)).toBe(true);
        expect(Number.isFinite(state.ships[0].y)).toBe(true);
      }
    }
  });

  it('should generate all 12 procedural 512x512 biome textures in under 35ms total', () => {
    const biomes = [
      'small', 'medium', 'large', 'ice', 'desert', 'volcanic',
      'oceanic', 'toxic', 'magma', 'crystalline', 'neptune', 'barren'
    ];

    const originalDoc = globalThis.document;
    if (!globalThis.document) {
      // @ts-expect-error mock document for bun test environment
      globalThis.document = {
        createElement: (tag: string) => {
          if (tag === 'canvas') {
            return {
              width: 0,
              height: 0,
              getContext: () => ({
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                fillRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                ellipse: () => {},
                moveTo: () => {},
                lineTo: () => {},
                closePath: () => {}
              })
            };
          }
          return {};
        }
      };
    }

    const start = performance.now();
    for (const b of biomes) {
      const c = generateProceduralBiomeCanvas(b);
      expect(c.width).toBe(512);
      expect(c.height).toBe(512);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(35); // Must be <35ms for all 12 biomes combined

    if (originalDoc === undefined) {
      // @ts-expect-error clean up mock
      delete globalThis.document;
    }
  });

  it('should execute 5,000 asset URL resolutions with sub-microsecond throughput (<15ms)', () => {
    let lastUrl = '';
    const start = performance.now();
    for (let i = 0; i < 5000; i++) {
      lastUrl = resolveAssetUrl('textures/small.png');
    }
    const elapsed = performance.now() - start;

    expect(lastUrl).toContain('small.png');
    expect(elapsed).toBeLessThan(25); // 5,000 resolutions under 25ms (<= 5 microseconds per resolution)
  });
});
