export const TRACKS = [
  { file: "01RedGiant.ogg", name: "Red Giant" },
  { file: "02Airglow.ogg", name: "Airglow" },
  { file: "03Eternity.ogg", name: "Eternity" },
  { file: "04LightYears.ogg", name: "Light Years" },
  { file: "05InTime.ogg", name: "In Time" },
  { file: "06CometHalley.ogg", name: "Comet Halley" },
  { file: "07ToTheGreatBeyond.ogg", name: "To The Great Beyond" },
  { file: "08TheDivineCosmos.ogg", name: "The Divine Cosmos" },
  { file: "09Penumbra.ogg", name: "Penumbra" },
  { file: "10Twilight.ogg", name: "Twilight" }
];

type TrackListener = (trackName: string | null) => void;

class MusicEngine {
  private audio: HTMLAudioElement | null = null;
  private currentTrackIndex = -1;
  private isMuted = false;
  private listeners: Set<TrackListener> = new Set();
  private volume = 0.3;

  public init() {
    if (this.audio) return;
    this.audio = new Audio();
    this.audio.volume = this.volume;
    this.audio.addEventListener('ended', () => this.nextTrack());
    
    // Start with a random track
    this.currentTrackIndex = Math.floor(Math.random() * TRACKS.length);
    this.playCurrentTrack();
  }

  public subscribe(listener: TrackListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const trackName = this.currentTrackIndex >= 0 ? TRACKS[this.currentTrackIndex].name : null;
    this.listeners.forEach(l => l(trackName));
  }

  private playCurrentTrack() {
    if (!this.audio || this.isMuted) return;
    const track = TRACKS[this.currentTrackIndex];
    this.audio.src = `/audio/${track.file}`;
    this.audio.play().then(() => {
      this.notify();
    }).catch(e => {
      console.warn("Failed to play track, trying next...", e);
      // Auto-skip if file not found (e.g., user hasn't downloaded them yet)
      setTimeout(() => this.nextTrack(), 2000);
    });
  }

  public nextTrack() {
    if (this.currentTrackIndex === -1) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % TRACKS.length;
    this.playCurrentTrack();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      if (this.isMuted) {
        this.audio.pause();
      } else {
        this.playCurrentTrack();
      }
    }
  }

  public setVolume(vol: number) {
    this.volume = vol;
    if (this.audio) {
      this.audio.volume = vol;
    }
  }
}

export const music = new MusicEngine();
