import type { ReactElement } from 'react';
import { Search, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PressableScale } from '@/components/ui/pressable-scale';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

export type GeocodeSuggestion = {
  id: string;
  place_name: string;
  center: [number, number];
};

type Props = {
  searchText: string;
  suggestions: GeocodeSuggestion[];
  searching: boolean;
  searchBarTop: number;
  suggestionTop: number;
  onChange: (text: string) => void;
  onSelect: (suggestion: GeocodeSuggestion) => void;
  onClear: () => void;
};

export function CourtsSearchOverlay({
  searchText,
  suggestions,
  searching,
  searchBarTop,
  suggestionTop,
  onChange,
  onSelect,
  onClear,
}: Props): ReactElement {
  return (
    <>
      <View style={[styles.searchBar, { top: searchBarTop }]}>
        <Search size={16} color={colors.text.tertiary} strokeWidth={1.75} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          placeholderTextColor={colors.text.tertiary}
          value={searchText}
          onChangeText={onChange}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searching ? (
          <ActivityIndicator size="small" color={colors.text.tertiary} />
        ) : searchText.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={10}>
            <X size={16} color={colors.text.tertiary} strokeWidth={1.75} />
          </Pressable>
        ) : null}
      </View>

      {suggestions.length > 0 && (
        <View style={[styles.suggestionList, { top: suggestionTop }]}>
          {suggestions.map((s, i) => (
            <PressableScale
              key={s.id}
              style={[
                styles.suggestionRow,
                i === suggestions.length - 1 && styles.suggestionRowLast,
              ]}
              onPress={(): void => onSelect(s)}
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
    </>
  );
}

const styles = StyleSheet.create({
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
  suggestionRowLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
});
