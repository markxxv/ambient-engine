import WebRenderer from '@elemaudio/web-renderer';
import { buildSynthGraph } from './SynthGraph';
import { AMBIENT_PRESETS, findPreset } from './presets';
import type {
  AmbientParameter,
  AmbientPreset,
  EngineSnapshot,
  MixState,
  SnapshotListener,
  VoiceState,
} from './types';

const PAD_POLYPHONY = 12;
const KEYS_POLYPHONY = 6;
const LOWEST_PAD_NOTE = 48; // C3
const LOWEST_KEY_NOTE = 60; // C4

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function createVoice(slot: number, midi: number): VoiceState {
  return {
    slot,
    midi,
    frequency: midiToFrequency(midi),
    velocity: 0,
    gate: 0,
    startedAt: 0,
  };
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
  private padVoices: VoiceState[] = Array.from(
    { length: PAD_POLYPHONY },
    (_, slot) => createVoice(slot, 60),
  );
  private keyVoices: VoiceState[] = Array.from(
    { length: KEYS_POLYPHONY },
    (_, slot) => createVoice(slot, 72),
  );
  private keySerial = 0;
  private preset: AmbientPreset = { ...AMBIENT_PRESETS[1] };
  private mix: MixState = {
    air: 1,
    music: 0.32,
    keys: 0.24,
  };
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

  noteOn(midi: number, velocity = 0.32): void {
    if (!this.initialized) return;

    const normalizedMidi = Math.max(LOWEST_PAD_NOTE, Math.min(88, Math.round(midi)));
    const existing = this.padVoices.find(
      (voice) => voice.gate > 0 && voice.midi === normalizedMidi,
    );
    const voice = existing ?? this.findVoiceForReuse(this.padVoices);

    voice.midi = normalizedMidi;
    voice.frequency = midiToFrequency(normalizedMidi);
    voice.velocity = Math.max(0.14, Math.min(0.48, velocity));
    voice.gate = 1;
    voice.startedAt = performance.now();

    void this.render();
    this.emitSnapshot();
  }

  noteOff(midi: number): void {
    let changed = false;
    this.padVoices.forEach((voice) => {
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

  playNotes(notes: number[], velocity = 0.3): void {
    notes.slice(0, PAD_POLYPHONY).forEach((note, index) => {
      window.setTimeout(() => this.noteOn(note, velocity - index * 0.005), index * 92);
    });
  }

  releaseNotes(notes: number[]): void {
    notes.forEach((note, index) => {
      window.setTimeout(() => this.noteOff(note), index * 42);
    });
  }

  triggerKey(midi: number, velocity = 0.24, gateMs = 130): void {
    if (!this.initialized) return;

    const normalizedMidi = Math.max(LOWEST_KEY_NOTE, Math.min(88, Math.round(midi)));
    const voice = this.findVoiceForReuse(this.keyVoices);
    const token = ++this.keySerial;

    voice.midi = normalizedMidi;
    voice.frequency = midiToFrequency(normalizedMidi);
    voice.velocity = Math.max(0.1, Math.min(0.38, velocity));
    voice.gate = 1;
    voice.startedAt = token;

    void this.render();
    this.emitSnapshot();

    window.setTimeout(() => {
      if (voice.startedAt !== token) return;
      voice.gate = 0;
      void this.render();
      this.emitSnapshot();
    }, Math.max(70, Math.min(240, gateMs)));
  }

  releaseAll(): void {
    [...this.padVoices, ...this.keyVoices].forEach((voice) => {
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
    const normalizedValue = Math.max(0, Math.min(1, value));

    if (parameter === 'air' || parameter === 'music' || parameter === 'keys') {
      this.mix = {
        ...this.mix,
        [parameter]: normalizedValue,
      };
    } else {
      this.preset = {
        ...this.preset,
        [parameter]: normalizedValue,
      };
    }

    void this.render();
    this.emitSnapshot();
  }

  getPreset(): AmbientPreset {
    return { ...this.preset };
  }

  private findVoiceForReuse(voices: VoiceState[]): VoiceState {
    const idle = voices.find((voice) => voice.gate === 0);
    if (idle) return idle;
    return [...voices].sort((a, b) => a.startedAt - b.startedAt)[0];
  }

  private render(): Promise<void> {
    this.renderQueue = this.renderQueue.then(async () => {
      if (!this.initialized) return;
      const [left, right] = buildSynthGraph(
        this.padVoices,
        this.keyVoices,
        this.preset,
        this.mix,
      );
      await this.core.render(left, right);
    });

    return this.renderQueue;
  }

  private snapshot(): EngineSnapshot {
    const allVoices = [...this.padVoices, ...this.keyVoices];

    return {
      initialized: this.initialized,
      activeVoices: allVoices.filter((voice) => voice.gate > 0).length,
      maxVoices: PAD_POLYPHONY + KEYS_POLYPHONY,
      peak: this.peak,
      presetId: this.preset.id,
      parameters: {
        air: this.mix.air,
        music: this.mix.music,
        keys: this.mix.keys,
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
