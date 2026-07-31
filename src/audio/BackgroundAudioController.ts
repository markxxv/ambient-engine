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
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }

  async restoreIfNeeded(): Promise<void> {
    if (!this.wantsPlayback || this.restoring) return;

    this.restoring = true;

    try {
      const resumed = await this.engine.resume();
      const hiddenFor = this.hiddenAt === null ? 0 : Date.now() - this.hiddenAt;

      if (resumed || hiddenFor >= STALE_GENERATOR_MS) {
        this.generator.reconcileAfterInterruption(new Date());
      }
    } catch (error) {
      // A browser may still require a new user gesture after a system-level
      // interruption. The central play button remains available for that case.
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
