import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusyInterval } from '@/lib/calendar/types';
import { findMutualFreeSlots } from '@/lib/overlap';

const FIXED_NOW = new Date('2026-01-01T08:00:00.000Z');

const hoursFromNow = (h: number): Date =>
  new Date(FIXED_NOW.getTime() + h * 60 * 60 * 1000);

const busy = (startH: number, endH: number): BusyInterval => ({
  start: hoursFromNow(startH),
  end: hoursFromNow(endH),
});

const opts = (
  lookaheadDays = 1,
  minDurationMinutes = 30,
): { lookaheadDays: number; minDurationMinutes: number } => ({
  lookaheadDays,
  minDurationMinutes,
});

describe('findMutualFreeSlots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns entire window when both have no busy blocks', () => {
    const slots = findMutualFreeSlots([], [], opts(1, 30));
    expect(slots).toHaveLength(1);
    expect(slots[0].start.getTime()).toBe(FIXED_NOW.getTime());
    expect(slots[0].end.getTime()).toBe(hoursFromNow(24).getTime());
  });

  it('returns empty when one player is busy the entire window', () => {
    const slots = findMutualFreeSlots([busy(0, 24)], [], opts(1, 30));
    expect(slots).toHaveLength(0);
  });

  it('returns empty when combined busy blocks cover the window', () => {
    const slots = findMutualFreeSlots(
      [busy(0, 12)],
      [busy(12, 24)],
      opts(1, 30),
    );
    expect(slots).toHaveLength(0);
  });

  it('excludes gaps shorter than minDurationMinutes', () => {
    // Gap of 20 min between busy(0,9) and busy(9.33,24) → shorter than 30 min min
    const slots = findMutualFreeSlots([busy(0, 9), busy(9.33, 24)], [], {
      lookaheadDays: 1,
      minDurationMinutes: 30,
    });
    expect(slots).toHaveLength(0);
  });

  it('includes gaps that exactly meet minDurationMinutes', () => {
    // Exact 30-min gap between 9h and 9.5h
    const slots = findMutualFreeSlots([busy(0, 9), busy(9.5, 24)], [], {
      lookaheadDays: 1,
      minDurationMinutes: 30,
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].start.getTime()).toBe(hoursFromNow(9).getTime());
    expect(slots[0].end.getTime()).toBe(hoursFromNow(9.5).getTime());
  });

  it('finds free slots between two different schedules', () => {
    // A busy: 0-2, 6-8  |  B busy: 3-5, 10-12
    // Combined merged: 0-2, 3-5, 6-8, 10-12
    // Free: [2-3], [5-6], [8-10], [12-24]
    const slots = findMutualFreeSlots(
      [busy(0, 2), busy(6, 8)],
      [busy(3, 5), busy(10, 12)],
      opts(1, 30),
    );
    expect(slots).toHaveLength(4);
    expect(slots[0].start.getTime()).toBe(hoursFromNow(2).getTime());
    expect(slots[0].end.getTime()).toBe(hoursFromNow(3).getTime());
    expect(slots[3].start.getTime()).toBe(hoursFromNow(12).getTime());
  });

  it('respects lookahead window boundary', () => {
    const slots = findMutualFreeSlots([], [], {
      lookaheadDays: 7,
      minDurationMinutes: 30,
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].end.getTime()).toBe(hoursFromNow(7 * 24).getTime());
  });

  it('ignores busy blocks that end before window start', () => {
    const priorBusy: BusyInterval = {
      start: hoursFromNow(-4),
      end: hoursFromNow(-1),
    };
    const slots = findMutualFreeSlots([priorBusy], [], opts(1, 30));
    expect(slots).toHaveLength(1);
    expect(slots[0].start.getTime()).toBe(FIXED_NOW.getTime());
  });

  it('clips busy block that straddles window start', () => {
    // Busy from -2h to 6h → free starts at 6h, not now
    const slots = findMutualFreeSlots([busy(-2, 6)], [], opts(1, 30));
    expect(slots).toHaveLength(1);
    expect(slots[0].start.getTime()).toBe(hoursFromNow(6).getTime());
  });

  it('returns slots sorted by start time', () => {
    const slots = findMutualFreeSlots(
      [busy(2, 4), busy(8, 10)],
      [],
      opts(1, 30),
    );
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].start.getTime()).toBeGreaterThan(
        slots[i - 1].start.getTime(),
      );
    }
  });

  it('handles overlapping busy across both players', () => {
    // A and B both busy 9-11 and 14-16 — result same as if one player had both
    const slots = findMutualFreeSlots(
      [busy(9, 11)],
      [busy(14, 16)],
      opts(1, 30),
    );
    expect(
      slots.every((s) => s.end.getTime() - s.start.getTime() >= 30 * 60 * 1000),
    ).toBe(true);
    // Free: [0-9], [11-14], [16-24]
    expect(slots).toHaveLength(3);
  });
});
