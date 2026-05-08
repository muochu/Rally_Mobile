import { zodResolver } from '@hookform/resolvers/zod';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/errors';
import { useOnboardingStore } from '@/store/onboarding';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const schema = z.object({
  city: z.string().min(2, 'Enter your city'),
});

type FormData = z.infer<typeof schema>;

export default function Step3LocationScreen(): ReactElement {
  const router = useRouter();
  const setCity = useOnboardingStore((s) => s.setCity);
  const stored = useOnboardingStore((s) => s.city);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { city: stored ?? '' },
  });

  const detectLocation = async (): Promise<void> => {
    setDetecting(true);
    setDetectError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDetectError('Location permission denied. Enter your city manually.');
        return;
      }
      const coords = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      const cityName = place?.city ?? place?.subregion ?? place?.region;
      if (cityName) {
        setValue('city', cityName, { shouldValidate: true });
      } else {
        setDetectError('Could not determine your city. Enter it manually.');
      }
    } catch (err) {
      reportError(err, { context: 'detectLocation' });
      setDetectError('Could not detect location. Enter your city manually.');
    } finally {
      setDetecting(false);
    }
  };

  const onSubmit = (values: FormData): void => {
    setCity(values.city);
    router.push('/(onboarding)/step-4-calendar');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Where do you play?</Text>
        <Text style={styles.subtitle}>
          We'll find players and courts near you
        </Text>

        <View style={styles.inputRow}>
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Your city"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="City"
              />
            )}
          />
          <Pressable
            onPress={detectLocation}
            style={styles.detectButton}
            disabled={detecting}
            accessibilityRole="button"
            accessibilityLabel="Detect my location"
          >
            {detecting ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : (
              <Text style={styles.detectLabel}>Detect</Text>
            )}
          </Pressable>
        </View>

        {errors.city && (
          <Text style={styles.errorText}>{errors.city.message}</Text>
        )}
        {detectError && <Text style={styles.errorText}>{detectError}</Text>}
      </View>

      <View style={styles.footer}>
        <Button label="Continue" onPress={handleSubmit(onSubmit)} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    marginTop: -spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.status.error,
  },
  detectButton: {
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  errorText: {
    fontSize: 12,
    color: colors.status.error,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
