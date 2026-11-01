import { describe, it, expect } from 'bun:test';
import { CAMPAIGN_LEVELS, MOTHERSHIP_LEVELS, FACTIONS } from '../src/utils/levels';

describe('3. Campaign & Mission Levels Integrity Tests', () => {
  it('should verify all 36 Campaign levels are well-formed and playable', () => {
    expect(CAMPAIGN_LEVELS.length).toBe(36);

    CAMPAIGN_LEVELS.forEach(lvl => {
      expect(lvl.id).toBeTruthy();
      expect(lvl.name).toBeTruthy();
      expect(lvl.width).toBeGreaterThan(0);
      expect(lvl.height).toBeGreaterThan(0);
      expect(lvl.planets.length).toBeGreaterThanOrEqual(2);

      // Verify at least one player planet exists
      const hasPlayer = lvl.planets.some(p => p.owner === 'player');
      expect(hasPlayer).toBe(true);

      // Verify at least one non-player, non-neutral enemy exists
      const hasEnemy = lvl.planets.some(p => p.owner !== 'player' && p.owner !== 'neutral');
      expect(hasEnemy).toBe(true);

      // Check all coordinates and radius are within bounds
      lvl.planets.forEach(p => {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(lvl.width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(lvl.height);
        expect(p.radius).toBeGreaterThanOrEqual(10);
      });
    });
  });

  it('should verify all Mothership levels are valid and include colossal stations', () => {
    expect(MOTHERSHIP_LEVELS.length).toBe(7);

    MOTHERSHIP_LEVELS.forEach(lvl => {
      expect(lvl.id.startsWith('m_lvl')).toBe(true);
      expect(lvl.planets.length).toBeGreaterThanOrEqual(3);

      const hasPlayer = lvl.planets.some(p => p.owner === 'player');
      expect(hasPlayer).toBe(true);

      // Verify portal linkage consistency
      const portals = lvl.planets.filter(p => p.type === 'portal');
      portals.forEach(p => {
        if (p.portalTargetId) {
          const targetExists = lvl.planets.some(other => other.id === p.portalTargetId);
          expect(targetExists).toBe(true);
        }
      });
    });
  });

  it('should verify all 6 factions have valid hex colors and configurations', () => {
    const factionIds = ['player', 'ai1', 'ai2', 'ai3', 'ai4', 'neutral'] as const;

    factionIds.forEach(fid => {
      const f = FACTIONS[fid];
      expect(f).toBeDefined();
      expect(f.id).toBe(fid);
      expect(f.color.startsWith('#')).toBe(true);
      expect(f.color.length).toBe(7); // e.g. #00f0ff
    });
  });
});
