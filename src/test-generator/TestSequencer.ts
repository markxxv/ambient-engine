import type { AmbientEngine } from '../audio/AmbientEngine';

interface SequenceStep {
  notes: number[];
  holdMs: number;
  velocity: number;
}

const CROSSFADE_MS = 2_200;

// Bright, slow I–V–vi–IV movement in C major: C – G – Am – F.
// Every voicing begins at C3 or above. The first cycle keeps E4 as a calm
// common tone; the second introduces a small, gentle upper-line variation.
const SEQUENCE: SequenceStep[] = [
  { notes: [48, 55, 59, 62, 64], holdMs: 11_800, velocity: 0.3 }, // Cmaj9
  { notes: [50, 55, 59, 62, 64], holdMs: 11_200, velocity: 0.29 }, // G6(add9)/D
  { notes: [52, 57, 59, 60, 64], holdMs: 12_000, velocity: 0.28 }, // Am9/E
  { notes: [53, 57, 60, 62, 64], holdMs: 11_600, velocity: 0.29 }, // Fmaj7(add9)
  { notes: [48, 55, 59, 62, 67], holdMs: 11_400, velocity: 0.29 }, // Cmaj9
  { notes: [50, 55, 59, 64, 69], holdMs: 11_900, velocity: 0.28 }, // G6/9/D
  { notes: [52, 57, 60, 62, 67], holdMs: 11_500, velocity: 0.28 }, // Am7(add11)/E
  { notes: [53, 57, 60, 64, 67], holdMs: 12_200, velocity: 0.29 }, // Fmaj9
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
