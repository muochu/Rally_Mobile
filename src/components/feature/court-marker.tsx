import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

type Props = {
  selected: boolean;
};

export function CourtMarker({ selected }: Props): ReactElement {
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

  // PointAnnotation anchors to this View's layout bounds — the outer
  // container must be large enough to contain the scaled pin (22 × 1.5 = 33)
  // so the anchor stays stable while the inner pin animates.
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pin,
          { backgroundColor: colors.accent.primary },
          selected && styles.pinSelected,
          animStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
