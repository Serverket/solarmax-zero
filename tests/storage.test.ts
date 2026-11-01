import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  getUnlockedLevel, 
  setUnlockedLevel, 
  getMothershipUnlocked, 
  unlockMothership, 
  getLastPlayedLevel, 
  setLastPlayedLevel, 
  getCustomMaps, 
  saveCustomMap, 
  deleteCustomMap,
  type CustomMap
} from '../src/utils/storage';

describe('8. Game Progression & LocalStorage Persistence Tests', () => {
  // Simple in-memory localStorage mock for node/bun runtime
  const storageMap: Record<string, string> = {};

  beforeEach(() => {
    for (const key in storageMap) {
      delete storageMap[key];
    }

    // @ts-expect-error mock localStorage
    globalThis.localStorage = {
      getItem: (k: string) => storageMap[k] ?? null,
      setItem: (k: string, v: string) => { storageMap[k] = v; },
      removeItem: (k: string) => { delete storageMap[k]; },
      clear: () => {
        for (const key in storageMap) delete storageMap[key];
      }
    };
  });

  it('should default unlocked level to 1 and strictly enforce monotonic progression', () => {
    expect(getUnlockedLevel()).toBe(1);

    // Progress to level 5
    setUnlockedLevel(5);
    expect(getUnlockedLevel()).toBe(5);

    // Lower level must be rejected (cannot regress user progress)
    setUnlockedLevel(3);
    expect(getUnlockedLevel()).toBe(5);

    // Higher level accepted
    setUnlockedLevel(12);
    expect(getUnlockedLevel()).toBe(12);
  });

  it('should manage mothership unlock state accurately', () => {
    expect(getMothershipUnlocked()).toBe(false);

    unlockMothership();
    expect(getMothershipUnlocked()).toBe(true);
  });

  it('should remember and retrieve last played mission level ID', () => {
    expect(getLastPlayedLevel()).toBeNull();

    setLastPlayedLevel('lvl24');
    expect(getLastPlayedLevel()).toBe('lvl24');

    setLastPlayedLevel('m_lvl3');
    expect(getLastPlayedLevel()).toBe('m_lvl3');
  });

  it('should serialize, retrieve, update, and delete custom maps without data corruption', () => {
    expect(getCustomMaps()).toEqual([]);

    const mapA: CustomMap = {
      id: 'map_alpha',
      name: 'Alpha Nebula',
      planets: [
        { id: 'p1', name: 'Terran HQ', x: 200, y: 300, radius: 30, maxShips: 100, ships: 40, owner: 'player', type: 'standard', productionRate: 1, pulsePhase: 0 },
        { id: 'p2', name: 'Alien Bastion', x: 600, y: 300, radius: 30, maxShips: 100, ships: 40, owner: 'ai1', type: 'standard', productionRate: 1, pulsePhase: 0 }
      ]
    };

    saveCustomMap(mapA);
    const loaded = getCustomMaps();
    expect(loaded.length).toBe(1);
    expect(loaded[0].name).toBe('Alpha Nebula');
    expect(loaded[0].planets.length).toBe(2);

    // Update existing map
    const updatedMapA: CustomMap = {
      ...mapA,
      name: 'Alpha Nebula Renamed'
    };
    saveCustomMap(updatedMapA);
    const updatedList = getCustomMaps();
    expect(updatedList.length).toBe(1);
    expect(updatedList[0].name).toBe('Alpha Nebula Renamed');

    // Delete map
    deleteCustomMap('map_alpha');
    expect(getCustomMaps()).toEqual([]);
  });

  it('should gracefully handle storage exceptions in restricted environments', () => {
    // Mock throwing localStorage (simulating private/incognito quota lockout)
    // @ts-expect-error test quota error
    globalThis.localStorage = {
      getItem: () => { throw new Error('QuotaExceededError'); },
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => { throw new Error('QuotaExceededError'); }
    };

    // None of these should throw or crash the engine
    expect(() => getUnlockedLevel()).not.toThrow();
    expect(getUnlockedLevel()).toBe(1);

    expect(() => setUnlockedLevel(5)).not.toThrow();
    expect(() => getMothershipUnlocked()).not.toThrow();
    expect(() => unlockMothership()).not.toThrow();
    expect(() => getCustomMaps()).not.toThrow();
  });
});
