import type { BusyInterval } from './types';

export const mergeBusyIntervals = (
  sources: BusyInterval[][],
): BusyInterval[] => {
  const flat = sources
    .flat()
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (flat.length === 0) return [];

  const merged: BusyInterval[] = [
    { start: new Date(flat[0].start), end: new Date(flat[0].end) },
  ];

  for (let i = 1; i < flat.length; i++) {
    const last = merged[merged.length - 1];
    if (flat[i].start <= last.end) {
      if (flat[i].end > last.end) last.end = new Date(flat[i].end);
    } else {
      merged.push({
        start: new Date(flat[i].start),
        end: new Date(flat[i].end),
      });
    }
  }

  return merged;
};
