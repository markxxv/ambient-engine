import { findScene } from './scenes';
import type { SceneDefinition, TimeBinding } from './types';

// Edit only this table to change which scene belongs to which local hour.
// Every hour must appear exactly once. The browser's local time is used.
export const TIME_BINDINGS: TimeBinding[] = [
  { sceneId: 'deep-night', hours: [0, 1, 2, 3, 4] },
  { sceneId: 'dawn', hours: [5, 6, 7] },
  { sceneId: 'morning', hours: [8, 9, 10] },
  { sceneId: 'daylight', hours: [11, 12, 13] },
  { sceneId: 'afternoon', hours: [14, 15, 16, 17] },
  { sceneId: 'evening', hours: [18, 19, 20, 21] },
  { sceneId: 'late-night', hours: [22, 23] },
];

function validateSchedule(): void {
  const assigned = new Set<number>();

  TIME_BINDINGS.forEach((binding) => {
    findScene(binding.sceneId);

    binding.hours.forEach((hour) => {
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        throw new Error(`Invalid generator hour: ${hour}`);
      }
      if (assigned.has(hour)) {
        throw new Error(`Generator hour ${hour} is assigned more than once`);
      }
      assigned.add(hour);
    });
  });

  if (assigned.size !== 24) {
    const missing = Array.from({ length: 24 }, (_, hour) => hour)
      .filter((hour) => !assigned.has(hour));
    throw new Error(`Generator schedule is missing hours: ${missing.join(', ')}`);
  }
}

validateSchedule();

export function sceneForDate(date: Date): SceneDefinition {
  const hour = date.getHours();
  const binding = TIME_BINDINGS.find((item) => item.hours.includes(hour));
  if (!binding) throw new Error(`No generator scene assigned to hour ${hour}`);
  return findScene(binding.sceneId);
}
