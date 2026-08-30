import type { Planet } from '../types/game';
import { supabase } from '../lib/supabase';

export const StorageKeys = {
  UNLOCKED_LEVEL: 'solarmax_unlocked_level',
  CUSTOM_MAPS: 'solarmax_custom_maps',
  MOTHERSHIP_UNLOCKED: 'solarmax_mothership_unlocked',
  LAST_PLAYED_LEVEL: 'solarmax_last_played_level'
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
      syncProgressToCloud();
    }
  } catch {
    // Ignore storage errors in incognito/restricted modes
  }
};

export const getMothershipUnlocked = (): boolean => {
  try {
    return localStorage.getItem(StorageKeys.MOTHERSHIP_UNLOCKED) === 'true';
  } catch {
    return false;
  }
};

export const unlockMothership = (): void => {
  try {
    localStorage.setItem(StorageKeys.MOTHERSHIP_UNLOCKED, 'true');
    syncProgressToCloud();
  } catch {}
};

export const getLastPlayedLevel = (): string | null => {
  try {
    return localStorage.getItem(StorageKeys.LAST_PLAYED_LEVEL);
  } catch {
    return null;
  }
};

export const setLastPlayedLevel = (levelId: string): void => {
  try {
    localStorage.setItem(StorageKeys.LAST_PLAYED_LEVEL, levelId);
  } catch {}
};

// --- Cloud Sync ---

export const syncProgressToCloud = async (): Promise<void> => {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const highestLevel = getUnlockedLevel();
    const mothershipUnlocked = getMothershipUnlocked();
    const customMaps = getCustomMaps();

    await supabase
      .from('game_progress')
      .upsert(
        { 
          user_id: user.id, 
          highest_level: highestLevel, 
          mothership_unlocked: mothershipUnlocked, 
          custom_maps: customMaps,
          updated_at: new Date().toISOString() 
        },
        { onConflict: 'user_id' }
      );
  } catch (err) {
    console.error("Cloud sync failed", err);
  }
};

export const syncProgressFromCloud = async (): Promise<void> => {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('game_progress')
      .select('highest_level, mothership_unlocked, custom_maps')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // ignore no rows error

    if (data) {
      const localLevel = getUnlockedLevel();
      if (data.highest_level > localLevel) {
        localStorage.setItem(StorageKeys.UNLOCKED_LEVEL, data.highest_level.toString());
      } else if (localLevel > data.highest_level) {
        syncProgressToCloud();
      }

      const localMothership = getMothershipUnlocked();
      if (data.mothership_unlocked && !localMothership) {
        localStorage.setItem(StorageKeys.MOTHERSHIP_UNLOCKED, 'true');
      } else if (localMothership && !data.mothership_unlocked) {
        syncProgressToCloud();
      }

      // Sync custom maps (Cloud data takes precedence if it has maps, otherwise merge/sync up)
      if (data.custom_maps && Array.isArray(data.custom_maps) && data.custom_maps.length > 0) {
        const cloudMaps = data.custom_maps as CustomMap[];
        const localMaps = getCustomMaps();
        
        // Simple merge: prefer cloud versions for maps that exist, keep local maps that don't exist in cloud
        const mergedMaps = [...cloudMaps];
        for (const localMap of localMaps) {
          if (!mergedMaps.find(m => m.id === localMap.id)) {
            mergedMaps.push(localMap);
          }
        }
        
        localStorage.setItem(StorageKeys.CUSTOM_MAPS, JSON.stringify(mergedMaps));
        
        // If we had local-only maps, push the merged state back to cloud
        if (mergedMaps.length > cloudMaps.length) {
          syncProgressToCloud();
        }
      } else {
        // Cloud has no maps, upload ours
        syncProgressToCloud();
      }
    } else {
      syncProgressToCloud();
    }
  } catch (err) {
    console.error("Cloud fetch failed", err);
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
    syncProgressToCloud();
  } catch {
    console.warn("Failed to save map to local storage.");
  }
};

export const deleteCustomMap = (id: string): void => {
  try {
    const maps = getCustomMaps();
    const newMaps = maps.filter(m => m.id !== id);
    localStorage.setItem(StorageKeys.CUSTOM_MAPS, JSON.stringify(newMaps));
    syncProgressToCloud();
  } catch {}
};
