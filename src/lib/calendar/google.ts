import type { BusyInterval } from './types';

// Google Calendar OAuth with calendar scope is connected in Phase 9 (Profile settings).
// The auth flow today only grants identity scope, not calendar read.
export const getGoogleBusyIntervals = async (): Promise<BusyInterval[]> => {
  return [];
};
