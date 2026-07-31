import type { AmbientEngine } from '../audio/AmbientEngine';

interface SequenceStep {
  notes: number[];
  holdMs: number;
  velocity: number;
}

const CROSSFADE_MS = 1_600;

// Original slow modal progression: D minor / F major colours with shared tones.
// Common notes remain held while only the changing voices fade in and out.
const SEQUENCE: SequenceStep[] = [
  { notes: [38, 45, 48, 52, 53, 57], holdMs: 10_800, velocity: 0.44 },
  { notes: [38, 46, 53, 57, 60, 62], holdMs: 11_600, velocity: 0.42 },
  { notes: [41, 48, 52, 55, 57, 60], holdMs: 10_400, velocity: 0.43 },
  { notes: [36, 43, 45, 50, 52, 57], holdMs: 11_800, velocity: 0.41 },
  { notes: [43, 50, 53, 57, 58, 62], holdMs: 10_600, velocity: 0.43 },
  { notes: [41, 45, 48, 52, 53, 57], holdMs: 11_400, velocity: 0.42 },
  { notes: [46, 53, 57, 60, 62, 65], holdMs: 10_900, velocity: 0.41 },
  { notes: [45, 52, 55, 59, 62, 64], holdMs: 12_200, velocity: 0.4 },
];

export class TestSequencer {
  private running = false;
  private stepIndex = 0;
  private timer: number | null = null;
  private releaseTimer: number | null = null;
  private activeNotes: number[] = [];

  constructor(private readonly engine: AmbientEngine) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.stepIndex = 0;
    this.playCurrentStep();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) window.clearTimeout(this.timer);
    if (this.releaseTimer !== null) window.clearTimeout(this.releaseTimer);
    this.timer = null;
    this.releaseTimer = null;
    this.engine.releaseAll();
    this.activeNotes = [];
  }

  isRunning(): boolean {
    return this.running;
  }

  private playCurrentStep(): void {
    if (!this.running) return;

    const step = SEQUENCE[this.stepIndex];
    const enteringNotes = step.notes.filter((note) => !this.activeNotes.includes(note));
    const leavingNotes = this.activeNotes.filter((note) => !step.notes.includes(note));

    // Bring the new harmony in first, then let departing tones dissolve behind it.
    this.engine.playNotes(enteringNotes, step.velocity);

    if (leavingNotes.length > 0) {
      this.releaseTimer = window.setTimeout(() => {
        this.engine.releaseNotes(leavingNotes);
        this.releaseTimer = null;
      }, CROSSFADE_MS);
    }

    this.activeNotes = [...step.notes];
    this.timer = window.setTimeout(() => {
      this.stepIndex = (this.stepIndex + 1) % SEQUENCE.length;
      this.playCurrentStep();
    }, step.holdMs);
  }
}
