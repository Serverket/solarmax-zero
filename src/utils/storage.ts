import type { Planet } from '../types/game';

export const StorageKeys = {
  UNLOCKED_LEVEL: 'solarmax_unlocked_level',
  CUSTOM_MAPS: 'solarmax_custom_maps'
};

export const getUnlockedLevel = (): number => {
  try {
    const val = localStorage.getItem(StorageKeys.UNLOCKED_LEVEL);
    return val ? parseInt(val, 10) : 1;
  } catch {
    return 1;
  }
};

export const setUnlockedLevel = (level: number): void => {
  try {
    const current = getUnlockedLevel();
    if (level > current) {
      localStorage.setItem(StorageKeys.UNLOCKED_LEVEL, level.toString());
    }
  } catch {
    // Ignore storage errors in incognito/restricted modes
  }
};

export interface CustomMap {
  id: string;
  name: string;
  planets: Planet[];
}

export const getCustomMaps = (): CustomMap[] => {
  try {
    const val = localStorage.getItem(StorageKeys.CUSTOM_MAPS);
    if (!val) return [];
    return JSON.parse(val) as CustomMap[];
  } catch {
    return [];
  }
};

export const saveCustomMap = (map: CustomMap): void => {
  try {
    const maps = getCustomMaps();
    const existingIndex = maps.findIndex(m => m.id === map.id);
    if (existingIndex >= 0) {
      maps[existingIndex] = map;
    } else {
      maps.push(map);
    }
    localStorage.setItem(StorageKeys.CUSTOM_MAPS, JSON.stringify(maps));
  } catch {
    console.warn("Failed to save map to local storage.");
  }
};

export const deleteCustomMap = (id: string): void => {
  try {
    const maps = getCustomMaps();
    const newMaps = maps.filter(m => m.id !== id);
    localStorage.setItem(StorageKeys.CUSTOM_MAPS, JSON.stringify(newMaps));
  } catch {}
};
