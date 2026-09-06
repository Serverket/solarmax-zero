import { useState, useEffect } from 'react';
import { X, Users, Signal, Play, Copy, Check, Zap, LogOut } from 'lucide-react';
import { sound } from '../utils/sound';
import { FACTIONS } from '../utils/levels';
import type { LobbyManager, RoomState } from '../engine/multiplayer/LobbyManager';
import type { FactionId } from '../types/game';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lobbyManager: LobbyManager;
  onStartGame: () => void;
}

const FACTION_KEYS: FactionId[] = ['player', 'ai1', 'ai2', 'ai3', 'ai4'];

export function MultiplayerLobbyModal({ isOpen, onClose, lobbyManager, onStartGame }: MultiplayerLobbyModalProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      lobbyManager.onRoomUpdate((state) => {
        setRoomState(state);
      });
    }
  }, [isOpen, lobbyManager]);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    sound.playSelect();
    setLoading(true);
    try {
      await lobbyManager.createRoom();
      setError('');
    } catch (err: any) {
      setError(err.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode || joinCode.length !== 6) {
      setError("Code must be 6 characters");
      return;
    }
    sound.playSelect();
    setLoading(true);
    try {
      await lobbyManager.joinRoom(joinCode);
      setError('');
    } catch (err: any) {
      setError(err.message || "Room not found or full");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    sound.playSelect();
    await lobbyManager.leaveRoom();
    setRoomState(null);
    setError('');
  };

  const handleClose = async () => {
    sound.playSelect();
    if (roomState) {
      await lobbyManager.leaveRoom();
      setRoomState(null);
    }
    onClose();
  };

  const copyCode = () => {
    if (roomState?.roomId) {
      navigator.clipboard.writeText(roomState.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      sound.playSelect();
    }
  };

  const myFaction = lobbyManager.myFaction;
  const myFactionInfo = FACTIONS[myFaction] || FACTIONS.player;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-1.5 sm:p-2 [@media(min-height:550px)]:p-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-[max(env(safe-area-inset-top),0.5rem)] pl-[max(env(safe-area-inset-left),0.5rem)] pr-[max(env(safe-area-inset-right),0.5rem)] bg-black/85 backdrop-blur-md animate-fade-in touch-none overflow-hidden select-none">
      <div className="relative w-full max-w-4xl h-full max-h-[96vh] sm:max-h-[92vh] [@media(min-width:768px)_and_(min-height:550px)]:h-auto bg-[#080a14]/95 border-2 border-[#00f0ff] p-2 sm:p-2.5 [@media(min-width:768px)_and_(min-height:550px)]:p-5 shadow-[0_0_40px_rgba(0,240,255,0.25)] animate-slide-up flex flex-col rounded-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-1.5 sm:mb-2 [@media(min-width:768px)_and_(min-height:550px)]:mb-3 border-b border-[#00f0ff]/30 pb-1 sm:pb-1.5 [@media(min-width:768px)_and_(min-height:550px)]:pb-2.5 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Signal className="w-4 h-4 sm:w-5 sm:h-5 text-[#00f0ff] animate-pulse" />
            <h2 className="font-orbitron font-bold text-sm sm:text-lg [@media(min-width:768px)_and_(min-height:550px)]:text-xl text-[#00f0ff] glow-white tracking-wider truncate">
              MULTIPLAYER LOBBY
            </h2>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 tracking-widest hidden sm:inline">
              WEBRTC P2P
            </span>
          </div>
          <button 
            onClick={handleClose}
            className="p-1 sm:p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg cursor-pointer"
            title="Close Lobby"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-1.5 p-1 sm:p-1.5 border border-red-500/50 bg-red-950/40 text-red-400 font-rajdhani text-[11px] sm:text-xs text-center rounded shrink-0">
            {error}
          </div>
        )}

        {!roomState ? (
          /* INITIAL VIEW: HOST OR JOIN (100% SYMMETRICAL & ALIGNED) */
          <div className="flex flex-row gap-2 sm:gap-3 [@media(min-width:768px)_and_(min-height:550px)]:gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Host Card */}
            <div className="flex-1 border border-[#00f0ff]/40 bg-gradient-to-b from-[#00f0ff]/10 to-transparent p-2 sm:p-2.5 [@media(min-width:768px)_and_(min-height:550px)]:p-4 rounded-xl flex flex-col justify-between items-center text-center shadow-[0_0_20px_rgba(0,240,255,0.05)] overflow-hidden min-h-0">
              <div className="flex flex-col items-center justify-center w-full min-h-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 [@media(min-width:768px)_and_(min-height:550px)]:w-14 [@media(min-width:768px)_and_(min-height:550px)]:h-14 rounded-full bg-[#00f0ff]/20 border border-[#00f0ff] flex items-center justify-center mb-1 sm:mb-1.5 [@media(min-width:768px)_and_(min-height:550px)]:mb-2.5 shadow-[0_0_15px_rgba(0,240,255,0.3)] shrink-0">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 [@media(min-width:768px)_and_(min-height:550px)]:w-7 [@media(min-width:768px)_and_(min-height:550px)]:h-7 text-[#00f0ff]" />
                </div>
                <h3 className="font-orbitron font-bold text-[#00f0ff] text-xs sm:text-sm [@media(min-width:768px)_and_(min-height:550px)]:text-base tracking-wider mb-0.5 shrink-0">
                  HOST ARENA
                </h3>
                <p className="text-white/70 font-rajdhani text-[10px] sm:text-[11px] [@media(min-width:768px)_and_(min-height:550px)]:text-xs max-w-xs mb-1.5 sm:mb-2 line-clamp-2 shrink-0">
                  Create a private tactical lobby for up to 5 commanders via WebRTC P2P mesh.
                </p>
                {/* Fixed-height container to match Guest Card's input box */}
                <div className="h-8 sm:h-9 [@media(min-width:768px)_and_(min-height:550px)]:h-11 flex items-center justify-center gap-1.5 shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 sm:py-1 rounded bg-white/5 border border-white/10 text-white/80">60 FPS SYNC</span>
                  <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 sm:py-1 rounded bg-white/5 border border-white/10 text-white/80">MAX 5 PILOTS</span>
                </div>
              </div>
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full h-8 sm:h-9 [@media(min-width:768px)_and_(min-height:550px)]:h-11 mt-1.5 sm:mt-2 bg-[#00f0ff]/20 hover:bg-[#00f0ff] hover:text-black text-[#00f0ff] border border-[#00f0ff] font-orbitron font-bold tracking-widest text-[10px] sm:text-[11px] [@media(min-width:768px)_and_(min-height:550px)]:text-xs rounded-lg transition-all duration-200 shadow-[0_0_15px_rgba(0,240,255,0.2)] disabled:opacity-50 cursor-pointer shrink-0 flex items-center justify-center"
              >
                {loading ? 'INITIALIZING...' : 'CREATE ROOM'}
              </button>
            </div>

            {/* Guest Card */}
            <div className="flex-1 border border-white/20 hover:border-[#00f0ff]/40 bg-white/[0.03] p-2 sm:p-2.5 [@media(min-width:768px)_and_(min-height:550px)]:p-4 rounded-xl flex flex-col justify-between items-center text-center transition-colors overflow-hidden min-h-0">
              <div className="flex flex-col items-center justify-center w-full min-h-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 [@media(min-width:768px)_and_(min-height:550px)]:w-14 [@media(min-width:768px)_and_(min-height:550px)]:h-14 rounded-full bg-white/10 border border-white/30 flex items-center justify-center mb-1 sm:mb-1.5 [@media(min-width:768px)_and_(min-height:550px)]:mb-2.5 shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 [@media(min-width:768px)_and_(min-height:550px)]:w-7 [@media(min-width:768px)_and_(min-height:550px)]:h-7 text-white" />
                </div>
                <h3 className="font-orbitron font-bold text-white text-xs sm:text-sm [@media(min-width:768px)_and_(min-height:550px)]:text-base tracking-wider mb-0.5 shrink-0">
                  JOIN FLEET
                </h3>
                <p className="text-white/70 font-rajdhani text-[10px] sm:text-[11px] [@media(min-width:768px)_and_(min-height:550px)]:text-xs max-w-xs mb-1.5 sm:mb-2 line-clamp-2 shrink-0">
                  Enter the 6-character room code provided by the Host commander.
                </p>
                {/* Fixed-height container to match Host Card's badge container */}
                <div className="h-8 sm:h-9 [@media(min-width:768px)_and_(min-height:550px)]:h-11 flex items-center justify-center w-full shrink-0">
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CODE (EX. X8P9A)"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                    className="w-full max-w-[200px] h-full bg-black/60 border border-[#00f0ff]/50 px-2 text-center text-xs sm:text-sm [@media(min-width:768px)_and_(min-height:550px)]:text-base font-orbitron font-bold text-white tracking-[0.25em] rounded-lg outline-none focus:border-[#00f0ff] focus:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={loading || joinCode.length !== 6}
                className="w-full h-8 sm:h-9 [@media(min-width:768px)_and_(min-height:550px)]:h-11 mt-1.5 sm:mt-2 bg-white/10 hover:bg-[#00f0ff] hover:text-black text-white hover:border-[#00f0ff] border border-white/20 font-orbitron font-bold tracking-widest text-[10px] sm:text-[11px] [@media(min-width:768px)_and_(min-height:550px)]:text-xs rounded-lg transition-all duration-200 disabled:opacity-40 cursor-pointer shrink-0 flex items-center justify-center"
              >
                {loading ? 'CONNECTING...' : 'JOIN ROOM'}
              </button>
            </div>
          </div>
        ) : (
          /* WAITING ROOM: TWO-COLUMN LANDSCAPE SPLIT (NO CUTOFFS) */
          <div className="flex flex-row gap-2 sm:gap-3 [@media(min-width:768px)_and_(min-height:550px)]:gap-4 flex-1 min-h-0 overflow-hidden">
            {/* LEFT COLUMN: Code, Fleet Info, & Action Launch Button */}
            <div className="w-[42%] sm:w-[38%] flex flex-col justify-between min-h-0 gap-1.5 sm:gap-2 shrink-0">
              {/* Room Code Card */}
              <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/40 rounded-xl p-1.5 sm:p-2 [@media(min-width:768px)_and_(min-height:550px)]:p-3 shrink-0 flex flex-col gap-0.5 sm:gap-1">
                <span className="font-mono text-white/60 text-[8px] sm:text-[9px] [@media(min-width:768px)_and_(min-height:550px)]:text-[10px] tracking-wider uppercase">ROOM TRANSMISSION CODE</span>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-orbitron font-black text-base sm:text-lg [@media(min-width:768px)_and_(min-height:550px)]:text-2xl tracking-[0.15em] text-white leading-none">
                    {roomState.roomId}
                  </span>
                  <button 
                    onClick={copyCode}
                    className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 border border-[#00f0ff]/60 bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black transition-colors font-orbitron text-[9px] sm:text-[10px] [@media(min-width:768px)_and_(min-height:550px)]:text-xs rounded cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
              </div>

              {/* Your Fleet Assignment */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 sm:p-2 [@media(min-width:768px)_and_(min-height:550px)]:p-2.5 shrink-0 flex items-center justify-between">
                <div>
                  <div className="text-[8px] sm:text-[9px] font-orbitron text-white/50 uppercase tracking-wider">YOUR FACTION</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: myFactionInfo.color, boxShadow: `0 0 8px ${myFactionInfo.color}` }}
                    />
                    <span className="font-orbitron font-bold text-xs sm:text-sm" style={{ color: myFactionInfo.color }}>
                      {myFactionInfo.name.toUpperCase()} FLEET
                    </span>
                  </div>
                </div>
                <span className={`text-[9px] font-orbitron px-1.5 sm:px-2 py-0.5 rounded border ${lobbyManager.isHost ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'}`}>
                  {lobbyManager.isHost ? 'HOST' : 'GUEST'}
                </span>
              </div>

              {/* Action Buttons: Start or Waiting Status + Leave Lobby */}
              <div className="flex flex-col gap-1 sm:gap-1.5 mt-auto shrink-0">
                {lobbyManager.isHost ? (
                  <button
                    onClick={() => {
                      sound.playSelect();
                      onStartGame();
                    }}
                    disabled={roomState.players.length < 2}
                    className="w-full h-8 sm:h-9 [@media(min-width:768px)_and_(min-height:550px)]:h-11 bg-[#00f0ff] hover:bg-white text-black font-orbitron font-black tracking-widest text-[10px] sm:text-xs [@media(min-width:768px)_and_(min-height:550px)]:text-sm rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-200 disabled:opacity-40 disabled:bg-[#00f0ff]/30 flex justify-center items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" />
                    <span>{roomState.players.length < 2 ? 'NEED 2+ PLAYERS' : 'START GAME'}</span>
                  </button>
                ) : (
                  <div className="text-center h-8 sm:h-9 [@media(min-width:768px)_and_(min-height:550px)]:h-11 px-2 border border-[#00f0ff]/40 bg-[#00f0ff]/10 rounded-lg animate-pulse flex items-center justify-center shrink-0">
                    <span className="font-orbitron font-bold text-[#00f0ff] text-[9px] sm:text-[10px] [@media(min-width:768px)_and_(min-height:550px)]:text-xs tracking-wider">
                      WAITING FOR HOST TO LAUNCH...
                    </span>
                  </div>
                )}

                <button
                  onClick={handleLeaveRoom}
                  className="w-full h-7 sm:h-8 [@media(min-width:768px)_and_(min-height:550px)]:h-9 text-white/50 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-lg font-orbitron text-[9px] sm:text-[10px] [@media(min-width:768px)_and_(min-height:550px)]:text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                  <span>LEAVE LOBBY</span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Fleet Commanders Roster */}
            <div className="flex-1 flex flex-col min-h-0 border border-white/10 rounded-xl bg-black/40 p-1.5 sm:p-2.5 [@media(min-width:768px)_and_(min-height:550px)]:p-3 overflow-hidden">
              <div className="flex justify-between items-center border-b border-white/15 pb-1 sm:pb-1.5 mb-1 sm:mb-1.5 shrink-0">
                <h3 className="font-orbitron text-[11px] sm:text-xs [@media(min-width:768px)_and_(min-height:550px)]:text-sm text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span>FLEET COMMANDERS</span>
                </h3>
                <span className="font-mono text-[#00f0ff] text-[11px] sm:text-xs [@media(min-width:768px)_and_(min-height:550px)]:text-sm font-bold">
                  {roomState.players.length} / 5
                </span>
              </div>

              {/* 5 Slots Roster (Fits completely without scrolling) */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 pr-0.5">
                {FACTION_KEYS.map((factionKey, i) => {
                  const player = roomState.players[i];
                  const faction = FACTIONS[factionKey] || FACTIONS.player;

                  if (player) {
                    const isLocal = player.id === lobbyManager.profile?.id;
                    const isHost = player.id === roomState.hostId;
                    return (
                      <div 
                        key={player.id} 
                        className="flex justify-between items-center bg-white/5 border border-white/10 hover:border-[#00f0ff]/40 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors shrink-0"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: faction.color, boxShadow: `0 0 8px ${faction.color}` }}
                          />
                          <span className="font-rajdhani font-semibold text-xs sm:text-sm text-white truncate">
                            {player.name} {isLocal ? <span className="text-[#00f0ff] font-mono">(You)</span> : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                          <span 
                            className="text-[8px] sm:text-[9px] font-orbitron px-1.5 py-0.5 rounded border"
                            style={{ borderColor: `${faction.color}60`, color: faction.color, backgroundColor: `${faction.color}15` }}
                          >
                            {faction.name.toUpperCase()}
                          </span>
                          {isHost && (
                            <span className="text-[8px] sm:text-[9px] font-orbitron bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 px-1.5 py-0.5 rounded">
                              HOST
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={`empty-${i}`} 
                      className="flex justify-between items-center border border-white/5 border-dashed px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg opacity-40 text-xs shrink-0"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div 
                          className="w-2 h-2 rounded-full shrink-0 opacity-40" 
                          style={{ backgroundColor: faction.color }}
                        />
                        <span className="font-rajdhani italic text-white/50 text-[10px] sm:text-[11px]">
                          Awaiting commander...
                        </span>
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-orbitron text-white/30 uppercase">
                        {faction.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
