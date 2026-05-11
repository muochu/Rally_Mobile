import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import type { MatchWithOpponent, PendingRequest } from '@/hooks/use-matches';
import { formatSlotDate, formatTimeRange } from '@/lib/format-slot';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const MARK_COMPLETE_DELAY_MS = 30 * 60 * 1000;

export type MatchCardProps =
  | {
      variant: 'upcoming';
      match: MatchWithOpponent;
      onCancel: () => void;
      onMarkComplete: () => void;
    }
  | {
      variant: 'past';
      match: MatchWithOpponent;
      onReview?: () => void;
      onRematch?: () => void;
    }
  | {
      variant: 'pending-incoming';
      request: PendingRequest;
      onBook: () => void;
      onDecline: () => void;
    }
  | {
      variant: 'pending-outgoing';
      request: PendingRequest;
      onCancelRequest: () => void;
    };

type BadgeProps = { label: string; color: string };

const Badge = ({ label, color }: BadgeProps): ReactElement => (
  <View style={[styles.badge, { backgroundColor: color + '20' }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  secondary?: boolean;
};

const ActionButton = ({
  label,
  onPress,
  destructive,
  secondary,
}: ActionButtonProps): ReactElement => (
  <PressableScale
    onPress={onPress}
    style={[
      styles.actionBtn,
      secondary && styles.actionBtnSecondary,
      destructive && styles.actionBtnDestructive,
    ]}
    haptic={destructive ? 'medium' : 'light'}
    scale={0.95}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Text
      style={[
        styles.actionBtnText,
        secondary && styles.actionBtnTextSecondary,
        destructive && styles.actionBtnTextDestructive,
      ]}
    >
      {label}
    </Text>
  </PressableScale>
);

export const MatchCard = (props: MatchCardProps): ReactElement => {
  if (props.variant === 'upcoming') {
    const { match, onCancel, onMarkComplete } = props;
    const canMarkComplete =
      Date.now() > match.endTime.getTime() + MARK_COMPLETE_DELAY_MS;

    return (
      <View style={styles.card}>
        <View
          style={[styles.accentBar, { backgroundColor: colors.accent.primary }]}
        />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.dateLabel}>
              {formatSlotDate(match.startTime)}
            </Text>
            <Badge label="Upcoming" color={colors.status.success} />
          </View>
          <Text style={styles.opponentName}>{match.opponentName}</Text>
          <Text style={styles.timeRange}>
            {formatTimeRange(match.startTime, match.endTime)}
          </Text>
          <View style={styles.actions}>
            {canMarkComplete ? (
              <ActionButton label="Mark complete" onPress={onMarkComplete} />
            ) : (
              <ActionButton
                label="Cancel match"
                onPress={onCancel}
                destructive
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  if (props.variant === 'past') {
    const { match, onReview, onRematch } = props;
    const isCancelled = match.status === 'cancelled';
    const showReview = !isCancelled && !match.hasMyReview && onReview;
    const showActions = showReview || onRematch;

    return (
      <View style={[styles.card, styles.cardMuted]}>
        <View
          style={[
            styles.accentBar,
            {
              backgroundColor: isCancelled
                ? colors.text.tertiary
                : colors.status.success,
            },
          ]}
        />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.dateLabel}>
              {formatSlotDate(match.startTime)}
            </Text>
            {isCancelled ? (
              <Badge label="Cancelled" color={colors.text.tertiary} />
            ) : (
              <Badge label="Played" color={colors.status.info} />
            )}
          </View>
          <Text style={styles.opponentName}>{match.opponentName}</Text>
          <Text style={styles.timeRange}>
            {formatTimeRange(match.startTime, match.endTime)}
          </Text>
          {showActions && (
            <View style={styles.actions}>
              {showReview && (
                <ActionButton label="Review" onPress={onReview} secondary />
              )}
              {onRematch && (
                <ActionButton label="Rematch" onPress={onRematch} />
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  if (props.variant === 'pending-incoming') {
    const { request, onBook, onDecline } = props;
    return (
      <View style={styles.card}>
        <View
          style={[styles.accentBar, { backgroundColor: colors.status.warning }]}
        />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.dateLabel}>Schedule request</Text>
            <Badge label="New" color={colors.status.warning} />
          </View>
          <Text style={styles.opponentName}>{request.opponentName}</Text>
          {request.message ? (
            <Text style={styles.message}>"{request.message}"</Text>
          ) : null}
          <View style={styles.actions}>
            <ActionButton label="Accept" onPress={onBook} />
            <ActionButton label="Decline" onPress={onDecline} destructive />
          </View>
        </View>
      </View>
    );
  }

  const { request, onCancelRequest } = props;
  return (
    <View style={[styles.card, styles.cardMuted]}>
      <View
        style={[styles.accentBar, { backgroundColor: colors.text.tertiary }]}
      />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.dateLabel}>Sent request</Text>
          <Badge label="Pending" color={colors.text.tertiary} />
        </View>
        <Text style={styles.opponentName}>{request.opponentName}</Text>
        <Text style={styles.timeRange}>Waiting for response</Text>
        <View style={styles.actions}>
          <ActionButton
            label="Cancel request"
            onPress={onCancelRequest}
            destructive
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMuted: { opacity: 0.75 },
  accentBar: { width: 3 },
  body: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  opponentName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  timeRange: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  message: {
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
  },
  actionBtnSecondary: { backgroundColor: colors.background.secondary },
  actionBtnDestructive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.status.error,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  actionBtnTextSecondary: { color: colors.text.primary },
  actionBtnTextDestructive: { color: colors.status.error },
});
