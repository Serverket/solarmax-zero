import { supabase } from '../../lib/supabase';
import { AuthManager } from '../../lib/auth-manager';
import type { PlayerProfile } from '../../lib/auth-manager';
import type { FactionId, LevelConfig } from '../../types/game';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RoomState {
  roomId: string;
  hostId: string;
  players: PlayerProfile[];
  status: 'waiting' | 'starting' | 'playing';
}

export const FACTION_SLOTS: FactionId[] = ['player', 'ai1', 'ai2', 'ai3', 'ai4'];

export class LobbyManager {
  private channel?: RealtimeChannel;
  public profile?: PlayerProfile;
  public roomId?: string;
  
  public isHost: boolean = false;
  public players: Map<string, PlayerProfile> = new Map();
  public hostId?: string;

  private onRoomUpdateCallback?: (state: RoomState | null) => void;
  private onGameStartCallback?: (level: LevelConfig) => void;
  private onGameActionCallback?: (action: any) => void;
  private onHostSyncCallback?: (payload: any) => void;
  private onPlayerLeftCallback?: (playerId: string) => void;

  constructor() {}

  async initProfile() {
    this.profile = await AuthManager.getCurrentProfile();
  }

  public get myFaction(): FactionId {
    const playerArray = Array.from(this.players.values());
    const myIndex = playerArray.findIndex(p => p.id === this.profile?.id);
    if (myIndex >= 0 && myIndex < FACTION_SLOTS.length) {
      return FACTION_SLOTS[myIndex];
    }
    return this.isHost ? 'player' : 'ai1';
  }

  public getPlayerFaction(playerId: string): FactionId {
    const playerArray = Array.from(this.players.values());
    const idx = playerArray.findIndex(p => p.id === playerId);
    if (idx >= 0 && idx < FACTION_SLOTS.length) {
      return FACTION_SLOTS[idx];
    }
    return 'player';
  }

  public getActivePlayerFactions(): FactionId[] {
    const factions: FactionId[] = [];
    const playerArray = Array.from(this.players.values());
    playerArray.forEach((_, idx) => {
       factions.push(FACTION_SLOTS[idx] || 'player');
    });
    return factions;
  }

  async createRoom(): Promise<string> {
    await this.initProfile();
    await this.cleanupChannel();

    this.roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.isHost = true;
    this.hostId = this.profile!.id;
    this.players.clear();
    this.players.set(this.profile!.id, this.profile!);
    
    await this.setupChannel(this.roomId);
    this.emitRoomUpdate();
    return this.roomId;
  }

  async joinRoom(roomId: string): Promise<boolean> {
    await this.initProfile();
    await this.cleanupChannel();

    const cleanRoomId = roomId.trim().toUpperCase();
    this.roomId = cleanRoomId;
    this.isHost = false;
    this.players.clear();

    await this.setupChannel(cleanRoomId);

    // Request join from Host and wait for authoritative lobby_sync confirmation
    return new Promise<boolean>((resolve, reject) => {
      let resolved = false;
      let pingInterval: any = null;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (pingInterval) clearInterval(pingInterval);
          this.leaveRoom();
          reject(new Error("Room not found or host is offline."));
        }
      }, 6000);

      const checkJoined = (state: RoomState | null) => {
        if (state && state.players.some(p => p.id === this.profile?.id)) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            if (pingInterval) clearInterval(pingInterval);
            this.onRoomUpdateCallback = prevCallback;
            resolve(true);
          }
        }
      };

      const prevCallback = this.onRoomUpdateCallback;
      this.onRoomUpdateCallback = (state) => {
        if (prevCallback) prevCallback(state);
        checkJoined(state);
      };

      // Periodic announce to prevent packet drops over connection handshake
      const announce = () => {
        if (!resolved && this.channel) {
          this.channel.send({
            type: 'broadcast',
            event: 'player_joined',
            payload: { profile: this.profile }
          }).catch(console.warn);
        }
      };

      announce();
      pingInterval = setInterval(announce, 1200);
    });
  }

  public startGame(level: LevelConfig) {
    if (!this.isHost || !this.channel) return;
    
    const payload = {
      level,
      hostId: this.profile!.id,
      players: Array.from(this.players.values())
    };

    this.channel.send({
      type: 'broadcast',
      event: 'game_start',
      payload
    });

    if (this.onGameStartCallback) {
      this.onGameStartCallback(level);
    }
  }

  public broadcastGameAction(action: any) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'game_action',
      payload: action
    });
  }

  public broadcastHostSync(payload: any) {
    if (!this.channel || !this.isHost) return;
    this.channel.send({
      type: 'broadcast',
      event: 'host_sync',
      payload
    });
  }

  public async leaveRoom() {
    if (this.channel) {
      if (this.profile) {
        try {
          await this.channel.send({
            type: 'broadcast',
            event: 'player_left',
            payload: { playerId: this.profile.id }
          });
        } catch (e) {
          console.warn("Could not broadcast player_left", e);
        }
      }
      await this.cleanupChannel();
    }
    this.players.clear();
    this.roomId = undefined;
    this.isHost = false;
    this.hostId = undefined;
    if (this.onRoomUpdateCallback) {
      this.onRoomUpdateCallback(null);
    }
  }

  private async cleanupChannel() {
    if (this.channel) {
      try {
        await this.channel.unsubscribe();
      } catch (e) {
        console.warn("Error unsubscribing channel", e);
      }
      this.channel = undefined;
    }
  }

  private async setupChannel(roomId: string) {
    if (!supabase) throw new Error("Supabase is not configured for multiplayer.");

    const channel = supabase.channel(`room:${roomId}`, {
      config: { 
        broadcast: { ack: false } 
      }
    });

    const extractData = (payload: any) => payload?.payload ?? payload;

    // 1. Host receives join request
    channel.on('broadcast', { event: 'player_joined' }, (payload) => {
      const data = extractData(payload);
      const p = data?.profile as PlayerProfile;
      if (!p || !this.isHost) return;

      if (!this.players.has(p.id)) {
        if (this.players.size >= 5) {
          channel.send({ type: 'broadcast', event: 'room_full', payload: { targetId: p.id } });
          return;
        }

        this.players.set(p.id, p);
        this.broadcastLobbySync();
        this.emitRoomUpdate();
      } else {
        // Player re-announced, re-broadcast sync
        this.broadcastLobbySync();
      }
    });

    // 2. Guests receive authoritative lobby sync from Host
    channel.on('broadcast', { event: 'lobby_sync' }, (payload) => {
      if (this.isHost) return;
      const data = extractData(payload);
      const remotePlayers = data?.players as PlayerProfile[];
      const remoteHostId = data?.hostId as string;

      if (remotePlayers && Array.isArray(remotePlayers)) {
        this.players.clear();
        remotePlayers.forEach(p => this.players.set(p.id, p));
        this.hostId = remoteHostId;
        this.emitRoomUpdate();
      }
    });

    // 3. Room full notification
    channel.on('broadcast', { event: 'room_full' }, (payload) => {
      const data = extractData(payload);
      if (data?.targetId === this.profile?.id) {
        this.leaveRoom();
        if (this.onRoomUpdateCallback) this.onRoomUpdateCallback(null);
      }
    });

    // 4. Game start notification
    channel.on('broadcast', { event: 'game_start' }, (payload) => {
      const data = extractData(payload);
      const level = data?.level as LevelConfig;
      const remotePlayers = data?.players as PlayerProfile[];
      const remoteHostId = data?.hostId as string;

      if (remotePlayers && Array.isArray(remotePlayers)) {
        this.players.clear();
        remotePlayers.forEach(p => this.players.set(p.id, p));
        this.hostId = remoteHostId;
      }

      if (this.onGameStartCallback && level) {
        this.onGameStartCallback(level);
      }
    });

    // 5. In-game action broadcast (fleet launches)
    channel.on('broadcast', { event: 'game_action' }, (payload) => {
      const data = extractData(payload);
      if (this.onGameActionCallback && data) {
        this.onGameActionCallback(data);
      }
    });

    // 6. Host periodic state sync
    channel.on('broadcast', { event: 'host_sync' }, (payload) => {
      const data = extractData(payload);
      if (!this.isHost && this.onHostSyncCallback && data) {
        this.onHostSyncCallback(data);
      }
    });

    // 7. Player left / disconnected
    channel.on('broadcast', { event: 'player_left' }, (payload) => {
      const data = extractData(payload);
      const id = data?.playerId as string;
      if (!id) return;

      if (id === this.hostId && !this.isHost) {
        // Host left the match
        if (this.onPlayerLeftCallback) {
          this.onPlayerLeftCallback(id);
        }
        this.leaveRoom();
        return;
      }

      if (this.players.has(id)) {
        this.players.delete(id);
        if (this.isHost) {
          this.broadcastLobbySync();
        }
        this.emitRoomUpdate();
        if (this.onPlayerLeftCallback) {
          this.onPlayerLeftCallback(id);
        }
      }
    });

    this.channel = channel;

    // Await subscription confirmation before sending any broadcast
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        } else if (status === 'CHANNEL_ERROR') {
          reject(err || new Error("Failed to subscribe to room channel"));
        } else if (status === 'TIMED_OUT') {
          reject(new Error("Room subscription timed out"));
        }
      });
    });
  }

  private broadcastLobbySync() {
    if (!this.channel || !this.isHost) return;
    this.channel.send({
      type: 'broadcast',
      event: 'lobby_sync',
      payload: {
        hostId: this.profile!.id,
        players: Array.from(this.players.values())
      }
    });
  }

  emitRoomUpdate() {
    if (this.onRoomUpdateCallback) {
      if (!this.roomId) {
        this.onRoomUpdateCallback(null);
        return;
      }
      this.onRoomUpdateCallback({
        roomId: this.roomId,
        hostId: this.hostId || Array.from(this.players.values())[0]?.id || '',
        players: Array.from(this.players.values()),
        status: 'waiting'
      });
    }
  }

  onRoomUpdate(cb: (state: RoomState | null) => void) {
    this.onRoomUpdateCallback = cb;
  }

  onGameStart(cb: (level: LevelConfig) => void) {
    this.onGameStartCallback = cb;
  }

  onGameAction(cb: (action: any) => void) {
    this.onGameActionCallback = cb;
  }

  onHostSync(cb: (payload: any) => void) {
    this.onHostSyncCallback = cb;
  }

  onPlayerLeft(cb: (playerId: string) => void) {
    this.onPlayerLeftCallback = cb;
  }
}
