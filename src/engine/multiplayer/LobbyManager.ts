import { supabase } from '../../lib/supabase';
import { NetworkClient } from './NetworkClient';
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

export class LobbyManager {
  private channel?: RealtimeChannel;
  public profile?: PlayerProfile;
  public roomId?: string;
  
  public isHost: boolean = false;
  public players: Map<string, PlayerProfile> = new Map();
  public clients: Map<string, NetworkClient> = new Map();

  private onRoomUpdateCallback?: (state: RoomState | null) => void;
  private onGameStartCallback?: (level: LevelConfig) => void;

  constructor() {}

  async initProfile() {
    this.profile = await AuthManager.getCurrentProfile();
  }

  public get myFaction(): FactionId {
    const playerArray = Array.from(this.players.values());
    const myIndex = playerArray.findIndex(p => p.id === this.profile?.id);
    const factionKeys: FactionId[] = ['player', 'ai1', 'ai2', 'ai3', 'ai4'];
    return factionKeys[Math.max(0, myIndex)] || 'player';
  }

  public getPlayerFaction(playerId: string): FactionId {
    const playerArray = Array.from(this.players.values());
    const idx = playerArray.findIndex(p => p.id === playerId);
    const factionKeys: FactionId[] = ['player', 'ai1', 'ai2', 'ai3', 'ai4'];
    return factionKeys[Math.max(0, idx)] || 'player';
  }

  async createRoom(): Promise<string> {
    await this.initProfile();
    this.roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.isHost = true;
    this.players.set(this.profile!.id, this.profile!);
    
    await this.joinChannel(this.roomId);
    this.emitRoomUpdate();
    return this.roomId;
  }

  async joinRoom(roomId: string): Promise<boolean> {
    await this.initProfile();
    this.roomId = roomId.toUpperCase();
    this.isHost = false;
    this.players.set(this.profile!.id, this.profile!);
    
    await this.joinChannel(this.roomId);
    
    // Anunciar presencia
    this.channel?.send({
      type: 'broadcast',
      event: 'player_joined',
      payload: { profile: this.profile }
    });

    return true;
  }

  public startGame(level: LevelConfig) {
    if (!this.isHost) return;
    this.channel?.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { level }
    });
    if (this.onGameStartCallback) {
      this.onGameStartCallback(level);
    }
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
      await this.channel.unsubscribe();
      this.channel = undefined;
    }
    this.clients.forEach(c => c.close());
    this.clients.clear();
    this.players.clear();
    this.roomId = undefined;
    this.isHost = false;
    if (this.onRoomUpdateCallback) {
      this.onRoomUpdateCallback(null);
    }
  }

  private async joinChannel(roomId: string) {
    if (!supabase) throw new Error("Supabase is not configured for signaling.");
    
    this.channel = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { ack: true } }
    });

    this.channel.on('broadcast', { event: 'player_joined' }, async (payload) => {
      const p = payload.payload.profile as PlayerProfile;
      if (!this.players.has(p.id)) {
        if (this.isHost && this.players.size >= 5) {
          // Reject (Límite 5)
          this.channel?.send({ type: 'broadcast', event: 'room_full', payload: { targetId: p.id } });
          return;
        }

        this.players.set(p.id, p);
        this.emitRoomUpdate();
        
        // El host inicia la conexión WebRTC
        if (this.isHost) {
          await this.initiateWebRTC(p.id);
          // Broadcast state to sync everyone
          this.channel?.send({ type: 'broadcast', event: 'sync_state', payload: { players: Array.from(this.players.values()) } });
        }
      }
    });

    this.channel.on('broadcast', { event: 'sync_state' }, (payload) => {
      if (!this.isHost) {
        const remotePlayers = payload.payload.players as PlayerProfile[];
        this.players.clear();
        remotePlayers.forEach(p => this.players.set(p.id, p));
        this.emitRoomUpdate();
      }
    });

    this.channel.on('broadcast', { event: 'game_start' }, (payload) => {
      if (this.onGameStartCallback) {
        this.onGameStartCallback(payload.payload.level);
      }
    });

    this.channel.on('broadcast', { event: 'player_left' }, (payload) => {
      const id = payload.payload.playerId as string;
      if (this.players.has(id)) {
        this.players.delete(id);
        const client = this.clients.get(id);
        if (client) {
          client.close();
          this.clients.delete(id);
        }
        this.emitRoomUpdate();
      }
    });

    this.channel.on('broadcast', { event: 'webrtc_offer' }, async (payload) => {
      if (payload.payload.targetId === this.profile!.id) {
        await this.handleWebRTCOffer(payload.payload.senderId, payload.payload.offer);
      }
    });

    this.channel.on('broadcast', { event: 'webrtc_answer' }, async (payload) => {
      if (payload.payload.targetId === this.profile!.id) {
        await this.handleWebRTCAnswer(payload.payload.senderId, payload.payload.answer);
      }
    });

    this.channel.on('broadcast', { event: 'webrtc_ice' }, async (payload) => {
      if (payload.payload.targetId === this.profile!.id) {
        const client = this.clients.get(payload.payload.senderId);
        if (client) await client.addIceCandidate(payload.payload.candidate);
      }
    });

    await this.channel.subscribe();
  }

  private async initiateWebRTC(targetId: string) {
    const client = new NetworkClient(targetId, true);
    this.setupClientEvents(client, targetId);
    
    const offer = await client.createOffer();
    this.clients.set(targetId, client);

    this.channel?.send({
      type: 'broadcast', event: 'webrtc_offer',
      payload: { senderId: this.profile!.id, targetId, offer }
    });
  }

  private async handleWebRTCOffer(senderId: string, offer: RTCSessionDescriptionInit) {
    const client = new NetworkClient(senderId, false);
    this.setupClientEvents(client, senderId);
    this.clients.set(senderId, client);

    const answer = await client.handleOffer(offer);
    
    this.channel?.send({
      type: 'broadcast', event: 'webrtc_answer',
      payload: { senderId: this.profile!.id, targetId: senderId, answer }
    });
  }

  private async handleWebRTCAnswer(senderId: string, answer: RTCSessionDescriptionInit) {
    const client = this.clients.get(senderId);
    if (client) {
      await client.handleAnswer(answer);
    }
  }

  private setupClientEvents(client: NetworkClient, targetId: string) {
    client.onIceCandidate((candidate) => {
      this.channel?.send({
        type: 'broadcast', event: 'webrtc_ice',
        payload: { senderId: this.profile!.id, targetId, candidate }
      });
    });

    client.onStateChange((state) => {
      console.log(`WebRTC state with ${targetId}: ${state}`);
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
        hostId: Array.from(this.players.values())[0]?.id,
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
}
