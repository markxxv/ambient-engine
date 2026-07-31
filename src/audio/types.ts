export type AmbientParameter = 'brightness' | 'warmth' | 'motion' | 'space';

export interface AmbientPreset {
  id: string;
  name: string;
  description: string;
  brightness: number;
  warmth: number;
  motion: number;
  space: number;
  attack: number;
  release: number;
  detune: number;
}

export interface VoiceState {
  slot: number;
  midi: number;
  frequency: number;
  velocity: number;
  gate: number;
  startedAt: number;
}

export interface EngineSnapshot {
  initialized: boolean;
  activeVoices: number;
  peak: number;
  presetId: string;
  parameters: Record<AmbientParameter, number>;
}

export type SnapshotListener = (snapshot: EngineSnapshot) => void;
