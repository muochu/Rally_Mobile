import * as Calendar from 'expo-calendar';

import type { BusyInterval } from './types';

export const getAppleBusyIntervals = async (
  daysAhead = 14,
): Promise<BusyInterval[]> => {
  const { status } = await Calendar.getCalendarPermissions();
  if (status !== 'granted') return [];

  const allCalendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const calendars = allCalendars.filter(
    (c) => c.type !== Calendar.CalendarType.BIRTHDAYS,
  );
  if (calendars.length === 0) return [];

  const start = new Date();
  const end = new Date(start.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const events = await Calendar.listEvents(calendars, start, end);

  return events
    .filter((e) => !e.allDay && Boolean(e.startDate) && Boolean(e.endDate))
    .map((e) => ({
      start: new Date(e.startDate),
      end: new Date(e.endDate),
    }));
};
