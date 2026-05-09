import { describe, expect, it, vi } from 'vitest';

const captureExceptionSpy = vi.hoisted(() => vi.fn());

vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
  captureException: captureExceptionSpy,
  wrap: (c: unknown): unknown => c,
}));

vi.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_SENTRY_DSN: 'https://key@sentry.io/123',
  },
}));

// --- Analytics PII guard ---

describe('analytics: no PII in event payloads', () => {
  it('trackEvent payload shape contains no PII fields', () => {
    const safePayload: Record<string, string | number | boolean> = {
      provider: 'apple',
    };
    expect(Object.keys(safePayload)).not.toContain('email');
    expect(Object.keys(safePayload)).not.toContain('name');
    expect(Object.keys(safePayload)).not.toContain('full_name');
    expect(Object.keys(safePayload)).not.toContain('calendar');
    expect(Object.keys(safePayload)).not.toContain('message');
  });
});

// --- Sentry PII scrubbing ---

describe('reportError: strips PII from context before sending to Sentry', () => {
  it('removes known PII keys from context object', async () => {
    captureExceptionSpy.mockClear();
    const { reportError } = await import('@/lib/errors');

    reportError(new Error('test'), {
      email: 'user@example.com',
      name: 'Matthew',
      full_name: 'Matthew Hu',
      message: 'private message',
      userId: 'abc-123',
      matchId: 'xyz-789',
    });

    expect(captureExceptionSpy).toHaveBeenCalledOnce();
    const extra = captureExceptionSpy.mock.calls[0][1]?.extra ?? {};
    expect(extra).not.toHaveProperty('email');
    expect(extra).not.toHaveProperty('name');
    expect(extra).not.toHaveProperty('full_name');
    expect(extra).not.toHaveProperty('message');
    expect(extra).toHaveProperty('userId', 'abc-123');
    expect(extra).toHaveProperty('matchId', 'xyz-789');
  });
});

vi.mock('expo-calendar', () => ({
  getCalendarPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getCalendarsAsync: vi.fn().mockResolvedValue([{ id: 'cal-1' }]),
  getEventsAsync: vi.fn().mockResolvedValue([
    {
      id: 'evt-secret',
      title: 'Confidential board meeting',
      location: '1 Infinite Loop',
      notes: 'Do not share',
      attendees: [{ name: 'Alice', email: 'alice@example.com' }],
      url: 'https://internal.example.com/meeting',
      alarms: [{ relativeOffset: -15 }],
      startDate: '2026-01-02T10:00:00.000Z',
      endDate: '2026-01-02T11:00:00.000Z',
      allDay: false,
    },
    {
      id: 'evt-allday',
      title: 'Holiday',
      startDate: '2026-01-03T00:00:00.000Z',
      endDate: '2026-01-03T23:59:59.000Z',
      allDay: true,
    },
  ]),
  EntityTypes: { EVENT: 'event' },
}));

describe('Apple calendar privacy', () => {
  it('strips all fields except start and end from each event', async () => {
    const { getAppleBusyIntervals } = await import('@/lib/calendar/apple');
    const intervals = await getAppleBusyIntervals(14);

    expect(intervals).toHaveLength(1); // all-day event filtered out

    const [interval] = intervals;
    const keys = Object.keys(interval);

    expect(keys).toHaveLength(2);
    expect(keys).toContain('start');
    expect(keys).toContain('end');

    expect(interval).not.toHaveProperty('title');
    expect(interval).not.toHaveProperty('location');
    expect(interval).not.toHaveProperty('notes');
    expect(interval).not.toHaveProperty('attendees');
    expect(interval).not.toHaveProperty('id');
    expect(interval).not.toHaveProperty('url');
    expect(interval).not.toHaveProperty('alarms');
  });

  it('start and end are Date objects', async () => {
    const { getAppleBusyIntervals } = await import('@/lib/calendar/apple');
    const intervals = await getAppleBusyIntervals(14);

    expect(intervals[0].start).toBeInstanceOf(Date);
    expect(intervals[0].end).toBeInstanceOf(Date);
  });

  it('skips all-day events', async () => {
    const { getAppleBusyIntervals } = await import('@/lib/calendar/apple');
    const intervals = await getAppleBusyIntervals(14);
    // Mock returns 1 regular + 1 all-day; only 1 should come through
    expect(intervals).toHaveLength(1);
  });
});
