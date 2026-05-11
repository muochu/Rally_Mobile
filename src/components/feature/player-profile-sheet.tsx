import type { ReactElement } from 'react';
import { useRef } from 'react';
import { BlurView } from 'expo-blur';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarLarge } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { FreeSlot } from '@/lib/overlap';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';
import type { NearbyPlayer } from './player-card';

interface PlayerProfileSheetProps {
  player: NearbyPlayer | null;
  mutualSlots: FreeSlot[];
  onSchedule: (playerId: string) => void;
  onClose: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const formatSlot = (slot: FreeSlot): string => {
  const { start, end } = slot;
  const day = DAY_NAMES[start.getDay()];
  const date = `${MONTH_NAMES[start.getMonth()]} ${start.getDate()}`;
  const fmt = (d: Date): string => {
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return m === 0
      ? `${hour}${period}`
      : `${hour}:${String(m).padStart(2, '0')}${period}`;
  };
  return `${day} ${date}, ${fmt(start)}–${fmt(end)}`;
};

export function PlayerProfileSheet({
  player,
  mutualSlots,
  onSchedule,
  onClose,
}: PlayerProfileSheetProps): ReactElement {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const dragY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 3,
      onPanResponderMove: (_, { dy }) => {
        dragY.setValue(Math.max(0, dy));
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.8) {
          Animated.timing(dragY, {
            toValue: 700,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            dragY.setValue(0);
            onCloseRef.current();
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      visible={player !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView tint="dark" intensity={30} style={StyleSheet.absoluteFill} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: dragY }] }]}
        >
          <Pressable onPress={() => undefined}>
            <SafeAreaView edges={['bottom']} style={styles.safeArea}>
              <View style={styles.handleArea} {...panResponder.panHandlers}>
                <View style={styles.handle} />
              </View>

              {player && (
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.header}>
                    <AvatarLarge
                      name={player.full_name}
                      imageUrl={player.avatar_url}
                      size={56}
                    />
                    <View style={styles.headerInfo}>
                      <Text style={styles.name}>{player.full_name}</Text>
                      <View style={styles.badges}>
                        {player.utr_rating != null && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                              UTR {player.utr_rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                        {(player.home_court_name ?? player.city) && (
                          <Text style={styles.location}>
                            {player.home_court_name ?? player.city}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      {player.overlap_count > 0
                        ? `${player.overlap_count} day${player.overlap_count !== 1 ? 's' : ''} you could play`
                        : 'No mutual time in the next 14 days'}
                    </Text>
                    {mutualSlots.slice(0, 3).map((slot, i) => (
                      <View key={i} style={styles.slotRow}>
                        <View style={styles.slotDot} />
                        <Text style={styles.slotText}>{formatSlot(slot)}</Text>
                      </View>
                    ))}
                    {mutualSlots.length === 0 && (
                      <Text style={styles.noSlots}>
                        Try expanding your availability in your calendar.
                      </Text>
                    )}
                  </View>

                  <View style={styles.footer}>
                    <Button
                      label="Schedule a match"
                      onPress={() => onSchedule(player.id)}
                      fullWidth
                      disabled={mutualSlots.length === 0}
                    />
                  </View>
                </ScrollView>
              )}
            </SafeAreaView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
  },
  safeArea: {
    // No flex:1 — let content determine height, maxHeight on sheet clips it
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.secondary,
  },
  scroll: {
    // No flexGrow:0 — let ScrollView grow within the sheet's maxHeight
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.accent.soft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  location: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
  },
  section: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
  },
  slotText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  noSlots: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  footer: {
    paddingTop: spacing.md,
  },
});
