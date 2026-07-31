import type { AmbientEngine } from '../audio/AmbientEngine';

interface SequenceStep {
  notes: number[];
  keyNotes: number[];
  holdMs: number;
  velocity: number;
}

const CROSSFADE_MS = 2_200;

// Bright, slow I–V–vi–IV movement in C major: C – G – Am – F.
// Keys use a wider harmonic pool than the pad, allowing the melodic contour
// to mutate without leaving the current harmony.
const SEQUENCE: SequenceStep[] = [
  {
    notes: [48, 55, 59, 62, 64],
    keyNotes: [60, 62, 64, 67, 71, 72, 74, 76],
    holdMs: 11_800,
    velocity: 0.3,
  },
  {
    notes: [50, 55, 59, 62, 64],
    keyNotes: [62, 64, 67, 69, 71, 74, 76, 79],
    holdMs: 11_200,
    velocity: 0.29,
  },
  {
    notes: [52, 57, 59, 60, 64],
    keyNotes: [60, 62, 64, 67, 69, 71, 72, 76],
    holdMs: 12_000,
    velocity: 0.28,
  },
  {
    notes: [53, 57, 60, 62, 64],
    keyNotes: [60, 62, 64, 65, 67, 69, 72, 76],
    holdMs: 11_600,
    velocity: 0.29,
  },
  {
    notes: [48, 55, 59, 62, 67],
    keyNotes: [62, 64, 67, 71, 72, 74, 76, 79],
    holdMs: 11_400,
    velocity: 0.29,
  },
  {
    notes: [50, 55, 59, 64, 69],
    keyNotes: [62, 64, 67, 69, 71, 74, 76, 79, 81],
    holdMs: 11_900,
    velocity: 0.28,
  },
  {
    notes: [52, 57, 60, 62, 67],
    keyNotes: [60, 62, 64, 67, 69, 72, 74, 76, 79],
    holdMs: 11_500,
    velocity: 0.28,
  },
  {
    notes: [53, 57, 60, 64, 67],
    keyNotes: [60, 64, 65, 67, 69, 72, 76, 79],
    holdMs: 12_200,
    velocity: 0.29,
  },
];

export class TestSequencer {
  private running = false;
  private stepIndex = 0;
  private chordTimer: number | null = null;
  private releaseTimer: number | null = null;
  private melodyTimer: number | null = null;
  private activeNotes: number[] = [];
  private currentKeyNote = 67;
  private melodyDirection: -1 | 1 = 1;
  private phraseLength = 3;
  private phrasePosition = 0;
  private recentKeyNotes: number[] = [];
  private recentIntervals: number[] = [];
  private randomState = 1;

  constructor(private readonly engine: AmbientEngine) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.stepIndex = 0;
    this.randomState = (Date.now() ^ 0x6d2b79f5) >>> 0;
    this.currentKeyNote = 67;
    this.melodyDirection = this.random() > 0.5 ? 1 : -1;
    this.phraseLength = this.randomInteger(2, 5);
    this.phrasePosition = 0;
    this.recentKeyNotes = [];
    this.recentIntervals = [];
    this.playCurrentStep();
    this.scheduleMelody(3_800 + this.random() * 4_200);
  }

  stop(): void {
    this.running = false;
    if (this.chordTimer !== null) window.clearTimeout(this.chordTimer);
    if (this.releaseTimer !== null) window.clearTimeout(this.releaseTimer);
    if (this.melodyTimer !== null) window.clearTimeout(this.melodyTimer);
    this.chordTimer = null;
    this.releaseTimer = null;
    this.melodyTimer = null;
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
    this.chordTimer = window.setTimeout(() => {
      this.stepIndex = (this.stepIndex + 1) % SEQUENCE.length;
      this.playCurrentStep();
    }, step.holdMs);
  }

  private scheduleMelody(delayMs: number): void {
    if (!this.running) return;
    if (this.melodyTimer !== null) window.clearTimeout(this.melodyTimer);

    this.melodyTimer = window.setTimeout(() => {
      this.melodyTimer = null;
      this.playMelodyMoment();
    }, delayMs);
  }

  private playMelodyMoment(): void {
    if (!this.running) return;

    // End phrases early sometimes. Long silence is part of the melody and
    // prevents the Keys layer from becoming a foreground hook.
    if (this.phrasePosition >= this.phraseLength || this.random() < 0.18) {
      this.phraseLength = this.randomInteger(2, 5);
      this.phrasePosition = 0;
      if (this.random() < 0.48) this.reverseDirection();
      this.scheduleMelody(4_800 + this.random() * 8_400);
      return;
    }

    const step = SEQUENCE[this.stepIndex];
    const note = this.chooseKeyNote(step.keyNotes);
    const interval = note - this.currentKeyNote;
    const heightSoftening = note >= 79 ? 0.018 : 0;
    const velocity = 0.17 + this.random() * 0.085 - heightSoftening;
    const gateMs = 90 + this.random() * 95;

    this.engine.triggerKey(note, velocity, gateMs);
    this.currentKeyNote = note;
    this.phrasePosition += 1;
    this.recentKeyNotes = [...this.recentKeyNotes.slice(-3), note];
    this.recentIntervals = [...this.recentIntervals.slice(-2), interval];

    if (note >= 79) this.melodyDirection = -1;
    else if (note <= 62) this.melodyDirection = 1;
    else if (this.random() < 0.22) this.reverseDirection();

    this.scheduleMelody(1_900 + this.random() * 3_700);
  }

  private chooseKeyNote(pool: number[]): number {
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
        if (note >= 81) score -= 1.2;
        score += this.random() * 4.2;

        return { note, score };
      })
      .sort((a, b) => b.score - a.score);

    // Occasionally choose the second-best route. This keeps the contour alive
    // without turning the melody into uncontrolled randomness.
    return ranked[this.random() < 0.2 && ranked.length > 1 ? 1 : 0].note;
  }

  private reverseDirection(): void {
    this.melodyDirection = this.melodyDirection === 1 ? -1 : 1;
  }

  private random(): number {
    let value = this.randomState || 0x9e3779b9;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 0x1_0000_0000;
  }

  private randomInteger(min: number, max: number): number {
    return Math.floor(min + this.random() * (max - min + 1));
  }
}
