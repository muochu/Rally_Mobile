import { describe, expect, it, vi } from 'vitest';
import { buildDayGroups } from '@/components/feature/slot-picker';

vi.mock('react-native', () => ({
  Pressable: {},
  ScrollView: {},
  StyleSheet: { create: (s: unknown): unknown => s },
  Text: {},
  View: {},
}));
vi.mock('@/lib/haptics', () => ({ haptics: { light: vi.fn() } }));
vi.mock('@/theme/colors', () => ({
  colors: { accent: {}, background: {}, border: {}, text: {}, status: {} },
}));
vi.mock('@/theme/spacing', () => ({ radii: {}, spacing: {} }));

const d = (iso: string): Date => new Date(iso);

const slot = (start: string, end: string): { start: Date; end: Date } => ({
  start: d(start),
  end: d(end),
});

describe('buildDayGroups', () => {
  it('returns empty array for empty input', () => {
    expect(buildDayGroups([])).toEqual([]);
  });

  it('groups a single slot into one day', () => {
    const groups = buildDayGroups([
      slot('2026-05-10T14:00:00', '2026-05-10T16:00:00'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].slots).toHaveLength(1);
  });

  it('groups two slots on the same day into one group', () => {
    const groups = buildDayGroups([
      slot('2026-05-10T09:00:00', '2026-05-10T11:00:00'),
      slot('2026-05-10T14:00:00', '2026-05-10T16:00:00'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].slots).toHaveLength(2);
  });

  it('groups slots on different days into separate groups', () => {
    const groups = buildDayGroups([
      slot('2026-05-10T14:00:00', '2026-05-10T16:00:00'),
      slot('2026-05-11T09:00:00', '2026-05-11T11:00:00'),
      slot('2026-05-12T10:00:00', '2026-05-12T12:00:00'),
    ]);
    expect(groups).toHaveLength(3);
    expect(groups[0].slots).toHaveLength(1);
    expect(groups[1].slots).toHaveLength(1);
    expect(groups[2].slots).toHaveLength(1);
  });

  it('preserves insertion order within a day', () => {
    const s1 = slot('2026-05-10T08:00:00', '2026-05-10T10:00:00');
    const s2 = slot('2026-05-10T13:00:00', '2026-05-10T15:00:00');
    const groups = buildDayGroups([s1, s2]);
    expect(groups[0].slots[0].start.getTime()).toBe(s1.start.getTime());
    expect(groups[0].slots[1].start.getTime()).toBe(s2.start.getTime());
  });

  it('sets dateKey from year-month-date components', () => {
    const groups = buildDayGroups([
      slot('2026-05-10T14:00:00', '2026-05-10T16:00:00'),
    ]);
    const { dateKey } = groups[0];
    expect(dateKey).toMatch(/^2026-\d+-\d+$/);
  });

  it('handles 3 slots across 2 days correctly', () => {
    const groups = buildDayGroups([
      slot('2026-05-10T08:00:00', '2026-05-10T10:00:00'),
      slot('2026-05-10T14:00:00', '2026-05-10T16:00:00'),
      slot('2026-05-11T09:00:00', '2026-05-11T11:00:00'),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].slots).toHaveLength(2);
    expect(groups[1].slots).toHaveLength(1);
  });
});
