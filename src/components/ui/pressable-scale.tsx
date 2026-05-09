import type { ReactElement, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';

interface PressableScaleProps {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'none';
  scale?: number;
  accessibilityRole?: 'button' | 'link' | 'checkbox' | 'radio';
  accessibilityLabel?: string;
  accessibilityState?: object;
  disabled?: boolean;
}

export function PressableScale({
  children,
  onPress,
  style,
  haptic = 'light',
  scale = 0.97,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  disabled = false,
}: PressableScaleProps): ReactElement {
  const scaleVal = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        if (haptic !== 'none') haptics[haptic]();
        onPress();
      }}
      onPressIn={() => {
        scaleVal.value = withSpring(scale, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scaleVal.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
    >
      <Animated.View style={[animStyle, style as object]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
