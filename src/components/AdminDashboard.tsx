import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Database, RefreshCw, ChevronLeft, Activity, ShieldCheck, Zap } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);

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
        .limit(50);

      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error("Error fetching players", err);
    }
  };

  const handleUnlockMothership = async (userId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('game_progress')
        .update({ mothership_unlocked: true })
        .eq('user_id', userId);
      if (error) throw error;
      fetchPlayers(); 
    } catch (err) {
      console.error("Unlock failed", err);
    }
  };

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
    <div className="fixed inset-0 z-[200] flex flex-col sm:flex-row bg-[#05070e] overflow-hidden">
      {/* Sidebar */}
      <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-white/5 bg-black/50 p-4 sm:p-6 flex flex-col gap-6 shrink-0">
        <div className="flex items-center gap-3 text-cyan-400">
          <ShieldCheck className="w-8 h-8 drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
          <div>
            <h2 className="font-orbitron font-black tracking-widest text-sm text-white uppercase glow-white">High Command</h2>
            <p className="text-[9px] text-cyan-400/60 uppercase tracking-[0.2em] font-mono">Terminal Active</p>
          </div>
        </div>
        
        <div className="flex sm:flex-col gap-2 flex-1 overflow-x-auto sm:overflow-visible no-scrollbar">
          <button className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-transparent text-cyan-400 border-l-2 border-cyan-400 text-xs font-bold uppercase tracking-widest shadow-[inset_20px_0_20px_rgba(0,240,255,0.05)] whitespace-nowrap">
            <Users className="w-4 h-4" /> Enlisted Pilots
          </button>
          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest whitespace-nowrap">
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

        <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-8 z-10 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-white/50" />
            <h3 className="font-orbitron text-sm sm:text-lg tracking-widest text-white uppercase">Personnel Records</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-green-400 font-mono hidden sm:inline-block">● DB_CONNECTED</span>
            <button onClick={fetchPlayers} className="p-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/80 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="sm:hidden p-2 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/20 text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 z-10">
          <div className="glass-panel rounded-xl overflow-hidden border-white/10 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[10px] text-white/50 uppercase tracking-widest font-mono">
                    <th className="p-4 font-normal">Pilot ID / Name</th>
                    <th className="p-4 font-normal">Enlistment Date</th>
                    <th className="p-4 font-normal">Progression</th>
                    <th className="p-4 font-normal text-right">Overrides</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {players.map(p => {
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
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Sector</span>
                              <span className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-xs text-white font-bold border border-white/20 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)]">
                                {progress.highest_level}
                              </span>
                            </div>
                            {progress.mothership_unlocked && (
                              <div className="flex flex-col items-center animate-fade-in">
                                <span className="text-[8px] text-purple-400/50 uppercase tracking-widest mb-1">Access</span>
                                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40 text-[9px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                                  Mothership
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {!progress.mothership_unlocked ? (
                            <button
                              onClick={() => handleUnlockMothership(p.id)}
                              className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold bg-cyan-900/40 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded border border-cyan-500/50 transition-all flex items-center gap-2 ml-auto shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                            >
                              <Zap className="w-3 h-3" /> Grant Access
                            </button>
                          ) : (
                            <span className="text-[10px] text-white/20 font-mono uppercase tracking-widest">Max Clearance</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {players.length === 0 && (
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
        </div>
      </div>
    </div>
  );
};
