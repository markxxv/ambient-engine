import { CHORDS, PROGRESSIONS } from './progressions';
import { SeededRandom, hashString } from './random';
import type {
  GeneratedComposition,
  GeneratedStep,
  GeneratorSource,
  ProgressionDefinition,
  SceneDefinition,
} from './types';

interface CreateCompositionOptions {
  date: Date;
  scene: SceneDefinition;
  source: GeneratorSource;
  cycle: number;
  previousNotes?: number[];
  seedSalt?: string;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function localHourKey(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}`;
}

function rotate<T>(items: readonly T[], amount: number): T[] {
  if (items.length === 0) return [];
  const offset = ((amount % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function commonToneCount(left: number[], right: number[]): number {
  const rightSet = new Set(right);
  return left.reduce((count, note) => count + (rightSet.has(note) ? 1 : 0), 0);
}

function voiceLeadingDistance(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  const length = Math.min(sortedLeft.length, sortedRight.length);
  let distance = 0;

  for (let index = 0; index < length; index += 1) {
    distance += Math.abs(sortedLeft[index] - sortedRight[index]);
  }

  return distance;
}

function progressionScore(progression: ProgressionDefinition, previousNotes: number[]): number {
  if (previousNotes.length === 0) return 0;
  const firstChord = CHORDS[progression.chordIds[0]];
  if (!firstChord) return Number.NEGATIVE_INFINITY;

  return Math.max(
    ...firstChord.voicings.map((voicing) => (
      commonToneCount(previousNotes, voicing.padNotes) * 12
      - voiceLeadingDistance(previousNotes, voicing.padNotes) * 0.35
    )),
  );
}

function chooseFirstSection(
  progressionIds: string[],
  previousNotes: number[],
  random: SeededRandom,
): ProgressionDefinition {
  const candidates = progressionIds
    .map((id) => PROGRESSIONS[id])
    .filter((item): item is ProgressionDefinition => Boolean(item));

  if (candidates.length === 0) {
    throw new Error('Scene has no valid progression definitions');
  }

  if (previousNotes.length === 0) return random.pick(candidates);

  const rotations = candidates.flatMap((progression) => (
    progression.chordIds.map((_, index) => ({
      id: `${progression.id}:${index}`,
      chordIds: rotate(progression.chordIds, index),
    }))
  ));

  return rotations
    .map((progression) => ({
      progression,
      score: progressionScore(progression, previousNotes) + random.next() * 2,
    }))
    .sort((left, right) => right.score - left.score)[0].progression;
}

function chooseVoicing(
  chordId: string,
  previousNotes: number[],
  random: SeededRandom,
): { padNotes: number[]; keyNotes: number[] } {
  const chord = CHORDS[chordId];
  if (!chord) throw new Error(`Unknown generator chord: ${chordId}`);

  return chord.voicings
    .map((voicing) => ({
      voicing,
      score: previousNotes.length === 0
        ? random.next() * 3
        : commonToneCount(previousNotes, voicing.padNotes) * 12
          - voiceLeadingDistance(previousNotes, voicing.padNotes) * 0.35
          + random.next() * 2.4,
    }))
    .sort((left, right) => right.score - left.score)[0].voicing;
}

function buildChordRoute(
  scene: SceneDefinition,
  previousNotes: number[],
  random: SeededRandom,
): string[] {
  const shuffledIds = random.shuffled(scene.progressionIds);
  const sectionCount = random.integer(2, Math.min(3, shuffledIds.length));
  const first = chooseFirstSection(shuffledIds, previousNotes, random);
  const route = [...first.chordIds];

  for (let sectionIndex = 1; sectionIndex < sectionCount; sectionIndex += 1) {
    const progression = PROGRESSIONS[shuffledIds[sectionIndex]];
    if (!progression) continue;

    const rotation = random.integer(0, progression.chordIds.length - 1);
    const section = rotate(progression.chordIds, rotation);

    if (section[0] === route.at(-1)) section.push(section.shift() as string);
    route.push(...section);
  }

  return route;
}

export function createComposition(options: CreateCompositionOptions): GeneratedComposition {
  const { date, scene, source, cycle, previousNotes = [], seedSalt = '' } = options;
  const hourKey = localHourKey(date);
  const seed = hashString(`${hourKey}:${scene.id}:${source}:${cycle}:${seedSalt}`);
  const random = new SeededRandom(seed);
  const startsAt = new Date(date);
  startsAt.setMinutes(0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + 1);
  const chordRoute = buildChordRoute(scene, previousNotes, random);
  const steps: GeneratedStep[] = [];
  let priorNotes = [...previousNotes];

  chordRoute.forEach((chordId) => {
    const voicing = chooseVoicing(chordId, priorNotes, random);
    const filteredKeys = voicing.keyNotes.filter((note) => (
      note >= scene.keysRegister.min && note <= scene.keysRegister.max
    ));
    const keyNotes = filteredKeys.length >= 4 ? filteredKeys : voicing.keyNotes;

    steps.push({
      chordId,
      notes: [...voicing.padNotes],
      keyNotes: [...keyNotes],
      holdMs: Math.round(random.range(scene.chordHoldMs.min, scene.chordHoldMs.max)),
      velocity: random.range(scene.padVelocity.min, scene.padVelocity.max),
    });

    priorNotes = voicing.padNotes;
  });

  return {
    id: `${hourKey}:${scene.id}:${cycle}:${seed.toString(16)}`,
    hourKey,
    scene,
    source,
    seed,
    cycle,
    startsAt,
    endsAt,
    transitionMs: Math.round(random.range(scene.transitionMs.min, scene.transitionMs.max)),
    steps,
  };
}
