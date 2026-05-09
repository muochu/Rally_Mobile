import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Crosshair, Search, X } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CourtDetailSheet } from '@/components/feature/court-detail-sheet';
import { CourtMarker } from '@/components/feature/court-marker';
import { useAuth } from '@/hooks/use-auth';
import type { Bounds, Court } from '@/hooks/use-courts';
import { getTrafficState, haversineKm, useCourts } from '@/hooks/use-courts';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

MapboxGL.setAccessToken(env.EXPO_PUBLIC_MAPBOX_TOKEN);

const DEFAULT_COORDS: [number, number] = [-118.2437, 34.0522]; // Los Angeles
const DEFAULT_ZOOM = 12;
const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

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

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [homeCourt, setHomeCourtState] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(({ coords }) => {
        cameraRef.current?.flyTo([coords.longitude, coords.latitude], 0);
      })
      .catch(() => {});
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
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(({ coords }) => {
        cameraRef.current?.flyTo([coords.longitude, coords.latitude], 500);
      })
      .catch(() => {});
  }, []);

  const handleCourtSelect = useCallback((court: Court): void => {
    setSelectedCourt(court);
    cameraRef.current?.flyTo([court.longitude, court.latitude], 400);
  }, []);

  const handleHomeCourtSet = useCallback((): void => {
    if (!selectedCourt) return;
    setHomeCourtState(selectedCourt.id);
  }, [selectedCourt]);

  const renderCourtRow = useCallback(
    ({ item }: { item: Court }): ReactElement => {
      const traffic = getTrafficState(item.upcoming_matches_count);
      const isHome = item.id === homeCourt;
      const trafficColor =
        traffic === 'open'
          ? colors.status.open
          : traffic === 'filling'
            ? colors.status.filling
            : colors.status.full;

      return (
        <Pressable
          style={[
            styles.courtRow,
            selectedCourt?.id === item.id && styles.courtRowSelected,
          ]}
          onPress={() => handleCourtSelect(item)}
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
        </Pressable>
      );
    },
    [selectedCourt, homeCourt, handleCourtSelect],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBar}>
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

      {suggestions.length > 0 && (
        <View style={styles.suggestionList}>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              style={styles.suggestionRow}
              onPress={() => handleSelectSuggestion(s)}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {s.place_name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          style={styles.map}
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

        <Pressable
          style={styles.locateBtn}
          onPress={handleLocateMe}
          hitSlop={8}
        >
          <Crosshair
            size={18}
            color={colors.accent.primary}
            strokeWidth={1.75}
          />
        </Pressable>

        {isLoading && (
          <View style={styles.mapLoader}>
            <ActivityIndicator color={colors.accent.primary} />
          </View>
        )}
      </View>

      <View style={styles.listContainer}>
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
          />
        )}
      </View>

      <CourtDetailSheet
        court={selectedCourt}
        homeCourt={homeCourt}
        userId={userId}
        onClose={() => setSelectedCourt(null)}
        onHomeCourtSet={handleHomeCourtSet}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  suggestionList: {
    position: 'absolute',
    top: 72,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
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
  mapContainer: {
    height: 320,
  },
  map: {
    flex: 1,
  },
  locateBtn: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  mapLoader: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.full,
    padding: spacing.sm,
  },
  listContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
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
