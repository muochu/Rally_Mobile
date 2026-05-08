import * as Calendar from 'expo-calendar';
import type { BusyInterval } from './types';

export const getAppleBusyIntervals = async (
  daysAhead = 14,
): Promise<BusyInterval[]> => {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  if (status !== 'granted') return [];

  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  if (calendars.length === 0) return [];

  const start = new Date();
  const end = new Date(start.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const events = await Calendar.getEventsAsync(
    calendars.map((c) => c.id),
    start,
    end,
  );

  return events
    .filter((e) => !e.allDay && Boolean(e.startDate) && Boolean(e.endDate))
    .map((e) => ({
      start: new Date(e.startDate),
      end: new Date(e.endDate),
    }));
};
