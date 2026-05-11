import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
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
  const scale = useSharedValue(selected ? 1.5 : 1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.5 : 1, {
      damping: 12,
      stiffness: 380,
    });
  }, [selected, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.pin,
        { backgroundColor: TRAFFIC_COLOR[traffic] },
        selected && styles.pinSelected,
        animStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  pinSelected: {
    borderColor: colors.accent.primary,
    borderWidth: 3,
  },
});
