export type AmbientMacro = 'brightness' | 'warmth' | 'motion' | 'space';
export type MixParameter = 'air' | 'music' | 'keys';
export type AmbientParameter = AmbientMacro | MixParameter;

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

export interface MixState {
  air: number;
  music: number;
  keys: number;
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
  maxVoices: number;
  peak: number;
  presetId: string;
  parameters: Record<AmbientParameter, number>;
}

export type SnapshotListener = (snapshot: EngineSnapshot) => void;
