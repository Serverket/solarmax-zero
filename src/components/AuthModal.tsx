import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (isOpen && isSupabaseConfigured()) {
      supabase?.auth.getSession().then(({ data }) => setSession(data.session));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (!isSupabaseConfigured()) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-sm w-full text-center border-red-500/30 shadow-[0_0_40px_rgba(255,0,0,0.2)] animate-fade-in">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse-slow" />
          <h2 className="font-orbitron text-xl text-white mb-2 uppercase tracking-widest">System Offline</h2>
          <p className="text-white/50 mb-6 text-xs uppercase tracking-widest">Neural link to Command Center is currently unavailable.</p>
          <button onClick={onClose} className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg font-bold uppercase tracking-widest text-xs transition-colors">
            Acknowledge
          </button>
        </div>
      </div>
    );
  }

  const hashPassword = async (pwd: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-384', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      setError("Anomalous activity detected. Access restricted.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error("Connection severed");

      // Quantum-Resistant Layer (Pre-Hash)
      const securedPassword = await hashPassword(password);

      let authError;
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: securedPassword });
        authError = error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: securedPassword });
        authError = error;
      }

      if (authError) throw authError;
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    setSession(null);
    onClose();
  };

  if (session) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-sm w-full text-center border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.2)] animate-fade-in relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
          <ShieldCheck className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h2 className="font-orbitron text-xl text-white mb-1 uppercase tracking-widest glow-white">Identity Verified</h2>
          <p className="text-white/50 mb-6 text-xs font-mono">{session.user.email}</p>
          <button onClick={handleLogout} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-colors border border-white/20">
            Terminate Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="glass-panel p-8 rounded-2xl max-w-sm w-full relative border-cyan-500/20 shadow-[0_0_50px_rgba(0,240,255,0.15)] animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            {isLogin ? <LogIn className="w-8 h-8 text-cyan-400" /> : <UserPlus className="w-8 h-8 text-cyan-400" />}
          </div>
          <h2 className="font-orbitron text-2xl font-black text-white tracking-[0.2em] uppercase glow-white">
            {isLogin ? 'Initialize' : 'Enlist'}
          </h2>
          <p className="text-[10px] text-cyan-200/50 tracking-[0.3em] uppercase mt-2">
            Secure Fleet Connection
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs shadow-[inset_0_0_10px_rgba(255,0,0,0.2)]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="text" 
            name="pilot_classification" 
            value={honeypot} 
            onChange={(e) => setHoneypot(e.target.value)} 
            className="opacity-0 absolute left-[-9999px]" 
            tabIndex={-1} 
            autoComplete="off" 
          />
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="PILOT EMAIL"
              className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-cyan-400 focus:bg-cyan-900/10 focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-mono"
            />
          </div>
          
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ACCESS CODE"
              className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-cyan-400 focus:bg-cyan-900/10 focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg font-orbitron font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 bg-white text-black hover:bg-cyan-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed mt-8 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shimmer" />
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              isLogin ? 'Authenticate' : 'Establish Link'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-[10px] text-white/30 hover:text-white uppercase tracking-[0.2em] transition-colors border-b border-transparent hover:border-white/50 pb-1"
          >
            {isLogin ? "Request Access Clearance" : "Authenticate Existing Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};
