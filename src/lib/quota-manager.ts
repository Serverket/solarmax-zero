import type { PlayerProfile } from './auth-manager';

export class QuotaManager {
  private static readonly STORAGE_KEY = 'solarmax_guest_quota_v1';
  // 2 hours in seconds
  public static readonly DAILY_GUEST_QUOTA_SECONDS = 7200;

  private static getTodayKey(): string {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  private static getQuotaData(): { date: string; secondsPlayed: number } {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse guest quota", e);
      }
    }
    return { date: this.getTodayKey(), secondsPlayed: 0 };
  }

  private static saveQuotaData(secondsPlayed: number) {
    const data = { date: this.getTodayKey(), secondsPlayed };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  static getRemainingSeconds(profile?: PlayerProfile): number {
    if (!profile) return this.DAILY_GUEST_QUOTA_SECONDS;
    if (!profile.isGuest) return Infinity; // Registered users have unlimited time

    let data = this.getQuotaData();
    const today = this.getTodayKey();

    if (data.date !== today) {
      // Reset quota for a new day
      data = { date: today, secondsPlayed: 0 };
      this.saveQuotaData(0);
    }

    const remaining = this.DAILY_GUEST_QUOTA_SECONDS - data.secondsPlayed;
    return Math.max(0, remaining);
  }

  static addPlayedSeconds(profile: PlayerProfile | undefined, seconds: number): number {
    if (profile && !profile.isGuest) return Infinity;

    let data = this.getQuotaData();
    const today = this.getTodayKey();

    if (data.date !== today) {
      data = { date: today, secondsPlayed: 0 };
    }

    data.secondsPlayed += seconds;
    this.saveQuotaData(data.secondsPlayed);

    const remaining = this.DAILY_GUEST_QUOTA_SECONDS - data.secondsPlayed;
    return Math.max(0, remaining);
  }
}
