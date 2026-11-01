import { describe, it, expect } from 'bun:test';
import { updatePhysics, launchFleets, fireBfgPlanet, executeBfgFire } from '../src/engine/physics';
import type { PhysicsEngineState, Planet, Ship, Spark } from '../src/types/game';

describe('7. Superweapons, Defensive Turrets & Hyperspace Portals Tests', () => {
  function createSuperweaponState(): PhysicsEngineState {
    const planets: Planet[] = [
      { id: 'p_bfg', name: 'BFG Station', x: 100, y: 100, radius: 45, maxShips: 100, ships: 50, owner: 'player', type: 'bfg', productionRate: 0, pulsePhase: 0, bfgCharge: 18, bfgCooldown: 0 },
      { id: 'p_target', name: 'Enemy Stronghold', x: 600, y: 100, radius: 40, maxShips: 100, ships: 100, owner: 'ai1', type: 'standard', productionRate: 1, pulsePhase: 0 },
      { id: 'p_turret', name: 'Defense Turret', x: 300, y: 400, radius: 30, maxShips: 100, ships: 0, owner: 'player', type: 'turret', productionRate: 0, pulsePhase: 0, turretRange: 250, turretCooldown: 0 },
      { id: 'p_portal_a', name: 'Alpha Gate', x: 200, y: 300, radius: 30, maxShips: 100, ships: 0, owner: 'player', type: 'portal', productionRate: 0, pulsePhase: 0, portalTargetId: 'p_portal_b' },
      { id: 'p_portal_b', name: 'Omega Gate', x: 800, y: 300, radius: 30, maxShips: 100, ships: 0, owner: 'player', type: 'portal', productionRate: 0, pulsePhase: 0, portalTargetId: 'p_portal_a' },
    ];

    return {
      planets,
      ships: [],
      sparks: [],
      lasers: [],
      stats: { shipsDestroyed: 0, planetsCaptured: 0, shipsProduced: 0 },
      screenShake: 0
    };
  }

  it('should charge BFG superweapon over time until reaching 18 maximum charge', () => {
    let state = createSuperweaponState();
    const bfg = state.planets.find(p => p.id === 'p_bfg')!;
    bfg.bfgCharge = 0;

    // Simulate 20 seconds of charging (dt = 1s per tick)
    for (let i = 0; i < 20; i++) {
      state = updatePhysics(state, 1.0);
    }

    const chargedBfg = state.planets.find(p => p.id === 'p_bfg')!;
    expect(chargedBfg.bfgCharge).toBe(18);
  });

  it('should initiate warmup and fire BFG planet obliterating 85% garrison and inflicting 10s EMP', () => {
    let state = createSuperweaponState();

    // Trigger BFG fire
    state = fireBfgPlanet('p_bfg', 'p_target', state);
    const bfg = state.planets.find(p => p.id === 'p_bfg')!;
    expect(bfg.bfgWarmupTimer).toBe(0.65);
    expect(bfg.bfgWarmupTarget?.targetPlanetId).toBe('p_target');

    // Simulate warmup countdown until beam triggers (0.7s)
    state = updatePhysics(state, 0.7);

    const targetPlanet = state.planets.find(p => p.id === 'p_target')!;
    // 100 initial ships -> 15% remaining = 15 ships
    expect(targetPlanet.ships).toBe(15);
    // 10 second EMP paralysis inflicted
    expect(targetPlanet.empTimer).toBeGreaterThanOrEqual(9.0);
    expect(targetPlanet.empTimer).toBeLessThanOrEqual(10.0);
  });

  it('should vaporize in-flight enemy ships crossing the BFG superlaser beam line', () => {
    const state = createSuperweaponState();
    const bfg = state.planets.find(p => p.id === 'p_bfg')!;
    const target = state.planets.find(p => p.id === 'p_target')!;

    // Place an enemy ship directly in the beam trajectory (x: 350, y: 100)
    const inBeamShip: Ship = {
      id: 'doomed-enemy',
      x: 350,
      y: 100,
      vx: 0,
      vy: 10,
      targetPlanetId: 'p_bfg',
      faction: 'ai1',
      state: 'transit',
      cooldown: 0
    };

    // Place another enemy ship far away from beam line (x: 350, y: 400)
    const safeShip: Ship = {
      id: 'safe-enemy',
      x: 350,
      y: 400,
      vx: 0,
      vy: 10,
      targetPlanetId: 'p_bfg',
      faction: 'ai1',
      state: 'transit',
      cooldown: 0
    };

    const ships = [inBeamShip, safeShip];
    const sparks: Spark[] = [];

    const { inFlightVaporized } = executeBfgFire(bfg, target, ships, sparks);

    expect(inFlightVaporized).toBe(1);
    expect(inBeamShip.vx).toBe(99999); // Destroyed flag
    expect(safeShip.vx).toBe(0);       // Untouched
  });

  it('should disable production and defense when planet is under EMP paralysis', () => {
    let state = createSuperweaponState();
    const target = state.planets.find(p => p.id === 'p_target')!;
    target.empTimer = 5.0; // 5s active EMP
    target.ships = 20;

    // Simulate 2 seconds of physics
    state = updatePhysics(state, 2.0);

    const empTarget = state.planets.find(p => p.id === 'p_target')!;
    // Ships should NOT have increased because production is frozen
    expect(empTarget.ships).toBe(20);
    expect(empTarget.empTimer).toBeCloseTo(3.0, 1);
  });

  it('should route fleets through hyperspace portals when warp distance is shorter', () => {
    const state = createSuperweaponState();
    const sourcePlanet: Planet = {
      id: 'p_source',
      name: 'Source Base',
      x: 180,
      y: 300,
      radius: 30,
      maxShips: 100,
      ships: 30,
      owner: 'player',
      type: 'standard',
      productionRate: 1,
      pulsePhase: 0
    };

    const destPlanet: Planet = {
      id: 'p_dest',
      name: 'Far Destination',
      x: 850,
      y: 300,
      radius: 30,
      maxShips: 100,
      ships: 10,
      owner: 'ai1',
      type: 'standard',
      productionRate: 1,
      pulsePhase: 0
    };

    state.planets.push(sourcePlanet, destPlanet);

    // Launch fleet from p_source to p_dest.
    // Direct distance: 850 - 180 = 670px.
    // Portal route: source to Alpha Gate (20px) + warp (100px penalty) + Omega Gate to dest (50px) = 170px!
    const nextState = launchFleets([sourcePlanet.id], destPlanet.id, state, 0.5);

    expect(nextState.ships.length).toBeGreaterThan(0);
    const launchedShip = nextState.ships.find(s => s.sourcePlanetId === sourcePlanet.id);
    expect(launchedShip).toBeDefined();
    // Must be routed to Alpha Gate first with final target set to destPlanet!
    expect(launchedShip?.targetPlanetId).toBe('p_portal_a');
    expect(launchedShip?.finalTargetId).toBe(destPlanet.id);
  });

  it('should lock onto and fire at the closest enemy within turret engagement range', () => {
    let state = createSuperweaponState();

    const enemyShip: Ship = {
      id: 'infiltrator',
      x: 320,
      y: 400,
      vx: 0,
      vy: 0,
      targetPlanetId: 'p_turret',
      faction: 'ai1',
      state: 'transit',
      cooldown: 0
    };

    state.ships.push(enemyShip);

    // Run 1 tick
    state = updatePhysics(state, 1 / 60);

    const turret = state.planets.find(p => p.id === 'p_turret')!;
    expect(turret.inCombat).toBe(true);
    expect(turret.targetLockId).toBe('infiltrator');
  });
});
