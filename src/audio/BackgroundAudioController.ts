import type { AmbientEngine } from './AmbientEngine';
import type { CompositionGenerator } from '../generator/CompositionGenerator';

type AudioSessionMode = 'auto' | 'ambient' | 'playback' | 'transient' | 'transient-solo' | 'play-and-record';

interface BrowserAudioSession extends EventTarget {
  type: AudioSessionMode;
  state?: 'inactive' | 'active' | 'interrupted';
}

interface NavigatorWithAudioSession extends Navigator {
  audioSession?: BrowserAudioSession;
}

const STALE_GENERATOR_MS = 30_000;

export class BackgroundAudioController {
  private wantsPlayback = false;
  private restoring = false;
  private hiddenAt: number | null = null;
  private readonly audioSession = (navigator as NavigatorWithAudioSession).audioSession;

  constructor(
    private readonly engine: AmbientEngine,
    private readonly generator: CompositionGenerator,
  ) {
    this.configurePlaybackSession();
    this.bindLifecycleEvents();
  }

  setPlaybackIntent(playing: boolean): void {
    this.wantsPlayback = playing;

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      } catch {
        // Media Session is optional and must never affect audio playback.
      }
    }
  }

  async restoreIfNeeded(): Promise<void> {
    if (!this.wantsPlayback || this.restoring) return;

    this.restoring = true;

    try {
      // AmbientEngine.initialize() is idempotent: after the first start it only
      // resumes the existing AudioContext and never creates a second engine.
      await this.engine.initialize();

      const hiddenFor = this.hiddenAt === null ? 0 : Date.now() - this.hiddenAt;
      if (hiddenFor >= STALE_GENERATOR_MS) {
        this.generator.reconcileAfterInterruption(new Date());
      }
    } catch (error) {
      // Some browser or OS interruptions still require a fresh user gesture.
      // In that case the central play button remains the recovery path.
      console.warn('Background audio could not resume automatically.', error);
    } finally {
      this.hiddenAt = null;
      this.restoring = false;
    }
  }

  private configurePlaybackSession(): void {
    if (!this.audioSession) return;

    try {
      this.audioSession.type = 'playback';
    } catch (error) {
      console.warn('Audio Session playback mode is unavailable.', error);
    }

    this.audioSession.addEventListener('statechange', () => {
      if (this.audioSession?.state === 'active') void this.restoreIfNeeded();
    });
  }

  private bindLifecycleEvents(): void {
    document.addEventListener('visibilitychange', () => {
      document.documentElement.classList.toggle('is-page-hidden', document.hidden);

      if (document.hidden) {
        this.hiddenAt = Date.now();
      } else {
        void this.restoreIfNeeded();
      }
    });

    window.addEventListener('pageshow', () => {
      void this.restoreIfNeeded();
    });

    window.addEventListener('focus', () => {
      void this.restoreIfNeeded();
    });
  }
}
