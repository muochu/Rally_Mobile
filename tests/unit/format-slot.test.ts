import { describe, expect, it } from 'vitest';

import {
  decodeSlotId,
  encodeSlotId,
  formatDuration,
  formatSlotDate,
  formatSlotFull,
  formatTimeRange,
} from '@/lib/format-slot';

describe('formatTimeRange', () => {
  it('formats on-the-hour times without minutes', () => {
    const start = new Date('2024-06-15T10:00:00');
    const end = new Date('2024-06-15T12:00:00');
    expect(formatTimeRange(start, end)).toBe('10am–12pm');
  });

  it('formats times with minutes', () => {
    const start = new Date('2024-06-15T09:30:00');
    const end = new Date('2024-06-15T11:30:00');
    expect(formatTimeRange(start, end)).toBe('9:30am–11:30am');
  });

  it('formats noon as 12pm', () => {
    const start = new Date('2024-06-15T12:00:00');
    const end = new Date('2024-06-15T14:00:00');
    expect(formatTimeRange(start, end)).toBe('12pm–2pm');
  });

  it('formats midnight as 12am', () => {
    const start = new Date('2024-06-15T00:00:00');
    const end = new Date('2024-06-15T02:00:00');
    expect(formatTimeRange(start, end)).toBe('12am–2am');
  });
});

describe('formatSlotDate', () => {
  it('formats a weekday date correctly', () => {
    const d = new Date('2024-06-17T10:00:00'); // Monday
    expect(formatSlotDate(d)).toBe('Mon Jun 17');
  });

  it('formats a weekend date correctly', () => {
    const d = new Date('2024-06-15T10:00:00'); // Saturday
    expect(formatSlotDate(d)).toBe('Sat Jun 15');
  });
});

describe('formatSlotFull', () => {
  it('combines date and time range', () => {
    const start = new Date('2024-06-17T09:00:00');
    const end = new Date('2024-06-17T11:00:00');
    expect(formatSlotFull(start, end)).toBe('Mon Jun 17, 9am–11am');
  });
});

describe('formatDuration', () => {
  it('formats sub-hour duration in minutes', () => {
    const start = new Date('2024-06-15T10:00:00');
    const end = new Date('2024-06-15T10:45:00');
    expect(formatDuration(start, end)).toBe('45m');
  });

  it('formats exact hours without minutes', () => {
    const start = new Date('2024-06-15T10:00:00');
    const end = new Date('2024-06-15T12:00:00');
    expect(formatDuration(start, end)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    const start = new Date('2024-06-15T10:00:00');
    const end = new Date('2024-06-15T12:30:00');
    expect(formatDuration(start, end)).toBe('2h 30m');
  });

  it('formats multi-day duration', () => {
    const start = new Date('2024-06-15T10:00:00');
    const end = new Date('2024-06-17T10:00:00');
    expect(formatDuration(start, end)).toBe('2d');
  });
});

describe('encodeSlotId / decodeSlotId', () => {
  it('round-trips correctly', () => {
    const start = new Date('2024-06-15T10:00:00');
    const end = new Date('2024-06-15T12:00:00');
    const encoded = encodeSlotId(start, end);
    const decoded = decodeSlotId(encoded);
    expect(decoded?.start.getTime()).toBe(start.getTime());
    expect(decoded?.end.getTime()).toBe(end.getTime());
  });

  it('produces underscore-separated timestamp string', () => {
    const start = new Date(1000000);
    const end = new Date(2000000);
    expect(encodeSlotId(start, end)).toBe('1000000_2000000');
  });
});
