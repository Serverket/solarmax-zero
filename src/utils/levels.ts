import type { FactionInfo, FactionId, LevelConfig, Planet, PlanetType } from '../types/game';

export const FACTIONS: Record<FactionId, FactionInfo> = {
  player: { id: 'player', name: 'Blue', color: '#4488ff', isAI: false },
  ai1: { id: 'ai1', name: 'Red', color: '#ff4444', isAI: true },
  ai2: { id: 'ai2', name: 'Green', color: '#44ff44', isAI: true },
  ai3: { id: 'ai3', name: 'Yellow', color: '#ffdd44', isAI: true },
  ai4: { id: 'ai4', name: 'Purple', color: '#cc44ff', isAI: true },
  neutral: { id: 'neutral', name: 'Neutral', color: '#888888', isAI: false },
};

let planetIdCounter = 0;
function mkPlanet(
  x: number, y: number, radius: number, owner: FactionId,
  ships: number, maxShips: number, type: PlanetType = 'standard',
  productionRate?: number, portalTargetId?: string, turretRange?: number
): Planet {
  return {
    id: `p${planetIdCounter++}`,
    name: `Planet ${planetIdCounter}`,
    x, y, radius, owner, ships, maxShips, type,
    productionRate: productionRate ?? (1.0 + (radius - 25) * 0.03),
    portalTargetId,
    turretRange,
    captureProgress: 0,
    capturingFaction: null,
    inCombat: false,
    pulsePhase: Math.random() * 4,
  };
}

function generateLevel(
  id: string, name: string, description: string, difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane',
  planets: Planet[], activeFactions: FactionId[]
): LevelConfig {
  // Auto-link portals cyclically
  const portals = planets.filter(p => p.type === 'portal');
  if (portals.length > 1) {
    for (let i = 0; i < portals.length; i++) {
      portals[i].portalTargetId = portals[(i + 1) % portals.length].id;
    }
  }
  return { id, name, description, difficulty, width: 1200, height: 800, planets, activeFactions };
}

// Helper to create symmetric 2-faction levels
function twoFactionLevel(
  id: string, name: string, desc: string, diff: 'Easy' | 'Medium' | 'Hard' | 'Insane',
  neutrals: { x: number; y: number; r: number; ships: number; max: number; type?: PlanetType }[]
): LevelConfig {
  planetIdCounter = 0;
  const planets = [
    mkPlanet(150, 400, 32, 'player', 20, 50),
    mkPlanet(1050, 400, 32, 'ai1', 20, 50),
    ...neutrals.map(n => mkPlanet(n.x, n.y, n.r, 'neutral', n.ships, n.max, n.type)),
  ];
  return generateLevel(id, name, desc, diff, planets, ['player', 'ai1']);
}

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  // Easy levels 1-12
  twoFactionLevel('lvl1', 'First Contact', 'Capture all planets.', 'Easy', []),
  twoFactionLevel('lvl2', 'Expansion', 'Two neutral planets to claim.', 'Easy', [
    { x: 400, y: 300, r: 26, ships: 5, max: 40 },
    { x: 800, y: 500, r: 26, ships: 5, max: 40 },
  ]),
  twoFactionLevel('lvl3', 'Crossroads', 'Fight for the center.', 'Easy', [
    { x: 600, y: 400, r: 36, ships: 10, max: 60 },
    { x: 400, y: 200, r: 24, ships: 5, max: 35 },
    { x: 800, y: 600, r: 24, ships: 5, max: 35 },
  ]),
  twoFactionLevel('lvl4', 'Outposts', 'Scattered neutral outposts.', 'Easy', [
    { x: 350, y: 250, r: 22, ships: 5, max: 30 },
    { x: 600, y: 400, r: 28, ships: 8, max: 45 },
    { x: 850, y: 550, r: 22, ships: 5, max: 30 },
    { x: 400, y: 600, r: 24, ships: 6, max: 35 },
  ]),
  twoFactionLevel('lvl5', 'The Forge', 'A central forge world.', 'Easy', [
    { x: 600, y: 400, r: 40, ships: 15, max: 80 },
    { x: 300, y: 300, r: 24, ships: 5, max: 35 },
    { x: 900, y: 500, r: 24, ships: 5, max: 35 },
  ]),
  twoFactionLevel('lvl6', 'Turret Defense', 'A turret station in the middle.', 'Easy', [
    { x: 600, y: 400, r: 30, ships: 8, max: 50, type: 'turret' },
    { x: 400, y: 250, r: 24, ships: 5, max: 35 },
    { x: 800, y: 550, r: 24, ships: 5, max: 35 },
  ]),
  twoFactionLevel('lvl7', 'Cluster', 'A cluster of small worlds.', 'Easy', [
    { x: 400, y: 200, r: 20, ships: 4, max: 28 },
    { x: 600, y: 300, r: 22, ships: 5, max: 32 },
    { x: 800, y: 200, r: 20, ships: 4, max: 28 },
    { x: 400, y: 600, r: 20, ships: 4, max: 28 },
    { x: 600, y: 500, r: 22, ships: 5, max: 32 },
    { x: 800, y: 600, r: 20, ships: 4, max: 28 },
  ]),
  twoFactionLevel('lvl8', 'Gateway', 'Portal gates connect distant worlds.', 'Easy', [
    { x: 300, y: 400, r: 26, ships: 5, max: 40, type: 'portal' },
    { x: 900, y: 400, r: 26, ships: 5, max: 40, type: 'portal' },
    { x: 600, y: 400, r: 30, ships: 10, max: 50 },
  ]),
  twoFactionLevel('lvl9', 'Ring', 'Planets in a ring formation.', 'Easy', [
    { x: 600, y: 200, r: 24, ships: 6, max: 35 },
    { x: 900, y: 300, r: 24, ships: 6, max: 35 },
    { x: 900, y: 500, r: 24, ships: 6, max: 35 },
    { x: 600, y: 600, r: 24, ships: 6, max: 35 },
    { x: 300, y: 500, r: 24, ships: 6, max: 35 },
    { x: 300, y: 300, r: 24, ships: 6, max: 35 },
  ]),
  twoFactionLevel('lvl10', 'Stronghold', 'A heavily defended neutral world.', 'Easy', [
    { x: 600, y: 400, r: 44, ships: 25, max: 90 },
    { x: 400, y: 250, r: 22, ships: 5, max: 30 },
    { x: 800, y: 550, r: 22, ships: 5, max: 30 },
    { x: 350, y: 550, r: 20, ships: 4, max: 28 },
    { x: 850, y: 250, r: 20, ships: 4, max: 28 },
  ]),
  twoFactionLevel('lvl11', 'Triangle', 'Three large worlds to contest.', 'Easy', [
    { x: 600, y: 250, r: 34, ships: 12, max: 60 },
    { x: 400, y: 550, r: 34, ships: 12, max: 60 },
    { x: 800, y: 550, r: 34, ships: 12, max: 60 },
  ]),
  twoFactionLevel('lvl12', 'Maze', 'Navigate through scattered worlds.', 'Easy', [
    { x: 300, y: 200, r: 22, ships: 5, max: 30 },
    { x: 500, y: 300, r: 22, ships: 5, max: 30 },
    { x: 700, y: 300, r: 22, ships: 5, max: 30 },
    { x: 900, y: 200, r: 22, ships: 5, max: 30 },
    { x: 300, y: 600, r: 22, ships: 5, max: 30 },
    { x: 500, y: 500, r: 22, ships: 5, max: 30 },
    { x: 700, y: 500, r: 22, ships: 5, max: 30 },
    { x: 900, y: 600, r: 22, ships: 5, max: 30 },
  ]),

  // Medium levels 13-24 (3 factions)
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl13', 'Three Way', 'Three factions compete.', 'Medium', [
      mkPlanet(150, 400, 32, 'player', 20, 50),
      mkPlanet(1050, 200, 32, 'ai1', 20, 50),
      mkPlanet(1050, 600, 32, 'ai2', 20, 50),
      mkPlanet(600, 400, 30, 'neutral', 10, 50),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl14', 'Crossfire', 'Caught between two enemies.', 'Medium', [
      mkPlanet(150, 400, 32, 'player', 20, 50),
      mkPlanet(1050, 400, 32, 'ai1', 20, 50),
      mkPlanet(600, 150, 30, 'ai2', 15, 45),
      mkPlanet(600, 650, 30, 'neutral', 10, 45),
      mkPlanet(400, 400, 24, 'neutral', 5, 35),
      mkPlanet(800, 400, 24, 'neutral', 5, 35),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl15', 'Fortress', 'Turret stations guard key points.', 'Medium', [
      mkPlanet(150, 400, 32, 'player', 20, 50),
      mkPlanet(1050, 400, 32, 'ai1', 20, 50),
      mkPlanet(600, 200, 28, 'ai2', 15, 45, 'turret'),
      mkPlanet(600, 600, 28, 'neutral', 10, 45, 'turret'),
      mkPlanet(400, 400, 22, 'neutral', 5, 30),
      mkPlanet(800, 400, 22, 'neutral', 5, 30),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl16', 'Warp Network', 'Portals connect the battlefield.', 'Medium', [
      mkPlanet(150, 400, 32, 'player', 20, 50),
      mkPlanet(1050, 400, 32, 'ai1', 20, 50),
      mkPlanet(300, 200, 26, 'neutral', 8, 40, 'portal'),
      mkPlanet(900, 600, 26, 'neutral', 8, 40, 'portal'),
      mkPlanet(600, 400, 30, 'ai2', 15, 50),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl17', 'Scramble', 'Many small worlds, fast expansion.', 'Medium', [
      mkPlanet(150, 400, 30, 'player', 15, 45),
      mkPlanet(1050, 200, 30, 'ai1', 15, 45),
      mkPlanet(1050, 600, 30, 'ai2', 15, 45),
      ...[200, 400, 600, 800].flatMap(x =>
        [200, 400, 600].map(y => mkPlanet(x, y, 20, 'neutral', 4, 25))
      ).filter((_, i) => i % 3 !== 0),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl18', 'Islands', 'Isolated clusters of planets.', 'Medium', [
      mkPlanet(150, 200, 28, 'player', 15, 45),
      mkPlanet(1050, 600, 28, 'ai1', 15, 45),
      mkPlanet(600, 400, 28, 'ai2', 15, 45),
      mkPlanet(300, 200, 22, 'neutral', 5, 30),
      mkPlanet(150, 350, 22, 'neutral', 5, 30),
      mkPlanet(900, 600, 22, 'neutral', 5, 30),
      mkPlanet(1050, 450, 22, 'neutral', 5, 30),
      mkPlanet(500, 400, 22, 'neutral', 5, 30),
      mkPlanet(700, 400, 22, 'neutral', 5, 30),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl19', 'The Wall', 'A wall of turret stations.', 'Medium', [
      mkPlanet(150, 400, 32, 'player', 20, 50),
      mkPlanet(1050, 400, 32, 'ai1', 20, 50),
      mkPlanet(400, 200, 26, 'ai2', 12, 40),
      mkPlanet(400, 600, 26, 'neutral', 8, 40),
      mkPlanet(600, 300, 24, 'neutral', 6, 35, 'turret'),
      mkPlanet(600, 500, 24, 'neutral', 6, 35, 'turret'),
      mkPlanet(800, 400, 24, 'neutral', 6, 35),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl20', 'Corridor', 'A narrow path to victory.', 'Medium', [
      mkPlanet(150, 400, 30, 'player', 18, 48),
      mkPlanet(1050, 400, 30, 'ai1', 18, 48),
      mkPlanet(350, 400, 24, 'neutral', 6, 35),
      mkPlanet(500, 300, 24, 'ai2', 10, 35),
      mkPlanet(500, 500, 24, 'neutral', 6, 35),
      mkPlanet(700, 300, 24, 'neutral', 6, 35),
      mkPlanet(700, 500, 24, 'neutral', 6, 35),
      mkPlanet(850, 400, 24, 'neutral', 6, 35),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl21', 'Double Portal', 'Two pairs of portals.', 'Medium', [
      mkPlanet(150, 400, 30, 'player', 18, 48),
      mkPlanet(1050, 400, 30, 'ai1', 18, 48),
      mkPlanet(300, 200, 24, 'neutral', 5, 35, 'portal'),
      mkPlanet(900, 200, 24, 'neutral', 5, 35, 'portal'),
      mkPlanet(300, 600, 24, 'neutral', 5, 35, 'portal'),
      mkPlanet(900, 600, 24, 'neutral', 5, 35, 'portal'),
      mkPlanet(600, 400, 30, 'ai2', 15, 50),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl22', 'Swarm', 'Many tiny planets, rapid production.', 'Medium', [
      mkPlanet(150, 400, 28, 'player', 15, 45),
      mkPlanet(1050, 400, 28, 'ai1', 15, 45),
      mkPlanet(600, 150, 26, 'ai2', 12, 40),
      mkPlanet(600, 650, 26, 'neutral', 8, 40),
      ...Array.from({ length: 6 }, (_, i) =>
        mkPlanet(300 + (i % 3) * 300, 250 + Math.floor(i / 3) * 250, 18, 'neutral', 3, 22)
      ),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl23', 'Citadel', 'A massive fortress world.', 'Medium', [
      mkPlanet(150, 400, 30, 'player', 18, 48),
      mkPlanet(1050, 400, 30, 'ai1', 18, 48),
      mkPlanet(600, 400, 48, 'ai2', 30, 100),
      mkPlanet(400, 250, 22, 'neutral', 5, 30),
      mkPlanet(800, 550, 22, 'neutral', 5, 30),
      mkPlanet(400, 550, 22, 'neutral', 5, 30),
      mkPlanet(800, 250, 22, 'neutral', 5, 30),
    ], ['player', 'ai1', 'ai2']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl24', 'Gauntlet', 'Multiple turrets and portals.', 'Medium', [
      mkPlanet(150, 400, 30, 'player', 18, 48),
      mkPlanet(1050, 400, 30, 'ai1', 18, 48),
      mkPlanet(600, 200, 26, 'ai2', 15, 42, 'turret'),
      mkPlanet(600, 600, 26, 'neutral', 10, 42, 'turret'),
      mkPlanet(350, 400, 22, 'neutral', 5, 30, 'portal'),
      mkPlanet(850, 400, 22, 'neutral', 5, 30, 'portal'),
    ], ['player', 'ai1', 'ai2']);
  })(),

  // Hard levels 25-30 (4 factions)
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl25', 'Four Corners', 'Four factions, four corners.', 'Hard', [
      mkPlanet(150, 200, 30, 'player', 18, 48),
      mkPlanet(1050, 200, 30, 'ai1', 18, 48),
      mkPlanet(150, 600, 30, 'ai2', 18, 48),
      mkPlanet(1050, 600, 30, 'ai3', 18, 48),
      mkPlanet(600, 400, 32, 'neutral', 15, 55),
    ], ['player', 'ai1', 'ai2', 'ai3']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl26', 'Pincer', 'Surrounded on all sides.', 'Hard', [
      mkPlanet(600, 400, 30, 'player', 20, 48),
      mkPlanet(150, 200, 28, 'ai1', 15, 45),
      mkPlanet(1050, 200, 28, 'ai2', 15, 45),
      mkPlanet(150, 600, 28, 'ai3', 15, 45),
      mkPlanet(1050, 600, 28, 'neutral', 10, 45),
      mkPlanet(400, 300, 22, 'neutral', 5, 30),
      mkPlanet(800, 500, 22, 'neutral', 5, 30),
    ], ['player', 'ai1', 'ai2', 'ai3']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl27', 'Arms Race', 'Turret stations everywhere.', 'Hard', [
      mkPlanet(150, 400, 30, 'player', 18, 48),
      mkPlanet(1050, 400, 30, 'ai1', 18, 48),
      mkPlanet(400, 200, 26, 'ai2', 12, 40, 'turret'),
      mkPlanet(800, 600, 26, 'ai3', 12, 40, 'turret'),
      mkPlanet(600, 400, 26, 'neutral', 10, 40, 'turret'),
      mkPlanet(400, 600, 22, 'neutral', 5, 30),
      mkPlanet(800, 200, 22, 'neutral', 5, 30),
    ], ['player', 'ai1', 'ai2', 'ai3']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl28', 'Nexus', 'Central hub with portals.', 'Hard', [
      mkPlanet(150, 400, 28, 'player', 16, 45),
      mkPlanet(1050, 400, 28, 'ai1', 16, 45),
      mkPlanet(600, 150, 28, 'ai2', 16, 45),
      mkPlanet(600, 650, 28, 'ai3', 16, 45),
      mkPlanet(600, 400, 24, 'neutral', 8, 35, 'portal'),
      mkPlanet(350, 400, 22, 'neutral', 5, 30, 'portal'),
      mkPlanet(850, 400, 22, 'neutral', 5, 30, 'portal'),
    ], ['player', 'ai1', 'ai2', 'ai3']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl29', 'Standoff', 'Tense four-way border.', 'Hard', [
      mkPlanet(300, 300, 28, 'player', 16, 45),
      mkPlanet(900, 300, 28, 'ai1', 16, 45),
      mkPlanet(300, 500, 28, 'ai2', 16, 45),
      mkPlanet(900, 500, 28, 'ai3', 16, 45),
      mkPlanet(600, 400, 36, 'neutral', 20, 65),
      mkPlanet(600, 200, 22, 'neutral', 5, 30),
      mkPlanet(600, 600, 22, 'neutral', 5, 30),
    ], ['player', 'ai1', 'ai2', 'ai3']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl30', 'Inferno', 'Heavy combat, many worlds.', 'Hard', [
      mkPlanet(150, 400, 30, 'player', 18, 48),
      mkPlanet(1050, 200, 30, 'ai1', 18, 48),
      mkPlanet(1050, 600, 30, 'ai2', 18, 48),
      mkPlanet(600, 400, 28, 'ai3', 15, 45),
      mkPlanet(400, 250, 22, 'neutral', 5, 30),
      mkPlanet(800, 550, 22, 'neutral', 5, 30),
      mkPlanet(600, 200, 22, 'neutral', 5, 30, 'turret'),
      mkPlanet(600, 600, 22, 'neutral', 5, 30, 'turret'),
    ], ['player', 'ai1', 'ai2', 'ai3']);
  })(),

  // Insane levels 31-36 (5 factions or extreme setups)
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl31', 'Pentagon', 'Five factions at war.', 'Insane', [
      mkPlanet(600, 150, 28, 'player', 15, 45),
      mkPlanet(1050, 300, 28, 'ai1', 15, 45),
      mkPlanet(900, 650, 28, 'ai2', 15, 45),
      mkPlanet(300, 650, 28, 'ai3', 15, 45),
      mkPlanet(150, 300, 28, 'ai4', 15, 45),
      mkPlanet(600, 400, 32, 'neutral', 15, 55),
    ], ['player', 'ai1', 'ai2', 'ai3', 'ai4']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl32', 'Chaos', 'Five factions, many planets.', 'Insane', [
      mkPlanet(200, 200, 26, 'player', 14, 42),
      mkPlanet(1000, 200, 26, 'ai1', 14, 42),
      mkPlanet(1000, 600, 26, 'ai2', 14, 42),
      mkPlanet(200, 600, 26, 'ai3', 14, 42),
      mkPlanet(600, 400, 26, 'ai4', 14, 42),
      mkPlanet(400, 300, 20, 'neutral', 4, 25),
      mkPlanet(800, 300, 20, 'neutral', 4, 25),
      mkPlanet(400, 500, 20, 'neutral', 4, 25),
      mkPlanet(800, 500, 20, 'neutral', 4, 25),
      mkPlanet(600, 250, 20, 'neutral', 4, 25),
      mkPlanet(600, 550, 20, 'neutral', 4, 25),
    ], ['player', 'ai1', 'ai2', 'ai3', 'ai4']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl33', 'Fortress Five', 'Turret stations and five factions.', 'Insane', [
      mkPlanet(200, 400, 28, 'player', 16, 45),
      mkPlanet(1000, 200, 28, 'ai1', 16, 45),
      mkPlanet(1000, 600, 28, 'ai2', 16, 45),
      mkPlanet(200, 200, 28, 'ai3', 16, 45),
      mkPlanet(200, 600, 28, 'ai4', 16, 45),
      mkPlanet(600, 400, 30, 'neutral', 12, 48, 'turret'),
      mkPlanet(600, 200, 24, 'neutral', 6, 35, 'turret'),
      mkPlanet(600, 600, 24, 'neutral', 6, 35, 'turret'),
    ], ['player', 'ai1', 'ai2', 'ai3', 'ai4']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl34', 'Warp Storm', 'Portals everywhere, five factions.', 'Insane', [
      mkPlanet(200, 400, 26, 'player', 14, 42),
      mkPlanet(1000, 400, 26, 'ai1', 14, 42),
      mkPlanet(600, 150, 26, 'ai2', 14, 42),
      mkPlanet(600, 650, 26, 'ai3', 14, 42),
      mkPlanet(400, 400, 22, 'ai4', 10, 35),
      mkPlanet(800, 400, 22, 'neutral', 8, 35),
      mkPlanet(300, 200, 22, 'neutral', 5, 30, 'portal'),
      mkPlanet(900, 200, 22, 'neutral', 5, 30, 'portal'),
      mkPlanet(300, 600, 22, 'neutral', 5, 30, 'portal'),
      mkPlanet(900, 600, 22, 'neutral', 5, 30, 'portal'),
    ], ['player', 'ai1', 'ai2', 'ai3', 'ai4']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl35', 'Overwhelming', 'Outnumbered against all odds.', 'Insane', [
      mkPlanet(150, 400, 28, 'player', 15, 45),
      mkPlanet(400, 200, 30, 'ai1', 20, 50),
      mkPlanet(800, 200, 30, 'ai2', 20, 50),
      mkPlanet(1050, 400, 30, 'ai3', 20, 50),
      mkPlanet(800, 600, 30, 'ai4', 20, 50),
      mkPlanet(400, 600, 30, 'neutral', 15, 50),
      mkPlanet(600, 400, 24, 'neutral', 8, 35),
    ], ['player', 'ai1', 'ai2', 'ai3', 'ai4']);
  })(),
  (() => {
    planetIdCounter = 0;
    return generateLevel('lvl36', 'Final Stand', 'The ultimate battle.', 'Insane', [
      mkPlanet(150, 400, 30, 'player', 20, 48),
      mkPlanet(1050, 150, 30, 'ai1', 20, 48),
      mkPlanet(1050, 400, 30, 'ai2', 20, 48),
      mkPlanet(1050, 650, 30, 'ai3', 20, 48),
      mkPlanet(600, 400, 30, 'ai4', 25, 50, 'turret'),
      mkPlanet(400, 250, 24, 'neutral', 8, 35),
      mkPlanet(400, 550, 24, 'neutral', 8, 35),
      mkPlanet(600, 200, 24, 'neutral', 8, 35, 'portal'),
      mkPlanet(600, 600, 24, 'neutral', 8, 35, 'portal'),
      mkPlanet(800, 250, 22, 'neutral', 5, 30),
      mkPlanet(800, 550, 22, 'neutral', 5, 30),
    ], ['player', 'ai1', 'ai2', 'ai3', 'ai4']);
  })(),
];

export function generateRandomLevel(factionCount: number, planetCount: number): LevelConfig {
  planetIdCounter = 0;
  const factions: FactionId[] = ['player', 'ai1', 'ai2', 'ai3', 'ai4'].slice(0, factionCount) as FactionId[];
  const planets: Planet[] = [];

  // Player starts left, others spread around
  factions.forEach((faction, i) => {
    const angle = (i / factions.length) * Math.PI * 2 - Math.PI / 2;
    const dist = 400;
    const cx = 600 + Math.cos(angle) * dist;
    const cy = 400 + Math.sin(angle) * dist;
    planets.push(mkPlanet(
      Math.max(80, Math.min(1120, cx)),
      Math.max(80, Math.min(720, cy)),
      30, faction, 15, 48
    ));
  });

  // Neutral planets
  const neutralCount = planetCount - factions.length;
  let attempts = 0;
  for (let i = 0; i < neutralCount; i++) {
    let x = 0, y = 0, r = 0;
    let valid = false;
    while (!valid && attempts < 200) {
      attempts++;
      x = 150 + Math.random() * 900;
      y = 120 + Math.random() * 560;
      r = 20 + Math.random() * 14;
      valid = true;
      for (const p of planets) {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p.radius + r + 40) { // 40px minimum gap
          valid = false;
          break;
        }
      }
    }
    
    if (valid) {
      const rand = Math.random();
      const type: PlanetType = rand < 0.1 ? 'turret' : rand < 0.2 ? 'portal' : rand < 0.25 ? 'mothership' : 'standard';
      const rMultiplier = type === 'mothership' ? 1.5 : 1;
      planets.push(mkPlanet(x, y, r * rMultiplier, 'neutral', Math.floor(Math.random() * 8) + 3, Math.floor(r * 2 * rMultiplier), type));
    }
  }

  return generateLevel('skirmish', 'Skirmish', 'Random battle.', 'Medium', planets, factions);
}
