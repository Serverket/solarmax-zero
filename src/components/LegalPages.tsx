import { Shield, FileText, ArrowLeft, Lock, EyeOff, Activity, UserCheck, UserCog, Server, Clock } from 'lucide-react';
import { sound } from '../utils/sound';

interface LegalPagesProps {
  type: 'privacy' | 'tos';
}

export function LegalPages({ type }: LegalPagesProps) {
  const handleBack = () => {
    sound.playSelect();
    window.location.href = '/';
  };

  const isPrivacy = type === 'privacy';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start bg-[#050510] text-white p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8 overflow-y-auto font-rajdhani">
      {/* Background aesthetics */}
      <div className="absolute inset-0 bg-[url('/bg.png')] opacity-10 bg-cover bg-center pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#00f0ff]/10 via-transparent to-[#00f0ff]/5 pointer-events-none" />
      
      <div className="relative w-full max-w-3xl glass-panel p-6 sm:p-10 rounded-2xl border border-[#00f0ff]/30 shadow-[0_0_50px_rgba(0,240,255,0.1)] mt-2 sm:mt-8 mb-6 sm:mb-12 shrink-0">
        <button 
          onClick={handleBack}
          className="group absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-white/50 hover:text-[#00f0ff] transition-colors font-orbitron text-[10px] sm:text-sm uppercase tracking-widest cursor-pointer z-10 bg-black/40 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-full sm:rounded-none backdrop-blur-sm sm:backdrop-blur-none border border-white/10 sm:border-transparent"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Command Center
        </button>

        <div className="text-center mb-10 mt-8 sm:mt-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#00f0ff]/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#00f0ff]/40 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            {isPrivacy ? <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-[#00f0ff]" /> : <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-[#00f0ff]" />}
          </div>
          <h1 className="font-orbitron text-2xl sm:text-4xl font-black text-white tracking-[0.1em] uppercase glow-white mb-2">
            {isPrivacy ? 'Privacy Protocol' : 'Terms of Service'}
          </h1>
          <p className="font-mono text-[#00f0ff]/70 text-xs sm:text-sm tracking-widest uppercase">
            Solarmax Zero Tactical Network
          </p>
        </div>

        <div className="space-y-8 text-white/80 leading-relaxed text-sm sm:text-base">
          {isPrivacy ? (
            <>
              <section className="bg-black/40 p-5 rounded-xl border border-white/5">
                <h3 className="font-orbitron text-lg text-white mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#00f0ff]" /> Military-Grade Encryption
                </h3>
                <p className="mb-2">
                  Your security is our absolute priority. Solarmax Zero implements strict cryptographic standards to protect your credentials.
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-2">
                  <li><strong>Client-Side Pre-Hashing:</strong> All passwords are hashed locally in your browser using Post-Quantum resistant algorithms (SHA-384) before ever touching the network.</li>
                  <li><strong>Zero-Knowledge Transmission:</strong> Our servers never receive, transmit, or store your raw password. We only process the cryptographic hash.</li>
                  <li><strong>End-to-End Secure:</strong> Database and authentication layers are handled securely via Supabase over WSS/HTTPS protocols.</li>
                </ul>
              </section>

              <section className="bg-black/40 p-5 rounded-xl border border-white/5">
                <h3 className="font-orbitron text-lg text-white mb-3 flex items-center gap-2">
                  <EyeOff className="w-5 h-5 text-[#00f0ff]" /> Zero Tracking & Advertising
                </h3>
                <p>
                  We believe in total privacy. Solarmax Zero contains <strong>absolutely zero tracking scripts</strong>. No Google Analytics, no Meta Pixels, no advertising cookies. Your gameplay data is never sold, traded, or utilized for commercial profiling. You play in a completely isolated, privacy-focused tactical environment.
                </p>
              </section>

              <section className="bg-black/40 p-5 rounded-xl border border-white/5">
                <h3 className="font-orbitron text-lg text-white mb-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#00f0ff]" /> Email Privacy
                </h3>
                <p>
                  Your email address is required exclusively for cryptographic account linkage and authentication recovery. <strong>We do not use your email for marketing, newsletters, or any form of unsolicited publicity.</strong> It remains completely confidential and shielded within our authentication infrastructure.
                </p>
              </section>

              <section className="bg-black/40 p-5 rounded-xl border border-white/5">
                <h3 className="font-orbitron text-lg text-white mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#00f0ff]" /> Game Telemetry
                </h3>
                <p>
                  The only data we store relates strictly to your in-game tactical performance (e.g., ships destroyed, planets captured, campaign progression, multiplayer matches). This telemetry is utilized solely to power the global leaderboards and persist your game state.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="bg-black/40 p-5 rounded-xl border border-white/5">
                <h3 className="font-orbitron text-lg text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00f0ff]" /> Fair Play & Integrity
                </h3>
                <p>
                  By connecting to the Solarmax Zero multiplayer network, you agree to engage in fair, tactical combat. Any utilization of memory manipulation, packet injection, automated AI clicking bots, or network manipulation (lag switching) is strictly prohibited. Violators will have their network authorization revoked.
                </p>
              </section>

              <section className="bg-black/40 p-5 rounded-xl border border-white/5">
                <h3 className="font-orbitron text-lg text-white mb-3 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-[#00f0ff]" /> Account Responsibilities
                </h3>
                <p>
                  You are responsible for maintaining the confidentiality of your authentication credentials. The development team is not liable for data loss or account compromise resulting from shared credentials or compromised personal devices.
                </p>
              </section>

              <section className="bg-black/40 p-5 rounded-xl border border-white/5">
                <h3 className="font-orbitron text-lg text-white mb-3 flex items-center gap-2">
                  <Server className="w-5 h-5 text-[#00f0ff]" /> Service Availability
                </h3>
                <p>
                  Solarmax Zero is provided "as is" and "as available". We reserve the right to perform network maintenance, reset global leaderboards for seasonal transitions, or modify game balancing mechanics at any time to ensure optimal multiplayer integrity.
                </p>
              </section>

              <section className="bg-black/40 p-5 rounded-xl border border-white/5">
                <h3 className="font-orbitron text-lg text-white mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#00f0ff]" /> Guest Quotas
                </h3>
                <p>
                  Unregistered "Guest" connections are granted a limited daily quota of server resources (multiplayer playtime) to protect server integrity. Circumventing these quotas through network manipulation or excessive IP rotation may result in automated firewall bans.
                </p>
              </section>
            </>
          )}

          <div className="mt-12 text-center text-white/40 text-xs font-mono">
            Last Updated: Sector Cycle {new Date().getFullYear()} <br/>
            Solarmax Zero / Serverket.dev
          </div>
        </div>
      </div>
    </div>
  );
}
