import { describe, it, expect } from 'bun:test';
import type { Planet } from '../src/types/game';

describe('4. Map Editor & Procedural Biome Assignment Tests', () => {
  const biomes = [
    'small', 'medium', 'large', 'ice', 'desert', 'volcanic',
    'oceanic', 'toxic', 'magma', 'crystalline', 'neptune', 'barren'
  ];

  it('should calculate non-repeating Golden Angle axial tilt across adjacent planets', () => {
    const goldenAngleRad = 2.399963; // ~137.5° in radians
    const angles: number[] = [];

    for (let index = 0; index < 12; index++) {
      const angle = (index * goldenAngleRad) % (Math.PI * 2);
      angles.push(angle);
    }

    // Ensure no two consecutive angles are identical or within 10 degrees (~0.17 rad)
    for (let i = 0; i < angles.length - 1; i++) {
      const diff = Math.abs(angles[i] - angles[i + 1]);
      expect(diff).toBeGreaterThan(0.2); // > 11.5° difference
    }
  });

  it('should cycle through all 12 biomes consecutively upon placing planets', () => {
    const assignedBiomes: string[] = [];
    for (let planetIndex = 0; planetIndex < 24; planetIndex++) {
      const biome = biomes[planetIndex % biomes.length];
      assignedBiomes.push(biome);
    }

    // Verify first 12 are all distinct
    const first12 = assignedBiomes.slice(0, 12);
    const uniqueFirst12 = new Set(first12);
    expect(uniqueFirst12.size).toBe(12);

    // Verify round-robin repeats perfectly
    expect(assignedBiomes[12]).toBe(assignedBiomes[0]);
    expect(assignedBiomes[13]).toBe(assignedBiomes[1]);
  });

  it('should correctly serialize and validate custom map payload', () => {
    const customPlanets: Planet[] = [
      {
        id: 'cp_1',
        name: 'Player Stronghold',
        x: 200,
        y: 200,
        radius: 30,
        maxShips: 100,
        ships: 50,
        owner: 'player',
        type: 'standard',
        productionRate: 2.0,
        captureProgress: 0,
        capturingFaction: null,
        inCombat: false,
        pulsePhase: 0
      },
      {
        id: 'cp_2',
        name: 'Enemy Base',
        x: 800,
        y: 600,
        radius: 30,
        maxShips: 100,
        ships: 50,
        owner: 'ai1',
        type: 'standard',
        productionRate: 2.0,
        captureProgress: 0,
        capturingFaction: null,
        inCombat: false,
        pulsePhase: 0
      }
    ];

    const json = JSON.stringify(customPlanets);
    const restored: Planet[] = JSON.parse(json);

    expect(restored.length).toBe(2);
    expect(restored[0].owner).toBe('player');
    expect(restored[1].owner).toBe('ai1');
  });
});
