import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Crosshair } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { CourtDetailSheet } from '@/components/feature/court-detail-sheet';
import { CourtMarker } from '@/components/feature/court-marker';
import { CourtsBottomDrawer } from '@/components/feature/courts-bottom-drawer';
import type { GeocodeSuggestion } from '@/components/feature/courts-search-overlay';
import { CourtsSearchOverlay } from '@/components/feature/courts-search-overlay';
import { useAuth } from '@/hooks/use-auth';
import {
  DRAWER_HEIGHT,
  SNAP_COLLAPSED,
  SNAP_HALF,
  useCourtDrawer,
} from '@/hooks/use-court-drawer';
import type { Bounds, Court } from '@/hooks/use-courts';
import { getTrafficState, haversineKm, useCourts } from '@/hooks/use-courts';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

MapboxGL.setAccessToken(env.EXPO_PUBLIC_MAPBOX_TOKEN);

const DEFAULT_COORDS: [number, number] = [-123.1207, 49.2827];
const DEFAULT_ZOOM = 13;
const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

const GeocodeFeatureSchema = z.object({
  id: z.string(),
  place_name: z.string(),
  center: z.tuple([z.number(), z.number()]),
});
const GeocodeResponseSchema = z.object({
  features: z.array(GeocodeFeatureSchema),
});

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

  const { drawerY, panHandlers, snapTo } = useCourtDrawer();
  const { courts, isLoading } = useCourts(bounds);

  useEffect((): void => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('home_court_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        const parsed = z
          .object({ home_court_id: z.string().nullable() })
          .nullable()
          .safeParse(data);
        if (parsed.data?.home_court_id)
          setHomeCourtState(parsed.data.home_court_id);
      });
  }, [userId]);

  useEffect((): void => {
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
    setBounds({ sw: [b.sw[0], b.sw[1]], ne: [b.ne[0], b.ne[1]] });
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
      searchTimer.current = setTimeout((): void => {
        setSearching(true);
        const [lng, lat] = mapCenter;
        const url = `${GEOCODE_URL}/${encodeURIComponent(text)}.json?access_token=${env.EXPO_PUBLIC_MAPBOX_TOKEN}&proximity=${lng},${lat}&types=place,address,poi&limit=5`;
        fetch(url)
          .then((res) => res.json())
          .then((json) => {
            const { features } = GeocodeResponseSchema.parse(json);
            setSuggestions(
              features.map((f) => ({
                id: f.id,
                place_name: f.place_name,
                center: f.center,
              })),
            );
          })
          .finally((): void => setSearching(false));
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

  const searchBarTop = insets.top + 12;
  const locateBtnBottom = DRAWER_HEIGHT - SNAP_HALF + 16;

  return (
    <View style={styles.container}>
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
            onSelected={(): void => handleCourtSelect(court)}
          >
            <CourtMarker
              traffic={getTrafficState(court.upcoming_matches_count)}
              selected={selectedCourt?.id === court.id}
            />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      <CourtsSearchOverlay
        searchText={searchText}
        suggestions={suggestions}
        searching={searching}
        searchBarTop={searchBarTop}
        suggestionTop={searchBarTop + 44 + 8}
        onChange={handleSearchChange}
        onSelect={handleSelectSuggestion}
        onClear={handleClearSearch}
      />

      {isLoading && (
        <View style={[styles.mapLoader, { top: searchBarTop }]}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
        </View>
      )}

      <Pressable
        style={[styles.locateBtn, { bottom: locateBtnBottom }]}
        onPress={handleLocateMe}
        hitSlop={8}
      >
        <Crosshair size={18} color={colors.accent.primary} strokeWidth={1.75} />
      </Pressable>

      <Text style={styles.attribution}>© Mapbox © OpenStreetMap</Text>

      <CourtsBottomDrawer
        courts={sortedCourts}
        isLoading={isLoading}
        homeCourt={homeCourt}
        selectedCourt={selectedCourt}
        drawerY={drawerY}
        drawerHeight={DRAWER_HEIGHT}
        panHandlers={panHandlers}
        onCourtSelect={handleCourtSelect}
        paddingBottom={insets.bottom}
      />

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
  container: { flex: 1, backgroundColor: colors.background.primary },
  attribution: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    fontSize: 9,
    color: 'rgba(0,0,0,0.45)',
    zIndex: 1,
  },
  mapLoader: {
    position: 'absolute',
    right: spacing.lg + 48,
    width: 36,
    height: 36,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 5,
  },
});
