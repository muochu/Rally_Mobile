import { describe, expect, it } from 'vitest';
import { mergeBusyIntervals } from '@/lib/calendar/merge';
import type { BusyInterval } from '@/lib/calendar/types';

const t = (isoOrOffset: string | number): Date =>
  typeof isoOrOffset === 'number'
    ? new Date(Date.UTC(2026, 0, 1, isoOrOffset, 0, 0, 0))
    : new Date(isoOrOffset);

const interval = (startH: number, endH: number): BusyInterval => ({
  start: t(startH),
  end: t(endH),
});

describe('mergeBusyIntervals', () => {
  it('returns empty for empty input', () => {
    expect(mergeBusyIntervals([])).toEqual([]);
  });

  it('returns empty for sources with no intervals', () => {
    expect(mergeBusyIntervals([[], []])).toEqual([]);
  });

  it('returns a single interval unchanged', () => {
    const result = mergeBusyIntervals([[interval(9, 10)]]);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(t(9));
    expect(result[0].end).toEqual(t(10));
  });

  it('merges two overlapping intervals from the same source', () => {
    const result = mergeBusyIntervals([[interval(9, 11), interval(10, 12)]]);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(t(9));
    expect(result[0].end).toEqual(t(12));
  });

  it('merges adjacent intervals (end = start of next)', () => {
    const result = mergeBusyIntervals([[interval(9, 10), interval(10, 11)]]);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(t(9));
    expect(result[0].end).toEqual(t(11));
  });

  it('keeps non-overlapping intervals separate', () => {
    const result = mergeBusyIntervals([[interval(9, 10), interval(12, 13)]]);
    expect(result).toHaveLength(2);
    expect(result[0].end).toEqual(t(10));
    expect(result[1].start).toEqual(t(12));
  });

  it('merges overlapping intervals across two sources', () => {
    const result = mergeBusyIntervals([[interval(9, 11)], [interval(10, 13)]]);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(t(9));
    expect(result[0].end).toEqual(t(13));
  });

  it('handles one source inside another', () => {
    const result = mergeBusyIntervals([[interval(9, 14), interval(10, 12)]]);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(t(9));
    expect(result[0].end).toEqual(t(14));
  });

  it('collapses all overlapping intervals into one', () => {
    const result = mergeBusyIntervals([
      [interval(1, 5), interval(3, 7), interval(6, 9)],
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(t(1));
    expect(result[0].end).toEqual(t(9));
  });

  it('sorts intervals across sources before merging', () => {
    const result = mergeBusyIntervals([[interval(12, 13)], [interval(9, 10)]]);
    expect(result).toHaveLength(2);
    expect(result[0].start).toEqual(t(9));
    expect(result[1].start).toEqual(t(12));
  });
});
