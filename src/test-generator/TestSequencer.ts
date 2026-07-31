import type { AmbientEngine } from '../audio/AmbientEngine';
import { BackgroundAudioController } from '../audio/BackgroundAudioController';
import { CompositionGenerator } from '../generator/CompositionGenerator';
import type { GeneratorSource } from '../generator/types';

// Compatibility wrapper for the existing UI import. Musical behaviour remains
// entirely inside CompositionGenerator; this class only adds browser lifecycle
// handling until main.ts is cleaned up in a later UI pass.
export class TestSequencer extends CompositionGenerator {
  private readonly backgroundAudio: BackgroundAudioController;
  private activeSource: GeneratorSource = 'clock';
  private activeSceneId = '';

  constructor(engine: AmbientEngine) {
    super(engine);

    this.subscribe((snapshot) => {
      this.activeSource = snapshot.source;
      this.activeSceneId = snapshot.sceneId;
    });

    // Constructed before the first user click, so Safari receives playback
    // session intent before AmbientEngine creates its AudioContext.
    this.backgroundAudio = new BackgroundAudioController(engine, this);
  }

  override start(): void {
    super.start();
    this.backgroundAudio.setPlaybackIntent(true);
  }

  override stop(): void {
    this.backgroundAudio.setPlaybackIntent(false);
    super.stop();
  }

  reconcileAfterInterruption(_date: Date): void {
    if (!this.isRunning()) return;

    if (this.activeSource === 'clock') {
      this.followClock();
      return;
    }

    if (this.activeSceneId) {
      this.selectScene(this.activeSceneId, this.activeSource);
    }
  }
}
