import type { ChordDefinition, ProgressionDefinition } from './types';

// All pad voicings remain at C3 or above and belong to the same consonant
// C-major / A-minor harmonic world. Add or replace voicings here without
// touching the scheduling or playback engine.
export const CHORDS: Record<string, ChordDefinition> = {
  cMaj9: {
    id: 'cMaj9',
    voicings: [
      { padNotes: [48, 55, 59, 62, 64], keyNotes: [60, 62, 64, 67, 71, 72, 74, 76, 79] },
      { padNotes: [52, 55, 59, 60, 62], keyNotes: [60, 62, 64, 67, 71, 74, 76, 79] },
      { padNotes: [48, 55, 60, 62, 67], keyNotes: [60, 62, 64, 67, 69, 71, 74, 76, 79] },
    ],
  },
  g69d: {
    id: 'g69d',
    voicings: [
      { padNotes: [50, 55, 59, 62, 64], keyNotes: [62, 64, 67, 69, 71, 74, 76, 79] },
      { padNotes: [55, 59, 62, 64, 69], keyNotes: [62, 64, 67, 69, 71, 74, 76, 79, 81] },
      { padNotes: [50, 57, 59, 62, 67], keyNotes: [62, 67, 69, 71, 74, 76, 79, 81] },
    ],
  },
  am9e: {
    id: 'am9e',
    voicings: [
      { padNotes: [52, 57, 59, 60, 64], keyNotes: [60, 62, 64, 67, 69, 71, 72, 76, 79] },
      { padNotes: [52, 55, 57, 60, 64], keyNotes: [60, 64, 67, 69, 71, 72, 76, 79] },
      { padNotes: [57, 59, 60, 64, 67], keyNotes: [60, 62, 64, 67, 69, 71, 72, 76, 79] },
    ],
  },
  fMaj9: {
    id: 'fMaj9',
    voicings: [
      { padNotes: [53, 57, 60, 64, 67], keyNotes: [60, 64, 65, 67, 69, 72, 76, 79] },
      { padNotes: [53, 57, 60, 62, 64], keyNotes: [60, 62, 64, 65, 67, 69, 72, 76] },
      { padNotes: [57, 60, 64, 65, 67], keyNotes: [60, 64, 65, 67, 69, 72, 76, 79] },
    ],
  },
  dm9a: {
    id: 'dm9a',
    voicings: [
      { padNotes: [50, 57, 60, 64, 65], keyNotes: [60, 62, 64, 65, 69, 72, 74, 76, 77] },
      { padNotes: [57, 60, 62, 64, 65], keyNotes: [60, 62, 64, 65, 69, 72, 74, 76] },
      { padNotes: [53, 57, 60, 62, 64], keyNotes: [60, 62, 64, 65, 69, 72, 74, 76] },
    ],
  },
  em711: {
    id: 'em711',
    voicings: [
      { padNotes: [52, 55, 59, 62, 64], keyNotes: [62, 64, 67, 69, 71, 74, 76, 79] },
      { padNotes: [52, 57, 59, 62, 67], keyNotes: [62, 64, 67, 69, 71, 74, 76, 79, 81] },
      { padNotes: [55, 59, 62, 64, 69], keyNotes: [62, 64, 67, 69, 71, 74, 76, 79] },
    ],
  },
  c69e: {
    id: 'c69e',
    voicings: [
      { padNotes: [52, 55, 57, 60, 62], keyNotes: [60, 62, 64, 67, 69, 72, 74, 76] },
      { padNotes: [48, 55, 57, 62, 64], keyNotes: [60, 62, 64, 67, 69, 72, 74, 76] },
    ],
  },
  gsus6d: {
    id: 'gsus6d',
    voicings: [
      { padNotes: [50, 55, 57, 60, 62], keyNotes: [60, 62, 67, 69, 72, 74, 79, 81] },
      { padNotes: [55, 57, 60, 62, 67], keyNotes: [60, 62, 67, 69, 72, 74, 79] },
    ],
  },
  am711e: {
    id: 'am711e',
    voicings: [
      { padNotes: [52, 55, 57, 60, 62], keyNotes: [60, 62, 64, 67, 69, 72, 74, 76, 79] },
      { padNotes: [57, 60, 62, 64, 67], keyNotes: [60, 62, 64, 67, 69, 72, 74, 76, 79] },
    ],
  },
  f69a: {
    id: 'f69a',
    voicings: [
      { padNotes: [57, 60, 62, 65, 67], keyNotes: [60, 62, 65, 67, 69, 72, 74, 77, 79] },
      { padNotes: [53, 57, 60, 62, 67], keyNotes: [60, 62, 65, 67, 69, 72, 74, 77, 79] },
    ],
  },
};

// Progressions are intentionally plain data. Reorder chord IDs, add another
// progression or remove one here; scenes decide which progressions are used.
export const PROGRESSIONS: Record<string, ProgressionDefinition> = {
  current: { id: 'current', chordIds: ['cMaj9', 'g69d', 'am9e', 'fMaj9'] },
  openSky: { id: 'openSky', chordIds: ['cMaj9', 'fMaj9', 'am9e', 'g69d'] },
  quietRise: { id: 'quietRise', chordIds: ['am9e', 'fMaj9', 'cMaj9', 'g69d'] },
  daylight: { id: 'daylight', chordIds: ['c69e', 'em711', 'fMaj9', 'g69d'] },
  suspended: { id: 'suspended', chordIds: ['cMaj9', 'gsus6d', 'am711e', 'f69a'] },
  softSteps: { id: 'softSteps', chordIds: ['cMaj9', 'dm9a', 'am9e', 'fMaj9'] },
  evening: { id: 'evening', chordIds: ['am711e', 'fMaj9', 'c69e', 'gsus6d'] },
  nightFlow: { id: 'nightFlow', chordIds: ['am9e', 'dm9a', 'fMaj9', 'cMaj9'] },
};
