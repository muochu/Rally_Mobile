import { FlashList } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import type { Court } from '@/hooks/use-courts';
import { getTrafficState } from '@/hooks/use-courts';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type Props = {
  courts: Court[];
  isLoading: boolean;
  homeCourt: string | null;
  selectedCourt: Court | null;
  drawerY: Animated.Value;
  drawerHeight: number;
  panHandlers: object;
  onCourtSelect: (court: Court) => void;
  paddingBottom: number;
};

function CourtRow({
  court,
  isSelected,
  isHome,
  onPress,
}: {
  court: Court;
  isSelected: boolean;
  isHome: boolean;
  onPress: () => void;
}): ReactElement {
  const traffic = getTrafficState(court.upcoming_matches_count);
  const trafficColor =
    traffic === 'open'
      ? colors.status.open
      : traffic === 'filling'
        ? colors.status.filling
        : colors.status.full;

  return (
    <PressableScale
      style={[styles.courtRow, isSelected && styles.courtRowSelected]}
      onPress={onPress}
      haptic="light"
      scale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${court.name}, ${traffic}`}
    >
      <View style={[styles.trafficDot, { backgroundColor: trafficColor }]} />
      <View style={styles.courtInfo}>
        <Text style={styles.courtName} numberOfLines={1}>
          {court.name}
          {isHome ? '  🏠' : ''}
        </Text>
        {court.address != null && (
          <Text style={styles.courtAddress} numberOfLines={1}>
            {court.address}
          </Text>
        )}
      </View>
      <Text style={styles.courtCourts}>
        {court.court_count} {court.court_count === 1 ? 'ct' : 'cts'}
      </Text>
    </PressableScale>
  );
}

export function CourtsBottomDrawer({
  courts,
  isLoading,
  homeCourt,
  selectedCourt,
  drawerY,
  drawerHeight,
  panHandlers,
  onCourtSelect,
  paddingBottom,
}: Props): ReactElement {
  return (
    <Animated.View
      style={[
        styles.drawer,
        { height: drawerHeight, paddingBottom },
        { transform: [{ translateY: drawerY }] },
      ]}
    >
      <View style={styles.drawerHandle} {...panHandlers}>
        <View style={styles.handlePill} />
        <Text style={styles.drawerTitle}>Nearby courts</Text>
      </View>

      {courts.length === 0 && !isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No courts in this area</Text>
        </View>
      ) : (
        <FlashList
          data={courts}
          keyExtractor={(c): string => c.id}
          renderItem={({ item }): ReactElement => (
            <CourtRow
              court={item}
              isSelected={selectedCourt?.id === item.id}
              isHome={item.id === homeCourt}
              onPress={(): void => onCourtSelect(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={64}
          ItemSeparatorComponent={(): ReactElement => (
            <View style={styles.separator} />
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHandle: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  handlePill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.secondary,
    marginBottom: spacing.sm,
  },
  drawerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  courtRowSelected: {
    backgroundColor: colors.accent.soft,
  },
  trafficDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  courtAddress: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  courtCourts: {
    fontSize: 13,
    color: colors.text.tertiary,
    flexShrink: 0,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginLeft: spacing.lg + 10 + spacing.md,
  },
});
