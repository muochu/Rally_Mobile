import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SlotPicker } from '@/components/feature/slot-picker';
import type { FreeSlot } from '@/lib/overlap';

jest.mock('@/lib/haptics', () => ({ haptics: { light: jest.fn() } }));
jest.mock('@/lib/format-slot', () => ({
  formatSlotDate: (d: Date): string => d.toDateString(),
  formatTimeRange: (s: Date, e: Date): string =>
    `${s.getHours()}:00–${e.getHours()}:00`,
}));

const makeSlot = (startHour: number): FreeSlot => ({
  start: new Date(2026, 4, 20, startHour, 0, 0),
  end: new Date(2026, 4, 20, startHour + 2, 0, 0),
});

const BASE_PROPS = {
  dayGroups: [],
  totalSlots: 0,
  noSlotsIn7: false,
  selectedSlot: null,
  onSelectSlot: jest.fn(),
  onExpandTo14: jest.fn(),
};

describe('SlotPicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows 14-day empty state when no slots and noSlotsIn7 is false', () => {
    render(<SlotPicker {...BASE_PROPS} noSlotsIn7={false} />);
    expect(
      screen.getByText('No mutual times in the next 14 days'),
    ).toBeTruthy();
    expect(screen.queryByText('Try 14 days')).toBeNull();
  });

  it('shows 7-day empty state with expand button when noSlotsIn7 is true', () => {
    render(<SlotPicker {...BASE_PROPS} noSlotsIn7={true} />);
    expect(screen.getByText('No mutual times this week')).toBeTruthy();
    expect(screen.getByText('Try 14 days')).toBeTruthy();
  });

  it('calls onExpandTo14 when "Try 14 days" is pressed', () => {
    const onExpandTo14 = jest.fn();
    render(
      <SlotPicker
        {...BASE_PROPS}
        noSlotsIn7={true}
        onExpandTo14={onExpandTo14}
      />,
    );
    fireEvent.press(screen.getByText('Try 14 days'));
    expect(onExpandTo14).toHaveBeenCalledTimes(1);
  });

  it('renders slot count header when slots are present', () => {
    const slot = makeSlot(9);
    const dayGroups = [
      { dateKey: '2026-4-20', dateLabel: 'Tue May 20', slots: [slot] },
    ];
    render(<SlotPicker {...BASE_PROPS} dayGroups={dayGroups} totalSlots={1} />);
    expect(screen.getByText("1 time you're both free")).toBeTruthy();
  });

  it('renders plural slot count correctly', () => {
    const slots = [makeSlot(9), makeSlot(14)];
    const dayGroups = [
      { dateKey: '2026-4-20', dateLabel: 'Tue May 20', slots },
    ];
    render(<SlotPicker {...BASE_PROPS} dayGroups={dayGroups} totalSlots={2} />);
    expect(screen.getByText("2 times you're both free")).toBeTruthy();
  });

  it('calls onSelectSlot with the correct slot when pressed', () => {
    const onSelectSlot = jest.fn();
    const slot = makeSlot(9);
    const dayGroups = [
      { dateKey: '2026-4-20', dateLabel: 'Tue May 20', slots: [slot] },
    ];
    render(
      <SlotPicker
        {...BASE_PROPS}
        dayGroups={dayGroups}
        totalSlots={1}
        onSelectSlot={onSelectSlot}
      />,
    );
    fireEvent.press(screen.getByRole('radio'));
    expect(onSelectSlot).toHaveBeenCalledWith(slot);
  });

  it('marks the selected slot as checked', () => {
    const slot = makeSlot(9);
    const dayGroups = [
      { dateKey: '2026-4-20', dateLabel: 'Tue May 20', slots: [slot] },
    ];
    render(
      <SlotPicker
        {...BASE_PROPS}
        dayGroups={dayGroups}
        totalSlots={1}
        selectedSlot={slot}
      />,
    );
    expect(screen.getByRole('radio', { checked: true })).toBeTruthy();
  });
});
