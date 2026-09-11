import type { FactionId } from '../../types/game';
import { LobbyManager } from './LobbyManager';

export type SyncAction =
  | { 
      type: 'launch'; 
      sourcePlanetIds: string[]; 
      targetPlanetId: string; 
      sendRatio: number; 
      faction: FactionId;
      senderId?: string;
    };

export interface HostPlanetSync {
  id: string;
  owner: FactionId;
  ships: number;
}

export interface HostSyncData {
  planets: HostPlanetSync[];
  timestamp: number;
}

export class SyncEngine {
  private lobby: LobbyManager;
  private onLaunchCallback?: (action: SyncAction) => void;
  private onHostSyncCallback?: (data: HostSyncData) => void;
  private syncInterval?: any;
  private watchdogInterval?: any;
  private lastSyncTime: number = 0;
  private onHostDisconnectedCallback?: () => void;

  constructor(lobby: LobbyManager) {
    this.lobby = lobby;

    // Listen to real-time game actions from Supabase Broadcast
    this.lobby.onGameAction((action: SyncAction) => {
      this.handleRemoteAction(action);
    });

    // Listen to authoritative host state sync
    this.lobby.onHostSync((data: HostSyncData) => {
      this.lastSyncTime = Date.now();
      if (this.onHostSyncCallback) {
        this.onHostSyncCallback(data);
      }
    });
  }

  public onHostDisconnected(cb: () => void) {
    this.onHostDisconnectedCallback = cb;
  }

  // Triggered when local player (or local Host AI) launches a fleet
  public emitLaunch(sourcePlanetIds: string[], targetPlanetId: string, sendRatio: number, faction: FactionId) {
    const action: SyncAction = { 
      type: 'launch', 
      sourcePlanetIds, 
      targetPlanetId, 
      sendRatio, 
      faction,
      senderId: this.lobby.profile?.id 
    };
    
    // Apply locally with zero latency
    if (this.onLaunchCallback) {
      this.onLaunchCallback(action);
    }
    // Broadcast immediately to all other commanders in the room
    this.lobby.broadcastGameAction(action);
  }

  public startGuestWatchdog() {
    if (this.lobby.isHost) return;
    this.stopGuestWatchdog();
    
    this.lastSyncTime = Date.now();
    this.watchdogInterval = setInterval(() => {
      if (Date.now() - this.lastSyncTime > 5000) {
        // Host timed out
        this.stopGuestWatchdog();
        if (this.onHostDisconnectedCallback) {
          this.onHostDisconnectedCallback();
        }
      }
    }, 1000);
  }

  public stopGuestWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = undefined;
    }
  }

  public startHostSyncLoop(getPlanets: () => HostPlanetSync[]) {
    if (!this.lobby.isHost) return;
    this.stopHostSyncLoop();

    // Broadcast authoritative planet states every 1.5 seconds
    this.syncInterval = setInterval(() => {
      if (this.lobby.isHost) {
        const planetsData = getPlanets();
        if (planetsData && planetsData.length > 0) {
          this.lobby.broadcastHostSync({
            planets: planetsData,
            timestamp: Date.now()
          });
        }
      }
    }, 1500);
  }

  public stopHostSyncLoop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  private handleRemoteAction(action: SyncAction) {
    if (!action) return;

    // Discard our own launches (already executed locally)
    if (action.senderId && this.lobby.profile?.id && action.senderId === this.lobby.profile.id) {
      return;
    }
    // Dual check: ignore if the action faction matches our own local faction
    if (action.faction && action.faction === this.lobby.myFaction) {
      return;
    }

    if (action.type === 'launch' && this.onLaunchCallback) {
      this.onLaunchCallback(action);
    }
  }

  public onLaunch(cb: (action: SyncAction) => void) {
    this.onLaunchCallback = cb;
  }

  public onHostSync(cb: (data: HostSyncData) => void) {
    this.onHostSyncCallback = cb;
  }
}
