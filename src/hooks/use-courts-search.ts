import { useCallback, useRef, useState } from 'react';
import { z } from 'zod';
import type { GeocodeSuggestion } from '@/components/feature/courts-search-overlay';
import { env } from '@/lib/env';

const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

const GeocodeResponseSchema = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      place_name: z.string(),
      center: z.tuple([z.number(), z.number()]),
    }),
  ),
});

type CourtsSearch = {
  searchText: string;
  suggestions: GeocodeSuggestion[];
  searching: boolean;
  handleSearchChange: (text: string) => void;
  handleSelectSuggestion: (suggestion: GeocodeSuggestion) => void;
  handleClearSearch: () => void;
};

export const useCourtsSearch = (
  mapCenter: [number, number],
  onFlyTo: (center: [number, number]) => void,
): CourtsSearch => {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            const result = GeocodeResponseSchema.safeParse(json);
            if (!result.success) return;
            setSuggestions(
              result.data.features.map((f) => ({
                id: f.id,
                place_name: f.place_name,
                center: f.center,
              })),
            );
          })
          .catch(() => {})
          .finally((): void => setSearching(false));
      }, 350);
    },
    [mapCenter],
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: GeocodeSuggestion): void => {
      setSearchText('');
      setSuggestions([]);
      onFlyTo(suggestion.center);
    },
    [onFlyTo],
  );

  const handleClearSearch = useCallback((): void => {
    setSearchText('');
    setSuggestions([]);
  }, []);

  return {
    searchText,
    suggestions,
    searching,
    handleSearchChange,
    handleSelectSuggestion,
    handleClearSearch,
  };
};
