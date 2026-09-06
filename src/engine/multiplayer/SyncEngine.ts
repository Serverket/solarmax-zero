import { launchFleets } from '../physics';
import type { PhysicsEngineState } from '../physics';
import { LobbyManager } from './LobbyManager';

export type SyncAction =
  | { type: 'launch', sourcePlanetIds: string[], targetPlanetId: string, sendRatio: number, faction: string }
  | { type: 'sync_state', state: PhysicsEngineState, timestamp: number };

export class SyncEngine {
  private lobby: LobbyManager;
  private onStateUpdateCallback?: (state: PhysicsEngineState) => void;
  private localState?: PhysicsEngineState;
  
  // Para el Host: enviar snapshots periódicos
  private syncInterval?: any;

  constructor(lobby: LobbyManager) {
    this.lobby = lobby;

    // Escuchar mensajes de todos los clientes WebRTC
    this.lobby.clients.forEach(client => {
      client.onMessage((data) => this.handleMessage(data));
    });
  }

  public setLocalState(state: PhysicsEngineState) {
    this.localState = state;
  }

  // Se llama desde la UI cuando el jugador local lanza una flota
  public emitLaunch(sourcePlanetIds: string[], targetPlanetId: string, sendRatio: number, faction: string) {
    const action: SyncAction = { type: 'launch', sourcePlanetIds, targetPlanetId, sendRatio, faction };
    
    // Aplicar localmente (si somos el host lo aplicamos, si somos cliente se lo mandamos al host)
    // En este modelo híbrido, todos simulan la física (determinismo suave), pero el Host manda correcciones.
    this.applyActionLocally(action);
    this.broadcast(action);
  }

  public startHostSyncLoop() {
    if (!this.lobby.isHost) return;
    
    // Sincronizar estado completo (posiciones, naves, planetas) cada 2 segundos
    // para corregir cualquier desincronización por lag o no-determinismo de Math.random
    this.syncInterval = setInterval(() => {
      if (this.localState) {
         // Omitimos chispas(sparks) y lasers para ahorrar ancho de banda, 
         // o los serializamos si es necesario.
         const snap: PhysicsEngineState = {
           planets: this.localState.planets,
           ships: this.localState.ships, // Idealmente comprimido en binario, pero usamos JSON para este prototipo
           sparks: [], 
           lasers: this.localState.lasers,
           stats: this.localState.stats,
           screenShake: 0
         };
         
         this.broadcast({ type: 'sync_state', state: snap, timestamp: Date.now() });
      }
    }, 2000);
  }

  public stopHostSyncLoop() {
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  private handleMessage(data: ArrayBuffer | string) {
    try {
      const action: SyncAction = JSON.parse(data as string);
      
      if (action.type === 'launch') {
         this.applyActionLocally(action);
         
         // Si somos Host, retransmitimos a los demás clientes
         if (this.lobby.isHost) {
            this.lobby.clients.forEach(c => {
               // No reenviar al que originó (aunque el ID del sender no lo pasamos aquí, simplificamos enviando a todos)
               c.send(data);
            });
         }
      } 
      else if (action.type === 'sync_state' && !this.lobby.isHost) {
         // Cliente recibe el estado autoritativo del host
         if (this.localState) {
            // Suavizado (Interpolación) debería ir aquí. 
            // Por simplicidad, machacamos el estado:
            this.localState.planets = action.state.planets;
            
            // Reemplazamos las naves, pero mantenemos nuestra extrapolación si es muy diferente
            this.localState.ships = action.state.ships;
            
            if (this.onStateUpdateCallback) {
               this.onStateUpdateCallback(this.localState);
            }
         }
      }
    } catch (e) {
      console.error("Error parsing sync message", e);
    }
  }

  private applyActionLocally(action: SyncAction) {
     if (action.type === 'launch' && this.localState) {
        // Ejecutamos la lógica de lanzamiento.
        // Importante: asegurar que el `sendRatio` y facción coincidan
        const newState = launchFleets(action.sourcePlanetIds, action.targetPlanetId, this.localState, action.sendRatio);
        this.localState = newState;
        if (this.onStateUpdateCallback) {
           this.onStateUpdateCallback(newState);
        }
     }
  }

  private broadcast(action: SyncAction) {
    const payload = JSON.stringify(action);
    this.lobby.clients.forEach(client => {
      client.send(payload);
    });
  }

  onStateUpdate(cb: (state: PhysicsEngineState) => void) {
    this.onStateUpdateCallback = cb;
  }
}
