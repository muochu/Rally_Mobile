import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TrafficState } from '@/hooks/use-courts';
import { colors } from '@/theme/colors';

type Props = {
  traffic: TrafficState;
  selected: boolean;
};

const TRAFFIC_COLOR: Record<TrafficState, string> = {
  open: colors.status.open,
  filling: colors.status.filling,
  full: colors.status.full,
};

export function CourtMarker({ traffic, selected }: Props): ReactElement {
  return (
    <View
      style={[
        styles.pin,
        { backgroundColor: TRAFFIC_COLOR[traffic] },
        selected && styles.pinSelected,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  pinSelected: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
  },
});
