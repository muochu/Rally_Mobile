import type { ReactElement } from 'react';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
}: ButtonProps): ReactElement {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = (): void => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.92,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = (): void => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'tertiary' && styles.tertiary,
          fullWidth && styles.fullWidth,
          disabled && styles.disabledContainer,
          { transform: [{ scale }], opacity },
        ]}
      >
        <Text
          style={[
            styles.label,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'tertiary' && styles.labelTertiary,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.accent.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  tertiary: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
  fullWidth: {
    width: '100%',
  },
  disabledContainer: {
    opacity: 0.4,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  labelSecondary: {
    color: colors.text.primary,
  },
  labelTertiary: {
    color: colors.accent.primary,
    fontSize: 15,
  },
});
