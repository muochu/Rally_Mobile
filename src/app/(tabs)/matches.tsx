import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export default function MatchesScreen(): ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Matches</Text>
      <Text style={styles.subtitle}>Matches placeholder</Text>
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
