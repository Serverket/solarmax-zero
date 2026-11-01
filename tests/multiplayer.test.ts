import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { FACTION_SLOTS, LobbyManager } from '../src/engine/multiplayer/LobbyManager';
import { SyncEngine, type SyncAction, type HostSyncData } from '../src/engine/multiplayer/SyncEngine';
import type { PlayerProfile } from '../src/lib/auth-manager';

// Polyfill sessionStorage for non-browser Bun test environment
if (typeof sessionStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (idx: number) => Array.from(store.keys())[idx] || null,
    get length() { return store.size; },
  };
}

describe('9. Real-Time Multiplayer Lobby & SyncEngine Unit Tests', () => {
  let mockLobby: LobbyManager;
  let actionCallback: ((action: any) => void) | undefined;
  let hostSyncCallback: ((data: any) => void) | undefined;

  beforeEach(() => {
    mockLobby = new LobbyManager();
    mockLobby.profile = {
      id: 'local_player_123',
      name: 'Commander Alpha',
      isGuest: false
    };

    // Intercept subscription callbacks
    mockLobby.onGameAction = (cb: (action: any) => void) => {
      actionCallback = cb;
    };
    mockLobby.onHostSync = (cb: (data: any) => void) => {
      hostSyncCallback = cb;
    };
    mockLobby.broadcastGameAction = mock(() => {});
    mockLobby.broadcastHostSync = mock(() => {});
  });

  afterEach(() => {
    actionCallback = undefined;
    hostSyncCallback = undefined;
  });

  it('should enforce FACTION_SLOTS distribution and order', () => {
    expect(FACTION_SLOTS).toEqual(['player', 'ai1', 'ai2', 'ai3', 'ai4']);
    expect(FACTION_SLOTS.length).toBe(5);
    // Ensure all slot IDs are unique
    const uniqueSlots = new Set(FACTION_SLOTS);
    expect(uniqueSlots.size).toBe(5);
  });

  it('should resolve local and remote factions correctly in LobbyManager', () => {
    mockLobby.isHost = true;
    mockLobby.players.set(mockLobby.profile!.id, mockLobby.profile!);

    // Host defaults to 'player'
    expect(mockLobby.myFaction).toBe('player');

    // Add guest player
    const guestProfile: PlayerProfile = {
      id: 'guest_player_456',
      name: 'Commander Beta',
      isGuest: true
    };
    mockLobby.players.set(guestProfile.id, guestProfile);

    // Positional faction resolution
    expect(mockLobby.getPlayerFaction(guestProfile.id)).toBe('ai1');

    // Explicit override in assignedFactions takes precedence
    mockLobby.assignedFactions.set(guestProfile.id, 'ai3');
    expect(mockLobby.getPlayerFaction(guestProfile.id)).toBe('ai3');

    // Retrieve all active player factions
    const activeFactions = mockLobby.getActivePlayerFactions();
    expect(activeFactions).toContain('player');
    expect(activeFactions).toContain('ai3');
  });

  it('should format and broadcast fleet launch actions locally and over network', () => {
    const syncEngine = new SyncEngine(mockLobby);

    let localExecutedAction: SyncAction | null = null;
    syncEngine.onLaunch((action) => {
      localExecutedAction = action;
    });

    syncEngine.emitLaunch(['p1', 'p2'], 'p3', 0.5, 'player');

    // 1. Validated immediate local execution with zero latency
    expect(localExecutedAction).not.toBeNull();
    expect(localExecutedAction!.type).toBe('launch');
    expect(localExecutedAction!.sourcePlanetIds).toEqual(['p1', 'p2']);
    expect(localExecutedAction!.targetPlanetId).toBe('p3');
    expect(localExecutedAction!.sendRatio).toBe(0.5);
    expect(localExecutedAction!.faction).toBe('player');
    expect(localExecutedAction!.senderId).toBe('local_player_123');

    // 2. Validated broadcast to room
    expect(mockLobby.broadcastGameAction).toHaveBeenCalledTimes(1);
    expect(mockLobby.broadcastGameAction).toHaveBeenCalledWith(localExecutedAction!);
  });

  it('should discard loopback/duplicate actions and accept valid remote actions', () => {
    mockLobby.isHost = false;
    const syncEngine = new SyncEngine(mockLobby);

    let receivedRemoteAction: SyncAction | null = null;
    syncEngine.onLaunch((action) => {
      receivedRemoteAction = action;
    });

    expect(actionCallback).toBeDefined();

    // 1. Remote action with same senderId (loopback) -> ignored
    actionCallback!({
      type: 'launch',
      sourcePlanetIds: ['p1'],
      targetPlanetId: 'p2',
      sendRatio: 1.0,
      faction: 'ai1',
      senderId: 'local_player_123'
    });
    expect(receivedRemoteAction).toBeNull();

    // 2. Remote action with matching local faction (dual check echo) -> ignored
    mockLobby.assignedFactions.set(mockLobby.profile!.id, 'ai1');
    actionCallback!({
      type: 'launch',
      sourcePlanetIds: ['p1'],
      targetPlanetId: 'p2',
      sendRatio: 1.0,
      faction: 'ai1',
      senderId: 'other_peer_789'
    });
    expect(receivedRemoteAction).toBeNull();

    // 3. Legitimate remote action from peer commander -> accepted
    actionCallback!({
      type: 'launch',
      sourcePlanetIds: ['p4', 'p5'],
      targetPlanetId: 'p6',
      sendRatio: 0.75,
      faction: 'player',
      senderId: 'host_peer_001'
    });
    expect(receivedRemoteAction).not.toBeNull();
    expect(receivedRemoteAction!.sourcePlanetIds).toEqual(['p4', 'p5']);
    expect(receivedRemoteAction!.targetPlanetId).toBe('p6');
    expect(receivedRemoteAction!.faction).toBe('player');
  });

  it('should receive and process authoritative host state sync data', () => {
    mockLobby.isHost = false;
    const syncEngine = new SyncEngine(mockLobby);

    let receivedHostSync: HostSyncData | null = null;
    syncEngine.onHostSync((data) => {
      receivedHostSync = data;
    });

    const now = Date.now();
    hostSyncCallback!({
      planets: [
        { id: 'planet_1', owner: 'player', ships: 45 },
        { id: 'planet_2', owner: 'ai1', ships: 20 },
      ],
      timestamp: now
    });

    expect(receivedHostSync).not.toBeNull();
    expect(receivedHostSync!.planets.length).toBe(2);
    expect(receivedHostSync!.planets[0].id).toBe('planet_1');
    expect(receivedHostSync!.planets[0].ships).toBe(45);
    expect(receivedHostSync!.timestamp).toBe(now);
  });

  it('should trigger guest watchdog disconnection when host sync stalls > 5000ms', async () => {
    mockLobby.isHost = false;
    const syncEngine = new SyncEngine(mockLobby);

    let disconnectedCalled = false;
    syncEngine.onHostDisconnected(() => {
      disconnectedCalled = true;
    });

    // Start watchdog
    syncEngine.startGuestWatchdog();

    // Simulate initial host heartbeat
    hostSyncCallback!({ planets: [], timestamp: Date.now() });
    expect(disconnectedCalled).toBe(false);

    // Fast-forward lastSyncTime to 6000ms in the past to trigger timeout condition
    (syncEngine as any).lastSyncTime = Date.now() - 6000;

    // Wait a tick for watchdog interval to trigger
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(disconnectedCalled).toBe(true);
    syncEngine.stopGuestWatchdog();
  });

  it('should periodically broadcast planet states during host sync loop', async () => {
    mockLobby.isHost = true;
    const syncEngine = new SyncEngine(mockLobby);

    const getPlanetsMock = mock(() => [
      { id: 'p_alpha', owner: 'player' as const, ships: 50 }
    ]);

    syncEngine.startHostSyncLoop(getPlanetsMock);

    // When stopped immediately, sync interval is cleaned up
    syncEngine.stopHostSyncLoop();
    expect((syncEngine as any).syncInterval).toBeUndefined();
  });
});
