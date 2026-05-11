import { useCallback, useRef } from 'react';
import { Animated, Dimensions, PanResponder } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.62;
export const SNAP_FULL = 0;
export const SNAP_HALF = DRAWER_HEIGHT * 0.5;
export const SNAP_COLLAPSED = DRAWER_HEIGHT - 68;

const SNAPS = [SNAP_FULL, SNAP_HALF, SNAP_COLLAPSED];

type UseCourtDrawer = {
  drawerY: Animated.Value;
  panHandlers: object;
  snapTo: (snap: number) => void;
};

export const useCourtDrawer = (): UseCourtDrawer => {
  const currentSnap = useRef(SNAP_HALF);
  const drawerY = useRef(new Animated.Value(SNAP_HALF)).current;

  const snapTo = useCallback(
    (snap: number): void => {
      currentSnap.current = snap;
      Animated.spring(drawerY, {
        toValue: snap,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    },
    [drawerY],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 4,
      onPanResponderGrant: () => {
        drawerY.stopAnimation((value) => {
          currentSnap.current = value;
        });
      },
      onPanResponderMove: (_, { dy }) => {
        const next = Math.max(
          SNAP_FULL,
          Math.min(SNAP_COLLAPSED, currentSnap.current + dy),
        );
        drawerY.setValue(next);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        let target: number;
        if (vy > 0.5) {
          const higher = SNAPS.filter((s) => s > currentSnap.current);
          target = higher.length ? Math.min(...higher) : SNAP_COLLAPSED;
        } else if (vy < -0.5) {
          const lower = SNAPS.filter((s) => s < currentSnap.current);
          target = lower.length ? Math.max(...lower) : SNAP_FULL;
        } else {
          const projected = currentSnap.current + dy;
          target = SNAPS.reduce((a, b) =>
            Math.abs(b - projected) < Math.abs(a - projected) ? b : a,
          );
        }
        currentSnap.current = target;
        Animated.spring(drawerY, {
          toValue: target,
          useNativeDriver: true,
          tension: 68,
          friction: 12,
        }).start();
      },
    }),
  ).current;

  return { drawerY, panHandlers: panResponder.panHandlers, snapTo };
};
