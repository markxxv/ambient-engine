export function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 0x9e3779b9;
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }

  integer(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty collection');
    return items[Math.floor(this.next() * items.length)];
  }

  shuffled<T>(items: readonly T[]): T[] {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = this.integer(0, index);
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }

    return copy;
  }
}
