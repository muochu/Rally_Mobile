import type { ReactElement } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export default function MatchDetailsScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match</Text>
      <Text style={styles.subtitle}>Match {id ?? 'unknown'} placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    color: colors.text.secondary,
    fontSize: 15,
  },
});
