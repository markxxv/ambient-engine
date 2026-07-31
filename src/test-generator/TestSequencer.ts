// Temporary compatibility bridge for the current UI import.
// All musical behaviour now lives in src/generator/CompositionGenerator.ts.
// This file can be removed when main.ts imports CompositionGenerator directly.
export { CompositionGenerator as TestSequencer } from '../generator/CompositionGenerator';
