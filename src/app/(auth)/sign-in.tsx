import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { trackEvent } from '@/lib/analytics';
import { routeAfterAuth } from '@/lib/auth';
import { reportError, UserFacingError } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen(): ReactElement {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleSignIn = useCallback(async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const rawNonce = Array.from(await Crypto.getRandomBytesAsync(16), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken ?? '',
        nonce: rawNonce,
      });

      if (authError)
        throw new UserFacingError('Apple sign-in failed. Please try again.');
      if (data.session) {
        haptics.success();
        if (data.user?.created_at === data.user?.last_sign_in_at)
          trackEvent('signed_up');
        await routeAfterAuth(data.session.user.id, router);
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('1001') ||
          err.message.toLowerCase().includes('cancel'))
      )
        return;
      if (err instanceof UserFacingError) {
        setError(err.message);
      } else {
        reportError(err, { context: 'appleSignIn' });
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleGoogleSignIn = useCallback(async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'rally' });

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (oauthError || !data.url)
        throw new UserFacingError('Could not connect to Google.');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );
      if (result.type !== 'success') return;

      const fragment =
        result.url.split('#')[1] ?? result.url.split('?')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        const { data: sessionData } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? '',
        });
        if (sessionData.session) {
          haptics.success();
          if (
            sessionData.user?.created_at === sessionData.user?.last_sign_in_at
          )
            trackEvent('signed_up');
          await routeAfterAuth(sessionData.session.user.id, router);
        }
      }
    } catch (err) {
      if (err instanceof UserFacingError) {
        setError(err.message);
      } else {
        reportError(err, { context: 'googleSignIn' });
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleEmailSignIn = useCallback((): void => {
    router.push('/(auth)/email-sign-in');
  }, [router]);

  const openPrivacyPolicy = useCallback((): void => {
    WebBrowser.openBrowserAsync('https://rallyapp.ca/privacy.html');
  }, []);

  const openTerms = useCallback((): void => {
    WebBrowser.openBrowserAsync('https://rallyapp.ca/terms.html');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>Rally</Text>
        <Text style={styles.tagline}>Schedule sport in one tap</Text>
      </View>

      <View style={styles.actions}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={10}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        <Pressable
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        <Pressable
          onPress={handleEmailSignIn}
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
        >
          <Text style={styles.emailLink}>Continue with Email</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>By continuing you agree to our </Text>
        <Pressable onPress={openPrivacyPolicy} accessibilityRole="link">
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.footerText}> and </Text>
        <Pressable onPress={openTerms} accessibilityRole="link">
          <Text style={styles.footerLink}>Terms of Service</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.hero,
  },
  wordmark: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.secondary,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  errorText: {
    fontSize: 14,
    color: colors.status.error,
    textAlign: 'center',
  },
  appleButton: {
    height: 56,
    width: '100%',
  },
  googleButton: {
    height: 56,
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.elevated,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emailLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.primary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  footerLink: {
    fontSize: 12,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});
