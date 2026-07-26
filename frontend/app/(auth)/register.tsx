import React, { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AppButton, BrandMark, FormField } from '../../components/ui';
import { SERVICE_CATEGORIES, colors, radius, shadows, spacing, typography } from '../../constants';
import { authAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';
import { getGoogleAccessToken, getGoogleIdToken, googleClientIds, hasGoogleClientId } from '../../services/googleAuth';
import { useAuthStore } from '../../store/authStore';

type AccountRole = 'need_help' | 'helper';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { width } = useWindowDimensions();
  const { login, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [role, setRole] = useState<AccountRole>(params.role === 'helper' ? 'helper' : 'need_help');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [hasSentCode, setHasSentCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const isWide = width >= 900;
  const googleConfigured = hasGoogleClientId();
  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    ...googleClientIds,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (params.role === 'helper' || params.role === 'need_help') setRole(params.role);
  }, [params.role]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const skillsForRequest = useMemo(() => role === 'helper' ? selectedSkills : [], [role, selectedSkills]);

  const finishSignup = React.useCallback(async (accessToken: string, user: Parameters<typeof login>[1]) => {
    await login(accessToken, user);
    try {
      const freshUser = await authAPI.getMe();
      setUser(freshUser.data);
    } catch {
      // Startup session validation will refresh the profile later.
    }
    router.replace('/(tabs)');
  }, [login, router, setUser]);

  const handleGoogleResponse = React.useCallback(async (response: any) => {
    const idToken = getGoogleIdToken(response);
    const accessToken = getGoogleAccessToken(response);
    if (!idToken && !accessToken) {
      setFormError('Google did not return a usable sign-up token. Please try again.');
      return;
    }

    setIsGoogleLoading(true);
    setFormError(null);
    try {
      const result = await authAPI.googleLogin({
        id_token: idToken,
        access_token: accessToken,
        role,
        skills: skillsForRequest,
      });
      const { access_token, user_id, name: googleName, email: googleEmail, profile_photo, skills: googleSkills } = result.data;
      await finishSignup(access_token, {
        _id: user_id,
        name: googleName,
        email: googleEmail,
        role,
        profile_photo,
        skills: googleSkills || skillsForRequest,
      });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to continue with Google.'));
    } finally {
      setIsGoogleLoading(false);
    }
  }, [finishSignup, role, skillsForRequest]);

  useEffect(() => {
    if (googleResponse?.type === 'success') void handleGoogleResponse(googleResponse);
  }, [googleResponse, handleGoogleResponse]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (hasSentCode) {
      setHasSentCode(false);
      setEmailVerificationCode('');
      setVerificationMessage(null);
      setResendCooldown(0);
    }
  };

  const handleSendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setFormError('Enter a valid email address before requesting a code.');
      return;
    }

    setIsSendingCode(true);
    setFormError(null);
    try {
      const response = await authAPI.sendEmailCode(normalizedEmail);
      const expiresInSeconds = Number(response.data?.expires_in_seconds || 600);
      const expiresInMinutes = Math.max(1, Math.round(expiresInSeconds / 60));
      setHasSentCode(true);
      setResendCooldown(Math.min(expiresInSeconds, 60));
      setVerificationMessage(`Code sent to ${normalizedEmail}. It expires in about ${expiresInMinutes} ${expiresInMinutes === 1 ? 'minute' : 'minutes'}.`);
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'We could not send a verification code.'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !normalizedEmail || !password) {
      setFormError('Full name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      setFormError('Use at least 8 characters for your password.');
      return;
    }
    if (!emailVerificationCode.trim()) {
      setFormError('Enter the email verification code before creating your account.');
      return;
    }

    setIsLoading(true);
    setFormError(null);
    try {
      const response = await authAPI.register({
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone || undefined,
        password,
        role,
        skills: skillsForRequest,
        email_verification_code: emailVerificationCode.trim(),
      });
      const { access_token, user_id } = response.data;
      await finishSignup(access_token, {
        _id: user_id,
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone || undefined,
        role,
        skills: skillsForRequest,
      });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'We could not create your account.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    try {
      await promptGoogleAsync();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to open Google sign up.'));
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
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
                <View style={styles.asideIcon}><Ionicons name="people-outline" size={28} color={colors.ink} /></View>
                <Text style={styles.asideEyebrow}>JOIN THE NETWORK</Text>
                <Text style={styles.asideTitle}>Start with what you need today.</Text>
                <Text style={styles.asideText}>Use one account to request help, offer your skills, join communities, and build useful local relationships over time.</Text>
                <View style={styles.asideFeatures}>
                  {[
                    'Choose a clear customer or provider starting point',
                    'Keep responses and conversations connected',
                    'Update your profile as your needs change',
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
                <Text style={styles.formEyebrow}>CREATE YOUR ACCOUNT</Text>
                <Text style={styles.title} accessibilityRole="header">Join SolveConnect</Text>
                <Text style={styles.subtitle}>Choose how you want to start. You can still use the wider network later.</Text>
              </View>

              <View style={styles.roleGroup} accessibilityRole="radiogroup">
                <TouchableOpacity
                  style={[styles.roleOption, role === 'need_help' && styles.roleOptionActive]}
                  onPress={() => setRole('need_help')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: role === 'need_help' }}
                >
                  <View style={[styles.roleIcon, role === 'need_help' && styles.roleIconActive]}>
                    <Ionicons name="help-buoy-outline" size={22} color={role === 'need_help' ? colors.inverse : colors.primary} />
                  </View>
                  <View style={styles.roleCopy}>
                    <Text style={[styles.roleTitle, role === 'need_help' && styles.roleTitleActive]}>I need help</Text>
                    <Text style={[styles.roleText, role === 'need_help' && styles.roleTextActive]}>Post requests and compare responses</Text>
                  </View>
                  <Ionicons name={role === 'need_help' ? 'radio-button-on' : 'radio-button-off'} size={20} color={role === 'need_help' ? colors.inverse : colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'helper' && styles.roleOptionActive]}
                  onPress={() => setRole('helper')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: role === 'helper' }}
                >
                  <View style={[styles.roleIcon, role === 'helper' && styles.roleIconActive]}>
                    <Ionicons name="briefcase-outline" size={22} color={role === 'helper' ? colors.inverse : colors.primary} />
                  </View>
                  <View style={styles.roleCopy}>
                    <Text style={[styles.roleTitle, role === 'helper' && styles.roleTitleActive]}>I offer solutions</Text>
                    <Text style={[styles.roleText, role === 'helper' && styles.roleTextActive]}>Find requests and send clear offers</Text>
                  </View>
                  <Ionicons name={role === 'helper' ? 'radio-button-on' : 'radio-button-off'} size={20} color={role === 'helper' ? colors.inverse : colors.muted} />
                </TouchableOpacity>
              </View>

              {formError ? (
                <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                  <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <FormField label="Full name" required leftIcon="person-outline" placeholder="Your full name" value={name} onChangeText={setName} textContentType="name" autoComplete="name" />
                <FormField label="Email address" required leftIcon="mail-outline" placeholder="you@example.com" value={email} onChangeText={handleEmailChange} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" />
                <AppButton
                  label={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : hasSentCode ? 'Send a new code' : 'Send verification code'}
                  variant="outline"
                  icon="mail-unread-outline"
                  fullWidth
                  loading={isSendingCode}
                  disabled={resendCooldown > 0}
                  onPress={handleSendCode}
                />
                {verificationMessage ? (
                  <View style={styles.verificationBanner} accessibilityLiveRegion="polite">
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                    <Text style={styles.verificationText}>{verificationMessage}</Text>
                  </View>
                ) : null}
                {hasSentCode ? (
                  <FormField label="Verification code" required leftIcon="keypad-outline" placeholder="6-digit code" value={emailVerificationCode} onChangeText={setEmailVerificationCode} keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} maxLength={6} helperText="Check your inbox and spam folder." />
                ) : null}
                <FormField label="Phone number" leftIcon="call-outline" placeholder="Optional" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" helperText="Useful for account and job contact details." />
                <FormField label="Password" required leftIcon="lock-closed-outline" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry showPasswordToggle textContentType="newPassword" autoComplete="new-password" helperText="Use at least 8 characters and keep it private." />

                {role === 'helper' ? (
                  <View style={styles.skillsSection}>
                    <View style={styles.skillsHeadingRow}>
                      <View style={styles.skillsHeadingCopy}>
                        <Text style={styles.skillsLabel}>Your main services</Text>
                        <Text style={styles.skillsHelp}>Choose the categories that best match your work. You can update these later.</Text>
                      </View>
                      <Text style={styles.skillsCount}>{selectedSkills.length} selected</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillsScroller} accessibilityRole="list">
                      {SERVICE_CATEGORIES.map((category) => {
                        const selected = selectedSkills.includes(category.id);
                        return (
                          <TouchableOpacity
                            key={category.id}
                            style={[styles.skillChip, selected && styles.skillChipActive]}
                            onPress={() => toggleSkill(category.id)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected }}
                          >
                            <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={16} color={selected ? colors.inverse : colors.muted} />
                            <Text style={[styles.skillChipText, selected && styles.skillChipTextActive]}>{category.shortLabel}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                <AppButton label="Create account" icon="arrow-forward" iconPosition="right" fullWidth loading={isLoading} onPress={handleRegister} />
              </View>

              {googleConfigured ? (
                <>
                  <View style={styles.dividerRow}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View>
                  <TouchableOpacity style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]} onPress={handleGoogleLogin} disabled={isGoogleLoading} accessibilityRole="button" accessibilityState={{ busy: isGoogleLoading, disabled: isGoogleLoading }}>
                    <View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View>
                    <Text style={styles.googleButtonText}>{isGoogleLoading ? 'Connecting...' : 'Continue with Google'}</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <Text style={styles.responsibilityNote}>By creating an account, you agree to use SolveConnect respectfully and provide accurate profile and request information.</Text>
              <View style={styles.loginRow}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')} accessibilityRole="button"><Text style={styles.loginLink}>Log in</Text></TouchableOpacity>
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
  topBar: { width: '100%', maxWidth: 1120, minHeight: 72, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  homeButtonText: { ...typography.label, color: colors.primary },
  authLayout: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingVertical: spacing.lg },
  authLayoutWide: { maxWidth: 1120, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg, paddingVertical: spacing.section },
  authAside: { flex: 0.82, minHeight: 640, justifyContent: 'center', padding: spacing.section, borderRadius: radius.lg, backgroundColor: colors.primaryDark },
  asideIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: '#F6B44B', marginBottom: spacing.xxl },
  asideEyebrow: { ...typography.overline, color: '#A8E3CD' },
  asideTitle: { ...typography.h1, color: colors.inverse, marginTop: spacing.sm },
  asideText: { ...typography.bodyLarge, color: '#D5E5DF', marginTop: spacing.md },
  asideFeatures: { gap: spacing.md, marginTop: spacing.section },
  asideFeature: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  asideFeatureText: { ...typography.body, flex: 1, color: '#E6F0EC' },
  formCard: { padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.low },
  formCardWide: { flex: 1.18, padding: spacing.section },
  formHeader: { marginBottom: spacing.xl },
  formEyebrow: { ...typography.overline, color: colors.primary, marginBottom: spacing.xs },
  title: { ...typography.h1, color: colors.ink },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.sm },
  roleGroup: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  roleOption: { flex: 1, minHeight: 116, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  roleOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryDark },
  roleIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.subtle, marginBottom: spacing.sm },
  roleIconActive: { backgroundColor: 'rgba(255,255,255,0.14)' },
  roleCopy: { flex: 1 },
  roleTitle: { ...typography.label, color: colors.ink },
  roleTitleActive: { color: colors.inverse },
  roleText: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
  roleTextActive: { color: '#D5E5DF' },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.dangerSoft },
  errorText: { ...typography.body, flex: 1, color: colors.danger },
  form: { gap: spacing.lg },
  verificationBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.successSoft },
  verificationText: { ...typography.caption, flex: 1, color: colors.success },
  skillsSection: { gap: spacing.sm },
  skillsHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  skillsHeadingCopy: { flex: 1 },
  skillsLabel: { ...typography.label, color: colors.ink },
  skillsHelp: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
  skillsCount: { ...typography.caption, color: colors.primary },
  skillsScroller: { gap: spacing.sm, paddingRight: spacing.lg },
  skillChip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  skillChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  skillChipText: { ...typography.label, color: colors.muted },
  skillChipTextActive: { color: colors.inverse },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.overline, color: colors.muted },
  googleButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  buttonDisabled: { opacity: 0.6 },
  googleMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.infoSoft },
  googleMarkText: { fontSize: 14, fontWeight: '700', color: '#4285F4' },
  googleButtonText: { ...typography.button, color: colors.ink },
  responsibilityNote: { ...typography.caption, color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  loginRow: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
  loginText: { ...typography.body, color: colors.muted },
  loginLink: { ...typography.bodyStrong, color: colors.primary },
});
