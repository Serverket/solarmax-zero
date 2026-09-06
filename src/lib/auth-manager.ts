import { supabase, isSupabaseConfigured } from './supabase';

export interface PlayerProfile {
  id: string;
  name: string;
  isGuest: boolean;
}

export class AuthManager {
  private static readonly GUEST_PREFIX = 'guest_';
  private static readonly GUEST_STORAGE_KEY = 'solarmax_guest_profile';

  static async getCurrentProfile(): Promise<PlayerProfile> {
    // 1. Try to get authenticated user if Supabase is configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          return {
            id: session.user.id,
            name: session.user.user_metadata?.username || `User_${session.user.id.substring(0, 5)}`,
            isGuest: false
          };
        }
      } catch (e) {
        console.warn("Error fetching Supabase session, falling back to Guest", e);
      }
    }

    // 2. Fallback to Guest
    return this.getOrCreateGuestProfile();
  }

  static getOrCreateGuestProfile(): PlayerProfile {
    const stored = localStorage.getItem(this.GUEST_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as PlayerProfile;
      } catch (e) {
        console.error("Failed to parse guest profile", e);
      }
    }

    // Generate new guest
    const guestId = `${this.GUEST_PREFIX}${crypto.randomUUID()}`;
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const newProfile: PlayerProfile = {
      id: guestId,
      name: `Guest_${randomNum}`,
      isGuest: true
    };

    localStorage.setItem(this.GUEST_STORAGE_KEY, JSON.stringify(newProfile));
    return newProfile;
  }
}
