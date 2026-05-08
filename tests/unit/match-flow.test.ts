import { describe, expect, it, vi } from 'vitest';
import { isSlotStillFree } from '@/lib/match-flow';

vi.mock('expo-calendar', () => ({}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

const d = (iso: string): Date => new Date(iso);

const SLOT_START = d('2026-05-08T14:00:00Z');
const SLOT_END = d('2026-05-08T16:00:00Z');

describe('isSlotStillFree', () => {
  it('returns true when no busy intervals', () => {
    expect(isSlotStillFree([], [], SLOT_START, SLOT_END)).toBe(true);
  });

  it('returns false when my interval overlaps the start', () => {
    const busy = [
      { start: d('2026-05-08T13:00:00Z'), end: d('2026-05-08T15:00:00Z') },
    ];
    expect(isSlotStillFree(busy, [], SLOT_START, SLOT_END)).toBe(false);
  });

  it('returns false when their interval overlaps the end', () => {
    const busy = [
      { start: d('2026-05-08T15:30:00Z'), end: d('2026-05-08T17:00:00Z') },
    ];
    expect(isSlotStillFree([], busy, SLOT_START, SLOT_END)).toBe(false);
  });

  it('returns false when slot is fully contained in a busy interval', () => {
    const busy = [
      { start: d('2026-05-08T13:00:00Z'), end: d('2026-05-08T18:00:00Z') },
    ];
    expect(isSlotStillFree(busy, [], SLOT_START, SLOT_END)).toBe(false);
  });

  it('returns true when busy ends exactly at slot start (touching, not overlapping)', () => {
    const busy = [
      { start: d('2026-05-08T12:00:00Z'), end: d('2026-05-08T14:00:00Z') },
    ];
    expect(isSlotStillFree(busy, [], SLOT_START, SLOT_END)).toBe(true);
  });

  it('returns true when busy starts exactly at slot end (touching, not overlapping)', () => {
    const busy = [
      { start: d('2026-05-08T16:00:00Z'), end: d('2026-05-08T18:00:00Z') },
    ];
    expect(isSlotStillFree(busy, [], SLOT_START, SLOT_END)).toBe(true);
  });

  it('returns true when busy intervals are completely before and after the slot', () => {
    const myBusy = [
      { start: d('2026-05-08T09:00:00Z'), end: d('2026-05-08T12:00:00Z') },
    ];
    const theirBusy = [
      { start: d('2026-05-08T17:00:00Z'), end: d('2026-05-08T20:00:00Z') },
    ];
    expect(isSlotStillFree(myBusy, theirBusy, SLOT_START, SLOT_END)).toBe(true);
  });

  it('returns false when stale: one side added a busy block after selection', () => {
    const theirBusy = [
      { start: d('2026-05-08T14:30:00Z'), end: d('2026-05-08T15:30:00Z') },
    ];
    expect(isSlotStillFree([], theirBusy, SLOT_START, SLOT_END)).toBe(false);
  });

  it('returns false when multiple intervals from both sides cause conflict', () => {
    const myBusy = [
      { start: d('2026-05-08T09:00:00Z'), end: d('2026-05-08T11:00:00Z') },
    ];
    const theirBusy = [
      { start: d('2026-05-08T15:00:00Z'), end: d('2026-05-08T16:30:00Z') },
    ];
    expect(isSlotStillFree(myBusy, theirBusy, SLOT_START, SLOT_END)).toBe(
      false,
    );
  });
});
