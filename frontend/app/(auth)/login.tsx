import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AppButton, BrandMark, FormField } from '../../components/ui';
import { colors, radius, shadows, spacing, typography } from '../../constants';
import { authAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';
import { getGoogleAccessToken, getGoogleIdToken, googleClientIds, hasGoogleClientId } from '../../services/googleAuth';
import { useAuthStore } from '../../store/authStore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { login, setUser } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isWide = width >= 900;
  const googleConfigured = hasGoogleClientId();
  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    ...googleClientIds,
    scopes: ['openid', 'profile', 'email'],
  });

  const finishLogin = React.useCallback(async (accessToken: string, user: Parameters<typeof login>[1]) => {
    await login(accessToken, user);
    try {
      const freshUser = await authAPI.getMe();
      setUser(freshUser.data);
    } catch {
      // The authenticated profile is refreshed again on the next app start.
    }
    router.replace('/(tabs)');
  }, [login, router, setUser]);

  const handleGoogleResponse = React.useCallback(async (response: any) => {
    const idToken = getGoogleIdToken(response);
    const accessToken = getGoogleAccessToken(response);
    if (!idToken && !accessToken) {
      setFormError('Google did not return a usable sign-in token. Please try again.');
      return;
    }

    setIsGoogleLoading(true);
    setFormError(null);
    try {
      const result = await authAPI.googleLogin({
        id_token: idToken,
        access_token: accessToken,
        role: 'need_help',
      });
      const { access_token, user_id, name, email, role, profile_photo, skills } = result.data;
      await finishLogin(access_token, {
        _id: user_id,
        name,
        email,
        role,
        profile_photo,
        skills,
      });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to log in with Google.'));
    } finally {
      setIsGoogleLoading(false);
    }
  }, [finishLogin]);

  React.useEffect(() => {
    if (googleResponse?.type === 'success') {
      void handleGoogleResponse(googleResponse);
    }
  }, [googleResponse, handleGoogleResponse]);

  const handleLogin = async () => {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier || !password) {
      setFormError('Enter your email or phone number and password.');
      return;
    }

    setIsLoading(true);
    setFormError(null);
    try {
      const loginData = normalizedIdentifier.includes('@')
        ? { email: normalizedIdentifier.toLowerCase(), password }
        : { phone: normalizedIdentifier, password };
      const response = await authAPI.login(loginData);
      const { access_token, user_id, name, role } = response.data;

      await finishLogin(access_token, {
        _id: user_id,
        name,
        email: normalizedIdentifier.includes('@') ? normalizedIdentifier.toLowerCase() : undefined,
        phone: normalizedIdentifier.includes('@') ? undefined : normalizedIdentifier,
        role,
      });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Those details did not match an account.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    try {
      await promptGoogleAsync();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to open Google sign in.'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Return to SolveConnect home">
              <BrandMark size="small" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/')} accessibilityRole="button">
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.homeButtonText}>Home</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.authLayout, isWide && styles.authLayoutWide]}>
            {isWide ? (
              <View style={styles.authAside}>
                <View style={styles.asideIcon}>
                  <Ionicons name="link-outline" size={28} color={colors.ink} />
                </View>
                <Text style={styles.asideEyebrow}>WELCOME BACK</Text>
                <Text style={styles.asideTitle}>Keep every useful connection moving.</Text>
                <Text style={styles.asideText}>Return to your requests, offers, conversations, provider profile, and community activity.</Text>
                <View style={styles.asideFeatures}>
                  {[
                    'Your active requests and work in one place',
                    'In-app offers and conversations',
                    'Profile details that travel with your account',
                  ].map((feature) => (
                    <View key={feature} style={styles.asideFeature}>
                      <Ionicons name="checkmark-circle" size={19} color="#A8E3CD" />
                      <Text style={styles.asideFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={[styles.formCard, isWide && styles.formCardWide]}>
              <View style={styles.formHeader}>
                <Text style={styles.formEyebrow}>YOUR ACCOUNT</Text>
                <Text style={styles.title} accessibilityRole="header">Log in to SolveConnect</Text>
                <Text style={styles.subtitle}>Use the email address or phone number connected to your account.</Text>
              </View>

              {formError ? (
                <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                  <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <FormField
                  label="Email or phone number"
                  required
                  leftIcon="person-outline"
                  placeholder="you@example.com or 080..."
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  returnKeyType="next"
                />
                <FormField
                  label="Password"
                  required
                  leftIcon="lock-closed-outline"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  showPasswordToggle
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <AppButton
                  label="Log in"
                  icon="log-in-outline"
                  fullWidth
                  loading={isLoading}
                  onPress={handleLogin}
                />
              </View>

              {googleConfigured ? (
                <>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <TouchableOpacity
                    style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
                    onPress={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    accessibilityRole="button"
                    accessibilityState={{ busy: isGoogleLoading, disabled: isGoogleLoading }}
                  >
                    <View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View>
                    <Text style={styles.googleButtonText}>{isGoogleLoading ? 'Connecting...' : 'Continue with Google'}</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <View style={styles.signupRow}>
                <Text style={styles.signupText}>New to SolveConnect?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')} accessibilityRole="button">
                  <Text style={styles.signupLink}>Create an account</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.securityNote}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text style={styles.securityNoteText}>Never share your password or verification code with another user.</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.section },
  topBar: { width: '100%', maxWidth: 1040, minHeight: 72, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  homeButtonText: { ...typography.label, color: colors.primary },
  authLayout: { width: '100%', maxWidth: 560, alignSelf: 'center', flex: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  authLayoutWide: { maxWidth: 1040, minHeight: 650, flexDirection: 'row', alignItems: 'stretch', gap: spacing.lg, paddingVertical: spacing.section },
  authAside: { flex: 1, justifyContent: 'center', padding: spacing.section, borderRadius: radius.lg, backgroundColor: colors.primaryDark },
  asideIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: '#F6B44B', marginBottom: spacing.xxl },
  asideEyebrow: { ...typography.overline, color: '#A8E3CD' },
  asideTitle: { ...typography.h1, color: colors.inverse, marginTop: spacing.sm },
  asideText: { ...typography.bodyLarge, color: '#D5E5DF', marginTop: spacing.md },
  asideFeatures: { gap: spacing.md, marginTop: spacing.section },
  asideFeature: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  asideFeatureText: { ...typography.body, flex: 1, color: '#E6F0EC' },
  formCard: { padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.low },
  formCardWide: { flex: 1, justifyContent: 'center', padding: spacing.section },
  formHeader: { marginBottom: spacing.xxl },
  formEyebrow: { ...typography.overline, color: colors.primary, marginBottom: spacing.xs },
  title: { ...typography.h1, color: colors.ink },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.sm },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.dangerSoft },
  errorText: { ...typography.body, flex: 1, color: colors.danger },
  form: { gap: spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.overline, color: colors.muted },
  googleButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  buttonDisabled: { opacity: 0.6 },
  googleMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.infoSoft },
  googleMarkText: { fontSize: 14, fontWeight: '700', color: '#4285F4' },
  googleButtonText: { ...typography.button, color: colors.ink },
  signupRow: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.lg },
  signupText: { ...typography.body, color: colors.muted },
  signupLink: { ...typography.bodyStrong, color: colors.primary },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  securityNoteText: { ...typography.caption, flex: 1, color: colors.muted },
});
