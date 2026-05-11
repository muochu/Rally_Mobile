import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Crosshair, Search, X } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourtDetailSheet } from '@/components/feature/court-detail-sheet';
import { CourtMarker } from '@/components/feature/court-marker';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useAuth } from '@/hooks/use-auth';
import type { Bounds, Court } from '@/hooks/use-courts';
import { getTrafficState, haversineKm, useCourts } from '@/hooks/use-courts';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

MapboxGL.setAccessToken(env.EXPO_PUBLIC_MAPBOX_TOKEN);

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_COORDS: [number, number] = [-123.1207, 49.2827]; // Vancouver
const DEFAULT_ZOOM = 13;
const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Drawer snap points — translateY values (0 = fully visible)
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.62;
const SNAP_FULL = 0;
const SNAP_HALF = DRAWER_HEIGHT * 0.5;
const SNAP_COLLAPSED = DRAWER_HEIGHT - 68;
const SNAPS = [SNAP_FULL, SNAP_HALF, SNAP_COLLAPSED];

type GeocodeSuggestion = {
  id: string;
  place_name: string;
  center: [number, number];
};

type GeocoderResponse = {
  features: { id: string; place_name: string; center: [number, number] }[];
};

export default function CourtsScreen(): ReactElement {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [homeCourt, setHomeCourtState] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drawer animation
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

  const { courts, isLoading } = useCourts(bounds);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('home_court_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.home_court_id) setHomeCourtState(data.home_court_id);
      });
  }, [userId]);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(({ coords }) => {
          cameraRef.current?.flyTo([coords.longitude, coords.latitude], 0);
        })
        .catch(() => {});
    });
  }, []);

  const handleMapIdle = useCallback((state: MapboxGL.MapState): void => {
    const { bounds: b } = state.properties;
    setBounds({
      sw: [b.sw[0], b.sw[1]],
      ne: [b.ne[0], b.ne[1]],
    });
  }, []);

  const mapCenter = useMemo((): [number, number] => {
    if (!bounds) return DEFAULT_COORDS;
    return [
      (bounds.sw[0] + bounds.ne[0]) / 2,
      (bounds.sw[1] + bounds.ne[1]) / 2,
    ];
  }, [bounds]);

  const sortedCourts = useMemo((): Court[] => {
    const [lng, lat] = mapCenter;
    return [...courts].sort(
      (a, b) =>
        haversineKm(lat, lng, a.latitude, a.longitude) -
        haversineKm(lat, lng, b.latitude, b.longitude),
    );
  }, [courts, mapCenter]);

  const handleSearchChange = useCallback(
    (text: string): void => {
      setSearchText(text);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (text.length < 2) {
        setSuggestions([]);
        return;
      }
      searchTimer.current = setTimeout(async () => {
        setSearching(true);
        try {
          const [lng, lat] = mapCenter;
          const url = `${GEOCODE_URL}/${encodeURIComponent(text)}.json?access_token=${env.EXPO_PUBLIC_MAPBOX_TOKEN}&proximity=${lng},${lat}&types=place,address,poi&limit=5`;
          const res = await fetch(url);
          const json = (await res.json()) as GeocoderResponse;
          setSuggestions(
            json.features.map((f) => ({
              id: f.id,
              place_name: f.place_name,
              center: f.center,
            })),
          );
        } finally {
          setSearching(false);
        }
      }, 350);
    },
    [mapCenter],
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: GeocodeSuggestion): void => {
      setSearchText('');
      setSuggestions([]);
      cameraRef.current?.flyTo(suggestion.center, 600);
    },
    [],
  );

  const handleClearSearch = useCallback((): void => {
    setSearchText('');
    setSuggestions([]);
  }, []);

  const handleLocateMe = useCallback((): void => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(({ coords }) => {
          cameraRef.current?.setCamera({
            centerCoordinate: [coords.longitude, coords.latitude],
            zoomLevel: 14,
            animationDuration: 500,
            animationMode: 'flyTo',
          });
        })
        .catch(() => {});
    });
  }, []);

  const handleCourtSelect = useCallback(
    (court: Court): void => {
      setSelectedCourt(court);
      cameraRef.current?.setCamera({
        centerCoordinate: [court.longitude, court.latitude],
        zoomLevel: 16,
        animationDuration: 500,
        animationMode: 'flyTo',
      });
      snapTo(SNAP_COLLAPSED);
    },
    [snapTo],
  );

  const handleCloseSheet = useCallback((): void => {
    setSelectedCourt(null);
    snapTo(SNAP_HALF);
  }, [snapTo]);

  const handleHomeCourtSet = useCallback((): void => {
    if (!selectedCourt) return;
    setHomeCourtState(selectedCourt.id);
  }, [selectedCourt]);

  const renderCourtRow = useCallback(
    ({ item }: { item: Court }): ReactElement => {
      const traffic = getTrafficState(item.upcoming_matches_count);
      const isHome = item.id === homeCourt;
      const isSelected = selectedCourt?.id === item.id;
      const trafficColor =
        traffic === 'open'
          ? colors.status.open
          : traffic === 'filling'
            ? colors.status.filling
            : colors.status.full;

      return (
        <PressableScale
          style={[styles.courtRow, isSelected && styles.courtRowSelected]}
          onPress={() => handleCourtSelect(item)}
          haptic="light"
          scale={0.98}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${traffic}`}
        >
          <View
            style={[styles.trafficDot, { backgroundColor: trafficColor }]}
          />
          <View style={styles.courtInfo}>
            <Text style={styles.courtName} numberOfLines={1}>
              {item.name}
              {isHome ? '  🏠' : ''}
            </Text>
            {item.address != null && (
              <Text style={styles.courtAddress} numberOfLines={1}>
                {item.address}
              </Text>
            )}
          </View>
          <Text style={styles.courtCourts}>
            {item.court_count} {item.court_count === 1 ? 'ct' : 'cts'}
          </Text>
        </PressableScale>
      );
    },
    [selectedCourt, homeCourt, handleCourtSelect],
  );

  const searchBarTop = insets.top + 12;
  const suggestionTop = searchBarTop + 44 + 8;
  const locateBtnBottom = DRAWER_HEIGHT - SNAP_HALF + 16;

  return (
    <View style={styles.container}>
      {/* Fullscreen map */}
      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        styleURL={MapboxGL.StyleURL.Street}
        onMapIdle={handleMapIdle}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: DEFAULT_COORDS,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />
        <MapboxGL.UserLocation visible />
        {courts.map((court) => (
          <MapboxGL.PointAnnotation
            key={court.id}
            id={court.id}
            coordinate={[court.longitude, court.latitude]}
            onSelected={() => handleCourtSelect(court)}
          >
            <CourtMarker
              traffic={getTrafficState(court.upcoming_matches_count)}
              selected={selectedCourt?.id === court.id}
            />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* Floating search bar */}
      <View style={[styles.searchBar, { top: searchBarTop }]}>
        <Search size={16} color={colors.text.tertiary} strokeWidth={1.75} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          placeholderTextColor={colors.text.tertiary}
          value={searchText}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searching ? (
          <ActivityIndicator size="small" color={colors.text.tertiary} />
        ) : searchText.length > 0 ? (
          <Pressable onPress={handleClearSearch} hitSlop={10}>
            <X size={16} color={colors.text.tertiary} strokeWidth={1.75} />
          </Pressable>
        ) : null}
      </View>

      {/* Geocoder suggestions */}
      {suggestions.length > 0 && (
        <View style={[styles.suggestionList, { top: suggestionTop }]}>
          {suggestions.map((s) => (
            <PressableScale
              key={s.id}
              style={styles.suggestionRow}
              onPress={() => handleSelectSuggestion(s)}
              haptic="light"
              scale={0.98}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {s.place_name}
              </Text>
            </PressableScale>
          ))}
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={[styles.mapLoader, { top: searchBarTop }]}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
        </View>
      )}

      {/* Locate me — floats just above half-position drawer */}
      <Pressable
        style={[styles.locateBtn, { bottom: locateBtnBottom }]}
        onPress={handleLocateMe}
        hitSlop={8}
      >
        <Crosshair size={18} color={colors.accent.primary} strokeWidth={1.75} />
      </Pressable>

      {/* Mapbox attribution — required by Mapbox ToS */}
      <Text style={styles.attribution}>© Mapbox © OpenStreetMap</Text>

      {/* Bottom drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { height: DRAWER_HEIGHT, paddingBottom: insets.bottom },
          { transform: [{ translateY: drawerY }] },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.drawerHandle} {...panResponder.panHandlers}>
          <View style={styles.handlePill} />
          <Text style={styles.drawerTitle}>Nearby courts</Text>
        </View>

        {/* Court list */}
        {courts.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No courts in this area</Text>
          </View>
        ) : (
          <FlatList
            data={sortedCourts}
            keyExtractor={(c) => c.id}
            renderItem={renderCourtRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </Animated.View>

      <CourtDetailSheet
        court={selectedCourt}
        homeCourt={homeCourt}
        userId={userId}
        onClose={handleCloseSheet}
        onHomeCourtSet={handleHomeCourtSet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  attribution: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    fontSize: 9,
    color: 'rgba(0,0,0,0.45)',
    zIndex: 1,
  },
  searchBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  suggestionList: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  mapLoader: {
    position: 'absolute',
    right: spacing.lg + 48,
    width: 36,
    height: 36,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  locateBtn: {
    position: 'absolute',
    right: spacing.lg,
    width: 44,
    height: 44,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 5,
  },
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
