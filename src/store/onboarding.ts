import { create } from 'zustand';

export type Gender = 'male' | 'female' | 'prefer_not_to_say';
export type CalendarPermission = 'granted' | 'denied' | 'skipped';

export interface PreferredHours {
  weekday_morning: boolean;
  weekday_evening: boolean;
  weekend: boolean;
}

interface OnboardingState {
  gender: Gender | null;
  utrRating: number | null;
  utrUnknown: boolean;
  city: string | null;
  calendarPermission: CalendarPermission | null;
  preferredHours: PreferredHours;
}

interface OnboardingActions {
  setGender: (gender: Gender) => void;
  setUtrRating: (rating: number | null, unknown?: boolean) => void;
  setCity: (city: string) => void;
  setCalendarPermission: (status: CalendarPermission) => void;
  reset: () => void;
}

const defaultHours: PreferredHours = {
  weekday_morning: false,
  weekday_evening: true,
  weekend: true,
};

const defaultState: OnboardingState = {
  gender: null,
  utrRating: null,
  utrUnknown: false,
  city: null,
  calendarPermission: null,
  preferredHours: defaultHours,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>(
  (set) => ({
    ...defaultState,
    setGender: (gender): void => {
      set({ gender });
    },
    setUtrRating: (utrRating, utrUnknown = false): void => {
      set({ utrRating, utrUnknown });
    },
    setCity: (city): void => {
      set({ city });
    },
    setCalendarPermission: (calendarPermission): void => {
      set({ calendarPermission });
    },
    reset: (): void => {
      set(defaultState);
    },
  }),
);
