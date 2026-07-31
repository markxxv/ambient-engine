import type { AmbientEngine } from '../audio/AmbientEngine';
import { createComposition, localHourKey } from './compositionFactory';
import { SeededRandom } from './random';
import { sceneForDate } from './schedule';
import { findScene } from './scenes';
import type {
  GeneratedComposition,
  GeneratedStep,
  GeneratorListener,
  GeneratorSnapshot,
  GeneratorSource,
  SceneDefinition,
} from './types';

export class CompositionGenerator {
  private running = false;
  private source: GeneratorSource = 'clock';
  private selectedSceneId: string | null = null;
  private selectionSerial = 0;
  private composition: GeneratedComposition | null = null;
  private cycle = 0;
  private stepIndex = 0;
  private activeNotes: number[] = [];
  private chordTimer: number | null = null;
  private releaseTimer: number | null = null;
  private pendingReleaseNotes: number[] = [];
  private melodyTimer: number | null = null;
  private hourTimer: number | null = null;
  private currentKeyNote = 67;
  private melodyDirection: -1 | 1 = 1;
  private phraseLength = 3;
  private phrasePosition = 0;
  private recentKeyNotes: number[] = [];
  private recentIntervals: number[] = [];
  private random = new SeededRandom(1);
  private listeners = new Set<GeneratorListener>();

  constructor(private readonly engine: AmbientEngine) {}

  start(): void {
    if (this.running) return;

    this.running = true;
    this.cycle = 0;
    const now = new Date();
    const composition = this.buildComposition(now, 0);
    this.switchComposition(composition, true);
    this.scheduleHourBoundary();
  }

  stop(): void {
    this.running = false;
    this.clearTimers();
    this.engine.releaseAll();
    this.activeNotes = [];
    this.emitSnapshot();
  }

  isRunning(): boolean {
    return this.running;
  }

  subscribe(listener: GeneratorListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  // Future Work/Sleep/Walk controls can call this method directly.
  selectScene(sceneId: string, source: Exclude<GeneratorSource, 'clock'> = 'manual'): void {
    findScene(sceneId);
    this.source = source;
    this.selectedSceneId = sceneId;
    this.selectionSerial += 1;
    this.cycle = 0;

    if (!this.running) {
      this.emitSnapshot();
      return;
    }

    this.clearHourTimer();
    const composition = this.buildComposition(new Date(), 0);
    this.switchComposition(composition, true);
  }

  followClock(): void {
    this.source = 'clock';
    this.selectedSceneId = null;
    this.cycle = 0;

    if (this.running) {
      const composition = this.buildComposition(new Date(), 0);
      this.switchComposition(composition, true);
      this.scheduleHourBoundary();
    } else {
      this.emitSnapshot();
    }
  }

  private resolveScene(date: Date): SceneDefinition {
    if (this.source === 'clock') return sceneForDate(date);
    if (!this.selectedSceneId) throw new Error('Manual generator source requires a scene');
    return findScene(this.selectedSceneId);
  }

  private buildComposition(date: Date, cycle: number): GeneratedComposition {
    const scene = this.resolveScene(date);

    return createComposition({
      date,
      scene,
      source: this.source,
      cycle,
      previousNotes: this.activeNotes,
      seedSalt: this.source === 'clock' ? '' : `selection:${this.selectionSerial}`,
    });
  }

  private switchComposition(composition: GeneratedComposition, resetMelody: boolean): void {
    if (!this.running) return;

    this.clearChordTimer();
    this.clearReleaseTimer();
    if (resetMelody) this.clearMelodyTimer();

    this.composition = composition;
    this.cycle = composition.cycle;
    this.stepIndex = 0;
    this.random = new SeededRandom(composition.seed ^ 0x6d2b79f5);

    if (resetMelody) {
      const firstPool = composition.steps[0]?.keyNotes ?? [67];
      this.currentKeyNote = firstPool[Math.floor(firstPool.length / 2)] ?? 67;
      this.melodyDirection = this.random.next() > 0.5 ? 1 : -1;
      this.phraseLength = this.random.integer(
        composition.scene.keysPhraseLength.min,
        composition.scene.keysPhraseLength.max,
      );
      this.phrasePosition = 0;
      this.recentKeyNotes = [];
      this.recentIntervals = [];
    }

    this.playCurrentStep();

    if (resetMelody) {
      this.scheduleMelody(this.random.range(
        composition.scene.keysRestMs.min * 0.55,
        composition.scene.keysRestMs.max * 0.8,
      ));
    }

    this.emitSnapshot();
  }

  private playCurrentStep(): void {
    if (!this.running || !this.composition) return;
    const step = this.composition.steps[this.stepIndex];
    if (!step) return;

    const enteringNotes = step.notes.filter((note) => !this.activeNotes.includes(note));
    const leavingNotes = this.activeNotes.filter((note) => !step.notes.includes(note));

    // New tones enter first. Old tones dissolve only after the scene-specific
    // crossfade, so hour changes never create a hard cut or empty gap.
    this.engine.playNotes(enteringNotes, step.velocity);

    if (leavingNotes.length > 0) {
      this.pendingReleaseNotes = [...leavingNotes];
      this.releaseTimer = window.setTimeout(() => {
        const notes = [...this.pendingReleaseNotes];
        this.pendingReleaseNotes = [];
        this.releaseTimer = null;
        this.engine.releaseNotes(notes);
      }, this.composition.transitionMs);
    }

    this.activeNotes = [...step.notes];
    this.chordTimer = window.setTimeout(() => {
      this.chordTimer = null;
      this.advanceStep();
    }, step.holdMs);

    this.emitSnapshot();
  }

  private advanceStep(): void {
    if (!this.running || !this.composition) return;

    if (this.stepIndex + 1 < this.composition.steps.length) {
      this.stepIndex += 1;
      this.playCurrentStep();
      return;
    }

    const now = new Date();

    if (this.source === 'clock' && localHourKey(now) !== this.composition.hourKey) {
      this.handleHourBoundary();
      return;
    }

    // The hourly identity stays stable, but each completed route receives a
    // new deterministic variation. This prevents a short loop from repeating
    // unchanged for the whole hour.
    this.cycle += 1;
    const nextVariation = this.buildComposition(now, this.cycle);
    this.switchComposition(nextVariation, false);
  }

  private scheduleMelody(delayMs: number): void {
    if (!this.running) return;
    this.clearMelodyTimer();

    this.melodyTimer = window.setTimeout(() => {
      this.melodyTimer = null;
      this.playMelodyMoment();
    }, Math.max(250, delayMs));
  }

  private playMelodyMoment(): void {
    if (!this.running || !this.composition) return;
    const scene = this.composition.scene;

    if (
      this.phrasePosition >= this.phraseLength
      || this.random.next() < scene.keysEarlyRestChance
    ) {
      this.phraseLength = this.random.integer(
        scene.keysPhraseLength.min,
        scene.keysPhraseLength.max,
      );
      this.phrasePosition = 0;
      if (this.random.next() < 0.48) this.reverseDirection();
      this.scheduleMelody(this.random.range(scene.keysRestMs.min, scene.keysRestMs.max));
      return;
    }

    const step = this.currentStep();
    const note = this.chooseKeyNote(step);
    const interval = note - this.currentKeyNote;
    const heightSoftening = note >= 79 ? 0.015 : 0;
    const velocity = this.random.range(scene.keysVelocity.min, scene.keysVelocity.max)
      - heightSoftening;
    const gateMs = this.random.range(85, 185);

    this.engine.triggerKey(note, velocity, gateMs);
    this.currentKeyNote = note;
    this.phrasePosition += 1;
    this.recentKeyNotes = [...this.recentKeyNotes.slice(-3), note];
    this.recentIntervals = [...this.recentIntervals.slice(-2), interval];

    if (note >= scene.keysRegister.max - 2) this.melodyDirection = -1;
    else if (note <= scene.keysRegister.min + 2) this.melodyDirection = 1;
    else if (this.random.next() < scene.keysDirectionChangeChance) this.reverseDirection();

    this.scheduleMelody(this.random.range(scene.keysGapMs.min, scene.keysGapMs.max));
  }

  private chooseKeyNote(step: GeneratedStep): number {
    const pool = step.keyNotes;
    const lastInterval = this.recentIntervals.at(-1) ?? 0;
    const avoid = new Set(this.recentKeyNotes.slice(-2));
    const freshCandidates = pool.filter((note) => !avoid.has(note));
    const candidates = freshCandidates.length > 0 ? freshCandidates : pool;

    const ranked = candidates
      .map((note) => {
        const interval = note - this.currentKeyNote;
        const distance = Math.abs(interval);
        const directionMatches = Math.sign(interval) === this.melodyDirection;
        let score = 10 - Math.min(10, distance);

        if (directionMatches) score += 2.8;
        if (distance >= 2 && distance <= 5) score += 2.4;
        if (distance > 9) score -= 4.5;
        if (interval === lastInterval) score -= 3.8;
        if (interval === 0) score -= 8;
        if (note >= 81) score -= 1.1;
        score += this.random.next() * 4.2;

        return { note, score };
      })
      .sort((left, right) => right.score - left.score);

    return ranked[this.random.next() < 0.2 && ranked.length > 1 ? 1 : 0]?.note
      ?? pool[0]
      ?? 67;
  }

  private currentStep(): GeneratedStep {
    if (!this.composition) throw new Error('Generator has no active composition');
    return this.composition.steps[this.stepIndex] ?? this.composition.steps[0];
  }

  private scheduleHourBoundary(): void {
    this.clearHourTimer();
    if (!this.running || this.source !== 'clock') return;

    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 80);

    this.hourTimer = window.setTimeout(() => {
      this.hourTimer = null;
      this.handleHourBoundary();
    }, Math.max(100, nextHour.getTime() - now.getTime()));
  }

  private handleHourBoundary(): void {
    if (!this.running || this.source !== 'clock') return;

    const now = new Date();
    if (this.composition && localHourKey(now) === this.composition.hourKey) {
      this.scheduleHourBoundary();
      return;
    }

    this.cycle = 0;
    const nextComposition = this.buildComposition(now, 0);
    this.switchComposition(nextComposition, true);
    this.scheduleHourBoundary();
  }

  private reverseDirection(): void {
    this.melodyDirection = this.melodyDirection === 1 ? -1 : 1;
  }

  private clearTimers(): void {
    this.clearChordTimer();
    this.clearReleaseTimer();
    this.clearMelodyTimer();
    this.clearHourTimer();
  }

  private clearChordTimer(): void {
    if (this.chordTimer !== null) window.clearTimeout(this.chordTimer);
    this.chordTimer = null;
  }

  private clearReleaseTimer(): void {
    if (this.releaseTimer !== null) window.clearTimeout(this.releaseTimer);
    this.releaseTimer = null;

    if (this.pendingReleaseNotes.length > 0) {
      const notes = [...this.pendingReleaseNotes];
      this.pendingReleaseNotes = [];
      this.engine.releaseNotes(notes);
    }
  }

  private clearMelodyTimer(): void {
    if (this.melodyTimer !== null) window.clearTimeout(this.melodyTimer);
    this.melodyTimer = null;
  }

  private clearHourTimer(): void {
    if (this.hourTimer !== null) window.clearTimeout(this.hourTimer);
    this.hourTimer = null;
  }

  private snapshot(): GeneratorSnapshot {
    const scene = this.composition?.scene ?? this.resolveScene(new Date());

    return {
      running: this.running,
      source: this.source,
      sceneId: scene.id,
      sceneName: scene.name,
      compositionId: this.composition?.id ?? '',
      hourKey: this.composition?.hourKey ?? localHourKey(new Date()),
      cycle: this.composition?.cycle ?? this.cycle,
      stepIndex: this.stepIndex,
    };
  }

  private emitSnapshot(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
