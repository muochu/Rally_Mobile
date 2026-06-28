import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ConfirmFooter } from '@/components/feature/confirm-footer';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

const BASE_PROPS = {
  isBooked: false,
  bookedAnimStyle: {} as StyleProp<ViewStyle>,
  isPending: false,
  isAccepting: false,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe('ConfirmFooter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows "Send match request" button in default state', () => {
    render(<ConfirmFooter {...BASE_PROPS} />);
    expect(screen.getByText('Send match request')).toBeTruthy();
  });

  it('shows "Accept and book" button when isAccepting is true', () => {
    render(<ConfirmFooter {...BASE_PROPS} isAccepting={true} />);
    expect(screen.getByText('Accept and book')).toBeTruthy();
  });

  it('calls onConfirm when the primary button is pressed', () => {
    const onConfirm = jest.fn();
    render(<ConfirmFooter {...BASE_PROPS} onConfirm={onConfirm} />);
    fireEvent.press(screen.getByText('Send match request'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is pressed', () => {
    const onCancel = jest.fn();
    render(<ConfirmFooter {...BASE_PROPS} onCancel={onCancel} />);
    fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows "Sending request…" when isPending and not accepting', () => {
    render(<ConfirmFooter {...BASE_PROPS} isPending={true} />);
    expect(screen.getByText('Sending request…')).toBeTruthy();
    expect(screen.queryByText('Send match request')).toBeNull();
  });

  it('shows "Booking match…" when isPending and accepting', () => {
    render(
      <ConfirmFooter {...BASE_PROPS} isPending={true} isAccepting={true} />,
    );
    expect(screen.getByText('Booking match…')).toBeTruthy();
    expect(screen.queryByText('Accept and book')).toBeNull();
  });

  it('shows "Sent!" when isBooked and not accepting', () => {
    render(<ConfirmFooter {...BASE_PROPS} isBooked={true} />);
    expect(screen.getByText('Sent!')).toBeTruthy();
    expect(screen.queryByText('Send match request')).toBeNull();
  });

  it('shows "Accepted!" when isBooked and isAccepting', () => {
    render(
      <ConfirmFooter {...BASE_PROPS} isBooked={true} isAccepting={true} />,
    );
    expect(screen.getByText('Accepted!')).toBeTruthy();
  });
});
