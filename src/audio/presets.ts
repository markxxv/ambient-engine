import type { AmbientPreset } from './types';

export const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: 'still-air',
    name: 'Still Air',
    description: 'Dark, close and nearly weightless.',
    brightness: 0.18,
    warmth: 0.84,
    motion: 0.12,
    space: 0.68,
    attack: 4.8,
    release: 13,
    detune: 0.0009,
  },
  {
    id: 'soft-horizon',
    name: 'Soft Horizon',
    description: 'A warm, wide digital pad with a soft halo.',
    brightness: 0.36,
    warmth: 0.78,
    motion: 0.24,
    space: 0.82,
    attack: 3.8,
    release: 11.5,
    detune: 0.0014,
  },
  {
    id: 'deep-cloud',
    name: 'Deep Cloud',
    description: 'Slow choir-like depth with a distant shimmer.',
    brightness: 0.29,
    warmth: 0.9,
    motion: 0.38,
    space: 0.94,
    attack: 5.4,
    release: 15,
    detune: 0.0019,
  },
];

export function findPreset(id: string): AmbientPreset {
  return AMBIENT_PRESETS.find((preset) => preset.id === id) ?? AMBIENT_PRESETS[1];
}
