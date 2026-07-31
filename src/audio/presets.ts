import type { AmbientPreset } from './types';

export const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: 'still-air',
    name: 'Still Air',
    description: 'Dark, close and almost motionless.',
    brightness: 0.28,
    warmth: 0.72,
    motion: 0.18,
    space: 0.58,
    attack: 2.8,
    release: 9.5,
    detune: 0.0018,
  },
  {
    id: 'soft-horizon',
    name: 'Soft Horizon',
    description: 'Balanced width with a gentle luminous edge.',
    brightness: 0.48,
    warmth: 0.58,
    motion: 0.42,
    space: 0.72,
    attack: 2.1,
    release: 10.5,
    detune: 0.0028,
  },
  {
    id: 'deep-cloud',
    name: 'Deep Cloud',
    description: 'Wide, slow and deeply diffused.',
    brightness: 0.34,
    warmth: 0.84,
    motion: 0.64,
    space: 0.9,
    attack: 3.6,
    release: 13,
    detune: 0.0038,
  },
];

export function findPreset(id: string): AmbientPreset {
  return AMBIENT_PRESETS.find((preset) => preset.id === id) ?? AMBIENT_PRESETS[1];
}
