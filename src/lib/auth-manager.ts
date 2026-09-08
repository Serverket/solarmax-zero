import { supabase, isSupabaseConfigured } from './supabase';

export interface PlayerProfile {
  id: string;
  name: string;
  isGuest: boolean;
}

export class AuthManager {
  private static readonly GUEST_PREFIX = 'guest_';
  private static readonly GUEST_STORAGE_KEY = 'solarmax_guest_profile';
  // Unique per tab/window instance so two tabs of the same user never collide in multiplayer
  private static readonly TAB_INSTANCE_ID = Math.random().toString(36).substring(2, 8);

  static async getCurrentProfile(): Promise<PlayerProfile> {
    // 1. Try to get authenticated user if Supabase is configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          return {
            id: `${session.user.id}_${this.TAB_INSTANCE_ID}`,
            name: session.user.user_metadata?.username || `User_${session.user.id.substring(0, 5)}`,
            isGuest: false
          };
        }
      } catch (e) {
        console.warn("Error fetching Supabase session, falling back to Guest", e);
      }
    }

    // 2. Fallback to Guest
    const guest = this.getOrCreateGuestProfile();
    return {
      ...guest,
      id: `${guest.id}_${this.TAB_INSTANCE_ID}`
    };
  }

  static getOrCreateGuestProfile(): PlayerProfile {
    const stored = sessionStorage.getItem(this.GUEST_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as PlayerProfile;
      } catch (e) {
        console.error("Failed to parse guest profile", e);
      }
    }

    // Generate new guest
    const guestId = `${this.GUEST_PREFIX}${crypto.randomUUID().substring(0, 8)}`;
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const newProfile: PlayerProfile = {
      id: guestId,
      name: `Guest_${randomNum}`,
      isGuest: true
    };

    sessionStorage.setItem(this.GUEST_STORAGE_KEY, JSON.stringify(newProfile));
    return newProfile;
  }
}
