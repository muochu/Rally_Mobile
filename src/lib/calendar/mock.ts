import type { BusyInterval } from './types';

const seededRand = (seed: string): (() => number) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) | 0;
    return (h >>> 0) / 0xffffffff;
  };
};

export const getMockBusyIntervals = (
  seed: string,
  daysAhead = 14,
): BusyInterval[] => {
  const rand = seededRand(seed);
  const now = new Date();
  const blocks: BusyInterval[] = [];

  for (let day = 0; day < daysAhead; day++) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() + day);
    dayStart.setHours(0, 0, 0, 0);

    const count = Math.floor(rand() * 3); // 0–2 busy blocks per day
    for (let b = 0; b < count; b++) {
      const startHour = 8 + Math.floor(rand() * 12);
      const startMinute = Math.floor(rand() * 4) * 15;
      const durationMs = (0.5 + rand() * 1.5) * 60 * 60 * 1000;

      const start = new Date(dayStart);
      start.setHours(startHour, startMinute, 0, 0);
      const end = new Date(start.getTime() + durationMs);

      blocks.push({ start, end });
    }
  }

  return blocks.sort((a, b) => a.start.getTime() - b.start.getTime());
};
