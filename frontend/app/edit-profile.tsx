import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, FormField, ScreenHeader } from '../components/ui';
import { colors, layout, radius, spacing, typography } from '../constants/theme';
import { getApiErrorMessage } from '../services/error';
import { userAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [skills, setSkills] = useState(user?.skills?.join(', ') ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/profile');
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const skillsArray =
      user?.role === 'helper'
        ? skills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : undefined;

    if (!trimmedName) {
      setNameError('Enter the name you want people to see.');
      return;
    }

    setNameError(undefined);
    setSubmissionError(null);
    setIsSaving(true);

    try {
      const response = await userAPI.updateUser({
        name: trimmedName,
        ...(user?.role === 'helper' ? { skills: skillsArray } : {}),
      });

      setUser(response.data);
      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'Done', onPress: goBack },
      ]);
    } catch (error: any) {
      setSubmissionError(getApiErrorMessage(error, 'Unable to update your profile right now.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.frame}>
        <ScreenHeader
          title="Edit profile"
          subtitle="Keep the account details shown across SolveConnect accurate."
          eyebrow="Account"
          onBack={goBack}
          bordered
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              {submissionError ? (
                <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
                  <Text style={styles.errorTitle}>Changes were not saved</Text>
                  <Text style={styles.errorText}>{submissionError}</Text>
                </View>
              ) : null}

              <FormField
                autoCapitalize="words"
                autoComplete="name"
                error={nameError}
                label="Full name"
                leftIcon="person-outline"
                onChangeText={(value) => {
                  setName(value);
                  if (nameError) setNameError(undefined);
                }}
                placeholder="Your full name"
                required
                returnKeyType="done"
                value={name}
              />

              {user?.email ? (
                <FormField
                  disabled
                  helperText="Email changes are not available from this screen."
                  label="Email"
                  leftIcon="mail-outline"
                  value={user.email}
                />
              ) : null}

              {user?.phone ? (
                <FormField
                  disabled
                  helperText="Phone changes are not available from this screen."
                  label="Phone"
                  leftIcon="call-outline"
                  value={user.phone}
                />
              ) : null}

              {user?.role === 'helper' ? (
                <FormField
                  autoCapitalize="none"
                  helperText="Separate each skill with a comma, for example: electrician, plumber, painter."
                  label="Skills"
                  leftIcon="construct-outline"
                  multiline
                  onChangeText={setSkills}
                  placeholder="electrician, plumber, painter"
                  value={skills}
                />
              ) : null}

              <AppButton
                accessibilityHint="Saves your profile details"
                fullWidth
                icon="checkmark-circle-outline"
                label="Save changes"
                loading={isSaving}
                onPress={handleSave}
                size="large"
                style={styles.saveButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  frame: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: layout.readingMaxWidth,
    width: '100%',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.page,
  },
  form: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: layout.formMaxWidth,
    width: '100%',
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  errorTitle: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
  saveButton: {
    marginTop: spacing.xs,
  },
});
