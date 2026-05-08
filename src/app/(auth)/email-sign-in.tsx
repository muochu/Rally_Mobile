import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { routeAfterAuth } from '@/lib/auth';
import { reportError, UserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function EmailSignInScreen(): ReactElement {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = async (values: FormData): Promise<void> => {
    setServerError(null);
    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

      if (!signInError && signInData.session) {
        await routeAfterAuth(signInData.session.user.id, router);
        return;
      }

      // Only attempt sign-up when the error is "no account found", not wrong password
      const isNoAccount =
        signInError?.message
          .toLowerCase()
          .includes('invalid login credentials') ||
        signInError?.message.toLowerCase().includes('user not found');

      if (!isNoAccount) {
        throw new UserFacingError(
          signInError?.message ?? 'Sign-in failed. Please try again.',
        );
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { data: { full_name: values.fullName } },
        });

      if (signUpError)
        throw new UserFacingError(
          'Could not create account. Please try again.',
        );
      if (signUpData.session) {
        await routeAfterAuth(signUpData.session.user.id, router);
      } else {
        setServerError(
          'Check your email to confirm your account, then sign in.',
        );
      }
    } catch (err) {
      if (err instanceof UserFacingError) {
        setServerError(err.message);
      } else {
        reportError(err, { context: 'emailSignIn' });
        setServerError('Sign-in failed. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Or create a new account</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={[styles.input, errors.fullName && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Your name"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  accessibilityLabel="Full name"
                />
                {errors.fullName && (
                  <Text style={styles.errorText}>
                    {errors.fullName.message}
                  </Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email address"
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="8+ characters"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry
                  accessibilityLabel="Password"
                />
                {errors.password && (
                  <Text style={styles.errorText}>
                    {errors.password.message}
                  </Text>
                )}
              </View>
            )}
          />

          {serverError && <Text style={styles.serverError}>{serverError}</Text>}
        </View>

        <Button
          label={isSubmitting ? 'Signing in…' : 'Continue'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          fullWidth
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
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
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  input: {
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
  errorText: {
    fontSize: 12,
    color: colors.status.error,
  },
  serverError: {
    fontSize: 14,
    color: colors.status.error,
    textAlign: 'center',
  },
});
