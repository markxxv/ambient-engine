export type GeneratorSource = 'clock' | 'manual' | 'event';

export interface Range {
  min: number;
  max: number;
}

export interface SceneDefinition {
  id: string;
  name: string;
  description: string;
  progressionIds: string[];
  chordHoldMs: Range;
  transitionMs: Range;
  padVelocity: Range;
  keysVelocity: Range;
  keysGapMs: Range;
  keysRestMs: Range;
  keysPhraseLength: Range;
  keysEarlyRestChance: number;
  keysDirectionChangeChance: number;
  keysRegister: Range;
}

export interface TimeBinding {
  sceneId: string;
  hours: number[];
}

export interface ChordVoicing {
  padNotes: number[];
  keyNotes: number[];
}

export interface ChordDefinition {
  id: string;
  voicings: ChordVoicing[];
}

export interface ProgressionDefinition {
  id: string;
  chordIds: string[];
}

export interface GeneratedStep {
  chordId: string;
  notes: number[];
  keyNotes: number[];
  holdMs: number;
  velocity: number;
}

export interface GeneratedComposition {
  id: string;
  hourKey: string;
  scene: SceneDefinition;
  source: GeneratorSource;
  seed: number;
  cycle: number;
  startsAt: Date;
  endsAt: Date;
  transitionMs: number;
  steps: GeneratedStep[];
}

export interface GeneratorSnapshot {
  running: boolean;
  source: GeneratorSource;
  sceneId: string;
  sceneName: string;
  compositionId: string;
  hourKey: string;
  cycle: number;
  stepIndex: number;
}

export type GeneratorListener = (snapshot: GeneratorSnapshot) => void;
