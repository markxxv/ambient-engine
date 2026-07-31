import WebRenderer from '@elemaudio/web-renderer';
import { buildSynthGraph } from './SynthGraph';
import { AMBIENT_PRESETS, findPreset } from './presets';
import type {
  AmbientParameter,
  AmbientPreset,
  EngineSnapshot,
  SnapshotListener,
  VoiceState,
} from './types';

const POLYPHONY = 8;

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function createImpulse(sampleRate: number, seconds: number, seed: number): Float32Array {
  const length = Math.floor(sampleRate * seconds);
  const data = new Float32Array(length);
  let random = seed >>> 0;

  const nextRandom = (): number => {
    random = (1664525 * random + 1013904223) >>> 0;
    return random / 0xffffffff;
  };

  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const decay = Math.exp(-time * 2.1);
    const diffusion = Math.min(1, time * 18);
    data[index] = (nextRandom() * 2 - 1) * decay * diffusion * 0.42;
  }

  const reflections = [0.029, 0.047, 0.071, 0.113, 0.179];
  reflections.forEach((time, index) => {
    const position = Math.floor(time * sampleRate);
    if (position < data.length) data[position] += 0.34 / (index + 1);
  });

  return data;
}

export class AmbientEngine {
  private readonly core = new WebRenderer();
  private context: AudioContext | null = null;
  private initialized = false;
  private voices: VoiceState[] = Array.from({ length: POLYPHONY }, (_, slot) => ({
    slot,
    midi: 60,
    frequency: midiToFrequency(60),
    velocity: 0,
    gate: 0,
    startedAt: 0,
  }));
  private preset: AmbientPreset = { ...AMBIENT_PRESETS[1] };
  private peak = 0;
  private listeners = new Set<SnapshotListener>();
  private renderQueue: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    if (this.initialized && this.context) {
      await this.context.resume();
      return;
    }

    this.context = new AudioContext({ latencyHint: 'interactive' });
    const sampleRate = this.context.sampleRate;
    const node = await this.core.initialize(this.context, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: {
        virtualFileSystem: {
          '/ir/soft-left': createImpulse(sampleRate, 2.9, 137),
          '/ir/soft-right': createImpulse(sampleRate, 3.1, 911),
        },
      },
    });

    node.connect(this.context.destination);
    this.core.on('meter', (event: { source?: string; min: number; max: number }) => {
      if (event.source?.startsWith('master-')) {
        this.peak = Math.max(Math.abs(event.min), Math.abs(event.max));
        this.emitSnapshot();
      }
    });

    this.initialized = true;
    await this.context.resume();
    await this.render();
    this.emitSnapshot();
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  noteOn(midi: number, velocity = 0.58): void {
    if (!this.initialized) return;

    const normalizedMidi = Math.max(36, Math.min(88, Math.round(midi)));
    const existing = this.voices.find((voice) => voice.gate > 0 && voice.midi === normalizedMidi);
    const voice = existing ?? this.findVoiceForReuse();

    voice.midi = normalizedMidi;
    voice.frequency = midiToFrequency(normalizedMidi);
    voice.velocity = Math.max(0.25, Math.min(0.72, velocity));
    voice.gate = 1;
    voice.startedAt = performance.now();

    void this.render();
    this.emitSnapshot();
  }

  noteOff(midi: number): void {
    let changed = false;
    this.voices.forEach((voice) => {
      if (voice.gate > 0 && voice.midi === midi) {
        voice.gate = 0;
        changed = true;
      }
    });

    if (changed) {
      void this.render();
      this.emitSnapshot();
    }
  }

  playNotes(notes: number[], velocity = 0.56): void {
    notes.slice(0, POLYPHONY).forEach((note, index) => {
      window.setTimeout(() => this.noteOn(note, velocity - index * 0.012), index * 32);
    });
  }

  releaseNotes(notes: number[]): void {
    notes.forEach((note, index) => {
      window.setTimeout(() => this.noteOff(note), index * 22);
    });
  }

  releaseAll(): void {
    this.voices.forEach((voice) => {
      voice.gate = 0;
    });
    void this.render();
    this.emitSnapshot();
  }

  setPreset(id: string): void {
    this.preset = { ...findPreset(id) };
    void this.render();
    this.emitSnapshot();
  }

  setParameter(parameter: AmbientParameter, value: number): void {
    this.preset = {
      ...this.preset,
      [parameter]: Math.max(0, Math.min(1, value)),
    };
    void this.render();
    this.emitSnapshot();
  }

  getPreset(): AmbientPreset {
    return { ...this.preset };
  }

  private findVoiceForReuse(): VoiceState {
    const idle = this.voices.find((voice) => voice.gate === 0);
    if (idle) return idle;
    return [...this.voices].sort((a, b) => a.startedAt - b.startedAt)[0];
  }

  private render(): Promise<void> {
    this.renderQueue = this.renderQueue.then(async () => {
      if (!this.initialized) return;
      const [left, right] = buildSynthGraph(this.voices, this.preset);
      await this.core.render(left, right);
    });

    return this.renderQueue;
  }

  private snapshot(): EngineSnapshot {
    return {
      initialized: this.initialized,
      activeVoices: this.voices.filter((voice) => voice.gate > 0).length,
      peak: this.peak,
      presetId: this.preset.id,
      parameters: {
        brightness: this.preset.brightness,
        warmth: this.preset.warmth,
        motion: this.preset.motion,
        space: this.preset.space,
      },
    };
  }

  private emitSnapshot(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
