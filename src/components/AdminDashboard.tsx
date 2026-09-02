import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Users, Database, RefreshCw, ChevronLeft, Activity, ShieldCheck, Zap, X, Search, RotateCcw, ZapOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pilots' | 'metrics'>('pilots');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    if (!isSupabaseConfigured()) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await supabase!
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || data?.role !== 'admin') throw new Error("Not an admin");
      
      setIsAdmin(true);
      fetchPlayers();
    } catch (err) {
      console.error("Admin check failed", err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          created_at,
          game_progress ( highest_level, mothership_unlocked )
        `)
        .eq('role', 'player')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error("Error fetching players", err);
    }
  };

  const handleUnlockMothership = async (userId: string, unlock: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('game_progress')
        .upsert({ user_id: userId, mothership_unlocked: unlock }, { onConflict: 'user_id' });
      if (error) throw error;
      fetchPlayers(); 
    } catch (err) {
      console.error("Unlock failed", err);
    }
  };

  const handleResetProgress = async (userId: string) => {
    if (!supabase) return;
    if (!window.confirm('WARNING: This will reset the pilot back to Sector 1. Proceed?')) return;
    try {
      const { error } = await supabase
        .from('game_progress')
        .upsert({ user_id: userId, highest_level: 1, mothership_unlocked: false, custom_maps: [] }, { onConflict: 'user_id' });
      if (error) throw error;
      fetchPlayers(); 
    } catch (err) {
      console.error("Reset failed", err);
    }
  };

  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return players;
    return players.filter(p => 
      p.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.id.includes(searchQuery)
    );
  }, [players, searchQuery]);

  // Calculate Metrics
  const totalPlayers = players.length;
  const mothershipsUnlocked = players.filter(p => p.game_progress?.[0]?.mothership_unlocked).length;
  const avgLevel = totalPlayers > 0 
    ? (players.reduce((sum, p) => sum + (p.game_progress?.[0]?.highest_level || 1), 0) / totalPlayers).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-900 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_30px_rgba(0,240,255,0.5)]" />
          <span className="font-orbitron tracking-[0.3em] text-cyan-400 text-xs uppercase animate-pulse">Decrypting Clearance...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
        <div className="text-center p-10 glass-panel rounded-2xl border-red-500/40 shadow-[0_0_50px_rgba(255,0,0,0.15)] max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-900 via-red-500 to-red-900" />
          <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]" />
          <h1 className="text-white font-orbitron text-2xl font-black tracking-[0.2em] uppercase mb-2">Access Denied</h1>
          <p className="text-red-400/80 text-xs tracking-[0.2em] uppercase mb-8 font-mono bg-red-950/50 py-2 rounded">Code: 403 - Insufficient Rank</p>
          <button onClick={onClose} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-colors">
            Return to Bridge
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col sm:flex-row bg-[#05070e] overflow-hidden pb-[env(safe-area-inset-bottom,0px)] touch-none">
      {/* Sidebar */}
      <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-white/5 bg-black/50 p-4 sm:p-6 flex flex-col gap-6 shrink-0">
        <div className="flex items-center gap-3 text-cyan-400">
          <ShieldCheck className="w-8 h-8 drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
          <div>
            <h2 className="font-orbitron font-black tracking-widest text-sm text-white uppercase glow-white">High Command</h2>
            <p className="text-[9px] text-cyan-400/60 uppercase tracking-[0.2em] font-mono">Terminal Active</p>
          </div>
        </div>
        
        <div className="flex sm:flex-col gap-2 flex-1 overflow-hidden no-scrollbar shrink-0">
          <button 
            onClick={() => setActiveTab('pilots')}
            className={`flex items-center gap-3 p-3 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTab === 'pilots' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-transparent text-cyan-400 border-l-2 border-cyan-400 shadow-[inset_20px_0_20px_rgba(0,240,255,0.05)]' 
                : 'hover:bg-white/5 text-white/40 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Enlisted Pilots
          </button>
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-3 p-3 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTab === 'metrics' 
                ? 'bg-gradient-to-r from-purple-500/20 to-transparent text-purple-400 border-l-2 border-purple-400 shadow-[inset_20px_0_20px_rgba(168,85,247,0.05)]' 
                : 'hover:bg-white/5 text-white/40 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" /> Server Metrics
          </button>
        </div>

        <button onClick={onClose} className="hidden sm:flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors text-xs font-bold uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" /> Disconnect
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50 pointer-events-none" />

        <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-8 z-10 bg-black/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-white/50" />
            <h3 className="font-orbitron text-sm sm:text-lg tracking-widest text-white uppercase">
              {activeTab === 'pilots' ? 'Personnel Records' : 'Global Metrics'}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-green-400 font-mono hidden sm:inline-block">● DB_CONNECTED</span>
            {activeTab === 'pilots' && (
              <div className="relative hidden md:block">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="text" 
                  placeholder="SEARCH PILOTS..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded px-8 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50 w-64"
                />
              </div>
            )}
            <button onClick={fetchPlayers} className="p-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/80 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="sm:hidden p-2 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/20 text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden touch-none p-2 sm:p-8 z-10 flex flex-col min-h-0">
          {activeTab === 'pilots' && (
            <div className="glass-panel rounded-xl overflow-hidden border-white/10 shadow-2xl flex flex-col flex-1 min-h-0">
              {/* Mobile Search */}
              <div className="p-4 border-b border-white/5 md:hidden">
                 <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="text" 
                    placeholder="SEARCH PILOTS..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-10 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
              <div className="overflow-hidden touch-none flex-1 min-h-0">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-[10px] text-white/50 uppercase tracking-widest font-mono">
                      <th className="p-4 font-normal">Pilot ID / Name</th>
                      <th className="p-4 font-normal">Enlistment Date</th>
                      <th className="p-4 font-normal">Progression</th>
                      <th className="p-4 font-normal text-right">Overrides</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredPlayers.map(p => {
                      const progress = p.game_progress?.[0] || { highest_level: 1, mothership_unlocked: false };
                      return (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="p-4">
                            <div className="font-bold text-white text-base font-orbitron">{p.username}</div>
                            <div className="text-[9px] text-cyan-400/50 font-mono tracking-wider mt-1">{p.id}</div>
                          </td>
                          <td className="p-4 text-white/50 text-xs font-mono">
                            {new Date(p.created_at).toISOString().split('T')[0]}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Sector</span>
                                <span className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs text-white font-bold border border-white/20 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)]">
                                  {progress.highest_level}
                                </span>
                              </div>
                              <div className={`flex flex-col items-center transition-opacity ${progress.mothership_unlocked ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                                <span className="text-[8px] text-purple-400/50 uppercase tracking-widest mb-1">Access</span>
                                <span className={`px-2 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest ${progress.mothership_unlocked ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                                  Mothership
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!progress.mothership_unlocked ? (
                                <button
                                  onClick={() => handleUnlockMothership(p.id, true)}
                                  title="Grant Mothership Access"
                                  className="w-8 h-8 flex items-center justify-center bg-cyan-900/40 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded border border-cyan-500/50 transition-all shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                                >
                                  <Zap className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnlockMothership(p.id, false)}
                                  title="Revoke Mothership Access"
                                  className="w-8 h-8 flex items-center justify-center bg-orange-900/40 hover:bg-orange-500 text-orange-400 hover:text-white rounded border border-orange-500/50 transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                                >
                                  <ZapOff className="w-4 h-4" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleResetProgress(p.id)}
                                title="Reset Progress to Sector 1"
                                className="w-8 h-8 flex items-center justify-center bg-red-900/40 hover:bg-red-500 text-red-400 hover:text-white rounded border border-red-500/50 transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPlayers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-white/30 text-xs uppercase tracking-[0.2em] font-orbitron">
                          No pilot records detected in database
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <div className="glass-panel p-8 rounded-2xl border-cyan-500/20 shadow-[0_0_30px_rgba(0,240,255,0.05)] flex flex-col items-center justify-center text-center">
                <Users className="w-12 h-12 text-cyan-400 mb-4 opacity-80" />
                <div className="text-4xl font-black font-orbitron text-white glow-white mb-2">{totalPlayers}</div>
                <div className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-mono">Total Enlisted Pilots</div>
              </div>

              <div className="glass-panel p-8 rounded-2xl border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.05)] flex flex-col items-center justify-center text-center">
                <Zap className="w-12 h-12 text-purple-400 mb-4 opacity-80" />
                <div className="text-4xl font-black font-orbitron text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] mb-2">{mothershipsUnlocked}</div>
                <div className="text-[10px] text-purple-400/60 uppercase tracking-widest font-mono">Motherships Deployed</div>
              </div>

              <div className="glass-panel p-8 rounded-2xl border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.05)] flex flex-col items-center justify-center text-center">
                <Activity className="w-12 h-12 text-orange-400 mb-4 opacity-80" />
                <div className="text-4xl font-black font-orbitron text-white drop-shadow-[0_0_10px_rgba(249,115,22,0.8)] mb-2">{avgLevel}</div>
                <div className="text-[10px] text-orange-400/60 uppercase tracking-widest font-mono">Average Sector Level</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
