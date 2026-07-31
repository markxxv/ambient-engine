import type { AmbientEngine } from '../audio/AmbientEngine';

interface SequenceStep {
  notes: number[];
  holdMs: number;
}

const SEQUENCE: SequenceStep[] = [
  { notes: [50, 57, 60, 64, 69], holdMs: 6_800 },
  { notes: [46, 53, 57, 60, 65], holdMs: 7_200 },
  { notes: [53, 57, 60, 64, 67], holdMs: 6_600 },
  { notes: [48, 55, 57, 62, 64], holdMs: 7_400 },
];

export class TestSequencer {
  private running = false;
  private stepIndex = 0;
  private timer: number | null = null;
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
    this.timer = null;
    this.engine.releaseNotes(this.activeNotes);
    this.activeNotes = [];
  }

  isRunning(): boolean {
    return this.running;
  }

  private playCurrentStep(): void {
    if (!this.running) return;

    if (this.activeNotes.length > 0) {
      this.engine.releaseNotes(this.activeNotes);
    }

    const step = SEQUENCE[this.stepIndex];
    this.activeNotes = step.notes;
    this.engine.playNotes(step.notes, 0.58);

    this.timer = window.setTimeout(() => {
      this.stepIndex = (this.stepIndex + 1) % SEQUENCE.length;
      this.playCurrentStep();
    }, step.holdMs);
  }
}
