import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ToastMessage } from '@/lib/toast';
import { toast as toastLib } from '@/lib/toast';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const VARIANT_COLOR: Record<ToastMessage['variant'], string> = {
  success: colors.status.success,
  error: colors.status.error,
  info: colors.accent.primary,
};

function ToastItem({ item }: { item: ToastMessage }): ReactElement {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
    ]).start();

    const fadeOut = setTimeout((): void => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2700);

    return (): void => clearTimeout(fadeOut);
  }, [opacity, translateY]);

  const accent = VARIANT_COLOR[item.variant];

  return (
    <Animated.View
      style={[styles.pill, { opacity, transform: [{ translateY }] }]}
    >
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={styles.text} numberOfLines={2}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

export function ToastContainer(): ReactElement {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => toastLib.subscribe(setItems), []);

  return (
    <View
      style={[styles.container, { top: insets.top + spacing.sm }]}
      pointerEvents="none"
    >
      {items.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    gap: spacing.sm,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    maxWidth: 340,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    flexShrink: 1,
  },
});
